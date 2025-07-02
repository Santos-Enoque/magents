# Claude Docker Authentication Solution

## The Issue

Claude Code CLI uses system-specific authentication storage (likely macOS Keychain or similar secure storage) that cannot be directly copied into Docker containers. This is why you're being asked to login each time.

## Solution: Authenticate Inside Container

Since Claude's authentication is tied to the system it runs on, you need to authenticate Claude inside the Docker container itself. Here's how:

### Step 1: Build the Docker Image

```bash
docker build -f Dockerfile.claude-working --target development -t magents/claude:dev .
```

### Step 2: Create Persistent Volume

```bash
docker volume create claude-container-auth
```

### Step 3: Run Container and Authenticate

```bash
# Start an interactive container with persistent volume
docker run -it --rm \
  -v claude-container-auth:/home/magents \
  -v $(pwd):/workspace \
  --name claude-setup \
  magents/claude:dev bash

# Inside the container, authenticate Claude:
claude

# This will:
# 1. Ask you to choose a theme (press 1-6)
# 2. Show a browser link for authentication
# 3. After authenticating in browser, press Enter in terminal
# 4. Claude will be authenticated

# Exit the container
exit
```

### Step 4: Copy Your Local Settings

```bash
# Start a temporary container
docker run -d --name claude-copy \
  -v claude-container-auth:/home/magents \
  magents/claude:dev sleep 300

# Copy your settings and commands
docker cp ~/.claude/settings.json claude-copy:/home/magents/.claude/
docker cp ~/.claude/commands/. claude-copy:/home/magents/.claude/commands/

# Stop and remove temp container
docker stop claude-copy && docker rm claude-copy
```

### Step 5: Use Claude Without Login

Now you can run Claude without being asked to login:

```bash
docker run -it --rm \
  -v claude-container-auth:/home/magents \
  -v $(pwd):/workspace \
  magents/claude:dev claude
```

## Docker Compose Configuration

Update your `docker-compose.claude-working.yml` to use the authenticated volume:

```yaml
version: '3.8'

services:
  claude-agent:
    image: magents/claude:dev
    volumes:
      # Use the authenticated volume instead of claude-data
      - claude-container-auth:/home/magents
      - ../../../:/workspace
    stdin_open: true
    tty: true
    command: claude

volumes:
  claude-container-auth:
    external: true
```

## Alternative: Use Environment Variable

If you have an Anthropic API key, you can bypass the browser authentication:

```bash
# Export your API key
export ANTHROPIC_API_KEY='your-api-key-here'

# Run with environment variable
docker run -it --rm \
  -e ANTHROPIC_API_KEY \
  -v $(pwd):/workspace \
  magents/claude:dev claude
```

## Key Points

1. **Authentication is Container-Specific**: Each container environment needs its own authentication
2. **Use Named Volumes**: The `claude-container-auth` volume persists the authentication
3. **Settings are Separate**: Your local settings/commands need to be copied after authentication
4. **One-Time Setup**: Once authenticated in the volume, all containers using that volume share the auth

## Testing

To verify authentication persists:

```bash
# Test 1: Check version without login prompt
docker run --rm \
  -v claude-container-auth:/home/magents \
  magents/claude:dev claude --version

# Test 2: Run a quick command
docker run --rm \
  -v claude-container-auth:/home/magents \
  -v $(pwd):/workspace \
  magents/claude:dev \
  claude -p "Create a test.txt file with 'Hello from Docker'"
```

If these commands work without asking for login, your setup is complete!