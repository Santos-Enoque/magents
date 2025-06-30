# 🚀 Magents Quick Start Guide

Get up and running with Magents in 5 minutes!

## Prerequisites Check

```bash
# Check Node.js (need 16+)
node --version

# Check Git (need 2.20+)
git --version

# Check tmux
tmux -V

# Check Claude Code
claude --version

# Check Docker (optional)
docker --version
```

## Installation

```bash
# Install globally from npm
npm install -g magents

# Or install from source
git clone https://github.com/Santos-Enoque/magents.git
cd magents
npm install && npm run build && npm link
```

## Initialize Magents

```bash
# Create configuration
magents init

# Verify installation
magents --version
```

## Your First Agent (2 minutes)

### Step 1: Create an Agent

```bash
# Navigate to your git repository
cd /path/to/your/project

# Create an agent for a new feature
magents create feature/add-login-page login-agent
```

What happens:
- ✅ Creates a new git branch `feature/add-login-page`
- ✅ Sets up a git worktree in `../project-login-agent`
- ✅ Starts tmux session with Claude Code
- ✅ Copies your Claude settings
- ✅ Injects context about the task

### Step 2: Attach to Your Agent

```bash
# Connect to the agent
magents attach login-agent
```

You're now in a tmux session with 3 windows:
- **Window 1 (main)**: Your terminal
- **Window 2 (claude)**: Claude Code is running here
- **Window 3 (git)**: For git operations

### Step 3: Work with Claude

In the Claude window (Ctrl+b, 2):
```
You: Implement a login page with email and password fields
Claude: I'll help you create a login page...
```

### Step 4: Check Your Work

```bash
# In the git window (Ctrl+b, 3)
git status
git add .
git commit -m "Add login page"
```

### Step 5: Detach and Continue Later

```bash
# Detach from tmux (agent keeps running)
Ctrl+b, d

# List your agents
magents list

# Come back anytime
magents attach login-agent
```

## Common Workflows

### Multiple Features in Parallel

```bash
# Terminal 1: Work on authentication
magents create feature/auth auth-agent
magents attach auth-agent

# Terminal 2: Work on dashboard
magents create feature/dashboard dashboard-agent
magents attach dashboard-agent

# Terminal 3: Work on API
magents create feature/api api-agent
magents attach api-agent
```

### Add Context to Your Agents

```bash
# Create agent with specific task
magents create feature/payment payment-agent \
  --task "Implement Stripe payment integration" \
  --env "STRIPE_KEY=sk_test_..." \
  --service "api=http://localhost:4000"
```

### Use Docker for Complete Isolation

```bash
# Create agent in Docker container
magents create feature/experimental exp-agent \
  --docker \
  --ports "5000-5010:5000-5010"
```

### Clean Up When Done

```bash
# Stop single agent
magents stop login-agent

# Stop and remove worktree
magents stop login-agent --remove-worktree

# Stop all agents
magents cleanup
```

## Tmux Shortcuts Cheat Sheet

| Action | Shortcut |
|--------|----------|
| Switch to main window | `Ctrl+b, 1` |
| Switch to Claude window | `Ctrl+b, 2` |
| Switch to git window | `Ctrl+b, 3` |
| Detach from session | `Ctrl+b, d` |
| Scroll up/down | `Ctrl+b, [` then arrows |
| Exit scroll mode | `q` |
| Create new window | `Ctrl+b, c` |
| Kill current window | `Ctrl+b, &` |

## Environment-Specific Setup

### For GitHub Codespaces

```bash
# Check environment
magents env

# Create agent with auto-detected settings
magents create feature/test test-agent
# Automatically uses --dangerously-skip-permissions
```

### For Limited Resources

```bash
# Use fewer agents
magents config -e
# Set MAX_AGENTS to 2 or 3

# Skip Docker
magents create feature/test test-agent
# Don't use --docker flag
```

## Next Steps

1. **Read the full README**: Understand all features
2. **Check the Commands Reference**: Learn all available commands
3. **Try Advanced Features**: Docker isolation, port management
4. **Integrate with your workflow**: Add to your development process

## Getting Help

```bash
# Built-in help
magents --help
magents create --help

# Check your environment
magents env --info

# List your configuration
magents config
```

## Pro Tips

1. **Name agents clearly**: Use descriptive names like `auth-agent`, `payment-agent`
2. **Always provide context**: Use `--task` to describe what the agent should do
3. **Check agent status**: Run `magents list` regularly
4. **Clean up**: Don't leave unused agents running
5. **Use projects**: Group related agents with `magents project create`

## Example: Full Feature Development

```bash
# 1. Create a project
magents project create . --name "My App" --ports 3000-3010

# 2. Create backend agent
magents create feature/backend backend \
  --task "Create REST API with Express" \
  --env "PORT=3001" \
  --env "DATABASE_URL=postgres://localhost/myapp"

# 3. Create frontend agent
magents create feature/frontend frontend \
  --task "Create React UI" \
  --env "PORT=3000" \
  --env "API_URL=http://localhost:3001"

# 4. Work on both in parallel
# Terminal 1
magents attach backend

# Terminal 2
magents attach frontend

# 5. Check status
magents list

# 6. Clean up when done
magents cleanup --remove-worktrees
```

## Troubleshooting Quick Fixes

### "Agent already exists"
```bash
magents list  # Check existing agents
magents stop old-agent  # Stop the old one
```

### "Port already in use"
```bash
magents ports --list  # Check allocated ports
magents create feature/test test --ports "5000-5010:5000-5010"
```

### "Can't attach to agent"
```bash
tmux ls  # Check tmux sessions
magents stop broken-agent
magents create feature/test test  # Recreate
```

### "Docker not working"
```bash
docker ps  # Check Docker daemon
# Use without Docker
magents create feature/test test  # No --docker flag
```

---

🎉 **You're ready to use Magents!** Start creating agents and boost your development workflow.