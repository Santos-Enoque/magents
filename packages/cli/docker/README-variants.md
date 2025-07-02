# Magents Docker Image Variants

This directory contains the Docker configuration for magents agent containers, with two distinct image variants optimized for different use cases.

## Image Variants

### Production Image (`magents/agent:latest`)
The production image is optimized for:
- **Minimal size** - Build tools removed after compilation
- **Security** - Only essential packages included
- **Performance** - NODE_ENV=production for optimized Node.js behavior
- **Stability** - No debugging tools that could impact performance

**Use when:**
- Deploying agents to production environments
- Running long-term agent tasks
- Minimizing resource usage
- Prioritizing security

### Development Image (`magents/agent:dev`)
The development image includes:
- All production features PLUS:
- **Text editors**: vim
- **System monitoring**: htop, lsof, psmisc
- **Network debugging**: tcpdump, net-tools, dnsutils, ping, telnet
- **Process debugging**: strace, gdb, valgrind
- **Node.js debugging**: node-inspector, nodemon, remote debugging on port 9229
- **Environment**: NODE_ENV=development, DEBUG=true

**Use when:**
- Developing and testing agent code
- Debugging agent behavior
- Investigating system issues
- Prototyping new features

## Building Images

### Using the build script (recommended):
```bash
# Build both variants
./build-images.sh

# Build and push to registry
./build-images.sh --push --registry myregistry

# Build with specific version
./build-images.sh --version 1.2.3
```

### Manual building:
```bash
# Production image
docker build --build-arg BUILD_TARGET=production -f Dockerfile.multi-stage -t magents/agent:latest .

# Development image
docker build --build-arg BUILD_TARGET=development -f Dockerfile.multi-stage -t magents/agent:dev .
```

## Using Images

### Production deployment:
```bash
# Using docker run
docker run -d \
  -v $(pwd):/workspace \
  -v /var/run/claude-code-bridge.sock:/host/claude-bridge.sock \
  magents/agent:latest

# Using docker-compose
docker-compose up -d
```

### Development with debugging:
```bash
# Using docker run with debugger
docker run -it \
  -p 9229:9229 \
  -v $(pwd):/workspace \
  -v /var/run/claude-code-bridge.sock:/host/claude-bridge.sock \
  magents/agent:dev

# Using docker-compose with dev overlay
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Remote debugging:
Connect your debugger to `localhost:9229` (or configured port) when using the development image.

## Image Size Comparison

Typical sizes:
- **Production**: ~400MB (Node.js + essential tools)
- **Development**: ~600MB (includes debugging tools)

## CI/CD Integration

GitHub Actions automatically builds and publishes both variants:
- On push to `main`: Updates `:latest` and `:dev` tags
- On version tags: Creates versioned images (e.g., `:1.2.3`, `:dev-1.2.3`)
- On PRs: Builds and tests both variants without pushing

## Testing Images

Run the test suite to verify both variants:
```bash
./test-variants.sh
```

This will:
1. Build both image variants
2. Verify common tools in both
3. Verify dev tools only in development
4. Check environment variables
5. Compare image sizes

## Environment Variables

Both variants support:
- `WORKSPACE_DIR` - Working directory mount point
- `SHARED_DIR` - Shared configuration directory  
- `AGENT_DIR` - Agent-specific data directory
- `CLAUDE_BRIDGE_SOCKET` - Path to Claude Code bridge socket

Development variant adds:
- `NODE_ENV=development`
- `DEBUG=true`
- `NODE_OPTIONS=--inspect=0.0.0.0:9229`