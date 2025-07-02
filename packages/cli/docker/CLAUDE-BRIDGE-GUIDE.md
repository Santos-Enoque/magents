# Claude Bridge Guide for Docker Containers

## Understanding the Claude Bridge

The Claude bridge allows Docker containers to use Claude Code installed on the host machine. This is necessary because Claude Code requires authentication and configuration that exists on your host system.

## Why Claude Commands Hang

When you run `claude` in the container and it hangs with no output, this means:

1. **The bridge server has stopped** - The bridge server that was started by `start-test-environment.sh` has terminated
2. **No error is shown** - The claude wrapper script is waiting for a response from a dead socket
3. **The socket file still exists** - Even though the server is gone, the socket file remains, causing the hang

## Solution: Persistent Bridge Server

### Step 1: Start the Persistent Bridge Server (on host)

```bash
./start-bridge-server.sh
```

This creates a persistent bridge server that:
- Runs in the background with `nohup`
- Logs to `/tmp/claude-bridge-persistent/bridge.log`
- Restarts automatically if needed
- Shows heartbeat messages every 30 seconds

### Step 2: Connect Your Container

```bash
./connect-to-bridge.sh
```

This will:
- Stop the existing container
- Start a new one connected to the persistent bridge
- Fix socket permissions automatically

### Step 3: Test Claude

```bash
# Test version
docker exec magents-test-bridge claude --version

# Use Claude interactively
docker exec -it magents-test-bridge claude
```

## Manual Setup

If you prefer manual setup:

1. **Start bridge server on host:**
```bash
# Create persistent directory
mkdir -p /tmp/claude-bridge-persistent

# Start bridge (keep terminal open)
node claude-bridge-server.js
```

2. **Run container with socket mount:**
```bash
docker run -d \
  --name magents-test \
  -v /path/to/workspace:/workspace \
  -v /tmp/claude-bridge-persistent/claude-bridge.sock:/host/claude-bridge.sock \
  -e CLAUDE_BRIDGE_SOCKET=/host/claude-bridge.sock \
  magents/agent:test \
  tail -f /dev/null
```

3. **Fix permissions in container:**
```bash
docker exec magents-test sudo chown magents:magents /host/claude-bridge.sock
```

## Troubleshooting

### Claude hangs with no output

**Cause**: Bridge server not running
**Solution**: Start persistent bridge with `./start-bridge-server.sh`

### Permission denied errors

**Cause**: Socket owned by root in container
**Solution**: Run `docker exec <container> sudo chown magents:magents /host/claude-bridge.sock`

### Bridge server stops immediately

**Cause**: Claude not installed on host
**Solution**: Install Claude: `npm install -g @anthropic-ai/claude-cli`

### Socket exists but connection refused

**Cause**: Stale socket file
**Solution**: Remove socket and restart bridge: `rm /tmp/claude-bridge-persistent/claude-bridge.sock`

## Alternative: Use Task Master Without Bridge

If you don't need Claude Code specifically, use Task Master with API keys:

```bash
# Enter container
docker exec -it magents-test bash

# Set API keys
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"

# Use Task Master
task-master --help
task-master list
task-master models --setup
```

## Architecture

```
Host Machine                           Docker Container
┌─────────────────────┐               ┌─────────────────────┐
│                     │               │                     │
│  Claude CLI         │               │  Claude Wrapper     │
│  (authenticated)    │               │  (/usr/local/bin/   │
│         ↓           │               │   claude)           │
│  Bridge Server      │←─────────────→│         ↓           │
│  (Node.js)          │  Unix Socket  │  Sends JSON request │
│         ↓           │               │  to socket          │
│  /tmp/claude-bridge-│               │  /host/claude-      │
│  persistent/        │               │  bridge.sock        │
│  claude-bridge.sock │               │                     │
└─────────────────────┘               └─────────────────────┘
```

## Best Practices

1. **Use persistent bridge** - The `start-bridge-server.sh` script creates a long-running bridge
2. **Check bridge logs** - `tail -f /tmp/claude-bridge-persistent/bridge.log`
3. **Monitor bridge health** - Look for heartbeat messages in logs
4. **One bridge, many containers** - Multiple containers can share the same bridge socket

## Summary

The Claude bridge requires:
1. Claude installed and authenticated on the host
2. A bridge server running on the host
3. Proper socket permissions in the container

For the best experience, use the persistent bridge server approach with `start-bridge-server.sh`.