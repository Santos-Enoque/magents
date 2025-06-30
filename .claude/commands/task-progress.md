Show progress across all Task Master tasks and active agents.

## Actions

1. **Show overall task progress:**
   ```bash
   tm list
   ```

2. **Show active agents and their tasks:**
   ```bash
   magents list
   ```

3. **For each agent with a task, show detailed status:**
   ```bash
   # Get task IDs from agent names
   magents list --json | jq -r '.[] | select(.id | contains("task-")) | .id' | while read agent_id; do
     # Extract task ID from agent name (e.g., task-1.2-agent -> 1.2)
     task_id=$(echo "$agent_id" | sed 's/task-\(.*\)-agent/\1/')
     echo "\n📊 Agent: $agent_id (Task $task_id)"
     tm show "$task_id" 2>/dev/null || echo "  Task not found"
   done
   ```

4. **Show dependency graph:**
   ```bash
   tm validate-dependencies
   ```

5. **Show complexity report:**
   ```bash
   tm complexity-report
   ```

## Summary View
- ✅ Completed tasks
- 🔄 In-progress tasks (with active agents)
- ⏳ Pending tasks (ready to start)
- 🚫 Blocked tasks (waiting on dependencies)

## Notes
- Helps coordinate multi-agent development
- Shows which tasks are actively being worked on
- Identifies bottlenecks and dependencies
- Useful for daily standups and planning