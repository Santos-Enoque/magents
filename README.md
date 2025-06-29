# magents

> Multi-Agent Claude Code Workflow Manager

Manage multiple Claude Code instances working on separate git worktrees simultaneously. Perfect for parallel development without conflicts.

## Features

- 🔧 **Automated Worktree Management** - Creates isolated git worktrees for each agent
- 🖥️ **Tmux Session Management** - Each agent gets its own tmux session
- 📊 **Agent Status Tracking** - Easy monitoring of all running instances
- ⚡ **Auto-Accept Commands** - Claude Code runs without prompting
- 🎯 **Branch Isolation** - Work on multiple features simultaneously

## Installation

```bash
npm install -g magents
```

## Requirements

- **git** - Version control
- **tmux** - Terminal multiplexer
- **claude** - Claude Code CLI tool

## Quick Start

```bash
# Create a new agent for feature development
magents create feature/user-dashboard dashboard

# List all running agents
magents list

# Attach to an agent
magents attach dashboard

# Stop an agent when done
magents stop dashboard
```

## Usage

### Create Agent
```bash
magents create <branch> [agent-id]
```
Creates a new git worktree and starts Claude Code in a tmux session.

### List Agents
```bash
magents list
```
Shows all active agents with their status.

### Attach to Agent
```bash
magents attach <agent-id>
```
Connects to an existing agent's tmux session.

### Stop Agent
```bash
magents stop <agent-id>
```
Stops an agent and optionally removes its worktree.

### Cleanup All
```bash
magents cleanup
```
Stops all agents and cleans up resources.

## Configuration

Configuration file: `~/.magents-config`

```bash
# Default settings
DEFAULT_BASE_BRANCH=main
TMUX_SESSION_PREFIX=magent
WORKTREE_PREFIX=agent
MAX_AGENTS=5
CLAUDE_CODE_PATH=claude
CLAUDE_AUTO_ACCEPT=true
```

## Tmux Navigation

Once attached to an agent:
- `Ctrl+b, 1`: Main window
- `Ctrl+b, 2`: Claude Code window  
- `Ctrl+b, 3`: Git window
- `Ctrl+b, d`: Detach (keeps running)

## Workflow Benefits

1. **Parallel Development** - Multiple Claude Code instances work simultaneously
2. **Branch Isolation** - Each agent works on separate branches
3. **Easy Context Switching** - Jump between agents instantly
4. **Resource Management** - Clean shutdown and cleanup
5. **Persistent Sessions** - Agents survive terminal disconnections

## Examples

```bash
# Start working on authentication feature
magents create feature/auth-system auth

# Start working on payment integration in parallel
magents create feature/payments pay

# Check what's running
magents list

# Switch between agents
magents attach auth
magents attach pay

# Finish and clean up
magents stop auth
magents stop pay
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

- 🐛 [Report bugs](https://github.com/yourusername/magents/issues)
- 💡 [Request features](https://github.com/yourusername/magents/issues)
- 📖 [Documentation](https://github.com/yourusername/magents/wiki)