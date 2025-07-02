#!/usr/bin/env node
/**
 * Health check server for magents Docker containers
 * Provides HTTP endpoint for Docker HEALTHCHECK
 */

const http = require('http');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const PORT = process.env.HEALTH_PORT || 3999;
const HEALTH_INTERVAL = process.env.HEALTH_INTERVAL || 30000; // 30 seconds

// Health status tracking
let healthStatus = {
    status: 'starting',
    timestamp: new Date().toISOString(),
    checks: {
        system: 'unknown',
        tmux: 'unknown',
        taskMaster: 'unknown',
        claudeBridge: 'unknown',
        workspace: 'unknown'
    },
    errors: []
};

// Perform health checks
async function performHealthChecks() {
    const newStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {},
        errors: []
    };

    try {
        // Check 1: System resources
        try {
            const { stdout } = await execAsync('df -h /workspace | tail -1 | awk \'{print $5}\'');
            const diskUsage = parseInt(stdout.trim().replace('%', ''));
            newStatus.checks.system = diskUsage < 90 ? 'healthy' : 'warning';
            if (diskUsage >= 90) {
                newStatus.errors.push(`Disk usage high: ${diskUsage}%`);
            }
        } catch (e) {
            newStatus.checks.system = 'error';
            newStatus.errors.push('Failed to check system resources');
        }

        // Check 2: Tmux sessions
        try {
            await execAsync('tmux list-sessions 2>/dev/null || true');
            newStatus.checks.tmux = 'healthy';
        } catch (e) {
            newStatus.checks.tmux = 'warning'; // OK if no sessions
        }

        // Check 3: Task Master
        try {
            const { stdout } = await execAsync('task-master --version');
            newStatus.checks.taskMaster = stdout.trim() ? 'healthy' : 'error';
        } catch (e) {
            newStatus.checks.taskMaster = 'error';
            newStatus.errors.push('Task Master not accessible');
        }

        // Check 4: Claude Bridge
        try {
            const socketPath = process.env.CLAUDE_BRIDGE_SOCKET || '/host/claude-bridge.sock';
            const { stdout } = await execAsync(`test -S ${socketPath} && echo "exists" || echo "missing"`);
            newStatus.checks.claudeBridge = stdout.trim() === 'exists' ? 'healthy' : 'warning';
            if (stdout.trim() !== 'exists') {
                newStatus.errors.push('Claude bridge socket not connected');
            }
        } catch (e) {
            newStatus.checks.claudeBridge = 'warning';
        }

        // Check 5: Workspace accessibility
        try {
            await execAsync('test -d /workspace && test -w /workspace');
            newStatus.checks.workspace = 'healthy';
        } catch (e) {
            newStatus.checks.workspace = 'error';
            newStatus.errors.push('Workspace not accessible or writable');
        }

        // Determine overall status
        const checkValues = Object.values(newStatus.checks);
        if (checkValues.includes('error')) {
            newStatus.status = 'unhealthy';
        } else if (checkValues.includes('warning')) {
            newStatus.status = 'degraded';
        } else {
            newStatus.status = 'healthy';
        }

    } catch (error) {
        newStatus.status = 'error';
        newStatus.errors.push(`Health check failed: ${error.message}`);
    }

    healthStatus = newStatus;
    return newStatus;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    if (req.url === '/health') {
        // Return current health status
        const statusCode = healthStatus.status === 'healthy' ? 200 : 
                          healthStatus.status === 'degraded' ? 200 : 503;
        
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(healthStatus, null, 2));
    } else if (req.url === '/ready') {
        // Simple readiness check
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ready');
    } else if (req.url === '/metrics') {
        // Prometheus-style metrics
        const metrics = [
            `# HELP magents_health_status Agent health status (1=healthy, 0=unhealthy)`,
            `# TYPE magents_health_status gauge`,
            `magents_health_status ${healthStatus.status === 'healthy' ? 1 : 0}`,
            `# HELP magents_health_checks Individual health check status`,
            `# TYPE magents_health_checks gauge`
        ];
        
        for (const [check, status] of Object.entries(healthStatus.checks)) {
            const value = status === 'healthy' ? 1 : status === 'warning' ? 0.5 : 0;
            metrics.push(`magents_health_checks{check="${check}"} ${value}`);
        }
        
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(metrics.join('\n'));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Health check server listening on port ${PORT}`);
    console.log(`Endpoints: /health, /ready, /metrics`);
    
    // Perform initial health check
    performHealthChecks();
    
    // Schedule periodic health checks
    setInterval(performHealthChecks, HEALTH_INTERVAL);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down health server...');
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Shutting down health server...');
    server.close(() => {
        process.exit(0);
    });
});