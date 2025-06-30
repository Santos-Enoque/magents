Check and update the status of the current task.

## Actions

1. Show current task details: `tm show $ARGUMENTS` or from `.taskmaster/current-task.json`
2. Display task status, dependencies, and subtasks
3. Show recent progress updates
4. If task is not started, mark as in-progress: `tm set-status --id=$ARGUMENTS --status=in_progress`
5. Show available commands for progress tracking:
   - `tm update-subtask --id=$ARGUMENTS --prompt="implementation notes"`
   - `tm set-status --id=$ARGUMENTS --status=done`