Start a structured development workflow for a GitHub issue or Task Master task.

## Usage
Provide either:
- A GitHub issue number (e.g., 123)
- A Task Master task ID (e.g., 1.2)

## Workflow

I'll guide you through the PLAN → CREATE → TEST → DEPLOY workflow:

### 1. PLAN Phase
- Fetch issue/task details using `gh issue view` or `tm show`
- Research relevant context (scratchpads, PRs, codebase)
- Create a comprehensive implementation plan
- Define testing strategy and commit approach

### 2. CREATE Phase  
- Follow the plan step-by-step
- Make focused commits after each subtask
- Update Task Master progress: `tm update-subtask --id=$TASK_ID --prompt="progress"`
- Test incrementally as we build

### 3. TEST Phase
- Write and run unit tests
- Create integration tests if needed
- Run Playwright e2e tests for UI changes
- Verify with manual testing

### 4. DEPLOY Phase
- Ensure all tests pass
- Build the application and fix any errors
- Create PR with comprehensive description
- Update issue/task status

## Implementation Steps

1. **First, I'll fetch the issue/task details:**
   ```bash
   # For GitHub issue
   gh issue view $ARGUMENTS --json title,body,labels,assignees,milestone
   
   # For Task Master task  
   tm show $ARGUMENTS
   ```

2. **Research relevant context:**
   - Search for related scratchpads
   - Find similar closed issues/PRs
   - Analyze existing code patterns
   - Review task dependencies

3. **Create implementation plan:**
   - Break down into clear phases
   - Define commit boundaries
   - Specify testing approach
   - Note technical considerations

4. **Execute the plan systematically:**
   - Make incremental changes
   - Commit after each logical unit
   - Update Task Master progress regularly
   - Test continuously

5. **Complete the workflow:**
   - Run full test suite
   - Build and verify
   - Create detailed PR
   - Update tracking systems

## Important Notes
- Each subtask completion = focused commit + Task Master update
- Follow existing code patterns and conventions
- Document important decisions in the plan
- Test continuously, not just at the end
- If working on a Task Master task, I'll use `tm` commands
- If working on a GitHub issue, I'll use `gh` commands
- The plan will be saved as `IMPLEMENTATION_PLAN.md` for reference