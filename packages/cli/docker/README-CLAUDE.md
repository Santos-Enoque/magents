# Claude Code Docker Mode

This implementation allows you to run Claude Code agents inside Docker containers with persistent authentication and settings, ready for cloud deployment.

## Features

✅ **No Login Required** - Authentication persists across container restarts  
✅ **Settings Sync** - All your local Claude settings are available in containers  
✅ **Custom Commands** - Your custom commands work in containers  
✅ **Multi-Agent Support** - Run multiple Claude agents sharing the same auth  
✅ **Task Master Integration** - Built-in Task Master AI support  
✅ **Cloud Ready** - Designed for deployment to Kubernetes/cloud platforms

## Quick Start

### 1. Initial Setup (One Time)

```bash
# Run the setup script to build image and configure authentication
./claude-container-setup.sh
```

This will:
- Build the Docker image
- Create persistent volume for Claude data
- Prompt for Claude authentication (one time only)
- Copy your local settings and custom commands

### 2. Running Claude Agents

#### Interactive Mode
```bash
docker run -it --rm \
  -v claude-data:/home/magents/.claude \
  -v $(pwd):/workspace \
  magents/claude:dev claude
```

#### Background Agent with tmux
```bash
docker run -d --name my-agent \
  -v claude-data:/home/magents/.claude \
  -v $(pwd):/workspace \
  magents/claude:dev \
  "tmux new-session -d -s claude 'claude' && sleep infinity"

# Attach to the agent
docker exec -it my-agent tmux attach -t claude
```

#### Multi-Agent with Docker Compose
```bash
docker-compose -f docker-compose.claude-working.yml up -d

# Attach to specific agents
docker exec -it claude-agent-main bash
docker exec -it claude-taskmaster bash
```

## Architecture

### Dockerfile Structure

The `Dockerfile.claude-working` uses multi-stage builds:

- **base**: Core dependencies (Node.js, git, tmux, Claude Code, Task Master)
- **production**: Minimal production image
- **development**: Development image with additional tools

### Volume Persistence

Claude data is stored in a Docker volume `claude-data` containing:
- Authentication tokens
- Settings.json
- Custom commands
- Stats and usage data

### Security Considerations

For cloud deployment:
1. Never include authentication tokens in images
2. Use Kubernetes secrets for API keys
3. Mount auth volumes at runtime
4. Consider using init containers for auth setup

## Files Overview

- `Dockerfile.claude-working` - Main Dockerfile with Claude Code
- `docker-compose.claude-working.yml` - Multi-agent orchestration
- `claude-container-setup.sh` - Initial setup script
- `test-claude-auth.sh` - Authentication verification
- `final-claude-test.sh` - Comprehensive test suite

## Cloud Deployment

### Kubernetes Example

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: claude-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claude-agent
spec:
  replicas: 1
  selector:
    matchLabels:
      app: claude-agent
  template:
    metadata:
      labels:
        app: claude-agent
    spec:
      containers:
      - name: claude
        image: magents/claude:production
        volumeMounts:
        - name: claude-data
          mountPath: /home/magents/.claude
        - name: workspace
          mountPath: /workspace
      volumes:
      - name: claude-data
        persistentVolumeClaim:
          claimName: claude-data
      - name: workspace
        emptyDir: {}
```

## Troubleshooting

### Authentication Issues
```bash
# Check if volume exists
docker volume ls | grep claude-data

# Inspect volume contents
docker run --rm -v claude-data:/data alpine ls -la /data
```

### Container Not Starting
```bash
# Check logs
docker logs <container-name>

# Debug interactively
docker run -it --rm -v claude-data:/home/magents/.claude magents/claude:dev bash
```

## Future Enhancements

1. **Automated Auth Token Rotation** - For long-running deployments
2. **Metrics Export** - Prometheus/OpenTelemetry integration
3. **Auto-scaling** - Based on task queue length
4. **Web UI Integration** - Direct container management from Magents UI