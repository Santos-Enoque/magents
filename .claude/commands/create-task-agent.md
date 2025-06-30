Create an intelligent agent for a Task Master task with full project context.

## Usage
Provide a Task Master task ID (e.g., 1.2)

## Actions

1. **Fetch task details:**
   ```bash
   tm show $ARGUMENTS
   ```

2. **Create intelligent agent with automatic setup:**
   ```bash
   magents task-create $ARGUMENTS --prefix feature --create-issue
   ```

3. **What this does:**
   - Creates a dedicated git worktree for the task
   - Inherits all Task Master settings from base project
   - Parses PRD automatically in agent context
   - Creates comprehensive task briefing
   - Creates GitHub issue for tracking
   - Sets up complete development environment

4. **Show agent details:**
   ```bash
   magents list | grep "task-$ARGUMENTS"
   ```

5. **Next steps:**
   - Attach to the agent: `magents attach task-$ARGUMENTS-agent`
   - Start structured workflow: `/work-issue $ARGUMENTS`

## Notes
- Agent will have complete project awareness
- Task Master is fully configured in the agent
- All AI models and settings are inherited
- Agent knows exactly what task to work on