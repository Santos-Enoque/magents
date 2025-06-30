# 🏗️ Magents Architecture

## Overview

Magents is designed as a modular system that orchestrates multiple Claude Code instances through git worktrees and process isolation. This document explains the architecture and design decisions.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                            │
│  (Commander.js - User Interface & Command Parsing)           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  AgentManager    │  ProjectManager  │  PortManager          │
│  GitService      │  DockerService   │  SettingsManager      │
│  TmuxService     │  ConfigManager   │  EnvironmentDetector  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Storage Layer                           │
├─────────────────────────────────────────────────────────────┤
│  ~/.magents/             │  ~/.magents-config               │
│  ├── projects/           │  (Global configuration)          │
│  ├── port-allocations    │                                  │
│  └── agent-*.json        │                                  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. AgentManager

The central orchestrator for agent lifecycle management.

**Responsibilities:**
- Creates git worktrees for branch isolation
- Manages tmux/Docker sessions
- Injects agent context into CLAUDE.md
- Tracks agent status and metadata

**Key Methods:**
```typescript
createAgent(options: CreateAgentOptions): Promise<CommandResult<CreateAgentResult>>
attachToAgent(agentId: string): Promise<CommandResult>
stopAgent(agentId: string, removeWorktree?: boolean): Promise<CommandResult>
```

### 2. GitService

Handles all git operations for worktree management.

**Responsibilities:**
- Creates and removes git worktrees
- Validates branch names
- Manages branch creation and switching
- Ensures repository state consistency

### 3. TmuxService

Manages terminal multiplexer sessions for local agents.

**Responsibilities:**
- Creates tmux sessions with multiple windows
- Injects environment variables
- Handles session attachment/detachment
- Manages Claude Code process lifecycle

### 4. DockerService

Provides container-based isolation for agents.

**Responsibilities:**
- Generates docker-compose configurations
- Manages container lifecycle
- Handles volume mounting for settings
- Implements network isolation

### 5. ProjectManager

Implements hierarchical organization of agents.

**Responsibilities:**
- Groups agents by project
- Manages project-level resources
- Tracks project metadata
- Enables multi-repository support

### 6. PortManager

Intelligent port allocation and conflict detection.

**Responsibilities:**
- Tracks port allocations
- Detects ports from project configuration
- Prevents port conflicts
- Manages port ranges per project

### 7. SettingsManager

Synchronizes Claude settings across agents.

**Responsibilities:**
- Detects Claude configuration files
- Implements settings inheritance
- Manages MCP configurations
- Handles secure credential propagation

### 8. EnvironmentDetector

Adapts behavior based on runtime environment.

**Responsibilities:**
- Detects Codespaces/Gitpod/remote environments
- Provides environment-specific configurations
- Manages resource limits
- Handles permission flags

## Data Flow

### Agent Creation Flow

```
User Command → CLI Parser → AgentManager
                                ↓
                          GitService.prepareBranch()
                                ↓
                          GitService.createWorktree()
                                ↓
                          SettingsManager.syncSettings()
                                ↓
                    DockerService.createContainer() OR
                    TmuxService.createSession()
                                ↓
                          ConfigManager.saveAgentData()
```

### Context Injection

```
CreateAgentOptions {
  environment: { ... }    →  AgentManager
  context: { ... }        →  generateAgentContextHeader()
}                         →  Prepend to CLAUDE.md
                         →  Agent receives context
```

## Storage Schema

### Agent Record
```json
{
  "id": "auth-agent",
  "projectId": "project-123",
  "branch": "feature/authentication",
  "worktreePath": "/Users/dev/project-auth-agent",
  "tmuxSession": "magent-auth-agent",
  "environment": {
    "PROJECT_ROOT": "/workspace",
    "AGENT_TASK": "Implement authentication"
  },
  "context": {
    "task": "Implement OAuth2 authentication",
    "services": {
      "api": "http://localhost:4000"
    },
    "boundaries": ["Do not modify user model"]
  },
  "useDocker": false,
  "portRange": "3000-3010"
}
```

### Project Record
```json
{
  "id": "project-123",
  "name": "My App",
  "path": "/Users/dev/my-app",
  "agents": ["auth-agent", "ui-agent"],
  "portRange": [3000, 3020],
  "status": "ACTIVE",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

## Design Patterns

### 1. Singleton Pattern
- `ConfigManager` ensures single source of truth for configuration

### 2. Service Pattern
- Each service encapsulates domain-specific logic
- Services are loosely coupled and independently testable

### 3. Command Pattern
- CLI commands map to service method calls
- Enables easy extension and testing

### 4. Factory Pattern
- Docker compose file generation
- Agent context header generation

## Integration Points

### Claude Code Integration
- Launches Claude Code in controlled environments
- Passes context through CLAUDE.md
- Manages Claude settings synchronization

### Git Integration
- Uses git worktrees for branch isolation
- Preserves git history and state
- Enables parallel development

### Docker Integration
- Optional container-based isolation
- Network and resource isolation
- Consistent development environments

## Security Considerations

1. **Credential Management**
   - Settings are copied, not linked
   - Sensitive data stays in user space
   - No credentials in git repositories

2. **Process Isolation**
   - Each agent runs in separate process
   - Docker provides additional isolation
   - Resource limits prevent DoS

3. **File System Boundaries**
   - Agents work in separate directories
   - Context injection defines boundaries
   - No cross-agent file access

## Performance Considerations

1. **Lazy Loading**
   - Services instantiated on demand
   - Configuration cached after first load

2. **Parallel Operations**
   - Agents run independently
   - No blocking between agents
   - Efficient resource utilization

3. **Resource Management**
   - Configurable agent limits
   - Port range allocation
   - Docker resource constraints

## Future Architecture Enhancements

1. **Plugin System**
   - Custom commands
   - Service extensions
   - Hook system for lifecycle events

2. **Remote Agent Support**
   - SSH-based agents
   - Cloud provider integration
   - Distributed agent management

3. **Enhanced Monitoring**
   - Agent health checks
   - Performance metrics
   - Resource usage tracking

4. **Advanced Orchestration**
   - Agent dependencies
   - Workflow automation
   - Integration with CI/CD