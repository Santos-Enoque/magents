import React, { useState, useEffect } from 'react';
import { Terminal } from './Terminal';
import {
  XMarkIcon,
  ArrowsPointingOutIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';

interface InlineTerminalProps {
  className?: string;
}

export const InlineTerminal: React.FC<InlineTerminalProps> = ({ 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [agentId, setAgentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleOpenTerminal = (event: CustomEvent) => {
      const { agentId: targetAgentId } = event.detail;
      setAgentId(targetAgentId);
      setIsOpen(true);
      setIsFullscreen(false);
    };

    window.addEventListener('open-terminal', handleOpenTerminal as EventListener);
    
    return () => {
      window.removeEventListener('open-terminal', handleOpenTerminal as EventListener);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setAgentId(undefined);
    setIsFullscreen(false);
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) {
    return null;
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-background-card border-b border-border">
          <div className="flex items-center gap-3">
            <CommandLineIcon className="w-5 h-5 text-brand" />
            <h1 className="text-lg font-semibold text-foreground">
              Terminal {agentId && `- Agent ${agentId}`}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFullscreen}
              className="p-2 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
              title="Exit fullscreen"
            >
              <ArrowsPointingOutIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-foreground-secondary hover:text-status-error hover:bg-status-error/20 rounded-lg transition-colors"
              title="Close terminal"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Fullscreen Terminal */}
        <div className="flex-1">
          <Terminal
            agentId={agentId}
            isFullscreen={true}
            onToggleFullscreen={handleToggleFullscreen}
            onClose={handleClose}
            className="h-full border-0 rounded-none"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 w-96 lg:w-[40rem] xl:w-[50rem] z-40 ${className}`}>
      <div className="bg-background-card border border-border rounded-lg shadow-2xl">
        {/* Inline Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-background-tertiary border-b border-border rounded-t-lg">
          <div className="flex items-center gap-3">
            <CommandLineIcon className="w-4 h-4 text-brand" />
            <span className="text-sm font-medium text-foreground">
              Terminal {agentId && `- Agent ${agentId}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFullscreen}
              className="p-1.5 text-foreground-secondary hover:text-foreground hover:bg-background-card rounded transition-colors"
              title="Fullscreen"
            >
              <ArrowsPointingOutIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 text-foreground-secondary hover:text-status-error hover:bg-status-error/20 rounded transition-colors"
              title="Close"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Inline Terminal Content */}
        <Terminal
          agentId={agentId}
          isFullscreen={false}
          onToggleFullscreen={handleToggleFullscreen}
          onClose={handleClose}
          className="border-0 rounded-b-lg h-80"
        />
      </div>
    </div>
  );
};