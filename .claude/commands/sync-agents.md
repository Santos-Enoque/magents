Synchronize Task Master configuration across all active agents.

## Actions

1. **List all active agents:**
   ```bash
   magents list
   ```

2. **For each active agent, sync Task Master:**
   ```bash
   # Extract agent IDs and sync each one
   magents list --json | jq -r '.[] | .id' | while read agent_id; do
     echo "Syncing Task Master to agent: $agent_id"
     magents sync-taskmaster "$agent_id"
   done
   ```

3. **Verify sync status:**
   ```bash
   # Check Task Master is available in each agent
   magents list --json | jq -r '.[] | .worktreePath' | while read path; do
     echo "Checking: $path"
     ls -la "$path/.taskmaster" 2>/dev/null || echo "  ⚠️  Task Master not found"
   done
   ```

## What Gets Synced
- Task Master configuration (config.json)
- AI model settings
- PRD documents
- Task database (tasks.json)
- All task markdown files

## Notes
- Use after updating Task Master config in base project
- Ensures all agents have latest task information
- Maintains consistency across parallel development