# Cleanup Guide for Magents

## Complete Cleanup Command

To completely remove all agents, worktrees, and data:

```bash
# Run the force cleanup script
./force-cleanup-all.sh
```

Or manually:

```bash
# 1. Kill all tmux sessions
tmux list-sessions | grep "magent-" | cut -d: -f1 | xargs -I {} tmux kill-session -t {}

# 2. Remove all agent worktrees
git worktree list | grep -E "(agent-|system-)" | awk '{print $1}' | xargs -I {} git worktree remove {} --force

# 3. Prune dangling worktrees
git worktree prune

# 4. Remove agent data file
rm ~/.magents/active_agents

# 5. Verify cleanup
magents ls  # Should show "No active agents found"
git worktree list  # Should only show main worktree
```

## Partial Cleanup Options

### Remove specific agent
```bash
magents stop <agent-id> --remove-worktree
```

### Stop all agents but keep worktrees
```bash
magents cleanup
# Answer 'N' when asked about removing worktrees
```

### Fix orphaned agents
```bash
magents cleanup --fix-orphaned
```

## What Gets Cleaned

1. **Tmux Sessions**: All sessions starting with `magent-`
2. **Git Worktrees**: All worktrees in parent directory
3. **Git Branches**: Associated feature branches (optional)
4. **Agent Data**: Records in `~/.magents/active_agents`

## After Cleanup

You'll have a fresh slate to create new agents:

```bash
# Test the system is clean
magents ls  # Should show no agents

# Create new agents
magents create auth-system
magents create dashboard --mode standard
```

## Known Issues

1. The interactive `magents cleanup` command has a readline issue - use the force cleanup script instead
2. Some worktrees might need manual removal if they're in a bad state
3. Branches are not automatically deleted - use `git branch -D <branch>` if needed

## Data Locations

- **Agent records**: `~/.magents/active_agents`
- **Config file**: `~/.magents-config`
- **Worktrees**: Parent directory of your main repo
- **Tmux sessions**: System tmux (check with `tmux ls`)

The force cleanup script handles all of these automatically!