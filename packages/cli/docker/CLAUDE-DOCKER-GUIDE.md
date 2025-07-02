# Running Claude Code in Docker Containers

## Overview

This guide explains how to run Claude Code inside Docker containers for cloud deployment.

## Architecture Options

### Option 1: Direct Claude Installation (Recommended)

Install Claude CLI directly in containers and manage authentication:

```bash
# Build Claude-enabled image
docker build -f Dockerfile.claude -t magents/claude-agent:latest .

# Run with mounted auth (development)
docker run -it \
  -v ~/.config/claude:/auth:ro \
  -v $(pwd):/workspace \
  magents/claude-agent:latest
```

### Option 2: Shared Authentication

Use a single authentication token across multiple containers:

```bash
# Export auth from host
./manage-claude-auth.sh export

# Run with environment auth
docker run -it \
  --env-file .env \
  -v $(pwd):/workspace \
  magents/claude-agent:latest
```

## Development Workflow

### 1. Setup Claude Authentication

```bash
# Option A: Use host authentication
docker run -it \
  -v ~/.config/claude:/auth:ro \
  magents/claude-agent:dev

# Option B: Setup new authentication
./manage-claude-auth.sh setup
```

### 2. Run Claude Agent

```bash
# Start Claude in tmux session
docker-compose -f docker-compose.claude.yml up -d claude-agent-dev

# Attach to Claude
docker exec -it magents-claude-dev tmux attach -t claude
```

### 3. Multiple Agents

```bash
# Start multiple agents
docker-compose -f docker-compose.claude.yml up -d agent-1 agent-2

# Each agent has its own Claude instance
docker exec -it magents-agent-1 tmux attach -t claude
docker exec -it magents-agent-2 tmux attach -t claude
```

## Cloud Deployment

### AWS ECS Example

```yaml
# task-definition.json
{
  "family": "magents-claude-agent",
  "taskRoleArn": "arn:aws:iam::xxx:role/ecsTaskRole",
  "executionRoleArn": "arn:aws:iam::xxx:role/ecsExecutionRole",
  "containerDefinitions": [{
    "name": "claude-agent",
    "image": "magents/claude-agent:latest",
    "memory": 4096,
    "cpu": 2048,
    "environment": [
      {"name": "AGENT_ID", "value": "ecs-agent-001"},
      {"name": "CLAUDE_HEADLESS", "value": "true"}
    ],
    "secrets": [
      {
        "name": "CLAUDE_AUTH_TOKEN",
        "valueFrom": "arn:aws:secretsmanager:region:xxx:secret:claude-auth"
      }
    ],
    "mountPoints": [{
      "sourceVolume": "workspace",
      "containerPath": "/workspace"
    }]
  }],
  "volumes": [{
    "name": "workspace",
    "efsVolumeConfiguration": {
      "fileSystemId": "fs-xxx"
    }
  }]
}
```

### Google Cloud Run Example

```dockerfile
# Dockerfile.cloudrun
FROM magents/claude-agent:latest

# Cloud Run expects port 8080
EXPOSE 8080

# Add health check endpoint
COPY healthcheck-server.js /usr/local/bin/
CMD ["node", "/usr/local/bin/healthcheck-server.js"]
```

```bash
# Deploy to Cloud Run
gcloud run deploy magents-claude-agent \
  --image gcr.io/project/magents-claude-agent \
  --set-env-vars CLAUDE_AUTH_TOKEN=$CLAUDE_AUTH_TOKEN \
  --memory 4Gi \
  --cpu 2
```

### Kubernetes Deployment

```bash
# Prepare deployment
./manage-claude-auth.sh deploy

# Apply to cluster
kubectl apply -f claude-auth-secret.yaml
kubectl apply -f k8s-deployment.yaml

# Access agent
kubectl exec -it deployment/magents-agent -- tmux attach -t claude
```

## Authentication Methods

### 1. Volume Mount (Development)
- Mount `~/.config/claude` from host
- Read-only for security
- Best for local development

### 2. Environment Variable (Production)
- Store token in `CLAUDE_AUTH_TOKEN`
- Use secrets management (AWS Secrets Manager, K8s Secrets)
- Best for cloud deployment

### 3. Init Container (Advanced)
- Fetch auth from secure storage
- Initialize before main container
- Best for dynamic environments

## Best Practices

### Security
1. **Never commit auth tokens**
2. **Use read-only mounts** for auth directories
3. **Rotate tokens regularly**
4. **Use secrets management** in production

### Performance
1. **Use tmux** for persistent sessions
2. **Allocate sufficient memory** (4GB minimum)
3. **Use volume mounts** for large workspaces
4. **Enable container health checks**

### Reliability
1. **Handle auth expiration** gracefully
2. **Implement retry logic**
3. **Monitor container health**
4. **Log Claude operations**

## Troubleshooting

### Authentication Issues

```bash
# Check auth in container
docker exec magents-agent-1 cat /home/magents/.config/claude/config.json

# Test Claude
docker exec magents-agent-1 claude --version
```

### Session Management

```bash
# List tmux sessions
docker exec magents-agent-1 tmux ls

# Create new session
docker exec magents-agent-1 tmux new-session -d -s claude claude

# Attach to existing
docker exec -it magents-agent-1 tmux attach -t claude
```

### Debugging

```bash
# Check logs
docker logs magents-agent-1

# Interactive debug
docker run -it --entrypoint bash magents/claude-agent:latest

# Environment check
docker exec magents-agent-1 env | grep CLAUDE
```

## Integration with Magents

Update your DockerAgentManager to support Claude mode:

```typescript
// When creating containers with Claude
const dockerCmd = `docker run -d \
  --name ${containerName} \
  -v ~/.config/claude:/auth:ro \
  -v ${workspace}:/workspace \
  -e AGENT_ID=${agentId} \
  -e CLAUDE_MODE=true \
  magents/claude-agent:latest`;
```

This enables true Claude Code agents in containers for cloud deployment!