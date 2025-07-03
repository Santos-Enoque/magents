import React from 'react';
import { formatShortcut } from '../hooks/useKeyboardShortcuts';
import {
  XMarkIcon,
  CommandLineIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  shortcuts,
}) => {
  if (!isOpen) return null;

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const ShortcutKey: React.FC<{ shortcut: KeyboardShortcut }> = ({ shortcut }) => {
    const parts: string[] = [];
    
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.metaKey) parts.push('⌘');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    
    const key = shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase();
    parts.push(key);

    return (
      <div className="flex items-center gap-1">
        {parts.map((part, index) => (
          <React.Fragment key={part}>
            {index > 0 && <span className="text-foreground-tertiary">+</span>}
            <kbd className="px-2 py-1 bg-background-tertiary border border-border rounded text-xs font-mono text-foreground-secondary">
              {part}
            </kbd>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background-card border border-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <KeyIcon className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-foreground-secondary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          <div className="p-6 space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-foreground-secondary mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand rounded-full" />
                  {category}
                </h3>
                <div className="space-y-3">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <span className="text-sm text-foreground">
                        {shortcut.description}
                      </span>
                      <ShortcutKey shortcut={shortcut} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {shortcuts.length === 0 && (
              <div className="text-center py-8">
                <CommandLineIcon className="w-12 h-12 text-foreground-tertiary mx-auto mb-3" />
                <p className="text-foreground-secondary">No keyboard shortcuts available</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 bg-background-tertiary">
          <div className="flex items-center justify-between text-xs text-foreground-tertiary">
            <span>Press <kbd className="px-1 py-0.5 bg-background-card border border-border rounded">Ctrl + ?</kbd> to toggle this help</span>
            <span>{shortcuts.length} shortcuts available</span>
          </div>
        </div>
      </div>
    </div>
  );
};