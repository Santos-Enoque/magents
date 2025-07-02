# 🤖 Magents - Multi-Agent Claude Code Workflow Manager

[![npm version](https://img.shields.io/npm/v/magents.svg)](https://www.npmjs.com/package/magents)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Issues](https://img.shields.io/github/issues/Santos-Enoque/magents.svg)](https://github.com/Santos-Enoque/magents/issues)

Magents is a powerful CLI tool for managing multiple Claude Code instances with git worktrees, enabling parallel AI-assisted development across different branches in isolated environments.

## 🚀 Why Magents?

While Claude Code has built-in subagents capabilities for parallel task execution, **Magents provides a complementary layer of orchestration** that focuses on:

1. **Branch-Level Isolation**: Each agent works on a separate git branch with its own worktree
2. **Persistent Sessions**: Agents run in tmux/Docker containers that persist across Claude sessions
3. **Resource Management**: Smart port allocation, Docker isolation, and environment-specific optimizations
4. **Project Organization**: Hierarchical project management with multi-repository support
5. **Configuration Sync**: Automatic Claude settings and MCP propagation across agents

### Magents vs Claude Subagents

| Feature | Claude Subagents | Magents |
|---------|-----------------|----------|
| **Scope** | Task-level parallelism | Branch-level parallelism |
| **Persistence** | Ephemeral (per conversation) | Persistent (tmux/Docker) |
| **Git Integration** | Limited | Full worktree isolation |
| **Resource Isolation** | Shared context | Separate processes/containers |
| **Use Case** | Parallel research/verification | Parallel feature development |

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Features](#features)
- [Docker Mode](#docker-mode)
- [Commands Reference](#commands-reference)
- [Task Master Integration](#task-master-integration)
- [Advanced Usage](#advanced-usage)
- [Integration with Claude Subagents](#integration-with-claude-subagents)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🛠️ Installation

### Prerequisites

- Node.js 16+ 
- Git 2.20+ (for worktree support)
- tmux (for local sessions)
- Docker & docker-compose (optional, for container isolation)
- Claude Code CLI installed

### Install from npm

```bash
npm install -g magents
```

### Install from source

```bash
git clone https://github.com/Santos-Enoque/magents.git
cd magents
npm install
npm run build
npm link
```

### Initialize Configuration

```bash
magents init
```

## 🏃 Quick Start

### 1. Create Your First Agent

```bash
# Create an agent for a new feature branch
magents create feature/authentication auth-agent

# The agent will:
# - Create a git worktree for the branch
# - Start a tmux session with Claude Code
# - Copy your Claude settings
# - Set up isolation boundaries
```

### 2. Attach to the Agent

```bash
# Attach to the agent's tmux session
magents attach auth-agent

# You'll see 3 tmux windows:
# - main: Your terminal
# - claude: Claude Code running
# - git: Git operations
```

### 3. List Active Agents

```bash
magents list

# Output:
# Active Claude Code agents:
# 
#   auth-agent         feature/authentication    RUNNING    /Users/you/project-auth-agent
#     Task: Implement user authentication system
```

## 🎯 Core Concepts

### Agents

An **agent** is an isolated Claude Code instance working on a specific branch:
- Has its own git worktree (no switching branches needed)
- Runs in a persistent tmux session or Docker container
- Receives context about its task and boundaries
- Can have environment variables and port allocations

### Projects

A **project** groups related agents and provides:
- Shared configuration and resources
- Port range management
- Docker network isolation (optional)
- Centralized agent management

### Environment Context

Each agent receives context through an enhanced `CLAUDE.md` file:
```markdown
# AGENT CONTEXT
**Agent ID:** auth-agent
**Branch:** feature/authentication
**Task:** Implement user authentication system

## Environment
- **Project Root:** /workspace
- **Allowed Ports:** 3000-3010

## Services
- **web:** http://localhost:3000
- **api:** http://localhost:4000

## Boundaries
- Do not modify database schemas
- Stay focused on authentication features
```

## ✨ Features

### 1. 🔒 Agent Isolation & Context

Prevent agents from interfering with each other:

```bash
# Create agent with specific context
magents create feature/auth auth-agent \
  --task "Implement OAuth2 authentication" \
  --env "API_PORT=4000" \
  --service "auth=http://localhost:4000" \
  --boundary "Do not modify user model"
```

### 2. 🐳 Docker-based Isolation

Complete project isolation with Docker:

```bash
# Create agent with Docker container
magents create feature/payment payment-agent \
  --docker \
  --ports "5000-5010:5000-5010" \
  --isolation strict
```

Benefits:
- No port conflicts between projects
- Resource limits per container
- Network isolation
- Easy cleanup

### 3. 📊 Project Management

Organize agents hierarchically:

```bash
# Create a project
magents project create /path/to/my-app \
  --name "My App" \
  --ports 3000-3010

# List projects
magents project list

# Create agents within projects
magents create feature/ui --project project-123
```

### 4. 🔌 Smart Port Management

Automatic port allocation and conflict detection:

```bash
# Detect ports used in project
magents ports --detect /path/to/project

# Allocate ports for a project
magents ports --allocate 5 --project project-123

# List all allocated ports
magents ports --list
```

### 5. ⚙️ Settings & MCP Sync

Synchronize Claude settings across agents:

```bash
# List Claude configuration files
magents settings --list

# Sync settings to an agent
magents settings --sync /path/to/agent-worktree

# Settings hierarchy:
# ~/.claude/ (global)
#   └── project/.magents/claude/ (project)
#       └── worktree/.claude/ (agent)
```

### 6. ☁️ Remote Development Support

Optimized for GitHub Codespaces and cloud environments:

```bash
# Check environment
magents env

# Output:
# Environment: codespaces
# Remote: Yes
# Claude Flags: --dangerously-skip-permissions
# Max Agents: 3

# Get optimized Claude command
magents env --claude-command
```

## 🐳 Docker Mode

Magents supports two modes for running AI agents:

### Traditional Mode (Default)
- Uses tmux sessions and git worktrees
- Direct Claude CLI access
- Lower resource usage
- Requires tmux installation

### Docker Mode
- Full container isolation
- API-based agent operation (Task Master with API keys)
- Better for multi-agent orchestration
- No Claude bridge complexity

#### Enable Docker Mode

```bash
# Enable globally
magents config --docker

# Or per-agent
magents create feature/ai-task --docker

# Build Docker image
cd packages/cli/docker && ./build.sh
```

#### Docker Agent Features

```bash
# Create Docker agent with API keys
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"

magents create feature/research research-agent --docker

# View container logs
docker logs magents-research-agent

# Execute commands in container
docker exec magents-research-agent task-master list

# Multi-agent orchestration
magents task-agents --docker  # Create Docker agents for all tasks
```

#### Docker vs Traditional Mode

| Feature | Docker Mode | Traditional Mode |
|---------|------------|------------------|
| **Isolation** | Full container | Process only |
| **Claude Access** | API keys only | Direct CLI |
| **Resource Usage** | Higher | Lower |
| **Scalability** | Excellent | Good |
| **Setup** | Docker required | tmux required |

For detailed Docker mode documentation, see [packages/cli/docker/DOCKER-MODE.md](packages/cli/docker/DOCKER-MODE.md).

## 📚 Commands Reference

### Agent Management

```bash
# Create agent
magents create <branch> [agent-id] [options]
  --docker                 # Use Docker isolation
  --ports <range>         # Port range (e.g., "3000-3010:3000-3010")
  --env <key=value>       # Set environment variable
  --task <description>    # Task description
  --service <name=url>    # Service endpoint
  --boundary <rule>       # Add boundary rule

# List agents
magents list

# Attach to agent
magents attach <agent-id>

# Stop agent
magents stop <agent-id>
  -r, --remove-worktree   # Also remove git worktree

# Cleanup all agents
magents cleanup
  -r, --remove-worktrees  # Also remove all worktrees
```

### Project Management

```bash
# Create project
magents project create <path> [options]
  -n, --name <name>       # Project name
  -p, --ports <start-end> # Port range

# List projects
magents project list

# Stop project
magents project stop <project-id>

# Remove project
magents project remove <project-id>
```

### Task Master Integration

```bash
# Create intelligent agent for specific task (ENHANCED)
magents task-create <task-id> [options]
  -p, --prefix <prefix>   # Branch prefix (default: "task")
  -n, --dry-run          # Show what would be created without creating
  --create-issue         # Create structured GitHub issue for the task
  --no-auto-setup        # Skip automatic Task Master setup and PRD parsing

# Create agents automatically from all pending tasks
magents task-agents [options]
  -p, --prefix <prefix>   # Branch prefix (default: "task")
  -n, --dry-run          # Show what would be created without creating

# Structured development workflow (PLAN→CREATE→TEST→DEPLOY)
magents work-issue <issue-or-task-id> [options]
  --agent <agent-id>     # Specific agent to use (auto-detects if not provided)
  --skip-plan           # Skip planning phase and go directly to implementation
  --plan-only           # Only run the planning phase

# Enhanced attach with task briefing
magents attach <agent-id> [options]
  --no-briefing          # Skip showing task briefing before attaching

# Sync complete Task Master environment to existing agent
magents sync-taskmaster <agent-id>

# Configuration
magents config
  -e, --edit             # Edit configuration interactively
  --docker               # Enable Docker mode
  --no-docker            # Disable Docker mode (use tmux)

# Initialize configuration
magents init
```

## 🎯 Task Master Integration

Magents provides seamless integration with [Task Master AI](https://www.npmjs.com/package/task-master-ai) for structured agentic development workflows.

### Prerequisites

Install Task Master AI:

```bash
npm install -g task-master-ai
```

**Compatibility**: Magents works with all versions of Task Master AI. Newer versions provide richer JSON output, while older versions are supported through intelligent text parsing.

### Quick Start with Task Master

1. **Initialize Task Master in your project:**

```bash
task-master init
task-master models --setup  # Configure AI models
```

2. **Create a PRD and parse it:**

```bash
echo "Build e-commerce platform with user auth, product catalog, shopping cart, and checkout" > .taskmaster/docs/prd.txt
task-master parse-prd .taskmaster/docs/prd.txt --research
task-master expand --all --research
```

3. **View generated tasks:**

```bash
task-master list
# Outputs:
# 1. User Authentication System
#   1.1 Database schema and models
#   1.2 Registration and login API
#   1.3 JWT token management
# 2. Product Catalog
#   2.1 Product model and database
#   2.2 Product CRUD API
# ...
```

4. **Create intelligent, self-contained agents:**

**Option A: Smart agent for specific task (RECOMMENDED):**
```bash
# Create fully-configured agent with automatic setup
magents task-create 1.2 --prefix feature --create-issue
# What happens:
# ✅ Inherits AI models and config from base project
# ✅ Automatically initializes Task Master in agent worktree
# ✅ Copies and parses PRD in agent context  
# ✅ Creates comprehensive task briefing
# ✅ Sets up project-specific environment
# ✅ Creates GitHub issue for tracking (optional)
# ✅ Agent knows exactly what to work on!

# Result: task-1.2-agent with complete autonomous setup
```

**Option B: Create multiple intelligent agents:**
```bash
magents task-agents --prefix feature
# Creates multiple agents, each with:
# - Complete Task Master environment
# - Inherited project settings
# - Task-specific context and briefing
# - Full autonomy and project awareness
```

5. **Start working on tasks with automatic briefing:**

```bash
# Attach to specific agents - shows task briefing automatically
magents attach task-1.2-agent    # Shows Task 1.2 details before attaching
# Displays:
# ┌─────── Current Task: 1.2 ───────┐
# │ Task ID: 1.2                    │
# │ Title: Registration and login   │
# │ Status: pending                 │
# │ Priority: high                  │
# │                                 │
# │ Description:                    │
# │ Implement user registration...  │
# └─────────────────────────────────┘
# 
# Quick Commands:
# $ get_task({id: "1.2"}) # Get full task details
# $ set_task_status({id: "1.2", status: "in_progress"}) # Mark as started
# $ update_subtask({id: "1.2", prompt: "your notes"}) # Log progress

# Skip briefing if needed
magents attach task-1.2-agent --no-briefing

# Agent automatically knows about the task context
# Task details are available in:
# - TASK_BRIEFING.md (full briefing)  
# - .taskmaster/current-task.json (task data)
# - .claude/task-context.md (Claude context)
```

### Advanced Task Master Workflows

#### Dependency-Aware Development

Task Master handles task dependencies automatically:

```bash
# Check dependencies before creating agents
task-master validate-dependencies

# Example dependency chain:
# Task 1.1 (Database) → Task 1.2 (Auth API) → Task 3.1 (Cart with Auth)

# Create agents in dependency order
magents create task/1-database db-agent       # Start with foundational work
# Wait for db-agent to complete task 1.1
magents create task/1-auth auth-agent         # Then create auth agent
magents create task/3-cart cart-agent         # Cart can start after auth
```

#### Context Sharing Between Agents

Agents share implementation context through Task Master:

```bash
# Agent 1 logs implementation details
update_subtask({
  id: "1.2", 
  prompt: "Created User model with bcrypt hashing. JWT tokens expire in 24h. Auth middleware checks Authorization header."
})

# Agent 2 reads this context when working on related tasks
get_task({id: "3.1"})  # Shows: "Implement cart with user authentication"
# Agent 2 can see Agent 1's auth implementation details
```

#### Multi-Agent Coordination

```bash
# Daily workflow
task-master list                    # Check overall project status
task-master complexity-report       # See complexity analysis

# Create agents for the day's work
magents task-agents --dry-run       # Preview what will be created
magents task-agents                 # Create agents for pending tasks

# Work in parallel across multiple terminals
magents list                        # See all active agents
magents attach task-1-agent &       # Background terminal 1
magents attach task-2-agent &       # Background terminal 2
magents attach task-3-agent &       # Background terminal 3
```

### MCP Integration

Configure `.mcp.json` for Task Master MCP tools in Claude Code:

```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "--package=task-master-ai", "task-master-ai"],
      "env": {
        "ANTHROPIC_API_KEY": "your_key_here",
        "PERPLEXITY_API_KEY": "your_key_here"
      }
    }
  }
}
```

Available MCP commands in Claude Code:

```javascript
// Task Master MCP commands
help()                              // Show available commands
get_tasks()                         // List all tasks
next_task()                         // Get next available task
get_task({id: "1.2"})              // Get specific task details
set_task_status({id: "1.2", status: "done"})  // Mark task complete
update_subtask({id: "1.2", prompt: "implementation notes"})  // Log progress
add_task({prompt: "new task description", research: true})   // Add new task
expand_task({id: "1", research: true})  // Break task into subtasks
```

### Best Practices

1. **Start with Task Structure:**
   - Always initialize Task Master first
   - Use `task-master analyze-complexity --research` for better task breakdown
   - Expand main tasks into subtasks before creating agents

2. **Agent-Task Mapping:**
   - Create one agent per main task category
   - Use descriptive branch names that match task themes
   - Keep agents focused on their task domain

3. **Context Management:**
   - Use `update-subtask` to log implementation decisions
   - Check task dependencies before starting new work
   - Reference completed tasks when working on dependent features

4. **Coordination:**
   - Use `task-master list` to track overall progress
   - Monitor agent status with `magents list`
   - Clean up completed agents to free resources

## 🔄 Structured Development Workflow

Magents implements a professional **PLAN → CREATE → TEST → DEPLOY** workflow for systematic feature development:

### The `work-issue` Command

Start a structured development workflow for any GitHub issue or Task Master task:

```bash
# Work on a GitHub issue
magents work-issue 123                    # GitHub issue #123

# Work on a Task Master task  
magents work-issue 1.2                    # Task Master task 1.2

# Advanced options
magents work-issue 123 --agent my-agent   # Use specific agent
magents work-issue 1.2 --plan-only        # Just create the plan
magents work-issue 123 --skip-plan        # Skip to implementation
```

### Workflow Phases

#### 1. **PLAN Phase** 📋
- **Issue Analysis**: Fetches GitHub issue or Task Master task details
- **Context Research**: Searches scratchpads, PRs, and codebase for relevant information
- **Planning Document**: Creates comprehensive implementation plan with:
  - Detailed requirements analysis
  - Implementation breakdown into phases
  - Testing strategy (unit, integration, e2e)
  - Commit strategy with Task Master updates
  - Technical considerations and dependencies

#### 2. **CREATE Phase** 🔨
- **Guided Implementation**: Follow the detailed plan step-by-step
- **Incremental Development**: Make focused commits after each step
- **Progress Tracking**: Update Task Master progress regularly
- **Pattern Following**: Adhere to established coding patterns

#### 3. **TEST Phase** 🧪
- **Unit Testing**: Write and run unit tests
- **Integration Testing**: Test component interactions
- **E2E Testing**: Use Playwright for end-to-end scenarios
- **Manual Testing**: Verify key user scenarios

#### 4. **DEPLOY Phase** 🚀
- **Build Verification**: Ensure build succeeds
- **PR Creation**: Open pull request to dev branch
- **Review Process**: Request and address code review
- **Final Testing**: QA verification before merge

### Enhanced GitHub Issues

Issues created with `--create-issue` follow a professional structure:

```markdown
[Feature] Add user authentication

## Problem Statement
[Clear description of user problem or need]

## Proposed Solution  
[High-level feature description]

## User Stories
- As a user, I want to authenticate so that I can access personalized features
- As a developer, I want clear auth patterns so that I can implement securely

## Acceptance Criteria
- [ ] User can register with email/password
- [ ] User can login and logout
- [ ] Session management works correctly
- [ ] Password validation and security

## Technical Considerations
**Task ID:** 1.2
**Priority:** high
**Dependencies:** Database setup (Task 1.1)
**Agent Setup:** ✅ Complete environment configured

## Implementation Approach
- [ ] Research & Planning: Analyze auth patterns
- [ ] Environment Setup: Configure auth libraries  
- [ ] Core Implementation: Build auth system
- [ ] Testing: Unit, integration, and e2e tests
- [ ] Documentation: Update auth documentation
- [ ] Review: Code review and refinements

## Definition of Done
- [ ] Feature implemented and working
- [ ] Tests written and passing
- [ ] Code follows project guidelines
- [ ] Documentation updated
- [ ] Code reviewed and approved
- [ ] Task Master status updated to 'done'
- [ ] Ready for deployment

## Development Setup
# Attach to dedicated agent
magents attach task-1.2-agent

# Work with structured workflow  
magents work-issue 1.2
```

### Example Workflow

```bash
# 1. Create intelligent agent with GitHub issue
magents task-create 1.2 --prefix feature --create-issue

# 2. Start structured development workflow
magents work-issue 1.2

# Magents creates comprehensive plan and guides you through:
# ✅ Requirements analysis and context research
# ✅ Implementation breakdown with clear steps  
# ✅ Testing strategy for all scenarios
# ✅ Commit strategy with Task Master updates

# 3. Attach to agent and follow the plan
magents attach task-1.2-agent

# 4. Inside agent - implement step by step:
# - Follow the generated plan document
# - Make focused commits after each step
# - Update Task Master: tm update-subtask --id=1.2 --prompt="progress notes"
# - Test incrementally as you build

# 5. Complete workflow automatically guides you to:
# - Run full test suite
# - Build and verify
# - Create PR with proper description
# - Update GitHub issue and Task Master
```

### Claude Code Custom Commands

Create custom slash commands for seamless workflow integration:

```bash
# Available custom commands in .claude/commands/
/work-issue <id>        # Start PLAN→CREATE→TEST→DEPLOY workflow
/create-task-agent <id> # Create intelligent agent for a task
/task-progress         # Show progress across all tasks and agents
/task-status <id>      # Check and update task status
/sync-agents          # Sync Task Master config to all agents
```

For detailed examples and advanced workflows, see:
- [TASKMASTER_INTEGRATION.md](docs/TASKMASTER_INTEGRATION.md) - Task Master integration guide
- [COMPLETE_WORKFLOW_EXAMPLE.md](docs/COMPLETE_WORKFLOW_EXAMPLE.md) - Full project example
- [TASK_SPECIFIC_WORKFLOW.md](docs/TASK_SPECIFIC_WORKFLOW.md) - Task-specific agent guide

### Port Management

```bash
# Port operations
magents ports [options]
  -l, --list              # List allocated ports
  -d, --detect <path>     # Detect ports in project
  -a, --allocate <count>  # Allocate port range
  --project <id>          # Project ID for operations
```

### Settings Management

```bash
# Settings operations
magents settings [options]
  -l, --list              # List Claude config files
  -s, --sync <path>       # Sync settings to agent
```

### Configuration

```bash
# Initialize configuration
magents init

# View/edit configuration
magents config
  -e, --edit              # Edit configuration interactively
```

## 🚀 Advanced Usage

### Integration with Claude Subagents

Magents can be enhanced by leveraging Claude's built-in subagents feature for even more powerful workflows:

#### 1. **Orchestration Pattern**: Use Magents + Subagents

```bash
# Create a main orchestrator agent
magents create main orchestrator \
  --task "Coordinate feature development across services"

# Create service-specific agents
magents create feature/api api-agent \
  --task "Implement API endpoints"

magents create feature/frontend frontend-agent \
  --task "Build UI components"
```

Then, within the orchestrator agent, use Claude's subagents to:
- Verify implementations across agents
- Gather status from multiple worktrees
- Coordinate integration tests

#### 2. **Verification Pattern**: Cross-Agent Validation

When working in one agent, spawn subagents to:
```markdown
Please use a subagent to check if the API implementation in 
the api-agent worktree matches the expected interface we're 
using in the frontend.
```

#### 3. **Research Pattern**: Parallel Exploration

```bash
# Create exploration agents for different approaches
magents create experiment/approach-1 exp1 \
  --task "Explore GraphQL implementation"

magents create experiment/approach-2 exp2 \
  --task "Explore REST API implementation"
```

Use subagents within each to research and compare approaches.

### Docker Compose Integration

For complex projects with multiple services:

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
  
  api:
    build: ./api
    ports:
      - "4000:4000"
```

```bash
# Create agents for each service
magents create feature/web web-agent \
  --docker \
  --service "web=http://localhost:3000"

magents create feature/api api-agent \
  --docker \
  --service "api=http://localhost:4000"
```

### CI/CD Integration

```yaml
# .github/workflows/magents.yml
name: Multi-Agent Testing
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Magents
        run: |
          npm install -g magents
          magents init
      
      - name: Create Test Agents
        run: |
          magents create test/unit unit-agent \
            --task "Run unit tests"
          
          magents create test/integration int-agent \
            --task "Run integration tests"
```

## 🏆 Best Practices

### 1. Task Clarity

Always provide clear task descriptions:
```bash
# Good
magents create feature/auth auth-agent \
  --task "Implement JWT authentication with refresh tokens"

# Too vague
magents create feature/auth auth-agent \
  --task "Do auth stuff"
```

### 2. Resource Planning

Allocate resources appropriately:
```bash
# For microservices project
magents project create /path/to/microservices \
  --ports 3000-3020  # 20 ports for multiple services

# For simple project  
magents project create /path/to/simple-app \
  --ports 3000-3005  # 5 ports sufficient
```

### 3. Combining with Subagents

Use Magents for branch-level parallelism and Claude subagents for task-level:
- **Magents**: Different features on different branches
- **Subagents**: Parallel research, verification, or sub-tasks within a feature

### 4. Environment Variables

Use environment variables for configuration:
```bash
magents create feature/api api-agent \
  --env "DATABASE_URL=postgresql://localhost/dev" \
  --env "REDIS_URL=redis://localhost:6379" \
  --env "NODE_ENV=development"
```

### 5. Clean Shutdown

Always clean up properly:
```bash
# Stop individual agent
magents stop auth-agent --remove-worktree

# Or cleanup everything
magents cleanup --remove-worktrees
```

## 🔧 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using a port
magents ports --list
lsof -i :3000

# Allocate different range
magents create feature/web web-agent \
  --ports "5000-5010:5000-5010"
```

#### Orphaned Agents
If agents show as STOPPED but can't be removed:
```bash
# Fix orphaned agents (removes from list)
magents cleanup --fix-orphaned

# Or manually stop specific agent without removing worktree
magents stop <agent-id>
```

#### Docker Issues
```bash
# Check Docker daemon
docker ps

# Reset Docker state
docker system prune -a

# Use local mode instead
magents create feature/test test-agent  # No --docker flag
```

#### Tmux Sessions
```bash
# List all tmux sessions
tmux ls

# Kill stuck session
tmux kill-session -t magent-auth-agent

# Reattach to session
magents attach auth-agent
```

### Debug Mode

```bash
# Set debug environment variable
export MAGENTS_DEBUG=true

# Run command with verbose output
magents create feature/debug debug-agent
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the Claude Code community
- Inspired by the need for better multi-agent workflows
- Special thanks to all contributors

---

**Note**: Magents enhances Claude Code's capabilities by providing persistent, branch-level agent management. While Claude's built-in subagents excel at task-level parallelism within a conversation, Magents enables sustained parallel development across multiple features and branches.