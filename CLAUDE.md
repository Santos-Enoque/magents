# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Magents is a CLI tool for managing multiple Claude Code instances with git worktrees. It allows running multiple AI coding agents in parallel, each working on separate branches in isolated environments.

## Common Development Commands

### Build and Development
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run TypeScript compiler in watch mode
- `npm run lint` - Run ESLint on all TypeScript files
- `npm run format` - Format code with Prettier

### Testing
- `npm test` - Run Jest tests (no tests implemented yet)

## Architecture

### Service Architecture
The codebase follows a service-oriented architecture:

1. **AgentManager** (`src/services/AgentManager.ts`): Orchestrates agent lifecycle
   - Creates agents with git worktrees and tmux sessions
   - Tracks active agents in local storage
   - Handles agent attachment and cleanup

2. **GitService** (`src/services/GitService.ts`): Manages git worktree operations
   - Creates/removes worktrees for branch isolation
   - Validates branch names and repository state

3. **TmuxService** (`src/services/TmuxService.ts`): Manages tmux sessions
   - Creates sessions with Claude Code instances
   - Handles session attachment and termination

4. **ConfigManager** (`src/config/ConfigManager.ts`): Singleton configuration management
   - Stores config in `~/.magents-config`
   - Manages agent data in `~/.magents/`

### CLI Commands
All commands are defined in `src/bin/magents.ts`:

- `magents create <branch> [agent-id]` - Create new agent
- `magents list` - List all active agents
- `magents attach <agent-id>` - Attach to agent's tmux session
- `magents stop <agent-id>` - Stop agent (optionally remove worktree)
- `magents cleanup` - Stop all agents and clean up
- `magents init` - Initialize configuration
- `magents config` - View/edit configuration

### Key Configuration
Default values in ConfigManager:
- `DEFAULT_BASE_BRANCH`: 'main'
- `TMUX_SESSION_PREFIX`: 'magent'
- `WORKTREE_PREFIX`: 'agent'
- `MAX_AGENTS`: 5
- `CLAUDE_CODE_PATH`: 'claude'
- `CLAUDE_AUTO_ACCEPT`: true

## Development Notes

- The project uses CommonJS modules (not ES modules)
- TypeScript strict mode is enabled
- Platform restricted to macOS and Linux only
- Requires git and tmux to be installed
- Post-install script validates dependencies