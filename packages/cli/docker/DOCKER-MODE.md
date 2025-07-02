# Magents Docker Mode

## Overview

Magents supports two modes for running AI agents:
1. **Traditional Mode** (default): Uses tmux sessions and git worktrees
2. **Docker Mode**: Uses Docker containers for isolated agent environments

## Quick Start

### Enable Docker Mode

```bash
# Enable Docker mode globally
magents config --docker

# Or create a single agent with Docker
magents create feature/my-feature --docker
```

### Build Docker Image

```bash
cd packages/cli/docker
./build.sh
```

### Create Docker Agents

```bash
# Create a Docker agent
magents create feature/ai-task agent-001

# List agents (shows both Docker and tmux agents)
magents list

# Attach to Docker agent
magents attach agent-001
```

## Features

### API-Based Agents
Docker agents use Task Master with API keys instead of Claude bridge:

```bash
# Set API keys before creating agents
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"

# Create agent with API access
magents create feature/research research-agent
```

### Shared Volumes
- `/workspace`: Project files (mounted from host)
- `/shared`: Shared configuration and Task Master data
- `/agent`: Agent-specific state and data

### Container Management

```bash
# View container logs
docker logs magents-agent-001

# Execute commands in container
docker exec magents-agent-001 task-master list

# Stop agent (container persists)
magents stop agent-001

# Stop and remove container
magents stop agent-001 --remove-worktree
```

## Configuration

### Global Settings
Edit `~/.magents-config`:

```
DOCKER_ENABLED=true
DOCKER_IMAGE=magents/agent:latest
```

Or use the interactive config:

```bash
magents config --edit
```

### Custom Docker Image
To use a custom image:

```bash
# Set custom image
magents config --edit
# Choose "Docker image for agents" and enter your image name

# Or edit config directly
echo "DOCKER_IMAGE=myorg/magents:custom" >> ~/.magents-config
```

## Architecture

### Container Structure
```
magents-agent-001/
├── /workspace        # Project mount (read-write)
├── /shared          # Shared config (read-write)
│   ├── .taskmaster/
│   ├── CLAUDE.md
│   └── .mcp.json
├── /agent           # Agent state (read-write)
└── /home/magents/   # User home
    ├── .taskmaster/
    └── .gitconfig
```

### Network Isolation
- Containers run in default Docker network
- No port exposure by default
- Can be customized via Docker options

### Process Management
- Main process: `tail -f /dev/null` (keeps container running)
- Health check: HTTP server on port 3000 (internal)
- Signal handling for graceful shutdown

## Docker vs Traditional Mode

| Feature | Docker Mode | Traditional Mode |
|---------|------------|------------------|
| Isolation | Full container isolation | Process isolation |
| Setup | Requires Docker | Requires tmux |
| Claude Access | API keys only | Direct CLI access |
| Resource Usage | Higher (containers) | Lower (processes) |
| Portability | Highly portable | System-dependent |
| Multi-agent | Excellent scaling | Good scaling |

## Troubleshooting

### Check Docker Setup
```bash
magents doctor
```

### Container Won't Start
```bash
# Check logs
docker logs magents-agent-001

# Verify image exists
docker images | grep magents

# Rebuild image
cd packages/cli/docker && ./build.sh
```

### Permission Issues
```bash
# Fix volume permissions
docker exec magents-agent-001 sudo chown -R magents:magents /workspace
```

### API Key Issues
```bash
# Verify API keys are set
echo $ANTHROPIC_API_KEY

# Check in container
docker exec magents-agent-001 env | grep API_KEY
```

## Advanced Usage

### Multi-Agent Orchestration

```yaml
# docker-compose.agents.yml
version: '3.8'

services:
  researcher:
    image: magents/agent:latest
    environment:
      - AGENT_ID=researcher
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./:/workspace
      - magents-shared:/shared

  developer:
    image: magents/agent:latest
    environment:
      - AGENT_ID=developer
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./:/workspace
      - magents-shared:/shared

volumes:
  magents-shared:
```

### Custom Agent Scripts

Create agent-specific startup scripts:

```bash
#!/bin/bash
# /agent/start.sh

# Configure Task Master
task-master models --set-main claude-3-5-sonnet-20241022

# Start work loop
while true; do
  task-master next
  sleep 60
done
```

## Best Practices

1. **API Keys**: Always set API keys before creating Docker agents
2. **Image Updates**: Rebuild image after Dockerfile changes
3. **Volume Management**: Use named volumes for persistence
4. **Resource Limits**: Set Docker resource constraints for production
5. **Logging**: Use centralized logging for multi-agent setups

## Migration Guide

### From tmux to Docker

1. Enable Docker mode: `magents config --docker`
2. Stop existing agents: `magents cleanup`
3. Rebuild with Docker: `magents task-agents`

### From Docker to tmux

1. Disable Docker mode: `magents config --no-docker`
2. Stop containers: `magents cleanup --remove-worktrees`
3. Recreate as tmux agents