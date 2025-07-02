import React, { useState, useRef, useEffect } from 'react';
import { CommandLineIcon } from '@heroicons/react/24/outline';

export const Terminal: React.FC = () => {
  const [commands, setCommands] = useState<{ command: string; output: string; timestamp: Date }[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new commands are added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commands]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCommand.trim()) return;

    // Simulate command execution
    const output = processCommand(currentCommand);
    setCommands([...commands, {
      command: currentCommand,
      output,
      timestamp: new Date()
    }]);
    setCurrentCommand('');
  };

  const processCommand = (cmd: string): string => {
    const [command, ...args] = cmd.split(' ');
    
    switch (command) {
      case 'help':
        return `Available commands:
  help              - Show this help message
  clear             - Clear terminal
  status            - Show system status
  agents            - List all agents
  projects          - List all projects
  agent start <id>  - Start an agent
  agent stop <id>   - Stop an agent
  exit              - Close terminal`;
      
      case 'clear':
        setCommands([]);
        return '';
      
      case 'status':
        return 'System is running. All services operational.';
      
      case 'agents':
        return 'Fetching agents... Use the Agents page for detailed view.';
      
      case 'projects':
        return 'Fetching projects... Use the Projects page for detailed view.';
      
      case 'exit':
        return 'Terminal session ended. Refresh to start a new session.';
      
      default:
        return `Command not found: ${command}. Type 'help' for available commands.`;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <CommandLineIcon className="h-6 w-6 text-foreground-secondary" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Terminal</h1>
            <p className="text-sm text-foreground-tertiary">Execute commands and interact with the system</p>
          </div>
        </div>
      </div>

      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm"
      >
        <div className="space-y-4">
          <div className="text-foreground-secondary">
            Welcome to Magents Terminal v1.0.0<br />
            Type 'help' for available commands.
          </div>
          
          {commands.map((cmd, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-brand">$</span>
                <span className="text-foreground">{cmd.command}</span>
              </div>
              {cmd.output && (
                <div className="text-foreground-secondary whitespace-pre-wrap ml-6">
                  {cmd.output}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleCommand} className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="text-brand font-mono">$</span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            className="flex-1 bg-transparent text-foreground font-mono text-sm focus:outline-none"
            placeholder="Enter command..."
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </form>
    </div>
  );
};