# Magents Simplification - Product Requirements Document

## Overview
Transform magents into a streamlined, Docker-first multi-agent development platform that seamlessly integrates Task Master while hiding complexity from basic users. The goal is to create a progressive experience where users can start simple and gradually access advanced features as needed.

## Core Requirements

### 1. Simplified Installation and Setup
- **One-line installation**: `npm install -g magents` should install everything needed
- **Automatic Task Master installation**: Bundle Task Master as a dependency
- **Docker verification**: Check for Docker on first run, provide clear installation instructions if missing
- **Zero-config start**: Users should be able to create their first agent without any configuration

### 2. Docker-First Agent Runtime
- **Containerized agents**: Each agent runs in its own Docker container
- **Pre-built images**: Provide magents/agent:latest with all tools pre-installed (tmux, git, task-master, claude-code bridge)
- **Volume mapping**: Automatic mapping of project files and shared configuration
- **Resource isolation**: Docker handles resource limits automatically
- **Local fallback**: Support non-Docker mode for advanced users only

### 3. Task Master Integration Layer
- **Transparent wrapper**: Hide Task Master complexity behind simple magents commands
- **Auto-analysis**: Automatically generate PRD from codebase structure
- **Smart task generation**: Create tasks based on project type detection
- **Simplified task view**: Present tasks in a user-friendly format
- **Progressive task management**: Basic users see simple task list, advanced users can access full Task Master features

### 4. Unified Command Interface
- **Three core commands**:
  - `magents create <name>`: Create and start agent with defaults
  - `magents assign`: Auto-analyze project and generate tasks
  - `magents start`: Launch agent(s) in Docker
- **Progressive options**: Add complexity through optional flags
- **GUI-CLI parity**: Same operations available in both interfaces

### 5. Simplified GUI
- **Single-page dashboard**: All core functionality on one screen
- **Progressive disclosure**: Advanced features hidden by default
- **Real-time updates**: WebSocket integration for live status
- **Quick actions**: One-click agent creation and task assignment
- **Integrated terminal**: Built-in terminal view for each agent

### 6. Unified Data Model
- **Single source of truth**: One data store shared between CLI and GUI
- **Automatic sync**: Changes in CLI immediately reflected in GUI
- **Simple schema**: Flattened structure for agent and task data
- **Migration tool**: Convert existing complex data to new format

### 7. Smart Defaults and Auto-Configuration
- **Project type detection**: Automatically detect Node.js, Python, etc.
- **Task generation**: Create relevant tasks based on project structure
- **Port allocation**: Automatic port assignment without user input
- **API key management**: Centralized key storage with secure access
- **MCP auto-detection**: Automatically find and configure MCP servers

### 8. Progressive Complexity Modes
- **Simple mode**: Just agent name required
- **Standard mode**: Basic configuration options
- **Advanced mode**: Full access to Task Master, MCP, resource controls
- **Mode switching**: Easy transition between modes

### 9. Cloud-Ready Architecture
- **Portable containers**: Same containers run locally or in cloud
- **State persistence**: Agent state saved and restorable
- **Remote access**: Access agents running in cloud
- **Deployment command**: `magents deploy --cloud`

### 10. Developer Experience Improvements
- **Better error messages**: Clear, actionable error messages
- **Interactive setup**: Guided setup for first-time users
- **Documentation**: Built-in help and examples
- **Migration assistant**: Help users migrate from current version

## Technical Requirements

### Architecture Changes
1. **Monorepo simplification**:
   - Merge shared types into core package
   - Reduce to 4 packages: core, cli, gui, runtime
   - Share business logic between CLI and GUI

2. **API consolidation**:
   - Single REST API with SSE for real-time updates
   - Remove redundant WebSocket implementation
   - GraphQL consideration for future

3. **Docker runtime**:
   - Base image with all dependencies
   - Layer caching for fast startup
   - Development and production variants

4. **Task Master wrapper**:
   - High-level API hiding Task Master complexity
   - Automatic command translation
   - Result simplification

5. **Configuration management**:
   - Single configuration file format
   - Environment variable support
   - Secure secrets handling

## Implementation Phases

### Phase 1: Core Simplification (Week 1-2)
- Implement Docker runtime
- Create Task Master wrapper
- Build unified data model
- Implement three core commands

### Phase 2: GUI Streamlining (Week 3-4)
- Redesign single-page dashboard
- Implement progressive disclosure
- Add quick actions
- Integrate with new CLI

### Phase 3: Smart Features (Week 5-6)
- Project type detection
- Automatic task generation
- Auto-configuration
- Error improvement

### Phase 4: Cloud Integration (Week 7-8)
- Cloud deployment support
- State persistence
- Remote access
- Production readiness

## Success Metrics
- Time to first agent: < 1 minute
- Commands to create agent: 1-3 maximum
- User satisfaction: 90%+ find it easy to use
- Performance: Agent startup < 10 seconds
- Reliability: 99.9% uptime for running agents

## Constraints
- Must maintain backward compatibility mode
- Cannot break existing Task Master integration
- Must support both Docker and non-Docker modes
- Should not require internet connection for basic operations

## Future Considerations
- Plugin system for extending functionality
- Marketplace for agent templates
- Team collaboration features
- Advanced monitoring and analytics
- AI-powered agent suggestions

## Detailed Feature Breakdown

### Agent Creation Simplification
- **Before**: 5-step wizard with 20+ configuration options
- **After**: Name input + optional advanced settings
- **Default configuration**:
  ```yaml
  runtime: docker
  tasks: auto-generate
  resources: docker-defaults
  tools: standard-set
  ```

### Task Management Simplification
- **Before**: Complex Task Master commands
- **After**: 
  ```bash
  magents assign              # Auto-analyze and create tasks
  magents tasks               # List all tasks
  magents complete <task-id>  # Mark task complete
  ```

### GUI Simplification
- **Before**: 10+ pages with complex navigation
- **After**: Single dashboard with expandable sections
  - Agent cards with status
  - Quick action buttons
  - Collapsible task list
  - Inline terminal

### Configuration Simplification
- **Before**: Multiple config files and formats
- **After**: Single .magents/config.yaml with sensible defaults
- **Environment inheritance**: Global → Project → Agent

### Error Message Examples
- **Before**: "Error: ENOENT worktree path undefined"
- **After**: "Agent workspace not found. Run 'magents create <name>' first."

### Progressive Disclosure Example
```bash
# Simple (most users)
magents create my-agent

# Standard (some configuration)
magents create my-agent --tasks=./requirements.md

# Advanced (full control)
magents create my-agent --mode=advanced --config=custom.yaml
```

This PRD provides a clear roadmap for simplifying magents while maintaining its power for advanced users. The focus is on making the tool approachable for newcomers while preserving flexibility for power users.