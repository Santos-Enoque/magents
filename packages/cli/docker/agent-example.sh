#!/bin/bash
# Example: Create and run a Magents Docker Agent

echo "=== Magents Docker Agent Example ==="
echo ""

# Agent configuration
AGENT_NAME="researcher-001"
AGENT_TYPE="research"
PROJECT_ROOT="$(pwd)/../../../"

# Check if container already exists
if docker ps -a | grep -q "magents-$AGENT_NAME"; then
    echo "Removing existing agent container..."
    docker rm -f "magents-$AGENT_NAME"
fi

echo "1. Creating Docker agent: $AGENT_NAME"
docker run -d \
    --name "magents-$AGENT_NAME" \
    --label "magents.agent.id=$AGENT_NAME" \
    --label "magents.agent.type=$AGENT_TYPE" \
    -v "$PROJECT_ROOT:/workspace" \
    -v "magents-shared:/shared" \
    -e "AGENT_ID=$AGENT_NAME" \
    -e "AGENT_TYPE=$AGENT_TYPE" \
    -e "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" \
    -e "OPENAI_API_KEY=${OPENAI_API_KEY}" \
    magents/agent:latest \
    bash -c "
        echo '=== Agent $AGENT_NAME starting ===' && \
        echo 'Configuring Task Master...' && \
        cd /workspace && \
        task-master models --set-main claude-3-5-sonnet-20241022 2>/dev/null || true && \
        echo 'Agent ready!' && \
        echo '' && \
        echo 'Agent can now:' && \
        echo '  - Use Task Master for AI-powered development' && \
        echo '  - Access the full project workspace' && \
        echo '  - Execute commands autonomously' && \
        echo '' && \
        tail -f /dev/null
    "

# Wait for container to start
sleep 2

echo ""
echo "2. Agent status:"
docker ps --filter "name=magents-$AGENT_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Labels}}"

echo ""
echo "3. Testing agent capabilities:"

# Test Task Master in agent
echo "   - Task Master version:"
docker exec "magents-$AGENT_NAME" task-master --version

echo "   - Available tasks:"
docker exec "magents-$AGENT_NAME" bash -c "cd /workspace && task-master list 2>/dev/null | head -10"

echo ""
echo "4. Agent is ready for autonomous work!"
echo ""
echo "Commands you can use:"
echo "  • Enter agent:     docker exec -it magents-$AGENT_NAME bash"
echo "  • View logs:       docker logs magents-$AGENT_NAME"
echo "  • Stop agent:      docker stop magents-$AGENT_NAME"
echo "  • Remove agent:    docker rm -f magents-$AGENT_NAME"
echo ""
echo "Inside the agent, you can use:"
echo "  • task-master next                    # Get next task"
echo "  • task-master show <id>               # View task details"
echo "  • task-master add-task --prompt '...' # Create new tasks"
echo ""

# Example of agent doing work
echo "5. Example: Agent analyzing the project..."
docker exec "magents-$AGENT_NAME" bash -c "
    cd /workspace && \
    echo 'Analyzing project structure...' && \
    find . -name '*.ts' -o -name '*.js' | grep -E '(Agent|agent)' | head -5 && \
    echo '' && \
    echo 'Agent found these agent-related files to analyze.'
"