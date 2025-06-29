# Issue #2: Docker-based Project Isolation

GitHub Issue: https://github.com/[repo]/issues/2

## Problem Analysis

When running multiple Claude Code agents simultaneously:
- Port conflicts between projects (e.g., multiple Next.js on port 3000)
- Claude agents see services from other projects
- No resource isolation between projects
- File system access can cross boundaries

## Solution Overview

Implement Docker containers for complete project isolation:
- Each project runs in isolated container
- Dedicated network namespace per project
- Volume mounting for project files
- Port range allocation per container

## Implementation Plan

### Phase 1: Docker Infrastructure
1. Create Dockerfile template
2. Create docker-compose template generator
3. Implement DockerService class

### Phase 2: Integration
1. Add Docker mode to AgentManager
2. Update CLI with Docker options
3. Handle volume mounting for Claude settings

### Phase 3: Container Management
1. Container lifecycle management
2. Health checks
3. Resource limits

### Phase 4: Testing & Documentation
1. Test Docker isolation
2. Document Docker requirements
3. Add examples

## Detailed Implementation Steps

### 1. Create Docker Templates

#### Dockerfile Template
```dockerfile
FROM node:20-slim

# Install required tools
RUN apt-get update && apt-get install -y \
    git \
    tmux \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash developer
USER developer

WORKDIR /workspace

# Keep container running
CMD ["tail", "-f", "/dev/null"]
```

#### Docker Compose Template
```yaml
version: '3.8'
services:
  {{agent_id}}:
    build:
      context: .
      dockerfile: Dockerfile.magents
    container_name: magents-{{agent_id}}
    volumes:
      - {{project_path}}:/workspace
      - ~/.claude:/home/developer/.claude:ro
      - ~/.magents/{{agent_id}}:/home/developer/.magents
    ports:
      - "{{port_range}}"
    environment:
      - AGENT_ID={{agent_id}}
      - PROJECT_NAME={{project_name}}
      - PROJECT_ROOT=/workspace
    networks:
      - magents-{{agent_id}}
    restart: unless-stopped

networks:
  magents-{{agent_id}}:
    driver: bridge
```

### 2. DockerService Class

```typescript
export class DockerService {
  async createContainer(options: DockerContainerOptions): Promise<void>
  async startContainer(containerId: string): Promise<void>
  async stopContainer(containerId: string): Promise<void>
  async removeContainer(containerId: string): Promise<void>
  async execInContainer(containerId: string, command: string[]): Promise<void>
  containerExists(containerId: string): boolean
  getContainerStatus(containerId: string): ContainerStatus
}
```

### 3. Update Types

```typescript
interface DockerContainerOptions {
  agentId: string;
  projectPath: string;
  portRange: string;
  environment?: Record<string, string>;
}

interface CreateAgentOptions {
  // ... existing fields
  useDocker?: boolean;
  portRange?: string;
}
```

### 4. CLI Enhancement

```bash
magents create feature/auth auth-agent \
  --docker \
  --ports "3000-3010" \
  --task "Implement authentication"
```

## Testing Strategy

1. Test container creation and lifecycle
2. Verify port isolation between containers
3. Test file system isolation
4. Verify Claude settings mounting

## Success Criteria

- [ ] Containers provide complete isolation
- [ ] No port conflicts between projects
- [ ] Claude settings accessible in containers
- [ ] Easy container management via CLI
- [ ] Clean shutdown and cleanup