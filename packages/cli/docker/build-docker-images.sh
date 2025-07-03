#!/bin/bash

# Build script for Magents Docker images
# Supports building with or without Task Master integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
BUILD_TARGET="production"
INCLUDE_TASKMASTER="false"
TAG_SUFFIX=""
DOCKERFILE="Dockerfile.multi-stage"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --with-taskmaster)
      INCLUDE_TASKMASTER="true"
      TAG_SUFFIX="-taskmaster"
      shift
      ;;
    --dev|--development)
      BUILD_TARGET="development"
      shift
      ;;
    --file)
      DOCKERFILE="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --with-taskmaster    Include Task Master in the image"
      echo "  --dev, --development Build development variant"
      echo "  --file <dockerfile>  Use specific Dockerfile (default: Dockerfile.multi-stage)"
      echo "  --help              Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                          # Build production image without Task Master"
      echo "  $0 --with-taskmaster        # Build production image with Task Master"
      echo "  $0 --dev                    # Build development image without Task Master"
      echo "  $0 --dev --with-taskmaster  # Build development image with Task Master"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Determine image tag
if [ "$BUILD_TARGET" = "development" ]; then
  IMAGE_TAG="magents/agent:dev${TAG_SUFFIX}"
else
  IMAGE_TAG="magents/agent:latest${TAG_SUFFIX}"
fi

echo -e "${GREEN}Building Magents Docker image...${NC}"
echo -e "Build target: ${YELLOW}${BUILD_TARGET}${NC}"
echo -e "Include Task Master: ${YELLOW}${INCLUDE_TASKMASTER}${NC}"
echo -e "Image tag: ${YELLOW}${IMAGE_TAG}${NC}"
echo ""

# Build the image
docker build \
  --build-arg BUILD_TARGET="${BUILD_TARGET}" \
  --build-arg INCLUDE_TASKMASTER="${INCLUDE_TASKMASTER}" \
  -f "${DOCKERFILE}" \
  -t "${IMAGE_TAG}" \
  .

if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}✓ Successfully built ${IMAGE_TAG}${NC}"
  
  # Show image info
  echo -e "\nImage details:"
  docker images "${IMAGE_TAG}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
  
  # Provide usage instructions
  echo -e "\n${GREEN}To use this image:${NC}"
  echo -e "  magents create my-agent --docker-image ${IMAGE_TAG}"
  
  if [ "$INCLUDE_TASKMASTER" = "true" ]; then
    echo -e "\n${YELLOW}Note: This image includes Task Master integration${NC}"
  else
    echo -e "\n${YELLOW}Note: Task Master not included. Enable it via agent configuration if needed.${NC}"
  fi
else
  echo -e "\n${RED}✗ Build failed${NC}"
  exit 1
fi