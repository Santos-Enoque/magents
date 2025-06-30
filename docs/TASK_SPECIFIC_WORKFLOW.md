# Task-Specific Agent Creation Workflow

## Overview

This guide demonstrates how to create agents for specific Task Master tasks and how agents automatically know what to do through integrated task context.

## Complete Workflow Example

### 1. Setup Task Master Project

```bash
# Initialize Task Master
task-master init
task-master models --setup

# Create a PRD
echo "Build a task management app with user authentication, task CRUD, and real-time updates" > .taskmaster/docs/prd.txt

# Parse PRD and generate tasks
task-master parse-prd .taskmaster/docs/prd.txt --research
task-master expand --all --research

# View generated tasks
task-master list
```

Output:
```
1. User Authentication System
  1.1 Database schema and user models
  1.2 Registration and login API endpoints  
  1.3 JWT token management and middleware
2. Task Management Features
  2.1 Task CRUD operations
  2.2 Task categorization and filtering
  2.3 Task assignment and collaboration
3. Real-time Updates
  3.1 WebSocket server setup
  3.2 Real-time task notifications
  3.3 Live collaboration features
```

### 2. Create Agent for Specific Task

```bash
# Create agent for a specific subtask
magents task-create 1.2 --prefix feature

# Or create agent for a main task  
magents task-create 1 --prefix feature
```

What happens:
1. **Fetches task details** from Task Master
2. **Shows task information** before creating agent
3. **Creates git worktree** with task-based branch name
4. **Sets up task context files** in the worktree:
   - `TASK_BRIEFING.md` - Full task briefing for human reading
   - `.taskmaster/current-task.json` - Machine-readable task data
   - `.claude/task-context.md` - Claude Code context file

Example output:
```
┌─────────────── Task 1.2 Details ───────────────┐
│ Task ID: 1.2                                   │
│ Title: Registration and login API endpoints    │  
│ Description: Create REST API endpoints for...  │
│ Status: pending                                │
│ Priority: high                                 │
└────────────────────────────────────────────────┘

Branch Name: feature/1.2-registration-and-login-api-endpoints
Agent ID: task-1.2-agent

✓ Agent task-1.2-agent created successfully!
✓ Task context files created in worktree

┌─────────── Agent: task-1.2-agent ───────────────┐
│ 🤖 Agent ID: task-1.2-agent                    │
│ 🌿 Branch: feature/1.2-registration-api        │
│ 📁 Worktree: /path/to/worktree                 │
│ 📺 Tmux Session: magents-task-1.2-agent        │
│ ℹ️  Status: Active                              │
│ ℹ️  Created: 12/30/2024, 2:30:45 PM            │
└─────────────────────────────────────────────────┘

────────────────── Next Steps ──────────────────
  $ magents attach task-1.2-agent # Attach to agent and start working on the task

ℹ Task briefing available at: /path/to/worktree/TASK_BRIEFING.md
ℹ Agent will automatically know about Task 1.2 context
```

### 3. Attach to Agent with Automatic Task Briefing

```bash
magents attach task-1.2-agent
```

What happens:
1. **Shows task briefing** before attaching to Claude Code
2. **Displays task details, dependencies, and quick commands**
3. **Automatically loads task context** in Claude Code session

Example briefing display:
```
─────────── Task Briefing for Agent task-1.2-agent ──────────────

┌─────────────── Current Task: 1.2 ───────────────┐
│ Task ID: 1.2                                    │
│ Title: Registration and login API endpoints     │
│ Status: pending                                 │
│ Priority: high                                  │
│                                                 │
│ Description:                                    │
│ Create REST API endpoints for user registration │
│ and login. Include validation, password hashing │
│ and JWT token generation.                       │
└─────────────────────────────────────────────────┘

Dependencies: 1.1

──────────────────── Subtasks ────────────────────
⏳ 1.2.1: User registration endpoint (pending)
⏳ 1.2.2: User login endpoint (pending)  
⏳ 1.2.3: Password validation (pending)
⏳ 1.2.4: JWT token generation (pending)

────────────────── Quick Commands ──────────────────
  $ get_task({id: "1.2"}) # Get full task details
  $ set_task_status({id: "1.2", status: "in_progress"}) # Mark task as started
  $ update_subtask({id: "1.2", prompt: "your notes"}) # Log progress  
  $ set_task_status({id: "1.2", status: "done"}) # Mark task complete

──────────────────────────────────────────────────
ℹ Full briefing available at: /path/to/worktree/TASK_BRIEFING.md

⠋ Attaching to agent 'task-1.2-agent'...
```

### 4. Working in Claude Code Session

Once attached, Claude Code automatically has access to:

#### Task Context Files
- **TASK_BRIEFING.md**: Full human-readable briefing
- **.taskmaster/current-task.json**: Machine-readable task data  
- **.claude/task-context.md**: Claude Code context file (auto-loaded)

#### Task Master MCP Commands
```javascript
// Agent automatically knows about Task 1.2
get_task({id: "1.2"})  // Get current task details

// Mark task as started
set_task_status({id: "1.2", status: "in_progress"})

// Log implementation progress
update_subtask({id: "1.2", prompt: "Implemented user registration with bcrypt hashing and validation"})

// Check dependencies 
get_task({id: "1.1"})  // See dependency details

// Get next available task when done
next_task()

// Mark task complete
set_task_status({id: "1.2", status: "done"})
```

#### Example Claude Code Session
```
Claude: I can see I'm working on Task 1.2: Registration and login API endpoints.

Based on the task briefing, I need to:
1. Create user registration endpoint with validation
2. Implement login endpoint with JWT tokens  
3. Add password hashing with bcrypt
4. Ensure dependency Task 1.1 (database schema) is complete

Let me start by checking the dependency status:

get_task({id: "1.1"})

Great! The database schema is complete. Let me mark this task as in progress:

set_task_status({id: "1.2", status: "in_progress"})

Now I'll implement the registration endpoint...
```

### 5. Task Completion and Handoff

```bash
# When task is complete, stop the agent
magents stop task-1.2-agent

# Create agent for next task
magents task-create 1.3 --prefix feature

# Or let Task Master suggest next task
magents attach task-1.3-agent
# Shows Task 1.3 briefing automatically
```

## Advanced Patterns

### Multiple Parallel Agents

```bash
# Create agents for independent tasks
magents task-create 1.2 --prefix auth    # Auth API
magents task-create 2.1 --prefix tasks   # Task CRUD  
magents task-create 3.1 --prefix ws      # WebSocket setup

# Work in parallel terminals
magents attach task-1.2-agent &    # Terminal 1: Auth
magents attach task-2.1-agent &    # Terminal 2: Tasks
magents attach task-3.1-agent &    # Terminal 3: WebSocket
```

### Dependency Management

```bash
# Check task dependencies before creating agent
task-master show 2.1
# Shows: "Depends on: 1.1, 1.2"

# Only create agent after dependencies are complete
task-master list | grep "1.1.*done"
task-master list | grep "1.2.*done"
magents task-create 2.1  # Now safe to start
```

### Context Sharing

```bash
# Agent 1 logs implementation details
update_subtask({id: "1.2", prompt: "Created /api/auth/register endpoint. Returns JWT token with 24h expiry. User model includes: email, password_hash, created_at."})

# Agent 2 can read this context when working on related tasks
get_task({id: "1.2"})  # See implementation notes from Agent 1
```

## File Structure Created by Task-Specific Agents

```
worktree/
├── TASK_BRIEFING.md              # Human-readable task briefing
├── .taskmaster/
│   └── current-task.json         # Machine-readable task data
├── .claude/
│   ├── settings.json             # Claude Code settings (copied)
│   └── task-context.md           # Task context for Claude (auto-loaded)
└── [your project files]          # Project code
```

## Benefits of Task-Specific Agents

1. **Automatic Context**: Agents know exactly what to do without manual briefing
2. **Focused Work**: Each agent works on one specific task with clear scope
3. **Dependency Awareness**: Agents can check dependencies before starting work
4. **Progress Tracking**: All implementation notes logged back to Task Master
5. **Seamless Handoffs**: Context preserved between agents and sessions
6. **Parallel Development**: Multiple agents can work on independent tasks simultaneously

This workflow creates a truly agentic development experience where each agent is purpose-built for specific tasks and has full context about what needs to be accomplished.