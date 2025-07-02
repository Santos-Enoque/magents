# Quick Verification Guide for Task 24 Features

## Prerequisites
```bash
# Build the project first
npm run --prefix .. build
```

## Task 24.2: Progressive Complexity Modes

### Check current mode
```bash
node ../dist/bin/magents.js mode show
```

### Get mode recommendation
```bash
node ../dist/bin/magents.js mode recommend
```

### Switch modes (with dry-run)
```bash
# Preview mode switch
node ../dist/bin/magents.js mode switch standard --dry-run

# Actually switch mode
node ../dist/bin/magents.js mode switch standard
```

### Create agents with different modes
```bash
# Simple mode (minimal features)
node ../dist/bin/magents.js create my-simple-agent --mode simple --dry-run

# Standard mode (balanced features)
node ../dist/bin/magents.js create my-standard-agent --mode standard --dry-run

# Advanced mode (all features)
node ../dist/bin/magents.js create my-advanced-agent --mode advanced --dry-run
```

## Task 24.3: Automatic Task Generation (assign command)

### Analyze current project
```bash
node ../dist/bin/magents.js assign --analyze --dry-run
```

### Generate tasks with filters
```bash
# By category
node ../dist/bin/magents.js assign --category testing --dry-run

# By priority
node ../dist/bin/magents.js assign --priority high --dry-run

# With max tasks limit
node ../dist/bin/magents.js assign --max-tasks 5 --dry-run
```

## Task 24.4: Agent Orchestration (start command)

### List agents first
```bash
node ../dist/bin/magents.js list
```

### Start agents with various options
```bash
# Start specific agent (dry-run)
node ../dist/bin/magents.js start <agent-id> --dry-run

# Start with resource limits
node ../dist/bin/magents.js start <agent-id> --cpu 1.5 --memory 2g --dry-run

# Start all stopped agents
node ../dist/bin/magents.js start --all --dry-run

# Interactive mode (select from list)
node ../dist/bin/magents.js start
```

### Docker-specific options
```bash
# With custom network
node ../dist/bin/magents.js start <agent-id> --network my-network --dry-run

# With volumes
node ../dist/bin/magents.js start <agent-id> --volume /host/path:/container/path --dry-run

# With environment variables
node ../dist/bin/magents.js start <agent-id> --env KEY=value --dry-run

# With restart policy
node ../dist/bin/magents.js start <agent-id> --restart unless-stopped --dry-run
```

## Task 24.5: Utility Features

### Dry-run support (preview without executing)
```bash
# All commands support --dry-run
node ../dist/bin/magents.js create test --dry-run
node ../dist/bin/magents.js assign --dry-run
node ../dist/bin/magents.js start test --dry-run
node ../dist/bin/magents.js mode switch advanced --dry-run
```

### Progress indicators
- Watch for spinner animations during:
  - Agent creation
  - Task generation
  - Mode switching
  - Agent startup

### Interactive mode
- Most commands prompt for missing information
- Use arrow keys to navigate choices
- Press Enter to select

## Quick Test Sequence

1. **Check current mode:**
   ```bash
   node ../dist/bin/magents.js mode show
   ```

2. **Create a test agent:**
   ```bash
   node ../dist/bin/magents.js create demo-agent --mode simple
   ```

3. **List agents:**
   ```bash
   node ../dist/bin/magents.js list
   ```

4. **Stop the agent (if running):**
   ```bash
   docker stop magents-<agent-id>
   ```

5. **Start it with the new command:**
   ```bash
   node ../dist/bin/magents.js start <agent-id> --dry-run
   node ../dist/bin/magents.js start <agent-id>
   ```

6. **Analyze project for tasks:**
   ```bash
   node ../dist/bin/magents.js assign --analyze --dry-run
   ```

## Verify Help is Updated
```bash
# Main help
node ../dist/bin/magents.js --help

# Command-specific help
node ../dist/bin/magents.js mode --help
node ../dist/bin/magents.js assign --help
node ../dist/bin/magents.js start --help
```

## Expected Behaviors

### Mode Command
- Shows current mode configuration
- Provides recommendations based on installed tools
- Switches modes with data preservation
- Shows feature comparison when switching

### Assign Command
- Analyzes project structure
- Detects languages, frameworks, and tools
- Generates relevant task suggestions
- Integrates with Task Master if available
- Filters tasks by category/priority

### Start Command
- Shows dry-run preview with all settings
- Starts Docker containers with proper configuration
- Applies resource limits
- Handles both Docker and tmux modes
- Interactive selection when no agent specified

### Utility Features
- Dry-run shows what would happen without executing
- Progress spinners show during long operations
- Interactive prompts fill in missing information
- Clear error messages with suggestions