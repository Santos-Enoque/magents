#!/bin/bash

echo "Looking for active_agents file..."

# Check common locations
locations=(
  "$HOME/.magents/active_agents"
  "./.magents/active_agents"
  "$PWD/.magents/active_agents"
)

for loc in "${locations[@]}"; do
  if [ -f "$loc" ]; then
    echo "Found active_agents at: $loc"
    echo "Contents:"
    cat "$loc"
    echo ""
    read -p "Remove this file to clear all agents? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      rm "$loc"
      echo "Removed $loc"
    fi
  fi
done

# Also check if the agents are tracked elsewhere
echo ""
echo "Checking for tmux sessions..."
tmux ls 2>/dev/null | grep magent || echo "No magent tmux sessions found"

echo ""
echo "Checking for git worktrees in parent directories..."
cd ~/Development/projects 2>/dev/null && git worktree list 2>/dev/null | grep -E "(task-1-agent|task-9-agent)" || echo "No matching worktrees found"

echo ""
echo "To manually clean up:"
echo "1. Remove any active_agents file you find"
echo "2. Kill tmux sessions: tmux kill-session -t magent-task-1-agent"
echo "3. Remove worktrees from their git repo: git worktree remove <path> --force"