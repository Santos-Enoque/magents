import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Send, Power, RotateCcw, Settings } from 'lucide-react';
import { Agent } from '@magents/shared';
import { useWebSocket } from '../hooks/useWebSocket';

interface InteractiveTerminalProps {
  agent: Agent;
}

interface TerminalLine {
  id: string;
  content: string;
  timestamp: Date;
  type: 'input' | 'output' | 'system';
}

export const InteractiveTerminal: React.FC<InteractiveTerminalProps> = ({ agent }) => {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState('');
  const [windows, setWindows] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { socket } = useWebSocket();

  // Auto-scroll to bottom when new content arrives
  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  // Fetch initial session info
  const fetchSessionInfo = useCallback(async () => {
    try {
      const response = await fetch(`/api/tmux/sessions/${agent.tmuxSession}/info`);
      const data = await response.json();
      
      if (data.success) {
        setWindows(data.data.windows);
        setSelectedWindow(data.data.activeWindow);
        setError(null);
        setIsConnected(true);
        
        // Add system message
        addLine(`Connected to tmux session: ${agent.tmuxSession}`, 'system');
        addLine(`Active window: ${data.data.activeWindow}`, 'system');
        addLine(`Available windows: ${data.data.windows.join(', ')}`, 'system');
        
        // Load initial content
        loadInitialContent();
      } else {
        setError(data.error);
        setIsConnected(false);
      }
    } catch (err) {
      setError('Failed to connect to tmux session');
      setIsConnected(false);
    }
  }, [agent.tmuxSession]);

  // Load initial terminal content
  const loadInitialContent = useCallback(async () => {
    try {
      const windowParam = selectedWindow ? `?window=${selectedWindow}&lines=20` : '?lines=20';
      const response = await fetch(`/api/tmux/sessions/${agent.tmuxSession}/content${windowParam}`);
      const data = await response.json();
      
      if (data.success) {
        const content = data.data.content;
        if (content.trim()) {
          // Split content into lines and add as output
          const contentLines = content.split('\n').filter((line: string) => line.trim());
          contentLines.forEach((line: string) => {
            if (line.trim()) {
              addLine(line, 'output');
            }
          });
        }
      }
    } catch (err) {
      console.error('Failed to load initial content:', err);
    }
  }, [agent.tmuxSession, selectedWindow]);

  // Add a new line to the terminal
  const addLine = useCallback((content: string, type: TerminalLine['type']) => {
    const newLine: TerminalLine = {
      id: Date.now().toString() + Math.random(),
      content,
      timestamp: new Date(),
      type
    };
    
    setLines(prev => [...prev, newLine]);
    setTimeout(scrollToBottom, 100);
  }, [scrollToBottom]);

  // Send command to tmux session
  const sendCommand = useCallback(async (command: string) => {
    if (!command.trim() || !isConnected) return;

    setIsLoading(true);
    addLine(`$ ${command}`, 'input');

    try {
      const response = await fetch(`/api/tmux/sessions/${agent.tmuxSession}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          window: selectedWindow
        })
      });

      const data = await response.json();
      if (data.success) {
        // Wait a moment then fetch new content to see the command result
        setTimeout(async () => {
          try {
            const contentResponse = await fetch(`/api/tmux/sessions/${agent.tmuxSession}/content?window=${selectedWindow}&lines=5`);
            const contentData = await contentResponse.json();
            
            if (contentData.success) {
              // Get the last few lines that might be new output
              const newContent = contentData.data.content.split('\n').slice(-3);
              newContent.forEach((line: string) => {
                if (line.trim() && !line.includes(`$ ${command}`)) {
                  addLine(line, 'output');
                }
              });
            }
          } catch (err) {
            addLine('Error fetching command output', 'system');
          }
        }, 500);
      } else {
        addLine(`Error: ${data.error}`, 'system');
      }
    } catch (err) {
      addLine('Error sending command', 'system');
    } finally {
      setIsLoading(false);
    }
  }, [agent.tmuxSession, selectedWindow, isConnected, addLine]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim()) {
      sendCommand(currentInput);
      setCurrentInput('');
    }
  }, [currentInput, sendCommand]);

  // Handle key press for command history (future enhancement)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
    // Future: Add arrow key history navigation
  }, [handleSubmit]);

  // Switch tmux window
  const switchWindow = useCallback(async (windowName: string) => {
    setSelectedWindow(windowName);
    addLine(`Switching to window: ${windowName}`, 'system');
    
    // Load content from the new window
    setTimeout(loadInitialContent, 500);
  }, [loadInitialContent]);

  // Clear terminal
  const clearTerminal = useCallback(() => {
    setLines([]);
    addLine('Terminal cleared', 'system');
  }, [addLine]);

  // Initialize connection
  useEffect(() => {
    fetchSessionInfo();
  }, [fetchSessionInfo]);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Get line styling based on type
  const getLineStyle = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input':
        return 'text-cyan-300 font-semibold';
      case 'output':
        return 'text-green-300';
      case 'system':
        return 'text-yellow-300 text-sm';
      default:
        return 'text-gray-300';
    }
  };

  if (error) {
    return (
      <div className="bg-red-900 border border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <Terminal className="h-5 w-5 text-red-400 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-red-200">Interactive Terminal Error</h3>
            <p className="text-sm text-red-300 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* Terminal Header */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-300 font-mono">
                {agent.tmuxSession}:{selectedWindow}
              </span>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            </div>
            
            {windows.length > 1 && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">Window:</span>
                <select
                  value={selectedWindow}
                  onChange={(e) => switchWindow(e.target.value)}
                  className="bg-gray-700 text-white text-xs border border-gray-600 rounded px-2 py-1"
                >
                  {windows.map(window => (
                    <option key={window} value={window}>{window}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={clearTerminal}
              className="text-gray-400 hover:text-white p-1"
              title="Clear terminal"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={fetchSessionInfo}
              className="text-gray-400 hover:text-white p-1"
              title="Reconnect"
            >
              <Power className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={terminalRef}
        className="h-96 overflow-y-auto p-4 font-mono text-sm bg-black"
      >
        {lines.map((line) => (
          <div key={line.id} className="flex items-start space-x-2 mb-1">
            <span className="text-gray-500 text-xs min-w-[60px]">
              {formatTime(line.timestamp)}
            </span>
            <span className={getLineStyle(line.type)}>
              {line.content}
            </span>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-center space-x-2 text-yellow-300">
            <span className="text-gray-500 text-xs min-w-[60px]">
              {formatTime(new Date())}
            </span>
            <span>Executing command...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-gray-800 border-t border-gray-700 p-3">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <span className="text-green-400 font-mono text-sm">$</span>
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isConnected || isLoading}
            placeholder={isConnected ? "Enter command..." : "Not connected"}
            className="flex-1 bg-gray-900 text-green-300 border border-gray-600 rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-green-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isConnected || isLoading || !currentInput.trim()}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-400">
          <span>Connected to tmux session: {agent.tmuxSession}</span>
          {selectedWindow && <span> | Window: {selectedWindow}</span>}
          <span> | Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  );
};