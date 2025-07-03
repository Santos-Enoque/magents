/**
 * Command Palette Component for GUI-CLI Integration
 * 
 * Provides a unified command interface that leverages the core manager
 * to execute commands that are also available in the CLI.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MagnifyingGlassIcon, CommandLineIcon } from '@heroicons/react/24/outline';
import { CoreCommandResult } from '@magents/shared';
import { useDemoMode } from './DemoModeProvider';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCommandExecuted?: (result: CoreCommandResult) => void;
}

interface CommandSuggestion {
  name: string;
  description: string;
  category: 'agent' | 'project' | 'system' | 'config';
  requiredParams: string[];
  optionalParams: string[];
  execute: (options: any) => Promise<any>;
  shortcut?: string;
  icon?: React.ReactNode;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onCommandExecuted
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<CoreCommandResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDemoMode } = useDemoMode();

  // Mock commands for browser environment
  // TODO: Replace with API call to fetch available commands from backend
  const mockCommands = [
    {
      name: 'list-agents',
      description: 'List all agents',
      category: 'agent' as const,
      requiredParams: [],
      optionalParams: ['status', 'project'],
      execute: async (options: any) => ({ success: true, data: [] })
    },
    {
      name: 'create-agent',
      description: 'Create a new agent',
      category: 'agent' as const,
      requiredParams: ['branch'],
      optionalParams: ['project', 'mode'],
      execute: async (options: any) => ({ success: true, data: { id: 'new-agent' } })
    },
    {
      name: 'start-agent',
      description: 'Start an agent',
      category: 'agent' as const,
      requiredParams: ['agentId'],
      optionalParams: [],
      execute: async (options: any) => ({ success: true, data: { status: 'RUNNING' } })
    },
    {
      name: 'stop-agent',
      description: 'Stop an agent',
      category: 'agent' as const,
      requiredParams: ['agentId'],
      optionalParams: [],
      execute: async (options: any) => ({ success: true, data: { status: 'STOPPED' } })
    },
    {
      name: 'list-projects',
      description: 'List all projects',
      category: 'project' as const,
      requiredParams: [],
      optionalParams: [],
      execute: async (options: any) => ({ success: true, data: [] })
    },
    {
      name: 'system-status',
      description: 'Get system status',
      category: 'system' as const,
      requiredParams: [],
      optionalParams: [],
      execute: async (options: any) => ({ success: true, data: { status: 'healthy' } })
    }
  ];

  // Get all available commands from the mock registry
  const allCommands = useMemo(() => {
    // Add shortcuts and icons for better UX
    const enhancedCommands: CommandSuggestion[] = mockCommands.map(cmd => ({
      ...cmd,
      shortcut: getCommandShortcut(cmd.name),
      icon: getCommandIcon(cmd.category)
    }));

    return enhancedCommands;
  }, []);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;

    const lowerQuery = query.toLowerCase();
    return allCommands.filter(cmd => 
      cmd.name.toLowerCase().includes(lowerQuery) ||
      cmd.description.toLowerCase().includes(lowerQuery) ||
      cmd.category.toLowerCase().includes(lowerQuery)
    ).sort((a, b) => {
      // Prioritize exact matches
      const aExact = a.name.toLowerCase().startsWith(lowerQuery);
      const bExact = b.name.toLowerCase().startsWith(lowerQuery);
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then by category priority
      const categoryPriority = { agent: 0, project: 1, system: 2, config: 3 };
      return (categoryPriority[a.category] || 999) - (categoryPriority[b.category] || 999);
    });
  }, [query, allCommands]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setExecutionResult(null);
      setIsExecuting(false);
      // Focus input after a small delay to ensure modal is rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Update selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex] && !isExecuting) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, isExecuting, onClose]);

  const executeCommand = async (command: CommandSuggestion) => {
    if (isExecuting) return;

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      // For demo mode, we'll simulate command execution
      const sessionId = `session_${Date.now()}`;
      
      // Get required parameters from user (simplified for demo)
      const params: Record<string, any> = {};
      
      // For commands that require parameters, we'll use mock data in demo mode
      if (isDemoMode) {
        for (const param of command.requiredParams) {
          switch (param) {
            case 'agentId':
              params[param] = 'demo-agent-1';
              break;
            case 'projectId':
              params[param] = 'demo-project-1';
              break;
            case 'name':
              params[param] = 'Demo Item';
              break;
            case 'path':
              params[param] = '/demo/path';
              break;
            case 'key':
              params[param] = 'DEMO_CONFIG';
              break;
            case 'value':
              params[param] = 'demo-value';
              break;
            default:
              params[param] = `demo-${param}`;
          }
        }
      }

      const result = await coreManager.executeCommand(command.name, {
        params,
        source: 'GUI',
        sessionId,
        userId: isDemoMode ? 'demo-user' : undefined
      });

      setExecutionResult(result);
      onCommandExecuted?.(result);

      // Auto-close on successful execution (after showing result briefly)
      if (result.success) {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Command execution failed:', error);
      setExecutionResult({
        success: false,
        error: error as any,
        executionTime: 0,
        commandId: '',
        source: 'GUI',
        timestamp: new Date()
      });
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Command Palette Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg">
        <div className="bg-background-card border border-border rounded-lg shadow-xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center px-4 py-3 border-b border-border">
            <MagnifyingGlassIcon className="w-5 h-5 text-foreground-secondary mr-3" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-foreground placeholder-foreground-tertiary focus:outline-none"
            />
            {isDemoMode && (
              <span className="text-xs text-purple-400 font-medium">DEMO</span>
            )}
          </div>

          {/* Command List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-foreground-secondary">No commands found</p>
                <p className="text-sm text-foreground-tertiary mt-1">
                  Try a different search term
                </p>
              </div>
            ) : (
              <div className="py-2">
                {filteredCommands.map((command, index) => (
                  <button
                    key={command.name}
                    onClick={() => executeCommand(command)}
                    disabled={isExecuting}
                    className={`w-full px-4 py-3 text-left hover:bg-background-tertiary transition-colors ${
                      index === selectedIndex ? 'bg-background-tertiary' : ''
                    } ${isExecuting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {command.icon}
                        <div>
                          <div className="font-medium text-foreground">
                            {command.name}
                          </div>
                          <div className="text-sm text-foreground-secondary">
                            {command.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(command.category)}`}>
                          {command.category}
                        </span>
                        {command.shortcut && (
                          <kbd className="px-2 py-1 text-xs bg-background-tertiary text-foreground-secondary rounded">
                            {command.shortcut}
                          </kbd>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Execution Result */}
          {executionResult && (
            <div className="border-t border-border px-4 py-3">
              <div className={`flex items-center gap-2 ${
                executionResult.success ? 'text-status-success' : 'text-status-error'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  executionResult.success ? 'bg-status-success' : 'bg-status-error'
                }`} />
                <span className="text-sm font-medium">
                  {executionResult.success ? 'Command executed successfully' : 'Command failed'}
                </span>
                <span className="text-xs text-foreground-tertiary">
                  ({executionResult.executionTime}ms)
                </span>
              </div>
              
              {executionResult.data && (
                <div className="mt-2 text-xs text-foreground-secondary">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(executionResult.data, null, 2)}
                  </pre>
                </div>
              )}
              
              {executionResult.error && (
                <div className="mt-2 text-xs text-status-error">
                  {executionResult.error.userMessage || executionResult.error.message}
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isExecuting && (
            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center gap-2 text-foreground-secondary">
                <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Executing command...</span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 bg-background-tertiary">
            <div className="flex items-center justify-between text-xs text-foreground-tertiary">
              <div className="flex items-center gap-4">
                <span>↑↓ navigate</span>
                <span>↵ execute</span>
                <span>esc close</span>
              </div>
              <div className="flex items-center gap-1">
                <CommandLineIcon className="w-3 h-3" />
                <span>GUI-CLI Bridge</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Helper functions
function getCommandShortcut(commandName: string): string | undefined {
  const shortcuts: Record<string, string> = {
    'create-agent': 'Ctrl+N',
    'list-agents': 'Ctrl+L',
    'system-status': 'Ctrl+I',
    'cleanup': 'Ctrl+Shift+C',
  };
  
  return shortcuts[commandName];
}

function getCommandIcon(category: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    agent: <div className="w-4 h-4 bg-blue-500 rounded-full" />,
    project: <div className="w-4 h-4 bg-green-500 rounded-full" />,
    system: <div className="w-4 h-4 bg-orange-500 rounded-full" />,
    config: <div className="w-4 h-4 bg-purple-500 rounded-full" />,
  };
  
  return icons[category] || <div className="w-4 h-4 bg-gray-500 rounded-full" />;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    agent: 'bg-blue-100 text-blue-800',
    project: 'bg-green-100 text-green-800',
    system: 'bg-orange-100 text-orange-800',
    config: 'bg-purple-100 text-purple-800',
  };
  
  return colors[category] || 'bg-gray-100 text-gray-800';
}