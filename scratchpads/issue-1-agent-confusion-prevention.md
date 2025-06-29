# Issue #1: Claude Agent Confusion Prevention

GitHub Issue: https://github.com/[repo]/issues/1

## Problem Analysis

Multiple Claude Code agents running simultaneously can get confused by:
- Services from other projects (e.g., detecting Next.js on port 3000 from another project)
- File searches crossing project boundaries
- Shared system resources
- Lack of clear project context

## Current State

The codebase already provides:
- ✅ File system isolation via git worktrees
- ✅ Process isolation via tmux sessions
- ✅ Separate working directories per agent
- ✅ Configuration file copying (CLAUDE.md, .claude-settings.json)

Missing features:
- ❌ Environment variable isolation/customization
- ❌ Project context injection
- ❌ Service discovery boundaries
- ❌ Enhanced CLAUDE.md with agent context

## Implementation Plan

### Phase 1: Environment Context System
1. **Extend AgentData interface** to include environment context
2. **Create AgentEnvironment interface** for environment variables
3. **Modify AgentManager.createAgent** to inject context

### Phase 2: Context Injection
1. **Create context template system**
2. **Enhance CLAUDE.md generation** with agent-specific context
3. **Add environment variable injection** to tmux session

### Phase 3: Service Boundaries
1. **Add service discovery configuration**
2. **Implement port allocation tracking**
3. **Document isolation best practices**

### Phase 4: Testing & Documentation
1. **Add unit tests** for context injection
2. **Update README** with isolation features
3. **Add examples** of context usage

## Detailed Implementation Steps

### 1. Update Types (src/types/index.ts)
```typescript
interface AgentEnvironment {
  PROJECT_ROOT: string;
  PROJECT_NAME: string;
  ALLOWED_PORTS?: string;
  AGENT_ID: string;
  AGENT_TASK?: string;
  ISOLATION_MODE?: 'strict' | 'permissive';
}

interface AgentData {
  // ... existing fields
  environment?: AgentEnvironment;
  context?: {
    task?: string;
    services?: Record<string, string>;
    boundaries?: string[];
  };
}
```

### 2. Enhance ConfigManager
- Add methods for managing agent environment
- Store environment context with agent data

### 3. Modify AgentManager
- Accept environment options in createAgent
- Generate agent context file
- Inject environment variables into tmux session

### 4. Update CLAUDE.md Generation
- Prepend agent context to CLAUDE.md
- Include project boundaries
- Add service information

### 5. CLI Enhancement
- Add --env flag for environment variables
- Add --task flag for task description
- Add --context flag for additional context

## Example Usage

```bash
magents create feature/auth auth-agent \
  --task "Implement authentication system" \
  --env "PROJECT_NAME=my-app" \
  --env "API_PORT=4000" \
  --context "services.web=http://localhost:3000"
```

## Testing Strategy

1. Unit tests for environment injection
2. Integration tests for context file generation
3. Manual testing with multiple agents
4. Verify isolation boundaries work correctly

## Success Criteria

- [ ] Agents receive clear project context
- [ ] No cross-project file access
- [ ] Service discovery is scoped
- [ ] Environment variables are isolated
- [ ] Context is visible in CLAUDE.md