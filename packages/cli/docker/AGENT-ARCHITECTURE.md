# Magents Docker Agent Architecture

## Current Challenge

The Claude bridge is having issues because:
1. Node.js spawn can't properly execute the claude CLI with its complex shebang
2. Path resolution issues between different execution environments
3. The claude CLI itself is a Node.js script with specific requirements

## Recommended Architecture

### Option 1: API-Based Agents (Recommended)

Instead of bridging Claude Code, use Task Master with API keys:

```yaml
# docker-compose.agents.yml
services:
  agent-1:
    image: magents/agent:latest
    environment:
      - AGENT_NAME=researcher
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./workspace:/workspace
      - taskmaster-config:/home/magents/.taskmaster
    command: |
      bash -c "
        task-master models --set-main claude-3-5-sonnet-20241022
        task-master next
        # Agent can now use Task Master with full AI capabilities
      "

  agent-2:
    image: magents/agent:latest
    environment:
      - AGENT_NAME=developer
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    # ... similar config
```

**Benefits:**
- No bridge complexity
- Agents are fully autonomous
- Can scale to many agents easily
- Works reliably across platforms

### Option 2: Direct Claude Installation in Containers

Install Claude in each container with shared config:

```dockerfile
# Dockerfile.agent
FROM magents/agent:base

# Install Claude in container
RUN npm install -g @anthropic-ai/claude-cli

# Mount shared Claude config
VOLUME /home/magents/.config/claude
```

Then share the config directory:

```bash
docker run -v ~/.config/claude:/home/magents/.config/claude:ro magents/agent
```

### Option 3: HTTP API Bridge (If Bridge Required)

Instead of Unix sockets, use an HTTP API:

```javascript
// claude-http-bridge.js
const express = require('express');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

app.post('/claude', (req, res) => {
  const { args } = req.body;
  exec(`claude ${args.join(' ')}`, (error, stdout, stderr) => {
    res.json({ 
      stdout, 
      stderr, 
      code: error ? error.code : 0 
    });
  });
});

app.listen(3000);
```

Agents connect via HTTP instead of Unix sockets.

## Recommended Approach for Magents

Given your use case of multiple AI agents, I strongly recommend **Option 1** using Task Master with API keys because:

1. **Simplicity**: No complex bridge architecture
2. **Reliability**: API calls always work
3. **Scalability**: Can run 100s of agents
4. **Features**: Task Master provides everything needed:
   - Task management
   - AI model access (Claude, GPT, etc.)
   - Code generation
   - Project understanding

## Implementation Steps

1. **Update AgentManager.ts** to use Docker instead of tmux:

```typescript
async createAgent(name: string): Promise<void> {
  // Instead of creating worktree...
  const containerName = `magents-agent-${name}`;
  
  await execAsync(`docker run -d \
    --name ${containerName} \
    -e AGENT_NAME=${name} \
    -e ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY} \
    -v ${this.projectRoot}:/workspace \
    -v magents-shared:/shared \
    magents/agent:latest \
    tail -f /dev/null`);
}
```

2. **Create agent startup script** in container:

```bash
#!/bin/bash
# /usr/local/bin/agent-start.sh

# Configure Task Master
task-master models --set-main claude-3-5-sonnet-20241022
task-master models --set-research perplexity-sonar

# Start agent work loop
while true; do
  # Get next task
  TASK=$(task-master next --json)
  
  if [ -n "$TASK" ]; then
    TASK_ID=$(echo $TASK | jq -r '.id')
    
    # Mark as in progress
    task-master set-status --id=$TASK_ID --status=in-progress
    
    # Execute task (this is where the AI magic happens)
    task-master execute --id=$TASK_ID
    
    # Mark complete
    task-master set-status --id=$TASK_ID --status=done
  else
    sleep 60
  fi
done
```

3. **Multi-agent orchestration**:

```yaml
# docker-compose.yml
services:
  orchestrator:
    image: magents/orchestrator
    command: |
      # Assign tasks to agents based on expertise
      # Monitor agent health
      # Coordinate agent communication

  agent-researcher:
    image: magents/agent
    environment:
      - AGENT_TYPE=researcher
      - AGENT_SKILLS=research,analysis,documentation

  agent-developer:
    image: magents/agent  
    environment:
      - AGENT_TYPE=developer
      - AGENT_SKILLS=coding,testing,debugging

  agent-reviewer:
    image: magents/agent
    environment:
      - AGENT_TYPE=reviewer
      - AGENT_SKILLS=code-review,quality-assurance
```

This architecture is much more robust and aligns with your goal of autonomous AI agents without the complexity of the Claude bridge.