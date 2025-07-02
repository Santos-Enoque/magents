# Base image with Node.js 20
FROM node:20-slim AS base

# Install essential system packages
RUN apt-get update && apt-get install -y \
    git \
    tmux \
    curl \
    python3 \
    python3-pip \
    make \
    g++ \
    build-essential \
    sudo \
    netcat-openbsd \
    jq \
    coreutils \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -g 1001 magents && \
    useradd -u 1001 -g magents -m -s /bin/bash magents && \
    echo 'magents ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Set up working directory
WORKDIR /workspace

# Install global npm packages
RUN npm install -g npm@latest pnpm task-master-ai

# Switch to non-root user
USER magents

# Create necessary directories with proper permissions
RUN mkdir -p /home/magents/.config /home/magents/.cache /home/magents/.npm

# Set environment variables
ENV NODE_ENV=production
ENV WORKSPACE_DIR=/workspace
ENV SHARED_DIR=/shared
ENV AGENT_DIR=/agent
ENV USER=magents

# Create volume mount points
VOLUME ["/workspace", "/shared", "/agent"]

# Copy scripts
COPY --chown=magents:magents docker-entrypoint.sh /usr/local/bin/
COPY --chown=magents:magents claude-wrapper.sh /usr/local/bin/claude
RUN chmod +x /usr/local/bin/docker-entrypoint.sh /usr/local/bin/claude

# Default command
CMD ["/usr/local/bin/docker-entrypoint.sh"]