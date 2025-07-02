# Claude Code Bridge Architecture for Docker Agents

## Overview
This architecture allows all Docker-based agents to share the host's Claude Code installation without requiring individual setup or authentication in each container.

## Architecture Components

### 1. Host-Side Bridge Server
```javascript
// claude-bridge-server.js (runs on host)
const net = require('net');
const { spawn } = require('child_process');

const SOCKET_PATH = '/var/run/claude-code-bridge.sock';

// Unix domain socket server
const server = net.createServer((connection) => {
  connection.on('data', (data) => {
    const request = JSON.parse(data);
    
    // Execute claude command on host
    const claude = spawn('claude', request.args, {
      env: { ...process.env, ...request.env }
    });
    
    // Stream results back to container
    claude.stdout.on('data', (output) => {
      connection.write(JSON.stringify({
        type: 'stdout',
        data: output.toString()
      }));
    });
    
    claude.on('close', (code) => {
      connection.write(JSON.stringify({
        type: 'exit',
        code
      }));
      connection.end();
    });
  });
});

server.listen(SOCKET_PATH);
```

### 2. Container-Side Claude Wrapper
```bash
#!/bin/bash
# /usr/local/bin/claude (in container)

# Send command to host via socket
echo "{\"args\": $@, \"env\": {}}" | nc -U /host/claude-bridge.sock
```

### 3. Docker Compose Configuration
```yaml
version: '3.8'

services:
  claude-bridge:
    image: magents/claude-bridge:latest
    volumes:
      - /var/run/claude-code-bridge.sock:/var/run/claude-code-bridge.sock
      - ~/.config/claude-code:/root/.config/claude-code:ro
    restart: unless-stopped
    
  agent-1:
    image: magents/agent:latest
    volumes:
      - /var/run/claude-code-bridge.sock:/host/claude-bridge.sock
      - ./project:/workspace
    environment:
      - CLAUDE_BRIDGE_SOCKET=/host/claude-bridge.sock
    depends_on:
      - claude-bridge
```

## Key Benefits

1. **Single Authentication**: Users authenticate Claude Code once on the host
2. **Shared Session**: All containers use the same Claude Code session
3. **Resource Efficiency**: No duplicate Claude Code installations
4. **Easy Updates**: Update Claude Code on host, all agents get the update
5. **Security**: Read-only mount of config, no credential exposure

## Implementation Steps

### Phase 1: Basic Bridge (Subtask 21.2)
- Create Unix socket bridge server
- Implement container-side wrapper script
- Test basic command forwarding

### Phase 2: Advanced Features
- Add request queuing for concurrent agents
- Implement connection pooling
- Add metrics and monitoring
- Create health check endpoint

### Phase 3: Security Hardening
- Add request validation
- Implement rate limiting
- Create audit logging
- Add access control lists

## Alternative Approaches Considered

### 1. HTTP API Bridge
- Pros: Easier debugging, standard protocols
- Cons: Higher overhead, security concerns

### 2. Shared Volume Approach
- Pros: Simple implementation
- Cons: Doesn't work for interactive commands

### 3. SSH Tunnel
- Pros: Secure, well-understood
- Cons: Complex setup, key management

## Error Handling

When bridge is unavailable:
```
Claude Code Bridge Error: Unable to connect to host

To use Claude Code in this container:
1. Ensure claude-bridge service is running on host
2. Check socket mount at /host/claude-bridge.sock
3. Verify host has Claude Code installed and authenticated

Alternative: Use Task Master with API-based models instead
```

## Testing Strategy

1. **Unit Tests**: Test bridge server request handling
2. **Integration Tests**: Test container-to-host communication
3. **Load Tests**: Verify multiple agents can use bridge concurrently
4. **Failure Tests**: Test graceful degradation when bridge is down

## Future Enhancements

1. **WebSocket Support**: For real-time streaming
2. **Multi-Host Support**: Bridge across multiple Docker hosts
3. **Cloud Integration**: Bridge to cloud-hosted Claude Code
4. **GUI Integration**: Show bridge status in magents dashboard