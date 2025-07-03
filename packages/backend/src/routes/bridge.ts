/**
 * GUI-CLI Integration Bridge API Routes
 * 
 * Provides WebSocket and SSE endpoints for real-time synchronization
 * between GUI and CLI interfaces.
 */

import { Router, Request, Response } from 'express';
import { WebSocket } from 'ws';
import { 
  coreManager, 
  EventPayload, 
  CommandOptions, 
  CoreCommandResult,
  createMagentsError,
  ERROR_CODES
} from '@magents/shared';

const router = Router();

// Store active SSE connections
const sseConnections = new Map<string, Response>();

// Store WebSocket connections
const wsConnections = new Map<string, WebSocket>();

/**
 * Execute Command via REST API
 * POST /api/bridge/execute
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { commandName, params, sessionId, userId } = req.body;

    if (!commandName || !sessionId) {
      throw createMagentsError(ERROR_CODES.INVALID_CONFIG, {
        missingFields: ['commandName', 'sessionId']
      });
    }

    const options: CommandOptions = {
      params: params || {},
      source: 'GUI',
      sessionId,
      userId
    };

    const result = await coreManager.executeCommand(commandName, options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
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
router.get('/commands', (req: Request, res: Response) => {
  try {
    const commands = coreManager.commandRegistry.getAllCommands();
    const commandsByCategory = commands.reduce((acc: any, cmd: any) => {
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
    }, {} as Record<string, any[]>);

    res.json({
      success: true,
      data: {
        commands,
        commandsByCategory,
        totalCommands: commands.length
      }
    });
  } catch (error) {
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
router.get('/activity', (req: Request, res: Response) => {
  try {
    const { source, command, userId, sessionId, since, limit } = req.query;
    
    const filters: any = {};
    if (source) filters.source = source as 'GUI' | 'CLI';
    if (command) filters.command = command as string;
    if (userId) filters.userId = userId as string;
    if (sessionId) filters.sessionId = sessionId as string;
    if (since) filters.since = new Date(since as string);
    if (limit) filters.limit = parseInt(limit as string);

    const logs = coreManager.activityLogger.getLogs(filters);
    const stats = coreManager.activityLogger.getStats();

    res.json({
      success: true,
      data: {
        logs,
        stats,
        totalEntries: logs.length
      }
    });
  } catch (error) {
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
router.get('/conflicts', (req: Request, res: Response) => {
  try {
    const { resolved, severity, since } = req.query;
    
    const filters: any = {};
    if (resolved !== undefined) filters.resolved = resolved === 'true';
    if (severity) filters.severity = severity as 'low' | 'medium' | 'high';
    if (since) filters.since = new Date(since as string);

    const conflicts = coreManager.conflictResolver.getConflicts(filters);

    res.json({
      success: true,
      data: {
        conflicts,
        totalConflicts: conflicts.length,
        unresolvedCount: conflicts.filter((c: any) => !c.autoResolved).length
      }
    });
  } catch (error) {
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
router.get('/status', (req: Request, res: Response) => {
  try {
    const syncBridge = coreManager.syncBridge;
    const subscribers = syncBridge.getSubscribers();
    const lastSyncTime = syncBridge.getLastSyncTime();

    const stats = coreManager.activityLogger.getStats();
    const recentConflicts = coreManager.conflictResolver.getConflicts({
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
  } catch (error) {
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
router.get('/events', (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const eventTypes = (req.query.events as string)?.split(',') || ['command.executed'];

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
  coreManager.syncBridge.subscribe(sessionId, eventTypes as any);

  // Set up event listener
  const handleSyncEvent = (payload: EventPayload) => {
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (error) {
      console.error('SSE write error:', error);
      cleanup();
    }
  };

  coreManager.syncBridge.onSync(sessionId, handleSyncEvent);

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
    coreManager.syncBridge.unsubscribe(sessionId);
    coreManager.syncBridge.offSync(sessionId);
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
export const handleWebSocketUpgrade = (ws: WebSocket, req: any) => {
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
  coreManager.syncBridge.subscribe(sessionId, eventTypes as any);

  // Set up event listener
  const handleSyncEvent = (payload: EventPayload) => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    } catch (error) {
      console.error('WebSocket send error:', error);
      cleanup();
    }
  };

  coreManager.syncBridge.onSync(sessionId, handleSyncEvent);

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
        
        const options: CommandOptions = {
          params: params || {},
          source: 'GUI',
          sessionId,
          userId
        };

        const result = await coreManager.executeCommand(commandName, options);
        
        ws.send(JSON.stringify({
          type: 'command_result',
          requestId: message.requestId,
          result
        }));
      }
    } catch (error) {
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
    coreManager.syncBridge.unsubscribe(sessionId);
    coreManager.syncBridge.offSync(sessionId);
  };

  // Handle disconnect
  ws.on('close', cleanup);
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    cleanup();
  });
};

export default router;