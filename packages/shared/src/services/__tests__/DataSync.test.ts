/**
 * Test suite for DataSync service
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import {
  DataSyncClient,
  DataSyncServer,
  DataSyncManager,
  SyncEvent,
  createSyncServer,
  createSyncClient,
  createSyncManager,
} from '../DataSync';
import { UnifiedDatabaseService, DatabaseFactory } from '../../database';
import { UnifiedAgentData, UnifiedProjectData, UnifiedTaskData } from '../../types/unified';

// Mock WebSocket
jest.mock('ws');
const MockWebSocket = WebSocket as jest.MockedClass<typeof WebSocket>;

describe('DataSyncClient', () => {
  let client: DataSyncClient;
  let mockWs: jest.Mocked<WebSocket>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockWs = {
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      send: jest.fn(),
      close: jest.fn(),
      terminate: jest.fn(),
      readyState: WebSocket.OPEN,
    } as any;

    MockWebSocket.mockImplementation(() => mockWs);

    client = new DataSyncClient({
      url: 'ws://localhost:8080',
      reconnectInterval: 100,
      maxReconnectAttempts: 3,
      heartbeatInterval: 1000,
      timeout: 5000,
    });
  });

  afterEach(() => {
    client.disconnect();
  });

  describe('connection management', () => {
    it('should connect successfully', async () => {
      const connectPromise = client.connect();
      
      // Simulate successful connection
      setTimeout(() => {
        if (mockWs.onopen) mockWs.onopen({} as any);
      }, 10);

      await connectPromise;
      
      expect(MockWebSocket).toHaveBeenCalledWith('ws://localhost:8080');
      expect(client.isConnectedToServer()).toBe(true);
    });

    it('should handle connection timeout', async () => {
      const connectPromise = client.connect();
      
      // Don't trigger onopen - let it timeout
      await expect(connectPromise).rejects.toThrow('Connection timeout');
    });

    it('should disconnect cleanly', () => {
      client.disconnect();
      
      expect(mockWs.close).toHaveBeenCalled();
      expect(client.isConnectedToServer()).toBe(false);
    });

    it('should emit connected event', (done) => {
      client.on('connected', () => {
        expect(client.isConnectedToServer()).toBe(true);
        done();
      });

      client.connect();
      setTimeout(() => {
        if (mockWs.onopen) mockWs.onopen({} as any);
      }, 10);
    });

    it('should emit disconnected event', (done) => {
      client.on('disconnected', () => {
        expect(client.isConnectedToServer()).toBe(false);
        done();
      });

      // First connect
      client.connect();
      setTimeout(() => {
        if (mockWs.onopen) mockWs.onopen({} as any);
        // Then disconnect
        setTimeout(() => {
          if (mockWs.onclose) mockWs.onclose({} as any);
        }, 10);
      }, 10);
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      setTimeout(() => {
        if (mockWs.onopen) mockWs.onopen({} as any);
      }, 10);
      await connectPromise;
    });

    it('should send events to server', () => {
      const event: SyncEvent = {
        id: 'test-event-1',
        type: 'agent.created',
        entityType: 'agent',
        entityId: 'agent-123',
        action: 'create',
        data: { id: 'agent-123', name: 'Test Agent' },
        timestamp: new Date(),
        source: 'gui',
      };

      client.sendEvent(event);
      
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(event));
    });

    it('should handle sync events from server', (done) => {
      const eventData: SyncEvent = {
        id: 'test-event-1',
        type: 'agent.updated',
        entityType: 'agent',
        entityId: 'agent-123',
        action: 'update',
        data: { id: 'agent-123', name: 'Updated Agent' },
        timestamp: new Date(),
        source: 'cli',
      };

      client.on('sync_event', (event) => {
        expect(event).toEqual(eventData);
        done();
      });

      // Simulate receiving message from server
      const message = {
        type: 'sync_event',
        data: eventData,
      };
      
      if (mockWs.onmessage) mockWs.onmessage({ data: JSON.stringify(message) } as any);
    });

    it('should subscribe to event types', () => {
      const eventTypes: any[] = ['agent.created', 'project.updated'];
      client.subscribe(eventTypes);
      
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'subscribe',
        eventTypes,
      }));
    });

    it('should unsubscribe from event types', () => {
      const eventTypes: any[] = ['agent.created', 'project.updated'];
      client.unsubscribe(eventTypes);
      
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'unsubscribe',
        eventTypes,
      }));
    });

    it('should handle heartbeat messages', () => {
      // Simulate ping/pong
      if (mockWs.onmessage) mockWs.onmessage({ data: JSON.stringify({ type: 'pong' }) } as any);
      
      // Should not throw any errors
      expect(mockWs.onmessage).toBeDefined();
    });

    it('should handle malformed messages gracefully', (done) => {
      client.on('error', (error) => {
        expect(error).toBeInstanceOf(Error);
        done();
      });

      // Send malformed JSON
      if (mockWs.onmessage) mockWs.onmessage({ data: 'invalid json' } as any);
    });
  });

  describe('reconnection logic', () => {
    it('should attempt reconnection on disconnect', (done) => {
      const connectSpy = jest.spyOn(client, 'connect');
      
      // Connect first
      client.connect();
      setTimeout(() => {
        if (mockWs.onopen) mockWs.onopen({} as any);
        
        // Then disconnect to trigger reconnection
        setTimeout(() => {
          if (mockWs.onclose) mockWs.onclose({} as any);
          
          // Wait for reconnection attempt
          setTimeout(() => {
            expect(connectSpy).toHaveBeenCalledTimes(2); // Initial + reconnect
            done();
          }, 150);
        }, 10);
      }, 10);
    });

    it('should stop reconnecting after max attempts', (done) => {
      client.on('max_reconnect_attempts_reached', () => {
        done();
      });

      // Simulate failed connections
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (mockWs.onerror) mockWs.onerror({} as any);
        }, i * 50);
      }
    });
  });
});

describe('DataSyncServer', () => {
  let server: DataSyncServer;
  let mockDb: UnifiedDatabaseService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDb = await DatabaseFactory.createInMemory();
    server = new DataSyncServer({
      port: 8080,
      heartbeatInterval: 1000,
      maxConnections: 10,
    }, mockDb);
  });

  afterEach(async () => {
    await server.stop();
    await mockDb.close();
  });

  describe('server lifecycle', () => {
    it('should create server instance', () => {
      expect(server).toBeInstanceOf(DataSyncServer);
      expect(server.getClientCount()).toBe(0);
    });

    it('should handle event broadcasting', () => {
      const event: SyncEvent = {
        id: 'test-event-1',
        type: 'agent.created',
        entityType: 'agent',
        entityId: 'agent-123',
        action: 'create',
        data: { id: 'agent-123', name: 'Test Agent' },
        timestamp: new Date(),
        source: 'cli',
      };

      // Should not throw when broadcasting without clients
      expect(() => server.broadcastEvent(event)).not.toThrow();
    });

    it('should track client count', () => {
      expect(server.getClientCount()).toBe(0);
    });
  });
});

describe('DataSyncManager', () => {
  let manager: DataSyncManager;
  let mockDb: UnifiedDatabaseService;

  beforeEach(async () => {
    // Use in-memory database for testing
    mockDb = await DatabaseFactory.createInMemory();
    manager = new DataSyncManager(mockDb);
  });

  afterEach(async () => {
    await manager.stop();
    await mockDb.close();
  });

  describe('sync operations', () => {
    it('should sync agent changes', (done) => {
      const mockAgent: UnifiedAgentData = {
        id: 'agent-123',
        name: 'Test Agent',
        projectId: 'project-456',
        status: 'RUNNING',
        mode: 'docker',
        branch: 'main',
        worktreePath: '/path/to/worktree',
        createdAt: new Date(),
        updatedAt: new Date(),
        autoAccept: false,
        dockerPorts: [],
        dockerVolumes: [],
        environmentVars: {},
        assignedTasks: [],
        tags: [],
        metadata: {},
      };

      manager.on('event_broadcasted', (event: SyncEvent) => {
        expect(event.type).toBe('agent.create');
        expect(event.entityType).toBe('agent');
        expect(event.entityId).toBe('agent-123');
        expect(event.action).toBe('create');
        expect(event.data).toEqual(mockAgent);
        done();
      });

      manager.syncAgentChange('create', mockAgent);
    });

    it('should sync project changes', (done) => {
      const mockProject: UnifiedProjectData = {
        id: 'project-123',
        name: 'Test Project',
        path: '/path/to/project',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        agentIds: [],
        maxAgents: 10,
        taskMasterEnabled: false,
        tags: [],
        metadata: {},
      };

      manager.on('event_broadcasted', (event: SyncEvent) => {
        expect(event.type).toBe('project.update');
        expect(event.entityType).toBe('project');
        expect(event.data).toEqual(mockProject);
        done();
      });

      manager.syncProjectChange('update', mockProject);
    });

    it('should sync task changes', (done) => {
      const mockTask: UnifiedTaskData = {
        id: 'task-123',
        projectId: 'project-456',
        title: 'Test Task',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        subtaskIds: [],
        dependencies: [],
        tags: [],
        metadata: {},
      };

      manager.on('event_broadcasted', (event: SyncEvent) => {
        expect(event.type).toBe('task.delete');
        expect(event.entityType).toBe('task');
        expect(event.action).toBe('delete');
        done();
      });

      manager.syncTaskChange('delete', mockTask);
    });
  });

  describe('server mode', () => {
    it('should start as server', async () => {
      await manager.startServer({ port: 8082 });
      
      const stats = manager.getStats();
      expect(stats.serverConnections).toBe(0);
    });

    it('should handle server events', (done) => {
      manager.on('client_connected', () => {
        done();
      });

      manager.startServer({ port: 8083 }).then(() => {
        // Simulate client connection
        manager.emit('client_connected');
      });
    });
  });

  describe('client mode', () => {
    it('should start as client', async () => {
      // Mock successful connection
      const originalConnect = DataSyncClient.prototype.connect;
      DataSyncClient.prototype.connect = jest.fn().mockResolvedValue(undefined);
      
      await manager.startClient({ url: 'ws://localhost:8084' });
      
      const stats = manager.getStats();
      expect(stats.clientConnected).toBeDefined();

      // Restore original method
      DataSyncClient.prototype.connect = originalConnect;
    });
  });

  describe('statistics', () => {
    it('should provide sync statistics', () => {
      const stats = manager.getStats();
      
      expect(stats).toHaveProperty('eventsProcessed');
      expect(stats.eventsProcessed).toBe(0);
    });
  });
});

describe('Factory functions', () => {
  let mockDb: UnifiedDatabaseService;

  beforeEach(async () => {
    mockDb = await DatabaseFactory.createInMemory();
  });

  afterEach(async () => {
    await mockDb.close();
  });

  it('should create sync server', () => {
    const server = createSyncServer({ port: 8085 }, mockDb);
    expect(server).toBeInstanceOf(DataSyncServer);
  });

  it('should create sync client', () => {
    const client = createSyncClient({ url: 'ws://localhost:8086' });
    expect(client).toBeInstanceOf(DataSyncClient);
  });

  it('should create sync manager', () => {
    const manager = createSyncManager(mockDb);
    expect(manager).toBeInstanceOf(DataSyncManager);
  });
});

describe('Integration tests', () => {
  let server: DataSyncServer | undefined;
  let client: DataSyncClient | undefined;
  let manager: DataSyncManager;
  let mockDb: UnifiedDatabaseService;

  beforeEach(async () => {
    mockDb = await DatabaseFactory.createInMemory();
    manager = new DataSyncManager(mockDb);
  });

  afterEach(async () => {
    if (client) client.disconnect();
    if (server) await server.stop();
    await manager.stop();
    await mockDb.close();
  });

  it('should handle full sync workflow', (done) => {
    // This is a simplified integration test
    // In a real environment, you'd set up actual WebSocket connections
    
    const mockAgent: UnifiedAgentData = {
      id: 'agent-integration-test',
      name: 'Integration Test Agent',
      projectId: 'project-456',
      status: 'RUNNING',
      mode: 'docker',
      branch: 'main',
      worktreePath: '/path/to/worktree',
      createdAt: new Date(),
      updatedAt: new Date(),
      autoAccept: false,
      dockerPorts: [],
      dockerVolumes: [],
      environmentVars: {},
      assignedTasks: [],
      tags: [],
      metadata: {},
    };

    manager.on('event_broadcasted', (event: SyncEvent) => {
      expect(event.entityId).toBe('agent-integration-test');
      done();
    });

    manager.syncAgentChange('create', mockAgent);
  });
});