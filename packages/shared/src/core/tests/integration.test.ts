/**
 * Integration Tests for GUI-CLI Bridge
 * 
 * Tests the unified command execution, real-time synchronization,
 * and conflict resolution between GUI and CLI interfaces.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  CoreManager, 
  CommandRegistry, 
  SyncBridge, 
  ActivityLogger, 
  ConflictResolver,
  CommandOptions,
  CoreCommandResult,
  EventPayload
} from '../index';
import { CreateAgentCommand, StartAgentCommand, StopAgentCommand } from '../commands';

describe('GUI-CLI Integration Bridge', () => {
  let coreManager: CoreManager;
  let commandRegistry: CommandRegistry;
  let syncBridge: SyncBridge;
  let activityLogger: ActivityLogger;
  let conflictResolver: ConflictResolver;

  beforeEach(() => {
    // Get fresh instance for each test
    coreManager = CoreManager.getInstance();
    commandRegistry = coreManager.commandRegistry;
    syncBridge = coreManager.syncBridge;
    activityLogger = coreManager.activityLogger;
    conflictResolver = coreManager.conflictResolver;

    // Register test commands
    commandRegistry.registerCommand(new CreateAgentCommand());
    commandRegistry.registerCommand(new StartAgentCommand());
    commandRegistry.registerCommand(new StopAgentCommand());
  });

  afterEach(() => {
    // Clean up
    vi.clearAllMocks();
  });

  describe('Unified Command Execution', () => {
    it('should execute commands from GUI interface', async () => {
      const options: CommandOptions = {
        params: { agentId: 'test-agent', branch: 'main' },
        source: 'GUI',
        sessionId: 'gui-session-1',
        userId: 'test-user'
      };

      const result = await coreManager.executeCommand('create-agent', options);

      expect(result.success).toBe(true);
      expect(result.source).toBe('GUI');
      expect(result.data).toHaveProperty('id', 'test-agent');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should execute commands from CLI interface', async () => {
      const options: CommandOptions = {
        params: { agentId: 'cli-agent' },
        source: 'CLI',
        sessionId: 'cli-session-1'
      };

      const result = await coreManager.executeCommand('start-agent', options);

      expect(result.success).toBe(true);
      expect(result.source).toBe('CLI');
      expect(result.data).toHaveProperty('agentId', 'cli-agent');
    });

    it('should handle command errors gracefully', async () => {
      const options: CommandOptions = {
        params: {}, // Missing required agentId
        source: 'GUI',
        sessionId: 'error-session'
      };

      const result = await coreManager.executeCommand('start-agent', options);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.source).toBe('GUI');
    });

    it('should validate required parameters', async () => {
      const options: CommandOptions = {
        params: { branch: 'main' }, // Missing required agentId
        source: 'GUI',
        sessionId: 'validation-session'
      };

      const result = await coreManager.executeCommand('create-agent', options);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Activity Logging', () => {
    it('should log command execution from both interfaces', async () => {
      // Execute from GUI
      await coreManager.executeCommand('create-agent', {
        params: { agentId: 'gui-agent', branch: 'main' },
        source: 'GUI',
        sessionId: 'gui-session'
      });

      // Execute from CLI
      await coreManager.executeCommand('start-agent', {
        params: { agentId: 'cli-agent' },
        source: 'CLI',
        sessionId: 'cli-session'
      });

      const allLogs = activityLogger.getLogs();
      expect(allLogs).toHaveLength(2);

      const guiLog = allLogs.find(log => log.source === 'GUI');
      const cliLog = allLogs.find(log => log.source === 'CLI');

      expect(guiLog).toBeDefined();
      expect(guiLog?.command).toBe('create-agent');
      expect(cliLog).toBeDefined();
      expect(cliLog?.command).toBe('start-agent');
    });

    it('should filter logs by source', () => {
      const guiLogs = activityLogger.getLogs({ source: 'GUI' });
      const cliLogs = activityLogger.getLogs({ source: 'CLI' });

      expect(guiLogs.every(log => log.source === 'GUI')).toBe(true);
      expect(cliLogs.every(log => log.source === 'CLI')).toBe(true);
    });

    it('should provide activity statistics', () => {
      const stats = activityLogger.getStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('bySource');
      expect(stats).toHaveProperty('byCommand');
      expect(stats).toHaveProperty('recentActivity');
      expect(stats.bySource).toHaveProperty('GUI');
      expect(stats.bySource).toHaveProperty('CLI');
    });
  });

  describe('Real-time Synchronization', () => {
    it('should broadcast events to subscribed sessions', (done) => {
      const sessionId = 'sync-session-1';
      const eventTypes = ['command.executed'];

      syncBridge.subscribe(sessionId, eventTypes);

      // Set up event listener
      syncBridge.onSync(sessionId, (payload: EventPayload) => {
        expect(payload.eventType).toBe('command.executed');
        expect(payload.source).toBe('GUI');
        expect(payload.data.command).toBe('create-agent');
        done();
      });

      // Execute command to trigger broadcast
      coreManager.executeCommand('create-agent', {
        params: { agentId: 'sync-agent', branch: 'main' },
        source: 'GUI',
        sessionId: 'different-session' // Different session to test broadcast
      });
    });

    it('should not send events back to originating session', (done) => {
      const sessionId = 'originator-session';
      let eventReceived = false;

      syncBridge.subscribe(sessionId, ['command.executed']);
      syncBridge.onSync(sessionId, () => {
        eventReceived = true;
      });

      // Execute from same session
      coreManager.executeCommand('create-agent', {
        params: { agentId: 'no-echo-agent', branch: 'main' },
        source: 'GUI',
        sessionId
      });

      // Wait a bit and check that no event was received
      setTimeout(() => {
        expect(eventReceived).toBe(false);
        done();
      }, 100);
    });

    it('should track subscribers correctly', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      syncBridge.subscribe(session1, ['command.executed', 'agent.created']);
      syncBridge.subscribe(session2, ['agent.updated']);

      const subscribers = syncBridge.getSubscribers();

      expect(subscribers['command.executed']).toContain(session1);
      expect(subscribers['agent.created']).toContain(session1);
      expect(subscribers['agent.updated']).toContain(session2);
    });

    it('should handle unsubscription', () => {
      const sessionId = 'unsubscribe-session';

      syncBridge.subscribe(sessionId, ['command.executed']);
      syncBridge.unsubscribe(sessionId, ['command.executed']);

      const subscribers = syncBridge.getSubscribers();
      expect(subscribers['command.executed']).not.toContain(sessionId);
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect resource conflicts', async () => {
      const agentId = 'conflict-agent';

      // Create two log entries for the same agent within the conflict window
      const logEntry1 = activityLogger.log({
        source: 'GUI',
        command: 'start-agent',
        params: { agentId },
        result: { success: true } as CoreCommandResult,
        sessionId: 'gui-session'
      });

      const logEntry2 = activityLogger.log({
        source: 'CLI',
        command: 'stop-agent',
        params: { agentId },
        result: { success: true } as CoreCommandResult,
        sessionId: 'cli-session'
      });

      const conflict = await conflictResolver.detectConflict(logEntry1, logEntry2);

      expect(conflict).toBeDefined();
      expect(conflict?.conflictType).toBe('resource');
      expect(conflict?.severity).toBe('medium');
    });

    it('should detect state conflicts', async () => {
      const agentId = 'state-conflict-agent';

      const logEntry1 = activityLogger.log({
        source: 'GUI',
        command: 'start-agent',
        params: { agentId },
        result: { success: true } as CoreCommandResult,
        sessionId: 'gui-session'
      });

      const logEntry2 = activityLogger.log({
        source: 'CLI',
        command: 'delete-agent',
        params: { agentId },
        result: { success: true } as CoreCommandResult,
        sessionId: 'cli-session'
      });

      const conflict = await conflictResolver.detectConflict(logEntry1, logEntry2);

      expect(conflict).toBeDefined();
      expect(conflict?.conflictType).toBe('state');
      expect(conflict?.severity).toBe('high');
    });

    it('should detect concurrent conflicts', async () => {
      const logEntry1 = activityLogger.log({
        source: 'GUI',
        command: 'create-agent',
        params: { agentId: 'concurrent-1' },
        result: { success: true } as CoreCommandResult,
        sessionId: 'gui-session'
      });

      const logEntry2 = activityLogger.log({
        source: 'CLI',
        command: 'create-agent',
        params: { agentId: 'concurrent-2' },
        result: { success: true } as CoreCommandResult,
        sessionId: 'cli-session'
      });

      const conflict = await conflictResolver.detectConflict(logEntry1, logEntry2);

      expect(conflict).toBeDefined();
      expect(conflict?.conflictType).toBe('concurrent');
      expect(conflict?.severity).toBe('low');
    });

    it('should auto-resolve resource conflicts using latest operation', async () => {
      const agentId = 'resolve-agent';

      const logEntry1 = activityLogger.log({
        source: 'GUI',
        command: 'start-agent',
        params: { agentId },
        result: { success: true } as CoreCommandResult,
        sessionId: 'gui-session'
      });

      // Create slightly later timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const logEntry2 = activityLogger.log({
        source: 'CLI',
        command: 'stop-agent',
        params: { agentId },
        result: { success: true } as CoreCommandResult,
        sessionId: 'cli-session'
      });

      const conflict = await conflictResolver.detectConflict(logEntry1, logEntry2);
      expect(conflict).toBeDefined();

      if (conflict) {
        const resolved = await conflictResolver.resolveConflict(conflict);
        expect(resolved).toBe(true);
        expect(conflict.autoResolved).toBe(true);
        expect(conflict.resolution).toContain('later operation');
      }
    });
  });

  describe('Command Registry', () => {
    it('should register and retrieve commands', () => {
      const allCommands = commandRegistry.getAllCommands();
      expect(allCommands.length).toBeGreaterThan(0);

      const createCommand = commandRegistry.getCommand('create-agent');
      expect(createCommand).toBeDefined();
      expect(createCommand?.name).toBe('create-agent');
    });

    it('should categorize commands correctly', () => {
      const agentCommands = commandRegistry.getCommandsByCategory('agent');
      expect(agentCommands.length).toBeGreaterThan(0);
      expect(agentCommands.every(cmd => cmd.category === 'agent')).toBe(true);
    });

    it('should handle unknown commands', async () => {
      const result = await commandRegistry.executeCommand('unknown-command', {
        source: 'GUI',
        sessionId: 'error-session'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('End-to-End Integration', () => {
    it('should handle complete workflow: create, start, stop, delete agent', async () => {
      const agentId = 'workflow-agent';
      const sessionId = 'workflow-session';

      // Create agent
      const createResult = await coreManager.executeCommand('create-agent', {
        params: { agentId, branch: 'main' },
        source: 'GUI',
        sessionId
      });
      expect(createResult.success).toBe(true);

      // Start agent
      const startResult = await coreManager.executeCommand('start-agent', {
        params: { agentId },
        source: 'CLI',
        sessionId: 'different-session'
      });
      expect(startResult.success).toBe(true);

      // Stop agent
      const stopResult = await coreManager.executeCommand('stop-agent', {
        params: { agentId },
        source: 'GUI',
        sessionId
      });
      expect(stopResult.success).toBe(true);

      // Verify activity logs
      const logs = activityLogger.getLogs({ limit: 10 });
      expect(logs.length).toBeGreaterThanOrEqual(3);
      
      const commandNames = logs.map(log => log.command);
      expect(commandNames).toContain('create-agent');
      expect(commandNames).toContain('start-agent');
      expect(commandNames).toContain('stop-agent');
    });

    it('should broadcast events for workflow operations', (done) => {
      const sessionId = 'broadcast-session';
      let eventCount = 0;
      const expectedEvents = 2; // We'll execute 2 commands

      syncBridge.subscribe(sessionId, ['command.executed']);
      syncBridge.onSync(sessionId, (payload: EventPayload) => {
        eventCount++;
        expect(payload.eventType).toBe('command.executed');
        
        if (eventCount === expectedEvents) {
          done();
        }
      });

      // Execute commands from different session to trigger broadcasts
      Promise.all([
        coreManager.executeCommand('create-agent', {
          params: { agentId: 'broadcast-agent-1', branch: 'main' },
          source: 'GUI',
          sessionId: 'other-session-1'
        }),
        coreManager.executeCommand('create-agent', {
          params: { agentId: 'broadcast-agent-2', branch: 'main' },
          source: 'CLI',
          sessionId: 'other-session-2'
        })
      ]);
    });
  });
});