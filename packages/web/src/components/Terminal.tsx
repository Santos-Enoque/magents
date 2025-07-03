import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useTerminal } from '../hooks/useTerminal';
import '@xterm/xterm/css/xterm.css';
import {
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';

interface TerminalProps {
  agentId?: string;
  isSystemTerminal?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onClose?: () => void;
  className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({
  agentId,
  isSystemTerminal = false,
  isFullscreen = false,
  onToggleFullscreen,
  onClose,
  className = '',
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  
  // Use WebSocket hook for terminal connection
  const { isConnected, isConnecting, error, sendData, connect, disconnect } = useTerminal({
    agentId,
    isSystemTerminal,
    onData: (data: string) => {
      if (xtermRef.current) {
        xtermRef.current.write(data);
      }
    },
    onConnect: () => {
      if (xtermRef.current) {
        xtermRef.current.clear();
        if (isSystemTerminal) {
          xtermRef.current.writeln('\x1b[32m✅ Connected to system terminal\x1b[0m');
          xtermRef.current.writeln('\x1b[36mSystem terminal session active.\x1b[0m');
        } else if (agentId) {
          xtermRef.current.writeln('\x1b[32m✅ Connected to agent ' + agentId + '\x1b[0m');
          xtermRef.current.writeln('\x1b[36mAgent terminal session active.\x1b[0m');
        }
        xtermRef.current.writeln('');
      }
    },
    onDisconnect: () => {
      if (xtermRef.current) {
        xtermRef.current.writeln('\r\n\x1b[33m🔌 Connection closed\x1b[0m');
      }
    },
    onError: (errorMsg: string) => {
      if (xtermRef.current) {
        xtermRef.current.writeln('\r\n\x1b[31m❌ Error: ' + errorMsg + '\x1b[0m');
      }
    },
  });

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#f7768e',
        selectionBackground: '#364a82',
        black: '#32344a',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#ad8ee6',
        cyan: '#449dab',
        white: '#9699a3',
        brightBlack: '#444b6a',
        brightRed: '#ff7a93',
        brightGreen: '#b9f27c',
        brightYellow: '#ff9e64',
        brightBlue: '#7da6ff',
        brightMagenta: '#bb9af7',
        brightCyan: '#0db9d7',
        brightWhite: '#acb0d0',
      },
      scrollback: 1000,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Open terminal in the DOM element
    terminal.open(terminalRef.current);

    // Store references
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Initial fit
    setTimeout(() => {
      fitAddon.fit();
    }, 100);

    // Set up input handling
    terminal.onData((data) => {
      if (isConnected) {
        sendData(data);
      }
    });

    // Show appropriate message
    if (isSystemTerminal) {
      if (isConnecting) {
        terminal.writeln('\x1b[32m🔌 Connecting to system terminal...\x1b[0m');
      } else if (!isConnected) {
        terminal.writeln('\x1b[33m⚠️  Not connected to system terminal\x1b[0m');
        terminal.writeln('\x1b[90mWaiting for connection...\x1b[0m');
      }
    } else if (agentId) {
      if (isConnecting) {
        terminal.writeln('\x1b[32m🔌 Connecting to agent ' + agentId + '...\x1b[0m');
      } else if (!isConnected) {
        terminal.writeln('\x1b[33m⚠️  Not connected to agent ' + agentId + '\x1b[0m');
        terminal.writeln('\x1b[90mWaiting for connection...\x1b[0m');
      }
    } else {
      showWelcomeMessage(terminal);
    }

    // Cleanup
    return () => {
      terminal.dispose();
    };
  }, [agentId, isSystemTerminal, isConnected, isConnecting, sendData]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        setTimeout(() => {
          fitAddonRef.current?.fit();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fit when fullscreen state changes
  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, [isFullscreen]);


  const showWelcomeMessage = (terminal: XTerm) => {
    terminal.clear();
    terminal.writeln('\x1b[36m┌─────────────────────────────────────────────┐\x1b[0m');
    terminal.writeln('\x1b[36m│               \x1b[1mMagents Terminal\x1b[0m\x1b[36m                │\x1b[0m');
    terminal.writeln('\x1b[36m└─────────────────────────────────────────────┘\x1b[0m');
    terminal.writeln('');
    terminal.writeln('\x1b[33mWelcome to the Magents integrated terminal!\x1b[0m');
    terminal.writeln('');
    terminal.writeln('\x1b[32m• \x1b[0mConnect to an agent to start interacting');
    terminal.writeln('\x1b[32m• \x1b[0mUse the agent cards to attach to running agents');
    terminal.writeln('\x1b[32m• \x1b[0mAll terminal sessions are isolated per agent');
    terminal.writeln('');
    terminal.writeln('\x1b[90mSelect an agent from the dashboard to get started.\x1b[0m');
  };

  const handleDisconnect = () => {
    disconnect();
    if (xtermRef.current) {
      xtermRef.current.clear();
      showWelcomeMessage(xtermRef.current);
    }
  };

  return (
    <div className={`bg-background-card border border-border rounded-lg overflow-hidden ${className}`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-background-tertiary border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CommandLineIcon className="w-4 h-4 text-foreground-secondary" />
            <span className="text-sm font-medium text-foreground">
              {agentId ? `Agent ${agentId}` : 'Terminal'}
            </span>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnecting ? 'bg-yellow-500 animate-pulse' :
              isConnected ? 'bg-status-success' : 'bg-foreground-tertiary'
            }`} />
            <span className="text-xs text-foreground-secondary">
              {isConnecting ? 'Connecting...' : 
               isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Disconnect Button */}
          {agentId && isConnected && (
            <button
              onClick={handleDisconnect}
              className="p-1.5 text-foreground-secondary hover:text-foreground hover:bg-background-card rounded transition-colors"
              title="Disconnect"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 text-foreground-secondary hover:text-foreground hover:bg-background-card rounded transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="w-4 h-4" />
              ) : (
                <ArrowsPointingOutIcon className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-foreground-secondary hover:text-status-error hover:bg-status-error/20 rounded transition-colors"
              title="Close terminal"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content */}
      <div className="relative">
        <div
          ref={terminalRef}
          className={`w-full ${isFullscreen ? 'h-[calc(100vh-4rem)]' : 'h-80'}`}
          style={{ minHeight: isFullscreen ? 'calc(100vh - 4rem)' : '20rem' }}
        />
      </div>
    </div>
  );
};