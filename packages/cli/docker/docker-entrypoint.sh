#!/bin/bash
set -e

# Function to handle signals for graceful shutdown
cleanup() {
    echo "Received shutdown signal, cleaning up..."
    
    # Save any tmux sessions
    if command -v tmux &> /dev/null && tmux list-sessions &> /dev/null; then
        echo "Saving tmux sessions..."
        tmux list-sessions -F "#{session_name}" | while read session; do
            tmux send-keys -t "$session" C-c
            sleep 1
        done
    fi
    
    # Sync filesystem
    sync
    
    echo "Cleanup complete, exiting..."
    exit 0
}

# Trap termination signals
trap cleanup SIGTERM SIGINT SIGQUIT

# Initialize environment
echo "Initializing magents agent container..."

# Run volume initialization
if [ -f "/usr/local/bin/init-volumes.sh" ]; then
    /usr/local/bin/init-volumes.sh
else
    # Fallback if init script not found
    if [ -d "$WORKSPACE_DIR" ]; then
        echo "Workspace directory found at $WORKSPACE_DIR"
    fi

    if [ -d "$SHARED_DIR" ]; then
        echo "Shared directory found at $SHARED_DIR"
    fi

    if [ -d "$AGENT_DIR" ]; then
        echo "Agent directory found at $AGENT_DIR"
    fi
fi

# Create .gitconfig if not exists
if [ ! -f "$HOME/.gitconfig" ]; then
    git config --global user.email "agent@magents.local"
    git config --global user.name "Magents Agent"
    git config --global init.defaultBranch main
fi

# Initialize tmux configuration
if [ ! -f "$HOME/.tmux.conf" ]; then
    cat > "$HOME/.tmux.conf" << 'EOF'
# Enable mouse support
set -g mouse on

# Set prefix to Ctrl-a
set -g prefix C-a
unbind C-b
bind C-a send-prefix

# Split panes with | and -
bind | split-window -h
bind - split-window -v

# Reload config with r
bind r source-file ~/.tmux.conf \; display "Config reloaded!"

# Status bar
set -g status-bg colour235
set -g status-fg white
set -g status-left '#[fg=green]#S '
set -g status-right '#[fg=yellow]#(whoami)@#H'

# History
set -g history-limit 10000
EOF
fi

# Version check function
check_versions() {
    echo "=== System Information ==="
    echo "Node.js version: $(node --version)"
    echo "npm version: $(npm --version)"
    echo "yarn version: $(yarn --version)"
    echo "pnpm version: $(pnpm --version)"
    echo "Git version: $(git --version)"
    echo "Python version: $(python3 --version)"
    echo "tmux version: $(tmux -V)"
    echo "========================="
}

# Display versions
check_versions

# Check if Task Master is available and enabled
if [ "$TASK_MASTER_ENABLED" = "true" ]; then
    if command -v task-master &> /dev/null; then
        echo "Task Master is available and enabled"
        task-master --version || echo "Task Master version check failed"
    else
        echo "Warning: Task Master is enabled but not installed in this image"
        echo "To use Task Master, rebuild the image with --with-taskmaster flag"
    fi
else
    echo "Task Master integration is disabled (optional feature)"
fi

# Start health check server in background
if [ -f "/usr/local/bin/health-server.js" ]; then
    echo "Starting health check server..."
    node /usr/local/bin/health-server.js &
    HEALTH_PID=$!
    echo "Health check server started (PID: $HEALTH_PID)"
    
    # Ensure health server stops on exit
    trap "kill $HEALTH_PID 2>/dev/null || true; cleanup" EXIT
fi

# If no command provided, start interactive bash
if [ $# -eq 0 ]; then
    echo "Starting interactive shell..."
    exec /bin/bash
else
    echo "Executing command: $@"
    exec "$@"
fi