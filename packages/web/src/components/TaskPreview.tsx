import React, { useState, useEffect } from 'react';
import { TaskMasterTask } from '@magents/shared';
import { 
  ChevronDown, 
  ChevronRight, 
  Hash, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  GitBranch,
  Code,
  TestTube,
  FileText,
  Layers,
  X,
  ArrowRight,
  Circle
} from 'lucide-react';

interface TaskPreviewProps {
  task: TaskMasterTask;
  onClose?: () => void;
  className?: string;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  isEmpty?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  icon, 
  defaultOpen = true, 
  children,
  isEmpty = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (isEmpty) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center space-x-2">
          {icon}
          <h3 className="font-medium text-gray-900">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

const TaskStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'done':
        return {
          color: 'text-green-700 bg-green-100 border-green-200',
          icon: CheckCircle,
          text: 'Done'
        };
      case 'in-progress':
        return {
          color: 'text-blue-700 bg-blue-100 border-blue-200',
          icon: Clock,
          text: 'In Progress'
        };
      case 'blocked':
        return {
          color: 'text-red-700 bg-red-100 border-red-200',
          icon: AlertCircle,
          text: 'Blocked'
        };
      case 'cancelled':
        return {
          color: 'text-gray-500 bg-gray-100 border-gray-200',
          icon: X,
          text: 'Cancelled'
        };
      default:
        return {
          color: 'text-yellow-700 bg-yellow-100 border-yellow-200',
          icon: Circle,
          text: 'Pending'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full border ${config.color}`}>
      <Icon className="w-4 h-4 mr-1.5" />
      {config.text}
    </span>
  );
};

const TaskPriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const getPriorityConfig = () => {
    switch (priority) {
      case 'high':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-green-700 bg-green-100 border-green-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full border capitalize ${getPriorityConfig()}`}>
      {priority}
    </span>
  );
};

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'text' }) => {
  // Simple syntax highlighting for common patterns
  const highlightCode = (code: string) => {
    // This is a simplified version - in production, you'd use a proper syntax highlighting library
    return code
      .split('\n')
      .map((line, index) => (
        <div key={index} className="table-row">
          <span className="table-cell pr-4 text-gray-500 select-none text-xs">{index + 1}</span>
          <span className="table-cell">
            <pre className="whitespace-pre font-mono text-sm">{line}</pre>
          </span>
        </div>
      ));
  };

  return (
    <div className="relative rounded-lg bg-gray-900 text-gray-100 overflow-hidden">
      {language && (
        <div className="absolute top-2 right-2 text-xs text-gray-400">{language}</div>
      )}
      <div className="p-4 overflow-x-auto">
        <div className="table w-full">
          {highlightCode(code)}
        </div>
      </div>
    </div>
  );
};

const DependencyGraph: React.FC<{ task: TaskMasterTask; allTasks?: TaskMasterTask[] }> = ({ task, allTasks = [] }) => {
  const renderDependency = (depId: string) => {
    const depTask = allTasks.find(t => t.id === depId);
    const status = depTask?.status || 'unknown';
    const statusColor = {
      'done': 'text-green-600 border-green-300 bg-green-50',
      'in-progress': 'text-blue-600 border-blue-300 bg-blue-50',
      'blocked': 'text-red-600 border-red-300 bg-red-50',
      'pending': 'text-yellow-600 border-yellow-300 bg-yellow-50',
      'cancelled': 'text-gray-500 border-gray-300 bg-gray-50',
      'unknown': 'text-gray-500 border-gray-300 bg-gray-50'
    }[status] || 'text-gray-600 border-gray-300 bg-gray-50';

    return (
      <div key={depId} className={`px-3 py-2 rounded-lg border ${statusColor} flex items-center space-x-2`}>
        <Hash className="w-3 h-3" />
        <span className="font-mono text-sm">{depId}</span>
        {depTask && (
          <span className="text-xs">- {depTask.title}</span>
        )}
      </div>
    );
  };

  if (!task.dependencies || task.dependencies.length === 0) {
    return <p className="text-gray-500 text-sm">No dependencies</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {task.dependencies.map(renderDependency)}
      </div>
      <div className="mt-4 text-xs text-gray-600">
        <p>Task will be blocked until all dependencies are completed.</p>
      </div>
    </div>
  );
};

const SubtaskTree: React.FC<{ subtasks: TaskMasterTask[]; level?: number }> = ({ subtasks, level = 0 }) => {
  if (!subtasks || subtasks.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-1 ${level > 0 ? 'ml-6' : ''}`}>
      {subtasks.map((subtask) => (
        <div key={subtask.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Hash className="w-3 h-3 text-gray-400" />
              <span className="font-mono text-sm text-gray-600">{subtask.id}</span>
              <span className="font-medium">{subtask.title}</span>
            </div>
            <TaskStatusBadge status={subtask.status} />
          </div>
          {subtask.description && (
            <p className="mt-1 text-sm text-gray-600 ml-5">{subtask.description}</p>
          )}
          {subtask.subtasks && subtask.subtasks.length > 0 && (
            <div className="mt-2">
              <SubtaskTree subtasks={subtask.subtasks} level={level + 1} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const TaskPreview: React.FC<TaskPreviewProps> = ({ task, onClose, className = '' }) => {
  const [showRawData, setShowRawData] = useState(false);

  // Format text with code block detection
  const formatText = (text: string) => {
    // Simple code block detection - looks for backticks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    // Process code blocks
    const tempText = text.replace(codeBlockRegex, (fullMatch, language, code, offset) => {
      if (offset > lastIndex) {
        parts.push(
          <span key={lastIndex}>
            {text.substring(lastIndex, offset).replace(inlineCodeRegex, (_, code) => (
              `<code>${code}</code>`
            ))}
          </span>
        );
      }
      parts.push(
        <div key={offset} className="my-4">
          <CodeBlock code={code.trim()} language={language} />
        </div>
      );
      lastIndex = offset + fullMatch.length;
      return '';
    });

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      parts.push(
        <span 
          key={lastIndex} 
          dangerouslySetInnerHTML={{ 
            __html: remainingText.replace(inlineCodeRegex, '<code class="px-1 py-0.5 bg-gray-100 rounded text-sm font-mono">$1</code>')
          }} 
        />
      );
    }

    return parts.length > 0 ? parts : text;
  };

  const getCompletionStats = () => {
    if (!task.subtasks || task.subtasks.length === 0) {
      return null;
    }

    const countSubtasks = (tasks: TaskMasterTask[]): { total: number; done: number } => {
      return tasks.reduce((acc, t) => {
        acc.total += 1;
        if (t.status === 'done') acc.done += 1;
        if (t.subtasks && t.subtasks.length > 0) {
          const subStats = countSubtasks(t.subtasks);
          acc.total += subStats.total;
          acc.done += subStats.done;
        }
        return acc;
      }, { total: 0, done: 0 });
    };

    const stats = countSubtasks(task.subtasks);
    const percentage = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

    return { ...stats, percentage };
  };

  const stats = getCompletionStats();

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 border-b px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-lg font-mono text-gray-600">#{task.id}</span>
              <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
            </div>
            <div className="flex items-center space-x-3">
              <TaskStatusBadge status={task.status} />
              <TaskPriorityBadge priority={task.priority} />
              {stats && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Layers className="w-4 h-4" />
                  <span>{stats.done}/{stats.total} subtasks ({stats.percentage}%)</span>
                </div>
              )}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Close preview"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Description */}
        {task.description && (
          <CollapsibleSection 
            title="Description" 
            icon={<FileText className="w-4 h-4 text-gray-500" />}
            defaultOpen={true}
          >
            <div className="prose prose-sm max-w-none text-gray-700">
              {formatText(task.description)}
            </div>
          </CollapsibleSection>
        )}

        {/* Implementation Details */}
        {task.details && (
          <CollapsibleSection 
            title="Implementation Details" 
            icon={<Code className="w-4 h-4 text-gray-500" />}
            defaultOpen={true}
          >
            <div className="prose prose-sm max-w-none text-gray-700">
              {formatText(task.details)}
            </div>
          </CollapsibleSection>
        )}

        {/* Test Strategy */}
        {task.testStrategy && (
          <CollapsibleSection 
            title="Test Strategy" 
            icon={<TestTube className="w-4 h-4 text-gray-500" />}
            defaultOpen={false}
          >
            <div className="prose prose-sm max-w-none text-gray-700">
              {formatText(task.testStrategy)}
            </div>
          </CollapsibleSection>
        )}

        {/* Dependencies */}
        <CollapsibleSection 
          title="Dependencies" 
          icon={<GitBranch className="w-4 h-4 text-gray-500" />}
          defaultOpen={true}
          isEmpty={!task.dependencies || task.dependencies.length === 0}
        >
          <DependencyGraph task={task} />
        </CollapsibleSection>

        {/* Subtasks */}
        <CollapsibleSection 
          title="Subtasks" 
          icon={<Layers className="w-4 h-4 text-gray-500" />}
          defaultOpen={true}
          isEmpty={!task.subtasks || task.subtasks.length === 0}
        >
          {task.subtasks && task.subtasks.length > 0 ? (
            <SubtaskTree subtasks={task.subtasks} />
          ) : (
            <p className="text-gray-500 text-sm">No subtasks defined</p>
          )}
        </CollapsibleSection>

        {/* Progress Bar */}
        {stats && stats.total > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-600">{stats.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Raw Data Toggle */}
        <div className="pt-4 border-t">
          <button
            onClick={() => setShowRawData(!showRawData)}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
          >
            <Code className="w-4 h-4" />
            <span>{showRawData ? 'Hide' : 'Show'} Raw Data</span>
          </button>
          {showRawData && (
            <div className="mt-4">
              <CodeBlock 
                code={JSON.stringify(task, null, 2)} 
                language="json" 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Standalone preview modal component
interface TaskPreviewModalProps {
  task: TaskMasterTask | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskPreviewModal: React.FC<TaskPreviewModalProps> = ({ task, isOpen, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative inline-block w-full max-w-4xl text-left align-bottom bg-white rounded-lg shadow-xl transform transition-all sm:my-8 sm:align-middle">
          <TaskPreview task={task} onClose={onClose} />
        </div>
      </div>
    </div>
  );
};