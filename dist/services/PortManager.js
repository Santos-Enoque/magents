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
exports.PortManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const ConfigManager_1 = require("../config/ConfigManager");
class PortManager {
    constructor() {
        this.MIN_PORT = 3000;
        this.MAX_PORT = 9999;
        this.configManager = ConfigManager_1.ConfigManager.getInstance();
        this.allocationsFile = path.join(this.configManager.getAgentsDir(), 'port-allocations.json');
    }
    allocatePort(projectId, service = 'web', preferred) {
        const allocations = this.loadAllocations();
        // Check if preferred port is available
        if (preferred && this.isPortAvailable(preferred, allocations)) {
            const allocation = {
                projectId,
                port: preferred,
                service,
                allocatedAt: new Date()
            };
            allocations.push(allocation);
            this.saveAllocations(allocations);
            return preferred;
        }
        // Find next available port
        const startPort = preferred || this.MIN_PORT;
        for (let port = startPort; port <= this.MAX_PORT; port++) {
            if (this.isPortAvailable(port, allocations)) {
                const allocation = {
                    projectId,
                    port,
                    service,
                    allocatedAt: new Date()
                };
                allocations.push(allocation);
                this.saveAllocations(allocations);
                return port;
            }
        }
        throw new Error(`No available ports in range ${startPort}-${this.MAX_PORT}`);
    }
    allocateRange(projectId, count, startPort) {
        const allocations = this.loadAllocations();
        const start = startPort || this.MIN_PORT;
        // Find a continuous range of available ports
        for (let port = start; port <= this.MAX_PORT - count; port++) {
            let available = true;
            // Check if the entire range is available
            for (let i = 0; i < count; i++) {
                if (!this.isPortAvailable(port + i, allocations)) {
                    available = false;
                    break;
                }
            }
            if (available) {
                // Allocate the entire range
                for (let i = 0; i < count; i++) {
                    const allocation = {
                        projectId,
                        port: port + i,
                        service: `service-${i}`,
                        allocatedAt: new Date()
                    };
                    allocations.push(allocation);
                }
                this.saveAllocations(allocations);
                return [port, port + count - 1];
            }
        }
        throw new Error(`No available port range of ${count} ports`);
    }
    releaseProjectPorts(projectId) {
        const allocations = this.loadAllocations();
        const filtered = allocations.filter(a => a.projectId !== projectId);
        this.saveAllocations(filtered);
    }
    releaseAgentPorts(agentId) {
        const allocations = this.loadAllocations();
        const filtered = allocations.filter(a => a.agentId !== agentId);
        this.saveAllocations(filtered);
    }
    getProjectPorts(projectId) {
        const allocations = this.loadAllocations();
        return allocations.filter(a => a.projectId === projectId);
    }
    getAllocatedPorts() {
        return this.loadAllocations();
    }
    isPortInUse(port) {
        try {
            // Check if port is actually in use on the system
            const result = (0, child_process_1.execSync)(`lsof -i :${port}`, { encoding: 'utf8', stdio: 'pipe' });
            return result.trim().length > 0;
        }
        catch {
            // Port is not in use
            return false;
        }
    }
    detectProjectPorts(projectPath) {
        const ports = {};
        try {
            // Check package.json for common port configurations
            const packageJsonPath = path.join(projectPath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                // Look for port configurations in scripts
                if (packageJson.scripts) {
                    for (const [name, script] of Object.entries(packageJson.scripts)) {
                        if (typeof script === 'string') {
                            const portMatch = script.match(/--port[=\s]+(\d+)/);
                            if (portMatch) {
                                ports[name] = parseInt(portMatch[1], 10);
                            }
                        }
                    }
                }
            }
            // Check for common config files
            const configFiles = [
                'next.config.js',
                'vite.config.js',
                'webpack.config.js',
                '.env',
                '.env.local'
            ];
            for (const configFile of configFiles) {
                const configPath = path.join(projectPath, configFile);
                if (fs.existsSync(configPath)) {
                    const content = fs.readFileSync(configPath, 'utf8');
                    const portMatches = content.match(/PORT[=:\s]+(\d+)/gi);
                    if (portMatches) {
                        portMatches.forEach((match, index) => {
                            const port = parseInt(match.replace(/PORT[=:\s]+/i, ''), 10);
                            if (port) {
                                ports[`config-${index}`] = port;
                            }
                        });
                    }
                }
            }
        }
        catch (error) {
            console.warn('Error detecting ports:', error);
        }
        return ports;
    }
    isPortAvailable(port, allocations) {
        // Check if port is allocated in our system
        const allocated = allocations.some(a => a.port === port);
        if (allocated) {
            return false;
        }
        // Check if port is actually in use on the system
        return !this.isPortInUse(port);
    }
    loadAllocations() {
        if (!fs.existsSync(this.allocationsFile)) {
            return [];
        }
        try {
            const data = fs.readFileSync(this.allocationsFile, 'utf8');
            return JSON.parse(data);
        }
        catch (error) {
            console.warn('Error loading port allocations:', error);
            return [];
        }
    }
    saveAllocations(allocations) {
        try {
            fs.writeFileSync(this.allocationsFile, JSON.stringify(allocations, null, 2));
        }
        catch (error) {
            console.error('Error saving port allocations:', error);
        }
    }
}
exports.PortManager = PortManager;
//# sourceMappingURL=PortManager.js.map