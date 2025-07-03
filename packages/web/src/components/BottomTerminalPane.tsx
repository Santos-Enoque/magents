import React, { useState, useEffect } from 'react';
import { Terminal } from './Terminal';
import {
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  CommandLineIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';

interface BottomTerminalPaneProps {
  className?: string;
}

export const BottomTerminalPane: React.FC<BottomTerminalPaneProps> = ({ 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [height, setHeight] = useState(400); // Default height
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleOpenBottomTerminal = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };

    window.addEventListener('open-bottom-terminal', handleOpenBottomTerminal);
    
    return () => {
      window.removeEventListener('open-bottom-terminal', handleOpenBottomTerminal);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY;
      const newHeight = Math.max(200, Math.min(800, startHeight + deltaY));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 bg-background-card border-t border-border shadow-2xl z-50 ${className}`}
      style={{ height: isMinimized ? '40px' : `${height}px` }}
    >
      {/* Resize Handle */}
      {!isMinimized && (
        <div
          className={`absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-brand/50 transition-colors ${
            isResizing ? 'bg-brand/70' : ''
          }`}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-background-tertiary border-b border-border">
        <div className="flex items-center gap-3">
          <CommandLineIcon className="w-5 h-5 text-brand" />
          <span className="text-sm font-medium text-foreground">
            System Terminal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMinimize}
            className="p-1.5 text-foreground-secondary hover:text-foreground hover:bg-background-card rounded transition-colors"
            title={isMinimized ? "Restore" : "Minimize"}
          >
            <MinusIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 text-foreground-secondary hover:text-status-error hover:bg-status-error/20 rounded transition-colors"
            title="Close terminal"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Terminal Content */}
      {!isMinimized && (
        <div className="h-full pb-10"> {/* Account for header */}
          <Terminal
            isSystemTerminal={true}
            isFullscreen={false}
            className="h-full border-0 rounded-none"
          />
        </div>
      )}
    </div>
  );
};