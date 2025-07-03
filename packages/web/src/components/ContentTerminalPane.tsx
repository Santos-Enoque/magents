import React, { useState, useRef, useEffect } from 'react';
import { Terminal } from './Terminal';
import {
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  CommandLineIcon,
  MinusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

interface ContentTerminalPaneProps {
  isOpen: boolean;
  height: number;
  onHeightChange: (height: number) => void;
  onClose: () => void;
}

export const ContentTerminalPane: React.FC<ContentTerminalPaneProps> = ({
  isOpen,
  height,
  onHeightChange,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY; // Negative because we're dragging up
      const newHeight = Math.max(200, Math.min(800, startHeight + deltaY));
      onHeightChange(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const effectiveHeight = isMinimized ? 40 : height;

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="bg-background-card border-t border-border"
      style={{ height: `${effectiveHeight}px` }}
    >
      {/* Resize Handle */}
      {!isMinimized && (
        <div
          ref={resizeRef}
          className={`h-1 bg-border hover:bg-brand/50 cursor-row-resize transition-colors ${
            isResizing ? 'bg-brand/70' : ''
          }`}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-background-tertiary border-b border-border min-h-[40px]">
        <div className="flex items-center gap-3">
          <CommandLineIcon className="w-4 h-4 text-brand" />
          <span className="text-sm font-medium text-foreground">
            Terminal
          </span>
          <div className="flex items-center gap-1 text-xs text-foreground-secondary">
            <span>zsh</span>
            <span>•</span>
            <span>~</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleMinimize}
            className="p-1.5 text-foreground-secondary hover:text-foreground hover:bg-background-card rounded transition-colors"
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </button>
          
          <button
            onClick={onClose}
            className="p-1.5 text-foreground-secondary hover:text-status-error hover:bg-status-error/20 rounded transition-colors"
            title="Close terminal"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Terminal Content */}
      {!isMinimized && (
        <div 
          className="h-full"
          style={{ height: `${height - 40}px` }} // Account for header
        >
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