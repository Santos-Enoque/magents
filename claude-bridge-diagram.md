# Claude Code Bridge Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                            HOST SYSTEM                               │
│                                                                     │
│  ┌─────────────────┐         ┌──────────────────────┐             │
│  │   Claude Code   │         │  Claude Bridge       │             │
│  │   (Installed)   │◄────────│  Server              │             │
│  │                 │         │                      │             │
│  │  - Authenticated│         │  Listens on:        │             │
│  │  - API Keys     │         │  /var/run/claude-   │             │
│  │  - Session      │         │  code-bridge.sock   │             │
│  └─────────────────┘         └──────────┬───────────┘             │
│                                         │                          │
│  ┌─────────────────┐                   │ Unix Socket              │
│  │ ~/.config/      │                   │                          │
│  │ claude-code/    │───────────────────┼─────────┐                │
│  │ (credentials)   │ Read-Only Mount   │         │                │
│  └─────────────────┘                   │         │                │
└────────────────────────────────────────┼─────────┼────────────────┘
                                        │         │
                    Docker Socket Mount │         │ Config Mount
                                        │         │ (Read-Only)
┌───────────────────────────────────────┼─────────┼────────────────┐
│                        DOCKER         │         │                 │
│  ┌────────────────────────────────────┼─────────┼──────────────┐ │
│  │              Agent Container 1     │         │              │ │
│  │                                    ▼         ▼              │ │
│  │  ┌──────────────┐    ┌──────────────────────────┐         │ │
│  │  │ Task Master  │    │ /host/claude-bridge.sock │         │ │
│  │  │              │───►│                          │         │ │
│  │  └──────────────┘    └──────────────────────────┘         │ │
│  │         │                          │                       │ │
│  │         ▼                          │                       │ │
│  │  ┌──────────────┐                 │                       │ │
│  │  │ claude       │                 │                       │ │
│  │  │ (wrapper)    │─────────────────┘                       │ │
│  │  └──────────────┘                                         │ │
│  │                                                           │ │
│  │  /workspace (project files)                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Agent Container 2                            │ │
│  │  (Same setup as Container 1)                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Agent Container N...                         │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Agent Request**: Task Master or user in container calls `claude` command
2. **Wrapper Script**: Container's claude wrapper captures the command
3. **Socket Communication**: Request sent via Unix socket to host bridge
4. **Host Execution**: Bridge server executes real Claude Code on host
5. **Response Stream**: Output streamed back through socket to container
6. **Result Delivery**: Container's wrapper returns result to caller

## Key Points

- **Single Point of Authentication**: Only host needs Claude Code setup
- **Shared Resources**: All containers share host's Claude Code instance
- **Secure Communication**: Unix sockets provide fast, secure IPC
- **Graceful Fallback**: Containers can detect if bridge is unavailable
- **Zero Configuration**: Containers work immediately after creation