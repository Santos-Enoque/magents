# Docker Default & Task Master Decoupling - Implementation PRD

## Overview
This PRD outlines the implementation plan to ensure Docker is the unambiguous default for Magents agents while properly decoupling Task Master as an optional integration.

## Tasks

### 1. Remove Deprecated tmux-based AgentManager
Clean up all legacy tmux-based agent management code and ensure Docker is the only implementation.

**Subtasks:**
1.1. Delete AgentManager.ts file and all references
1.2. Update all imports from AgentManager to DockerAgentManager
1.3. Remove tmux-specific configuration options from ConfigManager
1.4. Update tests to remove AgentManager references
1.5. Clean up tmux-related types and interfaces

### 2. Update Docker Implementation to be Fully Standalone
Ensure Docker implementation doesn't require Task Master and works independently.

**Subtasks:**
2.1. Create conditional Task Master installation in Dockerfile
2.2. Add build arguments to control Task Master inclusion
2.3. Update docker-entrypoint.sh to handle missing Task Master gracefully
2.4. Create separate Docker images (with and without Task Master)
2.5. Update docker build scripts and documentation

### 3. Decouple Task Master Integration
Create a plugin-like architecture for Task Master integration.

**Subtasks:**
3.1. Create TaskMasterIntegrationService as optional service
3.2. Move all Task Master logic from DockerAgentManager to integration service
3.3. Add feature flags for Task Master functionality
3.4. Update agent creation to work without Task Master
3.5. Create fallback behaviors when Task Master is not available

### 4. Update Configuration System
Add proper configuration options for Task Master as optional feature.

**Subtasks:**
4.1. Add TASKMASTER_AUTO_INSTALL configuration option
4.2. Update default configurations to have Task Master disabled
4.3. Create separate Task Master configuration file structure
4.4. Update ConfigManager to handle Task Master settings separately
4.5. Add configuration migration for existing users

### 5. Update CLI Commands and Flags
Modify CLI to properly handle Task Master as optional.

**Subtasks:**
5.1. Add --no-taskmaster flag to create command
5.2. Add --with-taskmaster flag for explicit enablement
5.3. Update help text to show Docker as default
5.4. Remove tmux-specific command options
5.5. Add taskmaster subcommand for Task Master operations

### 6. Update Mode System
Ensure modes properly reflect Task Master as optional.

**Subtasks:**
6.1. Update simple mode to clearly exclude Task Master
6.2. Make Task Master opt-in for standard mode
6.3. Update mode switching logic
6.4. Update mode documentation and help text
6.5. Add mode upgrade prompts for Task Master

### 7. Update Web UI Components
Ensure the web interface properly handles Task Master as optional.

**Subtasks:**
7.1. Update AgentCreationWizard to show Task Master as optional
7.2. Add Task Master toggle in AdvancedConfigurationStep
7.3. Update PreviewCreateStep to handle no Task Master
7.4. Add Task Master status indicator in agent cards
7.5. Update API calls to handle Task Master availability

### 8. Create Migration Tools
Help users transition from tmux agents to Docker agents.

**Subtasks:**
8.1. Create migration script for existing tmux agents
8.2. Add migration command to CLI
8.3. Create backup mechanism for tmux sessions
8.4. Update documentation for migration process
8.5. Add migration status tracking

### 9. Update Documentation
Comprehensive documentation updates for Docker-first approach.

**Subtasks:**
9.1. Update README to emphasize Docker usage
9.2. Create Docker-specific usage guide
9.3. Update Task Master integration guide
9.4. Create troubleshooting guide for Docker issues
9.5. Update API documentation

### 10. Testing and Validation
Ensure all scenarios work correctly.

**Subtasks:**
10.1. Create tests for Docker-only agents
10.2. Create tests for agents without Task Master
10.3. Update existing tests to use Docker
10.4. Add integration tests for Task Master toggle
10.5. Create performance tests for Docker agents

### 11. Backend Service Updates
Update backend services to handle Task Master as optional.

**Subtasks:**
11.1. Update taskMasterIntegration service to be optional
11.2. Add availability checks before Task Master operations
11.3. Update WebSocket messages for Task Master status
11.4. Create fallback responses when Task Master unavailable
11.5. Update project discovery to work without Task Master

### 12. Error Handling and User Experience
Improve error messages and user guidance.

**Subtasks:**
12.1. Add clear error messages when Docker is not available
12.2. Create helpful messages when Task Master is disabled
12.3. Add setup guides for Docker installation
12.4. Improve error recovery mechanisms
12.5. Add diagnostic commands for troubleshooting