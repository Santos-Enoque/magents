# Magents + Task Master Integration Guide

## Overview

Combining **Magents** (Multi-Agent Claude Code) with **Task Master** creates a powerful agentic development workflow where you can:

- Manage complex projects with structured task breakdown
- Run multiple specialized agents working on different parts of your project
- Maintain task context and progress across multiple Claude Code sessions
- Coordinate parallel development streams with proper task dependencies

## Core Integration Patterns

### 1. Task-Driven Agent Creation

Use Task Master tasks to drive agent creation and assignment:

```bash
# Setup project with Task Master
task-master init
task-master parse-prd .taskmaster/docs/prd.txt
task-master analyze-complexity --research
task-master expand --all --research

# View available tasks
task-master list

# Create specialized agents for different task streams
magents create feature/auth-system auth-agent      # For authentication tasks
magents create feature/api-refactor api-agent      # For API refactoring tasks  
magents create feature/ui-components ui-agent      # For UI component tasks
magents create feature/testing test-agent          # For testing tasks
```

### 2. Agent-Task Assignment Workflow

Each agent works on specific task categories:

```bash
# Agent 1: Authentication System (tasks 1.x)
magents attach auth-agent
# In Claude Code session:
# - task-master show 1.1
# - Work on authentication tasks
# - task-master set-status --id=1.1 --status=done

# Agent 2: API Refactoring (tasks 2.x) 
magents attach api-agent
# In Claude Code session:
# - task-master show 2.1
# - Work on API refactoring
# - task-master update-subtask --id=2.1 --prompt="implemented REST endpoints"

# Agent 3: UI Components (tasks 3.x)
magents attach ui-agent
# In Claude Code session:
# - task-master next
# - Work on next available UI task
```

### 3. Coordinated Multi-Agent Development

#### Daily Workflow

```bash
# Morning: Check overall project status
task-master list
task-master complexity-report

# Create agents for the day's work
magents list                                    # Check existing agents
magents create feature/user-profile profile-agent
magents create bugfix/api-errors fix-agent

# Assign and start work
magents attach profile-agent &                  # Background terminal 1
magents attach fix-agent &                      # Background terminal 2

# Each agent follows Task Master workflow:
# 1. task-master next
# 2. task-master show <id>
# 3. Implement the task
# 4. task-master update-subtask --id=<id> --prompt="implementation notes"
# 5. task-master set-status --id=<id> --status=done
```

## Advanced Integration Patterns

### 1. Task-Branch Mapping

Create agents with branches that directly correspond to Task Master task hierarchies:

```bash
# Main tasks from Task Master
task-master list
# 1. Authentication System
# 2. API Refactoring  
# 3. UI Components
# 4. Testing Suite

# Create corresponding agents
magents create task/1-auth-system task-1-agent
magents create task/2-api-refactor task-2-agent  
magents create task/3-ui-components task-3-agent
magents create task/4-testing task-4-agent
```

### 2. Dependency-Aware Agent Coordination

Use Task Master dependencies to coordinate agent work:

```bash
# Check task dependencies
task-master validate-dependencies

# Example dependency chain:
# Task 1.1 (Database schema) → Task 1.2 (Auth models) → Task 3.1 (Login UI)

# Start with foundational tasks
magents attach task-1-agent
# Complete task 1.1 first

# Once 1.1 is done, parallel agents can work
magents attach task-1-agent    # Continue with 1.2
magents attach task-3-agent    # Start 3.1 (now unblocked)
```

### 3. Context Sharing Between Agents

Agents share context through Task Master's task update system:

```bash
# Agent 1 logs implementation details
task-master update-subtask --id=1.2 --prompt="Created User model with bcrypt hashing. JWT tokens expire in 24h. Auth middleware checks Authorization header."

# Agent 2 can read this context when working on related tasks
task-master show 1.2  # See implementation notes from Agent 1
task-master show 3.1  # Work on UI that integrates with Agent 1's auth system
```

## MCP Integration for Seamless Workflow

Configure `.mcp.json` in your project to enable Task Master MCP tools in Claude Code:

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

Then in each Claude Code session:

```javascript
// MCP commands available in Claude Code
help()                    // Show Task Master commands
get_tasks()              // Same as: task-master list  
next_task()              // Same as: task-master next
get_task({id: "1.2"})    // Same as: task-master show 1.2
set_task_status({id: "1.2", status: "done"})  // Mark complete
update_subtask({id: "1.2", prompt: "implementation notes"})
```

## Practical Example: E-commerce Project

### Setup Phase

```bash
# 1. Initialize Task Master with e-commerce PRD
task-master init
echo "Build e-commerce platform with user auth, product catalog, shopping cart, and checkout" > .taskmaster/docs/prd.txt
task-master parse-prd .taskmaster/docs/prd.txt --research
task-master expand --all --research

# 2. Review generated tasks
task-master list
# Outputs something like:
# 1. User Authentication System
#   1.1 Database schema and models  
#   1.2 Registration and login API
#   1.3 JWT token management
# 2. Product Catalog
#   2.1 Product model and database
#   2.2 Product CRUD API
#   2.3 Search and filtering
# 3. Shopping Cart
#   3.1 Cart state management
#   3.2 Add/remove items API
# 4. Checkout System  
#   4.1 Payment integration
#   4.2 Order processing
```

### Agent Creation Phase

```bash
# 3. Create specialized agents
magents create auth/complete-system auth-specialist
magents create catalog/products-api catalog-specialist  
magents create cart/state-management cart-specialist
magents create payments/checkout-flow payment-specialist

# 4. Verify agents
magents list
```

### Development Phase

```bash
# 5. Start parallel development
# Terminal 1: Auth specialist
magents attach auth-specialist
# In Claude: 
# - next_task()  # Gets task 1.1
# - Implement database schema
# - set_task_status({id: "1.1", status: "done"})
# - next_task()  # Gets task 1.2
# - Continue...

# Terminal 2: Catalog specialist  
magents attach catalog-specialist
# In Claude:
# - get_task({id: "2.1"})  # Check if dependencies are met
# - If task 1.1 is done, proceed with product models
# - update_subtask({id: "2.1", prompt: "Using auth User model for product ownership"})

# Terminal 3: Integration testing
magents create integration/api-tests integration-agent
magents attach integration-agent
# In Claude:
# - Monitor completed tasks
# - Create integration tests as components are finished
```

### Coordination Commands

```bash
# Check overall progress
task-master list

# Monitor agent status  
magents list

# Clean up completed agents
magents stop auth-specialist --remove-worktree  # After auth tasks complete
magents stop catalog-specialist                  # Keep worktree for future use

# Create new specialized agents as needed
magents create frontend/auth-ui frontend-agent
magents create deployment/docker-setup deploy-agent
```

## Best Practices

### 1. Agent Naming Convention
- Use descriptive names that match Task Master categories
- Include task numbers for clear mapping: `task-1-auth`, `task-2-catalog`
- Use feature-based naming: `auth-system`, `payment-flow`, `ui-components`

### 2. Task Coordination
- Always check `task-master validate-dependencies` before starting work
- Use `task-master show <id>` to understand task context before creating agents
- Update subtasks with implementation details for other agents to reference

### 3. Agent Lifecycle Management
- Create agents for specific task clusters (not individual small tasks)
- Stop agents when their task category is complete
- Keep worktrees for agents that might need future work

### 4. Context Sharing
- Use `update-subtask` to log implementation decisions
- Reference completed tasks when working on dependent tasks  
- Keep task status updated in real-time

## Integration Commands Reference

### Task Master → Magents Flow
```bash
task-master next                    # Find next task
magents create feature/$(task-name) # Create agent for task
magents attach $(agent-id)          # Start working
```

### Magents → Task Master Flow  
```bash
magents list                       # See active agents
magents attach $(agent-id)         # Enter agent session
# In Claude Code:
next_task()                        # Get task from Task Master
# ... do work ...
set_task_status()                  # Mark complete in Task Master
```

### Coordination Commands
```bash
# Project overview
task-master complexity-report && magents list

# Cleanup completed work
task-master list | grep "done" && magents cleanup --remove-worktrees

# Create new work streams
task-master list | grep "pending" && magents create ...
```

This integration creates a powerful workflow where Task Master provides the structured project breakdown and task management, while Magents enables parallel development through multiple specialized Claude Code agents working in coordinated branches.