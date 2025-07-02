#!/bin/bash
# Manage Claude authentication for Docker agents

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

function show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  export    Export Claude auth from host to .env file"
    echo "  setup     Interactive setup for new auth"
    echo "  test      Test Claude in container"
    echo "  deploy    Prepare auth for cloud deployment"
    echo ""
}

function export_auth() {
    echo "Exporting Claude authentication..."
    
    if [ ! -f "$HOME/.config/claude/config.json" ]; then
        echo "❌ No Claude authentication found on host"
        echo "   Run 'claude auth' first"
        exit 1
    fi
    
    # Extract token (this is simplified - actual format may vary)
    TOKEN=$(jq -r '.token // .auth_token // .session' "$HOME/.config/claude/config.json" 2>/dev/null || echo "")
    
    if [ -z "$TOKEN" ]; then
        echo "❌ Could not extract authentication token"
        exit 1
    fi
    
    # Save to .env file
    echo "CLAUDE_AUTH_TOKEN=$TOKEN" > "$SCRIPT_DIR/.env"
    echo "✅ Authentication exported to .env file"
    echo "   You can now use this in Docker containers"
}

function setup_auth() {
    echo "Setting up Claude authentication in container..."
    
    # Build development image
    docker build -f Dockerfile.claude --target development -t magents/claude-agent:dev .
    
    # Run interactive auth
    docker run -it --rm \
        -v "$HOME/.config/claude:/auth" \
        magents/claude-agent:dev \
        claude auth
    
    echo "✅ Authentication complete"
}

function test_claude() {
    echo "Testing Claude in container..."
    
    # Build image
    docker build -f Dockerfile.claude --target development -t magents/claude-agent:dev .
    
    # Test with mounted auth
    docker run --rm \
        -v "$HOME/.config/claude:/auth:ro" \
        -v "$PWD:/workspace" \
        magents/claude-agent:dev \
        claude --version
    
    echo ""
    echo "Testing interactive Claude..."
    docker run -it --rm \
        -v "$HOME/.config/claude:/auth:ro" \
        -v "$PWD:/workspace" \
        magents/claude-agent:dev \
        bash -c "claude-setup.sh claude"
}

function prepare_deploy() {
    echo "Preparing for cloud deployment..."
    
    # Check for auth
    if [ ! -f "$HOME/.config/claude/config.json" ]; then
        echo "❌ No Claude authentication found"
        exit 1
    fi
    
    # Create auth secret for Kubernetes
    kubectl create secret generic claude-auth \
        --from-file=config.json="$HOME/.config/claude/config.json" \
        --dry-run=client -o yaml > claude-auth-secret.yaml
    
    echo "✅ Created claude-auth-secret.yaml"
    
    # Build production image
    docker build -f Dockerfile.claude --target production -t magents/claude-agent:latest .
    
    echo "✅ Built production image"
    echo ""
    echo "Next steps:"
    echo "1. Push image: docker push magents/claude-agent:latest"
    echo "2. Apply secret: kubectl apply -f claude-auth-secret.yaml"
    echo "3. Deploy: kubectl apply -f k8s-deployment.yaml"
}

# Main
case "$1" in
    export)
        export_auth
        ;;
    setup)
        setup_auth
        ;;
    test)
        test_claude
        ;;
    deploy)
        prepare_deploy
        ;;
    *)
        show_help
        ;;
esac