# This Dockerfile has been replaced by Dockerfile.multi-stage
# which supports both production and development variants
#
# To build:
#   Production: docker build --build-arg BUILD_TARGET=production -f Dockerfile.multi-stage -t magents/agent:latest .
#   Development: docker build --build-arg BUILD_TARGET=development -f Dockerfile.multi-stage -t magents/agent:dev .
#
# Or use the build script: ./build-images.sh

# For backward compatibility, this builds the production variant
FROM buildpack-deps:focal AS builder
COPY Dockerfile.multi-stage /tmp/
RUN echo "Please use Dockerfile.multi-stage instead" && exit 1