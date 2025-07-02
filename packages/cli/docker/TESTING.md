# Testing Magents Docker Runtime

## Prerequisites

1. **Docker Desktop** installed and running
2. **Claude Code** installed on the host machine:
   ```bash
   npm install -g @anthropic-ai/claude-code
   # or
   brew install claude
   ```
3. Claude authenticated on host:
   ```bash
   claude --version  # Should show version
   ```

## Quick Test

For a quick test that automatically cleans up:
```bash
./quick-test.sh
```

To keep the container running after the test:
```bash
./quick-test.sh --keep
```

## Interactive Testing

For extended testing with a persistent environment:
```bash
./start-test-environment.sh
```

This will:
1. Build the Docker image
2. Start a Claude bridge server in the background
3. Start a test container
4. Run health checks
5. Keep everything running for interactive testing

### Test Commands

Once the environment is running:

```bash
# Enter the container
docker exec -it magents-test bash

# Test Task Master
docker exec -it magents-test task-master --version
docker exec -it magents-test task-master list

# Test Claude (requires Claude installed on host)
docker exec -it magents-test claude --version

# Check health status
curl http://localhost:3999/health

# Start a tmux session
docker exec -it magents-test tmux
```

### Fixing Socket Permissions

If you see permission errors with the Claude bridge:
```bash
docker exec magents-test sudo chown magents:magents /host/claude-bridge.sock
```

### Stopping the Environment

The start script will provide a stop command like:
```bash
/tmp/claude-bridge.XXXXXX/stop-environment.sh
```

## Troubleshooting

### Claude Bridge Connection Failed

If claude commands fail with "Failed to connect to Claude bridge":

1. **Check if Claude is installed on host**:
   ```bash
   which claude  # Should show path
   claude --version  # Should show version
   ```

2. **Check bridge server is running**:
   ```bash
   ps aux | grep bridge-server
   ```

3. **Check socket permissions**:
   ```bash
   docker exec magents-test ls -la /tmp/claude-bridge.sock
   ```

4. **View bridge server logs**:
   The start script shows the log location, typically:
   ```bash
   cat /tmp/claude-bridge.XXXXXX/bridge.log
   ```

### Container Exits Immediately

If the container exits right after starting:
- Check container logs: `docker logs magents-test`
- Ensure volumes are mounted correctly
- Check for permission issues in init-volumes.sh

### Health Check Failures

If health checks fail:
```bash
# Check if health server is running
docker exec magents-test ps aux | grep health-server

# Check health endpoint directly
docker exec magents-test curl -v http://localhost:3999/health
```

## Using Without Claude Bridge

If you don't have Claude installed on the host, you can still use Task Master with API-based models:

```bash
# Enter container
docker exec -it magents-test bash

# Configure Task Master with API keys
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"

# Setup models
task-master models --setup

# Use Task Master
task-master list
task-master add-task --prompt "Create a new feature"
```