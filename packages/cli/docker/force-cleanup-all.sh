#!/bin/bash

# Force cleanup all agents and worktrees

echo "🧹 Force cleaning up all agents and worktrees..."
echo ""

# Get magents agent data directory
AGENTS_DIR="$HOME/.magents/agents"

# List current agents
echo "📋 Current agents:"
ls -la "$AGENTS_DIR" 2>/dev/null || echo "No agents directory found"
echo ""

# Kill all tmux sessions starting with 'magent-'
echo "🔪 Killing all tmux sessions..."
tmux list-sessions -F "#{session_name}" 2>/dev/null | grep "^magent-" | while read session; do
    echo "  Killing session: $session"
    tmux kill-session -t "$session" 2>/dev/null || true
done

# Remove all agent worktrees
echo ""
echo "🗑️  Removing git worktrees..."
git worktree list --porcelain | grep "^worktree" | cut -d' ' -f2 | while read worktree; do
    if [[ "$worktree" == *"/agent-"* ]] || [[ "$worktree" == *"system-"* ]]; then
        echo "  Removing worktree: $worktree"
        git worktree remove "$worktree" --force 2>/dev/null || true
    fi
done

# Clean up any dangling worktrees
git worktree prune

# Remove agent data files
echo ""
echo "📁 Removing agent data..."
if [ -d "$AGENTS_DIR" ]; then
    rm -rf "$AGENTS_DIR"/*
    echo "  ✓ Cleared agent data directory"
else
    echo "  No agent data directory found"
fi

# List remaining worktrees
echo ""
echo "📊 Remaining worktrees:"
git worktree list

# List remaining tmux sessions
echo ""
echo "📊 Remaining tmux sessions:"
tmux list-sessions 2>/dev/null | grep "magent-" || echo "  No magent sessions found"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "You can now create fresh agents with:"
echo "  magents create auth-system"
echo "  magents create dashboard --mode standard"
echo ""