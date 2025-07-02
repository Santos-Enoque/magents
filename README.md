# 🤖 Magents - Multi-Agent Claude Code Workflow Manager

[![npm version](https://img.shields.io/npm/v/magents.svg)](https://www.npmjs.com/package/magents)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Issues](https://img.shields.io/github/issues/Santos-Enoque/magents.svg)](https://github.com/Santos-Enoque/magents/issues)

Magents is a powerful CLI tool for managing multiple Claude Code instances across different git branches, enabling parallel AI-assisted development with intelligent task management and Docker/tmux isolation.

## 🚀 Why Magents?

Magents enables you to run multiple Claude Code agents simultaneously, each working on different features or tasks in isolated environments. Think of it as a orchestration layer that manages AI developers working on your codebase in parallel.

### Key Features

- **🌳 Branch Isolation**: Each agent works on its own git worktree - no branch switching needed
- **🐳 Docker Mode**: Run agents in Docker containers with shared Claude authentication
- **📋 Task Master Integration**: Automatic task assignment and tracking with AI-powered task management
- **🔄 Instant Creation**: Smart defaults and minimal configuration - create agents in seconds
- **🎯 Context Awareness**: Each agent knows its role, boundaries, and available resources
- **🖥️ Dashboard View**: Monitor all agents in a unified tmux dashboard

## 📋 Table of Contents

- [Architecture](#architecture)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Docker Mode](#docker-mode)
- [Commands Reference](#commands-reference)
- [Task Master Integration](#task-master-integration)
- [Configuration](#configuration)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

## 🏗️ Architecture

### Monorepo Structure

```
magents/
├── packages/
│   ├── cli/                 # Main CLI package
│   │   ├── src/            # TypeScript source code
│   │   ├── dist/           # Compiled JavaScript
│   │   └── docker/         # Docker configurations
│   ├── shared/             # Shared types and utilities
│   └── web/                # Web dashboard (future)
├── .taskmaster/            # Task Master configuration
├── CLAUDE.md              # Context for Claude Code
└── package.json           # Workspace configuration
```

### Core Components

1. **Agent Manager**: Creates and manages Claude Code instances
2. **Tmux Service**: Handles persistent tmux sessions for agents
3. **Docker Service**: Manages containerized agents with volume sharing
4. **Task Master Integration**: AI-powered task management and assignment
5. **Configuration Service**: Manages settings and Claude authentication

## 🛠️ Installation

### Prerequisites

- Node.js 18+ and npm
- Git 2.20+ (for worktree support)
- tmux (for local mode)
- Docker & docker-compose (for Docker mode)
- Claude Code CLI installed globally

### Install from npm

```bash
npm install -g magents
```

### Install from Source

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

### Traditional Mode (tmux)

```bash
# Create an agent for a new feature
magents create auth-system

# List active agents
magents list

# Attach to agent's session
magents attach auth-system

# Stop when done
magents stop auth-system
```

### Docker Mode (Recommended)

```bash
# First-time setup: Build images and authenticate Claude
cd packages/cli/docker
./build-images.sh
./setup-and-test-claude.sh

# Create Docker-based agent
magents create payment-api --docker

# Attach to Docker agent
magents attach payment-api
```

## 🐳 Docker Mode

Docker mode provides complete isolation and is recommended for production use.

### Initial Setup (One-Time)

1. **Build Docker Images**
   ```bash
   cd packages/cli/docker
   ./build-images.sh
   ```
   This creates:
   - `magents/agent:latest` - Production image
   - `magents/agent:dev` - Development image with extra tools

2. **Setup Claude Authentication**
   ```bash
   ./setup-and-test-claude.sh
   ```
   This process:
   - Creates a persistent volume `claude-container-auth`
   - Launches an interactive container for Claude authentication
   - Saves authentication for all future agent containers

3. **Configure API Keys**
   ```bash
   # Add to ~/.zshrc or ~/.bashrc
   export ANTHROPIC_API_KEY="your-key"
   export PERPLEXITY_API_KEY="your-key"  # For research features
   export OPENAI_API_KEY="your-key"      # Optional fallback
   ```

### Creating Docker Agents

```bash
# Basic Docker agent
magents create feature-x --docker

# With specific task
magents create api-refactor --docker --task 24.1

# Advanced mode with full Task Master
magents create complex-feature --docker --mode advanced

# Preview without creating
magents create test-agent --docker --dry-run
```

### Docker Architecture

```
magents-agent-001/
├── /workspace        # Your project (mounted)
├── /shared          # Shared config & Task Master
│   ├── .taskmaster/
│   ├── CLAUDE.md
│   └── .mcp.json
├── /agent           # Agent-specific state
└── /home/magents/   # User home with Claude auth
    ├── .config/claude/  # Shared authentication
    └── .taskmaster/
```

### Managing Docker Agents

```bash
# View logs
docker logs magents-agent-001

# Execute commands
docker exec magents-agent-001 task-master list

# Stop container (persists)
magents stop agent-001

# Stop and remove
magents stop agent-001 --remove-worktree

# Clean all containers
magents cleanup --remove-worktrees
```

## 📚 Commands Reference

### Core Commands

```bash
# Agent Management
magents create <name> [options]      # Create new agent
magents list                         # List all agents
magents attach <agent-id>            # Connect to agent
magents stop <agent-id>              # Stop agent
magents cleanup                      # Stop all agents

# Configuration
magents init                         # Initialize config
magents config [options]             # View/edit settings
magents doctor                       # Check requirements

# Monitoring
magents dashboard                    # Split-screen view
magents monitor                      # Live preview
```

### Create Command Options

```bash
magents create <name> [agent-id]
  --branch <branch>      # Git branch name
  --task <taskId>        # Task Master task ID
  --mode <mode>          # simple|standard|advanced
  --docker               # Use Docker mode
  --no-docker            # Force tmux mode
  --dry-run              # Preview only
  --interactive          # Interactive setup
```

### Task Master Commands

```bash
# Task-based agent creation
magents task-create <task-id>        # Create agent for task
magents task-agents                  # Create agents for all tasks
magents sync-taskmaster <agent-id>   # Sync Task Master config

# Workflow automation
magents work-issue <issue-id>        # Start GitHub issue workflow
```

## 📋 Task Master Integration

Magents includes deep integration with [Task Master AI](https://github.com/Santos-Enoque/task-master-ai) for intelligent task management.

### Setting Up Task Master

```bash
# Initialize Task Master in your project
task-master init

# Parse requirements document
task-master parse-prd docs/requirements.txt

# Configure AI models
task-master models --setup
```

### Creating Task-Based Agents

```bash
# View available tasks
task-master list

# Create agent for specific task
magents task-create 24.1 auth-agent

# Auto-create agents for all pending tasks
magents task-agents --mode standard
```

### Task Master in Agents

Each agent has access to Task Master commands:
- `task-master next` - Get next task
- `task-master show <id>` - View task details
- `task-master set-status --id=<id> --status=done` - Complete task
- `task-master update-subtask --id=<id> --prompt="notes"` - Log progress

## ⚙️ Configuration

### Global Configuration

Located at `~/.magents/config.json`:

```json
{
  "runtime": "docker",
  "dockerImage": "magents/agent:latest",
  "defaultMode": "standard",
  "apiKeys": {
    "anthropic": "sk-...",
    "perplexity": "pplx-...",
    "openai": "sk-..."
  }
}
```

### Project Configuration

Located at `.magents/config.json` in your project:

```json
{
  "projectName": "My App",
  "agents": {
    "maxConcurrent": 5,
    "defaultBranch": "develop"
  },
  "docker": {
    "network": "magents-network",
    "volumes": ["shared-data:/data"]
  }
}
```

### Environment Variables

```bash
# API Keys
ANTHROPIC_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...
OPENAI_API_KEY=sk-...

# Docker Settings
DOCKER_ENABLED=true
DOCKER_IMAGE=magents/agent:custom

# Runtime Options
MAGENTS_MODE=docker
MAGENTS_DEBUG=true
```

## 🚀 Advanced Usage

### Multi-Agent Workflows

```bash
# Create multiple agents for parallel work
magents create frontend --task "Build UI components"
magents create backend --task "Create API endpoints"
magents create tests --task "Write integration tests"

# Monitor all agents
magents dashboard
```

### Custom Docker Images

```dockerfile
# Dockerfile.custom
FROM magents/agent:latest

# Add your tools
RUN npm install -g your-tools

# Copy custom scripts
COPY scripts/ /usr/local/bin/
```

```bash
# Build and use
docker build -t myorg/magents:custom -f Dockerfile.custom .
magents config --set dockerImage myorg/magents:custom
```

### Integration with CI/CD

```yaml
# .github/workflows/ai-development.yml
name: AI Development
on:
  issue:
    types: [opened, labeled]

jobs:
  create-agent:
    if: contains(github.event.label.name, 'ai-task')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Magents
        run: |
          npm install -g magents
          magents init
      - name: Create Agent
        run: |
          magents create issue-${{ github.event.issue.number }} \
            --docker \
            --task "${{ github.event.issue.title }}"
```

### Debugging Agents

```bash
# Check agent health
magents doctor

# View agent logs (Docker)
docker logs magents-<agent-id>

# Interactive debugging
docker exec -it magents-<agent-id> bash

# Check tmux sessions
tmux ls | grep magents
```

## 🔧 Troubleshooting

### Common Issues

**Docker image not found**
```bash
cd packages/cli/docker
./build-images.sh
```

**Claude authentication issues**
```bash
cd packages/cli/docker
./setup-and-test-claude.sh
```

**Port conflicts**
```bash
magents cleanup
magents config --set ports.start 4000
```

**Task Master not found**
```bash
npm install -g task-master-ai
task-master init
```

### Debug Mode

```bash
# Enable debug logging
export MAGENTS_DEBUG=true

# Check system requirements
magents doctor

# Test Docker setup
cd packages/cli/docker
./test-docker-mode.sh
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/Santos-Enoque/magents.git
cd magents

# Install dependencies
npm install

# Build packages
npm run build

# Run tests
npm test

# Link for local development
npm link
```

## 📄 License

MIT © [Santos Enoque](https://github.com/Santos-Enoque)

## 🙏 Acknowledgments

- Built for [Claude Code](https://claude.ai/code) by Anthropic
- Integrates with [Task Master AI](https://github.com/Santos-Enoque/task-master-ai)
- Inspired by the need for parallel AI development workflows