import React from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
  headerActions?: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  isExpanded,
  onToggle,
  className = '',
  headerActions,
}) => {
  return (
    <div className={`bg-background-card border border-border rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-left flex-1 group"
        >
          <h2 className="text-lg font-semibold text-foreground group-hover:text-brand transition-colors">
            {title}
          </h2>
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5 text-foreground-secondary group-hover:text-brand transition-colors" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-foreground-secondary group-hover:text-brand transition-colors" />
          )}
        </button>
        
        {headerActions && (
          <div className="flex items-center gap-2">
            {headerActions}
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
};