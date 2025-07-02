#!/bin/bash
# Volume initialization script for magents Docker containers
set -e

# Function to initialize a directory with proper permissions
init_directory() {
    local dir=$1
    local desc=$2
    
    if [ ! -d "$dir" ]; then
        echo "Creating $desc directory: $dir"
        mkdir -p "$dir"
    fi
    
    # Ensure magents user owns the directory
    if [ "$(stat -c %u "$dir" 2>/dev/null || stat -f %u "$dir" 2>/dev/null)" != "1001" ]; then
        echo "Setting ownership for $dir"
        sudo chown -R 1001:1001 "$dir" 2>/dev/null || true
    fi
}

echo "=== Initializing Magents Volume Directories ==="

# Initialize shared directory structure
if [ -d "/shared" ] && [ -w "/shared" ]; then
    init_directory "/shared/config" "shared configuration"
    init_directory "/shared/cache" "shared cache"
    init_directory "/shared/logs" "shared logs"
    
    # Create default shared config if not exists
    if [ ! -f "/shared/config/magents.json" ]; then
        cat > "/shared/config/magents.json" << EOF
{
  "version": "1.0.0",
  "shared": {
    "apiKeys": {},
    "settings": {
      "defaultBranch": "main",
      "autoCommit": false,
      "verboseLogging": false
    }
  }
}
EOF
        chown 1001:1001 "/shared/config/magents.json"
    fi
fi

# Initialize agent-specific directory structure
if [ -d "/agent" ] && [ -w "/agent" ]; then
    init_directory "/agent/state" "agent state"
    init_directory "/agent/logs" "agent logs"
    init_directory "/agent/tmp" "agent temporary files"
    init_directory "/agent/.ssh" "agent SSH keys"
    chmod 700 "/agent/.ssh"
    
    # Create agent identity file if not exists
    if [ ! -f "/agent/state/identity.json" ]; then
        cat > "/agent/state/identity.json" << EOF
{
  "agentId": "${AGENT_ID:-unknown}",
  "agentName": "${AGENT_NAME:-magents-agent}",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "1.0.0"
}
EOF
        chown 1001:1001 "/agent/state/identity.json"
    fi
fi

# Initialize workspace (if empty)
if [ -d "/workspace" ] && [ -w "/workspace" ]; then
    # Check if workspace is empty (excluding .git)
    if [ -z "$(ls -A /workspace 2>/dev/null | grep -v '^\.git$')" ]; then
        echo "Workspace is empty, creating README"
        cat > "/workspace/README.md" << EOF
# Magents Workspace

This is your agent's workspace directory. Place your project files here.

## Volume Mappings

- \`/workspace\` - Your project files (bind mounted from host)
- \`/shared\` - Shared configuration across all agents
- \`/agent\` - Agent-specific persistent data

## Getting Started

1. Place your project files in this directory
2. Use Task Master to manage tasks: \`task-master list\`
3. Use Claude Code via bridge: \`claude --help\`

For more information, see: https://github.com/magents/magents
EOF
        chown 1001:1001 "/workspace/README.md" 2>/dev/null || true
    fi
fi

# Set up proper permissions for Task Master config
if [ -d "/home/magents/.taskmaster" ]; then
    echo "Task Master configuration found"
    # Ensure read access
    chmod -R a+r "/home/magents/.taskmaster" 2>/dev/null || true
fi

echo "=== Volume initialization complete ==="

# Show volume status
echo -e "\nVolume Status:"
echo "- Workspace: $([ -d "/workspace" ] && echo "✓ Mounted" || echo "✗ Not mounted")"
echo "- Shared: $([ -d "/shared" ] && echo "✓ Mounted" || echo "✗ Not mounted")"
echo "- Agent: $([ -d "/agent" ] && echo "✓ Mounted" || echo "✗ Not mounted")"
echo "- Task Master: $([ -d "/home/magents/.taskmaster" ] && echo "✓ Mounted" || echo "✗ Not mounted")"
echo "- Claude Bridge: $([ -S "/host/claude-bridge.sock" ] && echo "✓ Connected" || echo "✗ Not connected")"

# Run any additional initialization commands passed as arguments
if [ $# -gt 0 ]; then
    echo -e "\nRunning additional commands: $@"
    exec "$@"
fi