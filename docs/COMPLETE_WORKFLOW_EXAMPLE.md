# Complete Magents + Task Master + Claude Code Workflow

This guide demonstrates the complete workflow from project setup to feature deployment using Magents, Task Master, and Claude Code together.

## 1. Initial Project Setup

### Install Required Tools

```bash
# Install Task Master AI
npm install -g task-master-ai

# Install Magents
npm install -g magents

# Verify installations
task-master --version
magents --version
```

### Initialize Project

```bash
# Create project directory
mkdir my-saas-app && cd my-saas-app
git init

# Initialize Task Master
task-master init
task-master models --setup  # Configure AI models

# Initialize Magents
magents init
```

## 2. Create Product Requirements

```bash
# Create PRD
cat > .taskmaster/docs/prd.txt << 'EOF'
# SaaS Task Management Platform

## Overview
Build a modern task management SaaS platform with:
- Multi-tenant architecture
- User authentication and authorization
- Task CRUD operations with rich text
- Real-time collaboration
- Webhooks and integrations
- Analytics dashboard

## Core Features

### 1. Authentication System
- Email/password registration and login
- OAuth2 social login (Google, GitHub)
- JWT-based session management
- Password reset flow
- Two-factor authentication

### 2. Task Management
- Create, read, update, delete tasks
- Rich text editor for task descriptions
- Task categories and tags
- Priority levels and due dates
- File attachments
- Task comments and activity feed

### 3. Collaboration
- Workspace/team management
- User roles and permissions
- Real-time updates via WebSockets
- @mentions and notifications
- Task assignment and delegation

### 4. Integrations
- Webhook system for external integrations
- Slack integration
- Email notifications
- API for third-party apps
- Zapier integration

### 5. Analytics
- Task completion metrics
- Team productivity dashboard
- Custom reports
- Data export functionality
EOF

# Parse PRD and generate tasks
task-master parse-prd .taskmaster/docs/prd.txt --research
task-master analyze-complexity --research
task-master expand --all --research
```

## 3. Review Generated Tasks

```bash
# View all tasks
task-master list

# Example output:
# 1. Authentication System
#   1.1 Database schema for users and auth
#   1.2 Registration and login API
#   1.3 OAuth2 implementation
#   1.4 JWT session management
#   1.5 Password reset flow
# 2. Task Management Core
#   2.1 Task database schema
#   2.2 Task CRUD API
#   2.3 Rich text editor integration
#   2.4 File upload system
# 3. Real-time Collaboration
#   3.1 WebSocket server setup
#   3.2 Real-time event system
#   3.3 Notification service
# ...
```

## 4. Create Intelligent Agents for Development

### Option A: Create Multiple Agents at Once

```bash
# Preview what will be created
magents task-agents --dry-run

# Create agents for all pending tasks
magents task-agents --prefix feature

# This creates agents like:
# - task-1-agent (Authentication System)
# - task-2-agent (Task Management Core)
# - task-3-agent (Real-time Collaboration)
```

### Option B: Create Specific Agent with GitHub Issue

```bash
# Create agent for authentication with GitHub issue
magents task-create 1 --prefix feature --create-issue

# Output:
# ✓ Created GitHub issue #1: [Feature] Authentication System
# ✓ Agent task-1-agent created with full Task Master context
# ✓ PRD parsed in agent worktree
# ✓ Task briefing available at: /path/to/worktree/TASK_BRIEFING.md
```

## 5. Start Development with Claude Code

### Attach to Agent

```bash
# Attach to authentication agent
magents attach task-1-agent

# You'll see:
# ┌─────────────── Current Task: 1 ───────────────┐
# │ Task ID: 1                                    │
# │ Title: Authentication System                  │
# │ Status: pending                               │
# │ Priority: high                                │
# │                                               │
# │ Subtasks:                                     │
# │ 1.1 Database schema for users and auth       │
# │ 1.2 Registration and login API               │
# │ 1.3 OAuth2 implementation                     │
# └───────────────────────────────────────────────┘
```

### Use Claude Code Custom Commands

Once in Claude Code, use the custom slash commands:

```
# Start structured workflow
/work-issue 1

# Claude will:
# 1. PLAN: Research and create implementation plan
# 2. CREATE: Guide you through implementation
# 3. TEST: Ensure comprehensive testing
# 4. DEPLOY: Create PR and update tracking
```

### Example Claude Code Session

```
You: /work-issue 1

Claude: I'll help you implement the Authentication System using the PLAN → CREATE → TEST → DEPLOY workflow.

## PLAN Phase

Let me first fetch the task details and research the context...

[Runs: tm show 1]
[Searches for authentication patterns in codebase]
[Reviews similar closed PRs]

Based on my research, I'll create a comprehensive implementation plan:

### Implementation Plan for Task 1: Authentication System

#### Phase 1: Database Setup (Task 1.1)
1. Design user schema with proper fields
2. Create migration files
3. Set up database connection
4. Test database operations

#### Phase 2: Core Authentication (Task 1.2)
1. Implement user registration endpoint
2. Add input validation and sanitization
3. Implement password hashing with bcrypt
4. Create login endpoint with JWT generation
5. Add authentication middleware

[... detailed plan continues ...]

Shall we proceed with Phase 1?

You: Yes

Claude: Great! Let's start with the database setup...

[Implementation continues with focused commits and Task Master updates]
```

## 6. Parallel Development Workflow

### Terminal 1: Authentication Development

```bash
magents attach task-1-agent
# In Claude Code:
# /work-issue 1
```

### Terminal 2: Task Management Development

```bash
magents attach task-2-agent
# In Claude Code:
# /work-issue 2
```

### Terminal 3: Monitor Progress

```bash
# Watch overall progress
watch -n 10 "task-master list | grep -E '(done|in-progress)'"

# Monitor active agents
watch -n 5 "magents list"
```

## 7. Task Completion and Handoff

### Complete a Task

```bash
# In Claude Code (task-1-agent)
set_task_status({id: "1", status: "done"})

# Create PR
gh pr create --title "feat: Complete authentication system (Task 1)" \
  --body "Implements complete authentication system as specified in Task 1"
```

### Stop Completed Agent

```bash
# From main terminal
magents stop task-1-agent --remove-worktree
```

### Start Next Task

```bash
# Check dependencies
task-master validate-dependencies

# Create agent for next task
magents task-create 4 --prefix feature --create-issue

# Attach and continue
magents attach task-4-agent
```

## 8. Daily Workflow Commands

### Morning Standup

```bash
# Check overall progress
task-master list

# See active work
magents list

# Review completed tasks
task-master list | grep done

# Plan today's work
task-master next
```

### End of Day

```bash
# Update task progress
tm update-subtask --id=2.1 --prompt="Completed task schema, starting on CRUD endpoints tomorrow"

# Check in any uncommitted work
git add -A && git commit -m "WIP: Task 2.1 progress"

# Stop agents (keep worktrees for tomorrow)
magents stop task-2-agent
```

## 9. Advanced Patterns

### Dependency Chain Development

```bash
# Task 3.2 depends on 3.1
# Create and complete 3.1 first
magents task-create 3.1 --prefix feature
magents attach task-3.1-agent
# Complete 3.1...

# Then create 3.2
magents task-create 3.2 --prefix feature
# Agent 3.2 can now reference 3.1's implementation
```

### Cross-Agent Context Sharing

```bash
# In task-1-agent, log important details
update_subtask({
  id: "1.2", 
  prompt: "Auth middleware exported from src/middleware/auth.js. JWT tokens use HS256 with 24h expiry. User context available at req.user after authentication."
})

# In task-2-agent, reference this
get_task({id: "1.2"})  # See auth implementation details
```

### Emergency Context Recovery

```bash
# If Claude Code session dies, reattach and context is preserved
magents attach task-2-agent

# Task context is still available in:
# - TASK_BRIEFING.md
# - .taskmaster/current-task.json
# - .claude/task-context.md
```

## 10. Project Completion

### Final Review

```bash
# Ensure all tasks completed
task-master list | grep -v done

# Clean up all agents
magents cleanup --remove-worktrees

# Generate final report
task-master complexity-report > project-completion-report.json
```

### Deployment Preparation

```bash
# Merge all feature branches
git checkout main
gh pr list --state open | awk '{print $1}' | xargs -I {} gh pr merge {}

# Tag release
git tag -a v1.0.0 -m "Initial release - all tasks completed"
git push origin v1.0.0
```

## Key Benefits of This Workflow

1. **Structured Development**: Every feature follows PLAN → CREATE → TEST → DEPLOY
2. **Parallel Progress**: Multiple developers/agents work simultaneously
3. **Context Preservation**: Implementation details shared between agents
4. **Automatic Setup**: Agents know exactly what to work on
5. **Progress Tracking**: Real-time visibility into development status
6. **Quality Assurance**: Testing built into the workflow
7. **Documentation**: Automatic through Task Master updates

This workflow scales from solo developers to large teams, maintaining consistency and quality throughout the development process.