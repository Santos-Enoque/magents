import { useEffect, useCallback, useRef } from 'react';

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

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const { enabled = true, preventDefault = true } = options;
  const shortcutsRef = useRef(shortcuts);
  
  // Update shortcuts ref when shortcuts change
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in form elements
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = !!event.ctrlKey === !!shortcut.ctrlKey;
      const metaMatches = !!event.metaKey === !!shortcut.metaKey;
      const shiftMatches = !!event.shiftKey === !!shortcut.shiftKey;
      const altMatches = !!event.altKey === !!shortcut.altKey;

      return keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches;
    });

    if (matchingShortcut) {
      if (preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
      matchingShortcut.action();
    }
  }, [enabled, preventDefault]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current,
  };
};

// Helper function to format shortcut display
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.metaKey) parts.push('Cmd');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.altKey) parts.push('Alt');
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(' + ');
};

// Predefined shortcuts for common actions
export const createCommonShortcuts = (actions: {
  createAgent?: () => void;
  openTerminal?: () => void;
  toggleSearch?: () => void;
  toggleSettings?: () => void;
  refreshData?: () => void;
  toggleViewMode?: () => void;
  toggleFullscreen?: () => void;
  closeModal?: () => void;
  showHelp?: () => void;
  startAllAgents?: () => void;
  stopAllAgents?: () => void;
  openCommandPalette?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.createAgent) {
    shortcuts.push({
      key: 'n',
      ctrlKey: true,
      action: actions.createAgent,
      description: 'Create new agent',
      category: 'Navigation',
    });
  }

  if (actions.openTerminal) {
    shortcuts.push({
      key: 't',
      ctrlKey: true,
      action: actions.openTerminal,
      description: 'Open terminal',
      category: 'Navigation',
    });
  }

  if (actions.toggleSearch) {
    shortcuts.push({
      key: 'k',
      ctrlKey: true,
      action: actions.toggleSearch,
      description: 'Toggle search',
      category: 'Navigation',
    });
  }

  if (actions.toggleSettings) {
    shortcuts.push({
      key: ',',
      ctrlKey: true,
      action: actions.toggleSettings,
      description: 'Open settings',
      category: 'Navigation',
    });
  }

  if (actions.refreshData) {
    shortcuts.push({
      key: 'r',
      ctrlKey: true,
      action: actions.refreshData,
      description: 'Refresh data',
      category: 'Actions',
    });
  }

  if (actions.toggleViewMode) {
    shortcuts.push({
      key: 'v',
      ctrlKey: true,
      action: actions.toggleViewMode,
      description: 'Toggle view mode',
      category: 'View',
    });
  }

  if (actions.toggleFullscreen) {
    shortcuts.push({
      key: 'f',
      ctrlKey: true,
      action: actions.toggleFullscreen,
      description: 'Toggle fullscreen',
      category: 'View',
    });
  }

  if (actions.closeModal) {
    shortcuts.push({
      key: 'Escape',
      action: actions.closeModal,
      description: 'Close modal/dialog',
      category: 'Navigation',
    });
  }

  if (actions.showHelp) {
    shortcuts.push({
      key: '?',
      ctrlKey: true,
      action: actions.showHelp,
      description: 'Show keyboard shortcuts',
      category: 'Help',
    });
  }

  if (actions.startAllAgents) {
    shortcuts.push({
      key: 's',
      ctrlKey: true,
      shiftKey: true,
      action: actions.startAllAgents,
      description: 'Start all agents',
      category: 'Agent Control',
    });
  }

  if (actions.stopAllAgents) {
    shortcuts.push({
      key: 'x',
      ctrlKey: true,
      shiftKey: true,
      action: actions.stopAllAgents,
      description: 'Stop all agents',
      category: 'Agent Control',
    });
  }

  if (actions.openCommandPalette) {
    shortcuts.push({
      key: 'p',
      ctrlKey: true,
      shiftKey: true,
      action: actions.openCommandPalette,
      description: 'Open command palette',
      category: 'Navigation',
    });
  }

  return shortcuts;
};