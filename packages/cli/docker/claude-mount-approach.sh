#!/bin/bash
# Alternative approach using mounted directories (experimental)

# Create a test container with mounted dirs
docker run -it --rm \
  -v ~/.claude:/home/magents/.claude \
  -v ~/.config/claude:/home/magents/.config/claude \
  -v $(pwd):/workspace \
  -e HOME=/home/magents \
  magents/claude:dev \
  bash -c "
    echo 'Checking mounted authentication...'
    ls -la ~/.claude/
    echo ''
    echo 'Testing Claude...'
    claude --version || echo 'Auth not recognized'
    echo ''
    echo 'This approach likely won't work due to system-specific auth'
  "