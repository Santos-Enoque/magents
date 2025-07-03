"use strict";
/**
 * GUI-CLI Integration Bridge API Routes
 *
 * Provides WebSocket and SSE endpoints for real-time synchronization
 * between GUI and CLI interfaces.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebSocketUpgrade = void 0;
const express_1 = require("express");
const ws_1 = require("ws");
const shared_1 = require("@magents/shared");
const router = (0, express_1.Router)();
// Store active SSE connections
const sseConnections = new Map();
// Store WebSocket connections
const wsConnections = new Map();
/**
 * Execute Command via REST API
 * POST /api/bridge/execute
 */
router.post('/execute', async (req, res) => {
    try {
        const { commandName, params, sessionId, userId } = req.body;
        if (!commandName || !sessionId) {
            throw (0, shared_1.createMagentsError)(shared_1.ERROR_CODES.INVALID_CONFIG, {
                missingFields: ['commandName', 'sessionId']
            });
        }
        const options = {
            params: params || {},
            source: 'GUI',
            sessionId,
            userId
        };
        const result = await shared_1.coreManager.executeCommand(commandName, options);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Bridge command execution error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error instanceof Error ? error.message : 'Unknown error',
                code: 'BRIDGE_EXECUTION_ERROR'
            }
        });
    }
});
/**
 * Get Available Commands
 * GET /api/bridge/commands
 */
router.get('/commands', (req, res) => {
    try {
        const commands = shared_1.coreManager.commandRegistry.getAllCommands();
        const commandsByCategory = commands.reduce((acc, cmd) => {
            if (!acc[cmd.category]) {
                acc[cmd.category] = [];
            }
            acc[cmd.category].push({
                name: cmd.name,
                description: cmd.description,
                requiredParams: cmd.requiredParams,
                optionalParams: cmd.optionalParams
            });
            return acc;
        }, {});
        res.json({
            success: true,
            data: {
                commands,
                commandsByCategory,
                totalCommands: commands.length
            }
        });
    }
    catch (error) {
        console.error('Bridge commands error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }
});
/**
 * Get Activity Logs
 * GET /api/bridge/activity?source=GUI&limit=50
 */
router.get('/activity', (req, res) => {
    try {
        const { source, command, userId, sessionId, since, limit } = req.query;
        const filters = {};
        if (source)
            filters.source = source;
        if (command)
            filters.command = command;
        if (userId)
            filters.userId = userId;
        if (sessionId)
            filters.sessionId = sessionId;
        if (since)
            filters.since = new Date(since);
        if (limit)
            filters.limit = parseInt(limit);
        const logs = shared_1.coreManager.activityLogger.getLogs(filters);
        const stats = shared_1.coreManager.activityLogger.getStats();
        res.json({
            success: true,
            data: {
                logs,
                stats,
                totalEntries: logs.length
            }
        });
    }
    catch (error) {
        console.error('Bridge activity error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }
});
/**
 * Get Sync Conflicts
 * GET /api/bridge/conflicts?resolved=false
 */
router.get('/conflicts', (req, res) => {
    try {
        const { resolved, severity, since } = req.query;
        const filters = {};
        if (resolved !== undefined)
            filters.resolved = resolved === 'true';
        if (severity)
            filters.severity = severity;
        if (since)
            filters.since = new Date(since);
        const conflicts = shared_1.coreManager.conflictResolver.getConflicts(filters);
        res.json({
            success: true,
            data: {
                conflicts,
                totalConflicts: conflicts.length,
                unresolvedCount: conflicts.filter((c) => !c.autoResolved).length
            }
        });
    }
    catch (error) {
        console.error('Bridge conflicts error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }
});
/**
 * Get Sync Bridge Status
 * GET /api/bridge/status
 */
router.get('/status', (req, res) => {
    try {
        const syncBridge = shared_1.coreManager.syncBridge;
        const subscribers = syncBridge.getSubscribers();
        const lastSyncTime = syncBridge.getLastSyncTime();
        const stats = shared_1.coreManager.activityLogger.getStats();
        const recentConflicts = shared_1.coreManager.conflictResolver.getConflicts({
            since: new Date(Date.now() - 3600000) // Last hour
        });
        res.json({
            success: true,
            data: {
                lastSyncTime,
                subscribers,
                activeConnections: {
                    sse: sseConnections.size,
                    websocket: wsConnections.size
                },
                activityStats: stats,
                recentConflicts: recentConflicts.length,
                uptime: process.uptime()
            }
        });
    }
    catch (error) {
        console.error('Bridge status error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }
});
/**
 * Server-Sent Events Endpoint
 * GET /api/bridge/events?sessionId=abc123&events=command.executed,agent.updated
 */
router.get('/events', (req, res) => {
    const sessionId = req.query.sessionId;
    const eventTypes = req.query.events?.split(',') || ['command.executed'];
    if (!sessionId) {
        res.status(400).json({
            success: false,
            error: { message: 'sessionId is required' }
        });
        return;
    }
    // Set up SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });
    // Store connection
    sseConnections.set(sessionId, res);
    // Subscribe to events
    shared_1.coreManager.syncBridge.subscribe(sessionId, eventTypes);
    // Set up event listener
    const handleSyncEvent = (payload) => {
        try {
            res.write(`data: ${JSON.stringify(payload)}\n\n`);
        }
        catch (error) {
            console.error('SSE write error:', error);
            cleanup();
        }
    };
    shared_1.coreManager.syncBridge.onSync(sessionId, handleSyncEvent);
    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({
        eventType: 'connection.established',
        data: { sessionId, subscribedEvents: eventTypes },
        source: 'BRIDGE',
        timestamp: new Date(),
        sessionId
    })}\n\n`);
    // Cleanup function
    const cleanup = () => {
        sseConnections.delete(sessionId);
        shared_1.coreManager.syncBridge.unsubscribe(sessionId);
        shared_1.coreManager.syncBridge.offSync(sessionId);
        res.end();
    };
    // Handle client disconnect
    req.on('close', cleanup);
    req.on('aborted', cleanup);
    res.on('error', cleanup);
});
/**
 * WebSocket upgrade handler (to be used with express server)
 */
const handleWebSocketUpgrade = (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    const eventTypes = url.searchParams.get('events')?.split(',') || ['command.executed'];
    if (!sessionId) {
        ws.close(1008, 'sessionId is required');
        return;
    }
    // Store connection
    wsConnections.set(sessionId, ws);
    // Subscribe to events
    shared_1.coreManager.syncBridge.subscribe(sessionId, eventTypes);
    // Set up event listener
    const handleSyncEvent = (payload) => {
        try {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(JSON.stringify(payload));
            }
        }
        catch (error) {
            console.error('WebSocket send error:', error);
            cleanup();
        }
    };
    shared_1.coreManager.syncBridge.onSync(sessionId, handleSyncEvent);
    // Send initial connection confirmation
    ws.send(JSON.stringify({
        eventType: 'connection.established',
        data: { sessionId, subscribedEvents: eventTypes },
        source: 'BRIDGE',
        timestamp: new Date(),
        sessionId
    }));
    // Handle incoming messages (command execution requests)
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            if (message.type === 'execute_command') {
                const { commandName, params, userId } = message;
                const options = {
                    params: params || {},
                    source: 'GUI',
                    sessionId,
                    userId
                };
                const result = await shared_1.coreManager.executeCommand(commandName, options);
                ws.send(JSON.stringify({
                    type: 'command_result',
                    requestId: message.requestId,
                    result
                }));
            }
        }
        catch (error) {
            ws.send(JSON.stringify({
                type: 'error',
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error'
                }
            }));
        }
    });
    // Cleanup function
    const cleanup = () => {
        wsConnections.delete(sessionId);
        shared_1.coreManager.syncBridge.unsubscribe(sessionId);
        shared_1.coreManager.syncBridge.offSync(sessionId);
    };
    // Handle disconnect
    ws.on('close', cleanup);
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        cleanup();
    });
};
exports.handleWebSocketUpgrade = handleWebSocketUpgrade;
exports.default = router;
//# sourceMappingURL=bridge.js.map