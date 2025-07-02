# Claude Code Bridge for Docker Containers

This implementation allows Docker containers to access the host's Claude Code installation without requiring individual setup in each container.

## Architecture

```
Host Machine                           Docker Containers
------------                           -----------------
Claude Code CLI <---> Bridge Server <---> Unix Socket <---> Claude Wrapper <---> Task Master
~/.config/claude-code                      /var/run/          /usr/local/bin/claude
```

## Components

1. **claude-bridge-server.js** - Runs on host, proxies commands to Claude Code CLI
2. **claude-wrapper.sh** - In container, forwards commands to bridge via socket
3. **Docker socket mount** - `/var/run/claude-code-bridge.sock` shared between host and containers

## Setup Instructions

### 1. Manual Setup

```bash
# On host machine
sudo mkdir -p /var/run
sudo node packages/cli/docker/claude-bridge-server.js

# In another terminal
docker-compose -f packages/cli/docker/docker-compose.yml up
```

### 2. Systemd Setup (Recommended for Production)

```bash
# Copy files
sudo cp packages/cli/docker/claude-bridge-server.js /opt/magents/
sudo cp packages/cli/docker/claude-bridge.service /etc/systemd/system/

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable claude-bridge
sudo systemctl start claude-bridge

# Check status
sudo systemctl status claude-bridge
```

### 3. Docker Compose

The provided `docker-compose.yml` includes both the bridge server and an example agent container.

```bash
docker-compose -f packages/cli/docker/docker-compose.yml up -d
```

## Usage

Once the bridge is running, containers can use Claude Code as if it were installed locally:

```bash
# Inside container
claude --version
claude code review file.js
task-master expand --id=1  # Uses Claude Code via bridge
```

## Features

- **Zero Configuration**: Containers need no Claude Code setup
- **Shared Authentication**: Uses host's Claude Code session
- **Concurrent Support**: Up to 10 simultaneous container connections
- **Error Handling**: Graceful fallback with helpful messages
- **Security**: Read-only access to Claude config, socket permissions

## Troubleshooting

### Permission Denied

If you see "Permission denied" errors:

```bash
# Ensure docker group has access
sudo chgrp docker /var/run/claude-code-bridge.sock
sudo chmod 660 /var/run/claude-code-bridge.sock
```

### Bridge Not Found

If containers can't find the bridge:

1. Verify bridge server is running: `ps aux | grep claude-bridge`
2. Check socket exists: `ls -la /var/run/claude-code-bridge.sock`
3. Verify volume mount in docker-compose.yml

### Task Master Integration

Task Master will automatically use the Claude bridge when available. If not, it falls back to API-based models:

```bash
# Inside container
task-master models --setup  # Configure fallback models
```

## Security Considerations

1. The bridge server should only be accessible to trusted containers
2. Claude config is mounted read-only
3. Socket permissions restrict access to docker group
4. No credentials are stored in containers

## Testing

Run the test suite to verify installation:

```bash
./test-claude-bridge.sh
```

This tests:
- Task Master installation
- Claude wrapper functionality
- Socket communication
- Error handling
- Configuration access