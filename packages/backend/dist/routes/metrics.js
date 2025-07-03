"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsRoutes = exports.broadcastMetrics = void 0;
const express_1 = require("express");
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const router = (0, express_1.Router)();
exports.metricsRoutes = router;
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Store active SSE connections
const sseClients = new Set();
// System metrics collection
const getSystemMetrics = async () => {
    try {
        const cpus = os.cpus();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        // Calculate CPU usage
        const cpuUsage = cpus.reduce((acc, cpu) => {
            const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
            const idle = cpu.times.idle;
            return acc + (100 - (idle / total * 100));
        }, 0) / cpus.length;
        // Calculate memory usage
        const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
        // Get network I/O (simplified - in production you'd want more accurate stats)
        let networkIn = 0;
        let networkOut = 0;
        try {
            // Try to get network stats on macOS
            const { stdout } = await execAsync('netstat -ib | grep -E "^en[0-9]" | awk \'{sum+=$7+$10} END {print sum}\'');
            const totalBytes = parseInt(stdout.trim()) || 0;
            networkIn = totalBytes / 2; // Simplified split
            networkOut = totalBytes / 2;
        }
        catch {
            // Fallback values
            networkIn = Math.random() * 1000000; // Mock data
            networkOut = Math.random() * 1000000;
        }
        return {
            cpu: cpuUsage,
            memory: memoryUsage,
            networkIn,
            networkOut,
            uptime: os.uptime(),
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error collecting system metrics:', error);
        return {
            cpu: 0,
            memory: 0,
            networkIn: 0,
            networkOut: 0,
            uptime: os.uptime(),
            timestamp: new Date().toISOString()
        };
    }
};
// SSE endpoint for real-time metrics
router.get('/', async (req, res) => {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Add client to active connections
    sseClients.add(res);
    // Send initial connection message
    res.write('data: {"connected": true}\n\n');
    // Send metrics every 2 seconds
    const intervalId = setInterval(async () => {
        try {
            const metrics = await getSystemMetrics();
            const data = JSON.stringify(metrics);
            res.write(`event: system-metrics\ndata: ${data}\n\n`);
        }
        catch (error) {
            console.error('Error sending metrics:', error);
        }
    }, 2000);
    // Handle client disconnect
    req.on('close', () => {
        clearInterval(intervalId);
        sseClients.delete(res);
    });
    req.on('error', () => {
        clearInterval(intervalId);
        sseClients.delete(res);
    });
});
// Regular REST endpoint for one-time metrics fetch
router.get('/current', async (req, res) => {
    try {
        const metrics = await getSystemMetrics();
        res.json({
            success: true,
            data: metrics
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to collect system metrics'
        });
    }
});
// Broadcast function for other parts of the app to send metrics updates
const broadcastMetrics = (eventType, data) => {
    const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach(client => {
        try {
            client.write(message);
        }
        catch (error) {
            // Client might be disconnected
            sseClients.delete(client);
        }
    });
};
exports.broadcastMetrics = broadcastMetrics;
//# sourceMappingURL=metrics.js.map