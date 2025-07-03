# Magents Docker Images

This directory contains Docker configurations for building Magents agent containers.

## Building Images

### Basic Build

```bash
# Build production image (without TaskMaster)
./build-images.sh

# Build with TaskMaster integration
./build-images.sh --with-taskmaster
```

### Build Options

- `--with-taskmaster`: Include Task Master CLI in the image (optional integration)
- `--push`: Push images to Docker registry after building
- `--registry <name>`: Specify custom registry (default: magents)
- `--version <tag>`: Specify version tag (default: timestamp)
- `--no-latest`: Don't tag images as 'latest'

### Examples

```bash
# Build development image with TaskMaster
./build-images.sh --with-taskmaster

# Build and push to custom registry
./build-images.sh --registry myregistry --push

# Build specific version
./build-images.sh --version v1.0.0 --with-taskmaster
```

## Image Variants

### Production Image
- Minimal footprint
- Essential tools only
- No development tools
- Optional TaskMaster integration

### Development Image
- Includes debugging tools
- Development utilities
- Larger image size
- Optional TaskMaster integration

## Environment Variables

### TaskMaster Integration

When running containers, you can control TaskMaster integration with:

```bash
# Enable TaskMaster (if installed in image)
docker run -e TASK_MASTER_ENABLED=true magents/agent:latest

# Provide API keys for TaskMaster AI features
docker run \
  -e TASK_MASTER_ENABLED=true \
  -e ANTHROPIC_API_KEY=your_key \
  -e PERPLEXITY_API_KEY=your_key \
  magents/agent:latest
```

### Other Environment Variables

- `WORKSPACE_DIR`: Working directory for agent (default: /workspace)
- `SHARED_DIR`: Shared data directory (default: /shared)
- `AGENT_DIR`: Agent-specific directory (default: /agent)
- `NODE_ENV`: Node environment (production/development)

## Manual Docker Build

If you prefer to build directly with Docker:

```bash
# Production image without TaskMaster
docker build \
  --build-arg BUILD_TARGET=production \
  --build-arg INCLUDE_TASKMASTER=false \
  -f Dockerfile.multi-stage \
  -t magents/agent:latest .

# Development image with TaskMaster
docker build \
  --build-arg BUILD_TARGET=development \
  --build-arg INCLUDE_TASKMASTER=true \
  -f Dockerfile.multi-stage \
  -t magents/agent:dev .
```

## Running Containers

```bash
# Basic run
docker run -it magents/agent:latest

# With volumes
docker run -it \
  -v $(pwd):/workspace \
  -v /shared/data:/shared \
  magents/agent:latest

# With TaskMaster enabled
docker run -it \
  -e TASK_MASTER_ENABLED=true \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -v $(pwd):/workspace \
  magents/agent:latest
```

## Health Check

All images include a health check endpoint on port 3999:

```bash
# Check container health
curl http://localhost:3999/health
```

## Notes

- TaskMaster is an optional integration that can be included at build time
- If TaskMaster is not included in the image, setting TASK_MASTER_ENABLED will have no effect
- The integration system allows for future task management backends beyond TaskMaster