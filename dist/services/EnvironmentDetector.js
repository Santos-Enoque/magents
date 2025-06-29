"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentDetector = void 0;
class EnvironmentDetector {
    isCodespaces() {
        return !!(process.env.CODESPACES ||
            process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN);
    }
    isGitpod() {
        return !!(process.env.GITPOD_WORKSPACE_ID ||
            process.env.GITPOD_WORKSPACE_URL);
    }
    isRemoteDocker() {
        return !!(process.env.DOCKER_HOST ||
            process.env.REMOTE_CONTAINERS);
    }
    isContainerEnvironment() {
        // Check if running inside a container
        try {
            const fs = require('fs');
            const cgroupContent = fs.readFileSync('/proc/1/cgroup', 'utf8');
            return cgroupContent.includes('docker') || cgroupContent.includes('containerd');
        }
        catch {
            return false;
        }
    }
    getEnvironmentConfig() {
        if (this.isCodespaces()) {
            return {
                type: 'codespaces',
                isRemote: true,
                supportsDocker: true,
                claudeFlags: ['--dangerously-skip-permissions'],
                resourceLimits: {
                    maxAgents: 3,
                    memoryLimit: '2g',
                    cpuLimit: '1.0'
                }
            };
        }
        if (this.isGitpod()) {
            return {
                type: 'gitpod',
                isRemote: true,
                supportsDocker: true,
                claudeFlags: ['--dangerously-skip-permissions'],
                resourceLimits: {
                    maxAgents: 2,
                    memoryLimit: '1g',
                    cpuLimit: '0.5'
                }
            };
        }
        if (this.isRemoteDocker() || this.isContainerEnvironment()) {
            return {
                type: 'remote',
                isRemote: true,
                supportsDocker: true,
                claudeFlags: [],
                resourceLimits: {
                    maxAgents: 3
                }
            };
        }
        // Local environment
        return {
            type: 'local',
            isRemote: false,
            supportsDocker: true,
            claudeFlags: [],
            resourceLimits: {
                maxAgents: 5
            }
        };
    }
    getCodespacesConfig() {
        if (!this.isCodespaces()) {
            return null;
        }
        return {
            name: process.env.CODESPACE_NAME || 'unknown',
            machineType: process.env.CODESPACE_MACHINE || 'unknown',
            region: process.env.CODESPACE_REGION || 'unknown',
            portForwardingDomain: process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
        };
    }
    generateClaudeCommand(baseCommand = 'claude') {
        const config = this.getEnvironmentConfig();
        if (config.claudeFlags.length > 0) {
            return `${baseCommand} ${config.claudeFlags.join(' ')}`;
        }
        return baseCommand;
    }
    shouldUsePermissionsFlag() {
        const config = this.getEnvironmentConfig();
        return config.claudeFlags.includes('--dangerously-skip-permissions');
    }
    getOptimizedDockerConfig() {
        const config = this.getEnvironmentConfig();
        if (!config.isRemote) {
            return {};
        }
        return {
            // Use smaller base images for remote environments
            baseImage: 'node:20-alpine',
            // Resource limits for cloud environments
            resources: {
                limits: {
                    memory: config.resourceLimits.memoryLimit || '1g',
                    cpus: config.resourceLimits.cpuLimit || '1.0'
                },
                reservations: {
                    memory: '256m',
                    cpus: '0.25'
                }
            },
            // Optimize for network latency
            buildOptions: {
                cache: true,
                parallel: false
            },
            // Environment-specific settings
            environment: {
                NODE_ENV: 'development',
                REMOTE_ENV: config.type
            }
        };
    }
    printEnvironmentInfo() {
        const config = this.getEnvironmentConfig();
        console.log(`Environment: ${config.type}`);
        console.log(`Remote: ${config.isRemote ? 'Yes' : 'No'}`);
        console.log(`Docker Support: ${config.supportsDocker ? 'Yes' : 'No'}`);
        console.log(`Max Agents: ${config.resourceLimits.maxAgents}`);
        if (config.claudeFlags.length > 0) {
            console.log(`Claude Flags: ${config.claudeFlags.join(' ')}`);
        }
        if (this.isCodespaces()) {
            const codespacesConfig = this.getCodespacesConfig();
            console.log(`Codespace: ${codespacesConfig.name}`);
            console.log(`Machine: ${codespacesConfig.machineType}`);
        }
    }
}
exports.EnvironmentDetector = EnvironmentDetector;
//# sourceMappingURL=EnvironmentDetector.js.map