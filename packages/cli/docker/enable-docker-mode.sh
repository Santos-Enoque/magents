#!/bin/bash
# Enable Docker mode for Magents

# Go to project root
cd "$(dirname "$0")/../../.."

echo "Enabling Docker mode..."
npx magents config --docker

echo ""
echo "Checking configuration..."
npx magents config | grep -E "(Docker mode|Docker image)"

echo ""
echo "Docker mode is now enabled!"
echo ""
echo "Next steps:"
echo "1. Build Docker image:  cd packages/cli/docker && ./build.sh"
echo "2. Create Docker agent: npx magents create feature/test test-agent"
echo "3. List agents:         npx magents list"
echo "4. Attach to agent:     npx magents attach test-agent"