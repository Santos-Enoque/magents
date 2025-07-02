#!/bin/bash
set -e

# Script to build both production and development Docker images
# Usage: ./build-images.sh [--push] [--registry <registry>]

PUSH=false
REGISTRY="magents"
VERSION=$(date +%Y%m%d-%H%M%S)
LATEST=true

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --push)
            PUSH=true
            shift
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --no-latest)
            LATEST=false
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--push] [--registry <registry>] [--version <version>] [--no-latest]"
            exit 1
            ;;
    esac
done

echo "Building magents agent Docker images..."
echo "Registry: $REGISTRY"
echo "Version: $VERSION"
echo "Push to registry: $PUSH"
echo ""

# Build production image
echo "=== Building PRODUCTION image ==="
docker build \
    --build-arg BUILD_TARGET=production \
    -f Dockerfile.multi-stage \
    -t "$REGISTRY/agent:$VERSION" \
    -t "$REGISTRY/agent:production-$VERSION" \
    .

if [ "$LATEST" = true ]; then
    docker tag "$REGISTRY/agent:$VERSION" "$REGISTRY/agent:latest"
    docker tag "$REGISTRY/agent:$VERSION" "$REGISTRY/agent:production"
fi

echo "✓ Production image built successfully"
echo ""

# Build development image
echo "=== Building DEVELOPMENT image ==="
docker build \
    --build-arg BUILD_TARGET=development \
    -f Dockerfile.multi-stage \
    -t "$REGISTRY/agent:dev-$VERSION" \
    .

if [ "$LATEST" = true ]; then
    docker tag "$REGISTRY/agent:dev-$VERSION" "$REGISTRY/agent:dev"
    docker tag "$REGISTRY/agent:dev-$VERSION" "$REGISTRY/agent:development"
fi

echo "✓ Development image built successfully"
echo ""

# Show image sizes
echo "=== Image Sizes ==="
docker images | grep "$REGISTRY/agent" | grep -E "(latest|production|dev|$VERSION)" | sort

# Push images if requested
if [ "$PUSH" = true ]; then
    echo ""
    echo "=== Pushing images to registry ==="
    
    # Production images
    docker push "$REGISTRY/agent:$VERSION"
    docker push "$REGISTRY/agent:production-$VERSION"
    if [ "$LATEST" = true ]; then
        docker push "$REGISTRY/agent:latest"
        docker push "$REGISTRY/agent:production"
    fi
    
    # Development images
    docker push "$REGISTRY/agent:dev-$VERSION"
    if [ "$LATEST" = true ]; then
        docker push "$REGISTRY/agent:dev"
        docker push "$REGISTRY/agent:development"
    fi
    
    echo "✓ All images pushed successfully"
fi

echo ""
echo "=== Build Complete ==="
echo "Production image: $REGISTRY/agent:latest"
echo "Development image: $REGISTRY/agent:dev"