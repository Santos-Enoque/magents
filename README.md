# 🤖 Magents - Multi-Agent Claude Code Workflow Manager

[![npm version](https://img.shields.io/npm/v/magents.svg)](https://www.npmjs.com/package/magents)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Issues](https://img.shields.io/github/issues/Santos-Enoque/magents.svg)](https://github.com/Santos-Enoque/magents/issues)

Magents is a powerful CLI tool for managing multiple Claude Code instances with git worktrees, enabling parallel AI-assisted development across different branches in isolated environments.

## 🚀 Why Magents?

While Claude Code has built-in subagents capabilities for parallel task execution, **Magents provides a complementary layer of orchestration** that focuses on:

1. **Branch-Level Isolation**: Each agent works on a separate git branch with its own worktree
2. **Persistent Sessions**: Agents run in tmux/Docker containers that persist across Claude sessions
3. **Resource Management**: Smart port allocation, Docker isolation, and environment-specific optimizations
4. **Project Organization**: Hierarchical project management with multi-repository support
5. **Configuration Sync**: Automatic Claude settings and MCP propagation across agents

### Magents vs Claude Subagents

| Feature | Claude Subagents | Magents |
|---------|-----------------|----------|
| **Scope** | Task-level parallelism | Branch-level parallelism |
| **Persistence** | Ephemeral (per conversation) | Persistent (tmux/Docker) |
| **Git Integration** | Limited | Full worktree isolation |
| **Resource Isolation** | Shared context | Separate processes/containers |
| **Use Case** | Parallel research/verification | Parallel feature development |

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Features](#features)
- [Commands Reference](#commands-reference)
- [Advanced Usage](#advanced-usage)
- [Integration with Claude Subagents](#integration-with-claude-subagents)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🛠️ Installation

### Prerequisites

- Node.js 16+ 
- Git 2.20+ (for worktree support)
- tmux (for local sessions)
- Docker & docker-compose (optional, for container isolation)
- Claude Code CLI installed

### Install from npm

```bash
npm install -g magents
```

### Install from source

```bash
git clone https://github.com/Santos-Enoque/magents.git
cd magents
npm install
npm run build
npm link
```

### Initialize Configuration

```bash
magents init
```

## 🏃 Quick Start

### 1. Create Your First Agent

```bash
# Create an agent for a new feature branch
magents create feature/authentication auth-agent

# The agent will:
# - Create a git worktree for the branch
# - Start a tmux session with Claude Code
# - Copy your Claude settings
# - Set up isolation boundaries
```

### 2. Attach to the Agent

```bash
# Attach to the agent's tmux session
magents attach auth-agent

# You'll see 3 tmux windows:
# - main: Your terminal
# - claude: Claude Code running
# - git: Git operations
```

### 3. List Active Agents

```bash
magents list

# Output:
# Active Claude Code agents:
# 
#   auth-agent         feature/authentication    RUNNING    /Users/you/project-auth-agent
#     Task: Implement user authentication system
```

## 🎯 Core Concepts

### Agents

An **agent** is an isolated Claude Code instance working on a specific branch:
- Has its own git worktree (no switching branches needed)
- Runs in a persistent tmux session or Docker container
- Receives context about its task and boundaries
- Can have environment variables and port allocations

### Projects

A **project** groups related agents and provides:
- Shared configuration and resources
- Port range management
- Docker network isolation (optional)
- Centralized agent management

### Environment Context

Each agent receives context through an enhanced `CLAUDE.md` file:
```markdown
# AGENT CONTEXT
**Agent ID:** auth-agent
**Branch:** feature/authentication
**Task:** Implement user authentication system

## Environment
- **Project Root:** /workspace
- **Allowed Ports:** 3000-3010

## Services
- **web:** http://localhost:3000
- **api:** http://localhost:4000

## Boundaries
- Do not modify database schemas
- Stay focused on authentication features
```

## ✨ Features

### 1. 🔒 Agent Isolation & Context

Prevent agents from interfering with each other:

```bash
# Create agent with specific context
magents create feature/auth auth-agent \
  --task "Implement OAuth2 authentication" \
  --env "API_PORT=4000" \
  --service "auth=http://localhost:4000" \
  --boundary "Do not modify user model"
```

### 2. 🐳 Docker-based Isolation

Complete project isolation with Docker:

```bash
# Create agent with Docker container
magents create feature/payment payment-agent \
  --docker \
  --ports "5000-5010:5000-5010" \
  --isolation strict
```

Benefits:
- No port conflicts between projects
- Resource limits per container
- Network isolation
- Easy cleanup

### 3. 📊 Project Management

Organize agents hierarchically:

```bash
# Create a project
magents project create /path/to/my-app \
  --name "My App" \
  --ports 3000-3010

# List projects
magents project list

# Create agents within projects
magents create feature/ui --project project-123
```

### 4. 🔌 Smart Port Management

Automatic port allocation and conflict detection:

```bash
# Detect ports used in project
magents ports --detect /path/to/project

# Allocate ports for a project
magents ports --allocate 5 --project project-123

# List all allocated ports
magents ports --list
```

### 5. ⚙️ Settings & MCP Sync

Synchronize Claude settings across agents:

```bash
# List Claude configuration files
magents settings --list

# Sync settings to an agent
magents settings --sync /path/to/agent-worktree

# Settings hierarchy:
# ~/.claude/ (global)
#   └── project/.magents/claude/ (project)
#       └── worktree/.claude/ (agent)
```

### 6. ☁️ Remote Development Support

Optimized for GitHub Codespaces and cloud environments:

```bash
# Check environment
magents env

# Output:
# Environment: codespaces
# Remote: Yes
# Claude Flags: --dangerously-skip-permissions
# Max Agents: 3

# Get optimized Claude command
magents env --claude-command
```

## 📚 Commands Reference

### Agent Management

```bash
# Create agent
magents create <branch> [agent-id] [options]
  --docker                 # Use Docker isolation
  --ports <range>         # Port range (e.g., "3000-3010:3000-3010")
  --env <key=value>       # Set environment variable
  --task <description>    # Task description
  --service <name=url>    # Service endpoint
  --boundary <rule>       # Add boundary rule

# List agents
magents list

# Attach to agent
magents attach <agent-id>

# Stop agent
magents stop <agent-id>
  -r, --remove-worktree   # Also remove git worktree

# Cleanup all agents
magents cleanup
  -r, --remove-worktrees  # Also remove all worktrees
```

### Project Management

```bash
# Create project
magents project create <path> [options]
  -n, --name <name>       # Project name
  -p, --ports <start-end> # Port range

# List projects
magents project list

# Stop project
magents project stop <project-id>

# Remove project
magents project remove <project-id>
```

### Port Management

```bash
# Port operations
magents ports [options]
  -l, --list              # List allocated ports
  -d, --detect <path>     # Detect ports in project
  -a, --allocate <count>  # Allocate port range
  --project <id>          # Project ID for operations
```

### Settings Management

```bash
# Settings operations
magents settings [options]
  -l, --list              # List Claude config files
  -s, --sync <path>       # Sync settings to agent
```

### Configuration

```bash
# Initialize configuration
magents init

# View/edit configuration
magents config
  -e, --edit              # Edit configuration interactively
```

## 🚀 Advanced Usage

### Integration with Claude Subagents

Magents can be enhanced by leveraging Claude's built-in subagents feature for even more powerful workflows:

#### 1. **Orchestration Pattern**: Use Magents + Subagents

```bash
# Create a main orchestrator agent
magents create main orchestrator \
  --task "Coordinate feature development across services"

# Create service-specific agents
magents create feature/api api-agent \
  --task "Implement API endpoints"

magents create feature/frontend frontend-agent \
  --task "Build UI components"
```

Then, within the orchestrator agent, use Claude's subagents to:
- Verify implementations across agents
- Gather status from multiple worktrees
- Coordinate integration tests

#### 2. **Verification Pattern**: Cross-Agent Validation

When working in one agent, spawn subagents to:
```markdown
Please use a subagent to check if the API implementation in 
the api-agent worktree matches the expected interface we're 
using in the frontend.
```

#### 3. **Research Pattern**: Parallel Exploration

```bash
# Create exploration agents for different approaches
magents create experiment/approach-1 exp1 \
  --task "Explore GraphQL implementation"

magents create experiment/approach-2 exp2 \
  --task "Explore REST API implementation"
```

Use subagents within each to research and compare approaches.

### Docker Compose Integration

For complex projects with multiple services:

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
  
  api:
    build: ./api
    ports:
      - "4000:4000"
```

```bash
# Create agents for each service
magents create feature/web web-agent \
  --docker \
  --service "web=http://localhost:3000"

magents create feature/api api-agent \
  --docker \
  --service "api=http://localhost:4000"
```

### CI/CD Integration

```yaml
# .github/workflows/magents.yml
name: Multi-Agent Testing
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Magents
        run: |
          npm install -g magents
          magents init
      
      - name: Create Test Agents
        run: |
          magents create test/unit unit-agent \
            --task "Run unit tests"
          
          magents create test/integration int-agent \
            --task "Run integration tests"
```

## 🏆 Best Practices

### 1. Task Clarity

Always provide clear task descriptions:
```bash
# Good
magents create feature/auth auth-agent \
  --task "Implement JWT authentication with refresh tokens"

# Too vague
magents create feature/auth auth-agent \
  --task "Do auth stuff"
```

### 2. Resource Planning

Allocate resources appropriately:
```bash
# For microservices project
magents project create /path/to/microservices \
  --ports 3000-3020  # 20 ports for multiple services

# For simple project  
magents project create /path/to/simple-app \
  --ports 3000-3005  # 5 ports sufficient
```

### 3. Combining with Subagents

Use Magents for branch-level parallelism and Claude subagents for task-level:
- **Magents**: Different features on different branches
- **Subagents**: Parallel research, verification, or sub-tasks within a feature

### 4. Environment Variables

Use environment variables for configuration:
```bash
magents create feature/api api-agent \
  --env "DATABASE_URL=postgresql://localhost/dev" \
  --env "REDIS_URL=redis://localhost:6379" \
  --env "NODE_ENV=development"
```

### 5. Clean Shutdown

Always clean up properly:
```bash
# Stop individual agent
magents stop auth-agent --remove-worktree

# Or cleanup everything
magents cleanup --remove-worktrees
```

## 🔧 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using a port
magents ports --list
lsof -i :3000

# Allocate different range
magents create feature/web web-agent \
  --ports "5000-5010:5000-5010"
```

#### Docker Issues
```bash
# Check Docker daemon
docker ps

# Reset Docker state
docker system prune -a

# Use local mode instead
magents create feature/test test-agent  # No --docker flag
```

#### Tmux Sessions
```bash
# List all tmux sessions
tmux ls

# Kill stuck session
tmux kill-session -t magent-auth-agent

# Reattach to session
magents attach auth-agent
```

### Debug Mode

```bash
# Set debug environment variable
export MAGENTS_DEBUG=true

# Run command with verbose output
magents create feature/debug debug-agent
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the Claude Code community
- Inspired by the need for better multi-agent workflows
- Special thanks to all contributors

---

**Note**: Magents enhances Claude Code's capabilities by providing persistent, branch-level agent management. While Claude's built-in subagents excel at task-level parallelism within a conversation, Magents enables sustained parallel development across multiple features and branches.