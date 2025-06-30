import React, { useState } from 'react';
import { Play, Square, RotateCcw, Trash2, MoreVertical, AlertTriangle } from 'lucide-react';
import { Agent, AgentStatus } from '@magents/shared';

interface AgentActionsProps {
  agent: Agent;
  onStart: (agentId: string) => void;
  onStop: (agentId: string) => void;
  onRestart: (agentId: string) => void;
  onDelete: (agentId: string, removeWorktree?: boolean) => void;
  variant?: 'dropdown' | 'inline';
  size?: 'sm' | 'md';
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  confirmStyle?: 'danger' | 'warning' | 'primary';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  confirmStyle = 'danger',
}) => {
  if (!isOpen) return null;

  const getConfirmButtonStyle = () => {
    switch (confirmStyle) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          </div>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-md ${getConfirmButtonStyle()}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AgentActions: React.FC<AgentActionsProps> = ({
  agent,
  onStart,
  onStop,
  onRestart,
  onDelete,
  variant = 'dropdown',
  size = 'md',
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'delete' | 'deleteWithWorktree' | null;
  }>({ isOpen: false, action: null });

  const canStart = agent.status === 'STOPPED' || agent.status === 'ERROR';
  const canStop = agent.status === 'RUNNING';
  const canRestart = agent.status === 'RUNNING' || agent.status === 'STOPPED';

  const handleAction = (action: string) => {
    setShowDropdown(false);
    
    switch (action) {
      case 'start':
        if (canStart) onStart(agent.id);
        break;
      case 'stop':
        if (canStop) onStop(agent.id);
        break;
      case 'restart':
        if (canRestart) onRestart(agent.id);
        break;
      case 'delete':
        setConfirmDialog({ isOpen: true, action: 'delete' });
        break;
      case 'deleteWithWorktree':
        setConfirmDialog({ isOpen: true, action: 'deleteWithWorktree' });
        break;
    }
  };

  const handleConfirmDelete = () => {
    if (confirmDialog.action === 'delete') {
      onDelete(agent.id, false);
    } else if (confirmDialog.action === 'deleteWithWorktree') {
      onDelete(agent.id, true);
    }
    setConfirmDialog({ isOpen: false, action: null });
  };

  const getIconSize = () => size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const getButtonSize = () => size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';

  if (variant === 'inline') {
    return (
      <>
        <div className="flex items-center space-x-1">
          {canStart && (
            <button
              onClick={() => handleAction('start')}
              className={`inline-flex items-center ${getButtonSize()} font-medium text-green-600 hover:text-green-700 disabled:opacity-50`}
              title="Start agent"
            >
              <Play className={`${getIconSize()} mr-1`} />
              Start
            </button>
          )}
          {canStop && (
            <button
              onClick={() => handleAction('stop')}
              className={`inline-flex items-center ${getButtonSize()} font-medium text-yellow-600 hover:text-yellow-700 disabled:opacity-50`}
              title="Stop agent"
            >
              <Square className={`${getIconSize()} mr-1`} />
              Stop
            </button>
          )}
          {canRestart && (
            <button
              onClick={() => handleAction('restart')}
              className={`inline-flex items-center ${getButtonSize()} font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50`}
              title="Restart agent"
            >
              <RotateCcw className={`${getIconSize()} mr-1`} />
              Restart
            </button>
          )}
          <button
            onClick={() => handleAction('delete')}
            className={`inline-flex items-center ${getButtonSize()} font-medium text-red-600 hover:text-red-700`}
            title="Delete agent"
          >
            <Trash2 className={`${getIconSize()} mr-1`} />
            Delete
          </button>
        </div>
        
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, action: null })}
          onConfirm={handleConfirmDelete}
          title="Delete Agent"
          message={
            confirmDialog.action === 'deleteWithWorktree'
              ? `Are you sure you want to delete agent "${agent.id}" and its worktree? This action cannot be undone.`
              : `Are you sure you want to delete agent "${agent.id}"? The worktree will be preserved.`
          }
          confirmText="Delete"
          confirmStyle="danger"
        />
      </>
    );
  }

  // Dropdown variant
  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`inline-flex items-center ${getButtonSize()} font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50`}
        >
          <MoreVertical className={getIconSize()} />
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
            <div className="py-1">
              {canStart && (
                <button
                  onClick={() => handleAction('start')}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Play className="w-4 h-4 mr-3 text-green-500" />
                  Start Agent
                </button>
              )}
              {canStop && (
                <button
                  onClick={() => handleAction('stop')}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Square className="w-4 h-4 mr-3 text-yellow-500" />
                  Stop Agent
                </button>
              )}
              {canRestart && (
                <button
                  onClick={() => handleAction('restart')}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <RotateCcw className="w-4 h-4 mr-3 text-blue-500" />
                  Restart Agent
                </button>
              )}
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={() => handleAction('delete')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Trash2 className="w-4 h-4 mr-3 text-red-500" />
                Delete Agent Only
              </button>
              <button
                onClick={() => handleAction('deleteWithWorktree')}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-3 text-red-500" />
                Delete Agent + Worktree
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Agent"
        message={
          confirmDialog.action === 'deleteWithWorktree'
            ? `Are you sure you want to delete agent "${agent.id}" and its worktree? This action cannot be undone.`
            : `Are you sure you want to delete agent "${agent.id}"? The worktree will be preserved.`
        }
        confirmText="Delete"
        confirmStyle="danger"
      />

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </>
  );
};