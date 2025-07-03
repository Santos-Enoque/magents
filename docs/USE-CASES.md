# 💡 Magents Use Cases & Examples

Real-world scenarios where Magents shines, with practical examples and configurations.

## 1. Microservices Development

### Scenario
Developing a microservices architecture with separate services for authentication, API, frontend, and payment processing.

### Setup
```bash
# Create project
magents project create ~/projects/marketplace \
  --name "Marketplace Platform" \
  --ports 3000-3020

# Create service agents
magents create feature/auth auth-service \
  --task "Build JWT authentication service with refresh tokens" \
  --env "PORT=3001" \
  --env "JWT_SECRET=dev-secret" \
  --service "auth=http://localhost:3001"

magents create feature/api api-service \
  --task "Build GraphQL API for marketplace" \
  --env "PORT=3002" \
  --env "AUTH_SERVICE=http://localhost:3001" \
  --service "api=http://localhost:3002"

magents create feature/frontend web-app \
  --task "Build Next.js marketplace frontend" \
  --env "PORT=3000" \
  --env "API_URL=http://localhost:3002" \
  --service "web=http://localhost:5000"

magents create feature/payments payment-service \
  --task "Integrate Stripe payment processing" \
  --env "PORT=3003" \
  --env "STRIPE_KEY=sk_test_..." \
  --service "payments=http://localhost:3003"
```

### Workflow
```bash
# Work on services in parallel
tmux new-window -n services

# Split into panes
tmux split-window -h
tmux split-window -v
tmux select-pane -t 0
tmux split-window -v

# Attach to each agent in a pane
tmux send-keys -t 0 "magents attach auth-service" Enter
tmux send-keys -t 1 "magents attach api-service" Enter
tmux send-keys -t 2 "magents attach web-app" Enter
tmux send-keys -t 3 "magents attach payment-service" Enter
```

## 2. Feature Branch Testing

### Scenario
QA team needs to test multiple feature branches simultaneously without environment conflicts.

### Setup
```bash
# QA creates test agents for each feature
magents create feature/new-checkout checkout-test \
  --task "Test new checkout flow" \
  --docker \
  --ports "4000-4010:4000-4010" \
  --env "TEST_ENV=qa"

magents create feature/user-profile profile-test \
  --task "Test user profile updates" \
  --docker \
  --ports "4100-4110:4100-4110" \
  --env "TEST_ENV=qa"

magents create feature/search-v2 search-test \
  --task "Test new search functionality" \
  --docker \
  --ports "4200-4210:4200-4210" \
  --env "TEST_ENV=qa"
```

### Benefits
- Each feature runs in isolation
- No port conflicts
- Easy to reproduce issues
- Parallel testing capability

## 3. Experiment & Prototype

### Scenario
Evaluating different technical approaches for a new feature.

### Setup
```bash
# Create experiment agents
magents create experiment/redis-cache redis-exp \
  --task "Prototype Redis caching strategy" \
  --env "CACHE_TYPE=redis" \
  --boundary "Don't modify production code"

magents create experiment/memcached memcached-exp \
  --task "Prototype Memcached caching strategy" \
  --env "CACHE_TYPE=memcached" \
  --boundary "Don't modify production code"

magents create experiment/in-memory memory-exp \
  --task "Prototype in-memory caching strategy" \
  --env "CACHE_TYPE=memory" \
  --boundary "Don't modify production code"
```

### Evaluation with Subagents
In the main branch:
```markdown
Please create a subagent to analyze the three caching experiments:
1. Compare performance metrics from each experiment branch
2. Evaluate implementation complexity
3. Consider production scalability
4. Recommend the best approach
```

## 4. Code Review Workflow

### Scenario
Senior developer reviewing multiple PRs from team members.

### Setup
```bash
# Create review agents for each PR
magents create pr/123-add-auth review-pr-123 \
  --task "Review PR #123: Add authentication" \
  --boundary "Read-only review, no modifications"

magents create pr/124-fix-bug review-pr-124 \
  --task "Review PR #124: Fix cart calculation bug" \
  --boundary "Read-only review, suggest improvements"

magents create pr/125-refactor review-pr-125 \
  --task "Review PR #125: Refactor payment module" \
  --boundary "Read-only review, check for breaking changes"
```

### Review Process
```bash
# In each review agent, use Claude to:
# 1. Analyze code quality
# 2. Check for security issues
# 3. Verify test coverage
# 4. Suggest improvements
```

## 5. Multi-Repository Coordination

### Scenario
Making coordinated changes across frontend, backend, and mobile repositories.

### Setup
```bash
# Clone all repositories to a workspace
mkdir ~/workspace/platform
cd ~/workspace/platform
git clone git@github.com:company/backend.git
git clone git@github.com:company/frontend.git
git clone git@github.com:company/mobile.git

# Create coordination agent
cd backend
magents create feature/api-v2 backend-v2 \
  --task "Implement API v2 with breaking changes"

cd ../frontend
magents create feature/api-v2-migration frontend-v2 \
  --task "Migrate to API v2"

cd ../mobile
magents create feature/api-v2-migration mobile-v2 \
  --task "Migrate mobile app to API v2"

# Create orchestrator
cd ..
magents create main/api-migration orchestrator \
  --task "Coordinate API v2 migration across all platforms"
```

## 6. Learning & Documentation

### Scenario
Creating documentation while learning a new codebase.

### Setup
```bash
# Create exploration agents
magents create explore/architecture arch-explorer \
  --task "Document system architecture and create diagrams" \
  --boundary "Create docs/ folder only"

magents create explore/api-routes api-explorer \
  --task "Document all API endpoints and create OpenAPI spec" \
  --boundary "Create docs/api/ folder only"

magents create explore/database db-explorer \
  --task "Document database schema and relationships" \
  --boundary "Create docs/database/ folder only"
```

## 7. Hotfix Coordination

### Scenario
Critical production bug requires immediate fix with careful coordination.

### Setup
```bash
# Create hotfix agents
magents create hotfix/payment-bug fix-agent \
  --task "Fix critical payment processing bug" \
  --env "URGENCY=critical" \
  --boundary "Minimal changes, must not break existing features"

magents create hotfix/payment-tests test-agent \
  --task "Create comprehensive tests for payment fix" \
  --env "FOCUS=payment-module"

magents create hotfix/payment-deploy deploy-agent \
  --task "Prepare deployment plan and rollback strategy" \
  --boundary "Document all steps, create rollback plan"
```

## 8. Continuous Integration Enhancement

### Scenario
Improving CI/CD pipeline with parallel test execution.

### GitHub Actions Workflow
```yaml
name: Parallel Testing with Magents
on: [pull_request]

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@v3
      - id: set-matrix
        run: |
          echo "matrix={\"test\":[\"unit\",\"integration\",\"e2e\"]}" >> $GITHUB_OUTPUT

  test:
    needs: setup
    runs-on: ubuntu-latest
    strategy:
      matrix: ${{fromJson(needs.setup.outputs.matrix)}}
    steps:
      - uses: actions/checkout@v3
      - name: Setup Magents
        run: |
          npm install -g magents
          magents init
      
      - name: Run ${{ matrix.test }} tests
        run: |
          magents create test/${{ matrix.test }} ${{ matrix.test }}-agent \
            --task "Run ${{ matrix.test }} tests and report results" \
            --env "TEST_TYPE=${{ matrix.test }}"
          
          # Run tests in agent
          magents exec ${{ matrix.test }}-agent "npm run test:${{ matrix.test }}"
```

## 9. Remote Development

### Scenario
Team working from different locations needs consistent development environments.

### Codespaces Setup
```bash
# .devcontainer/postCreateCommand.sh
#!/bin/bash
npm install -g magents
magents init

# Pre-create common agents
magents create develop/backend backend --task "Backend development"
magents create develop/frontend frontend --task "Frontend development"
magents create develop/testing testing --task "Testing and QA"

echo "Magents setup complete! Run 'magents list' to see available agents."
```

## 10. Onboarding New Developers

### Scenario
Streamlining onboarding process for new team members.

### Setup Script
```bash
#!/bin/bash
# onboard-developer.sh

echo "Welcome! Setting up your development environment..."

# Install Magents
npm install -g magents
magents init

# Create learning agents
magents create learn/codebase codebase-tour \
  --task "Explore and understand the codebase structure" \
  --boundary "Read-only exploration"

magents create learn/setup setup-env \
  --task "Set up local development environment" \
  --env "TUTORIAL_MODE=true"

magents create learn/first-feature first-feature \
  --task "Implement your first feature: Add user avatar upload" \
  --env "MENTOR_MODE=true"

echo "Setup complete! Start with: magents attach codebase-tour"
```

## Best Practices from Use Cases

1. **Clear Task Descriptions**: Always specify what each agent should accomplish
2. **Environment Isolation**: Use Docker for experiments and testing
3. **Resource Planning**: Allocate port ranges to avoid conflicts
4. **Boundary Setting**: Define what agents should and shouldn't modify
5. **Coordination Patterns**: Use orchestrator agents for complex workflows

## Performance Tips

### For Large Teams
```bash
# Configure higher agent limits
magents config -e
# Set MAX_AGENTS=10

# Use project grouping
magents project create . --name "Team Project" --ports 3000-4000
```

### For Resource-Constrained Environments
```bash
# Limit concurrent agents
export MAGENTS_MAX_AGENTS=3

# Use local mode instead of Docker
magents create feature/test test  # No --docker flag

# Clean up inactive agents regularly
magents cleanup --inactive --older-than 7d
```

## Integration Examples

### With VS Code
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Create Magents Agent",
      "type": "shell",
      "command": "magents create feature/${input:branchName} ${input:agentName}",
      "problemMatcher": []
    },
    {
      "label": "Attach to Agent",
      "type": "shell",
      "command": "magents attach ${input:agentName}",
      "problemMatcher": []
    }
  ],
  "inputs": [
    {
      "id": "branchName",
      "type": "promptString",
      "description": "Branch name"
    },
    {
      "id": "agentName",
      "type": "promptString",
      "description": "Agent name"
    }
  ]
}
```

### With Git Hooks
```bash
#!/bin/bash
# .git/hooks/post-checkout
BRANCH=$(git branch --show-current)

# Auto-create agent for feature branches
if [[ $BRANCH == feature/* ]]; then
  AGENT_NAME=$(echo $BRANCH | sed 's/feature\///')
  magents create $BRANCH $AGENT_NAME \
    --task "Work on $BRANCH" \
    --auto-attach
fi
```

These use cases demonstrate the versatility of Magents in real-world development scenarios. Adapt and combine these patterns to fit your specific workflow needs.