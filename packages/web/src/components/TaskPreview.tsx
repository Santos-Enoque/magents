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
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-background-tertiary hover:bg-background-card-hover transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center space-x-2">
          {icon}
          <h3 className="font-medium text-foreground">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-foreground-tertiary" />
        ) : (
          <ChevronRight className="w-4 h-4 text-foreground-tertiary" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-background-card">
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
          color: 'text-status-success bg-status-success/20 border-status-success/30',
          icon: CheckCircle,
          text: 'Done'
        };
      case 'in-progress':
        return {
          color: 'text-brand bg-brand/20 border-brand/30',
          icon: Clock,
          text: 'In Progress'
        };
      case 'blocked':
        return {
          color: 'text-status-error bg-status-error/20 border-status-error/30',
          icon: AlertCircle,
          text: 'Blocked'
        };
      case 'cancelled':
        return {
          color: 'text-foreground-tertiary bg-foreground-tertiary/20 border-foreground-tertiary/30',
          icon: X,
          text: 'Cancelled'
        };
      default:
        return {
          color: 'text-status-warning bg-status-warning/20 border-status-warning/30',
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
        return 'text-status-error bg-status-error/20 border-status-error/30';
      case 'medium':
        return 'text-status-warning bg-status-warning/20 border-status-warning/30';
      case 'low':
        return 'text-status-success bg-status-success/20 border-status-success/30';
      default:
        return 'text-foreground-tertiary bg-foreground-tertiary/20 border-foreground-tertiary/30';
    }
  };

  return (
    <span className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full border capitalize ${getPriorityConfig()}`}>
      {priority}
    </span>
  );
};

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'text' }) => {
  const highlightCode = (code: string) => {
    return code
      .split('\n')
      .map((line, index) => (
        <div key={index} className="table-row">
          <span className="table-cell pr-4 text-foreground-tertiary select-none text-xs">{index + 1}</span>
          <span className="table-cell">
            <pre className="whitespace-pre font-mono text-sm text-foreground">{line}</pre>
          </span>
        </div>
      ));
  };

  return (
    <div className="relative rounded-lg bg-background-secondary text-foreground overflow-hidden border border-border">
      {language && (
        <div className="absolute top-2 right-2 text-xs text-foreground-tertiary">{language}</div>
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
      'done': 'text-status-success border-status-success/30 bg-status-success/10',
      'in-progress': 'text-brand border-brand/30 bg-brand/10',
      'blocked': 'text-status-error border-status-error/30 bg-status-error/10',
      'pending': 'text-status-warning border-status-warning/30 bg-status-warning/10',
      'cancelled': 'text-foreground-tertiary border-foreground-tertiary/30 bg-foreground-tertiary/10',
      'unknown': 'text-foreground-tertiary border-foreground-tertiary/30 bg-foreground-tertiary/10'
    }[status] || 'text-foreground-tertiary border-foreground-tertiary/30 bg-foreground-tertiary/10';

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
    return <p className="text-foreground-tertiary text-sm">No dependencies</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {task.dependencies.map(renderDependency)}
      </div>
      <div className="mt-4 text-xs text-foreground-secondary">
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
        <div key={subtask.id} className="border border-border rounded-lg p-3 hover:bg-background-card-hover transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Hash className="w-3 h-3 text-foreground-tertiary" />
              <span className="font-mono text-sm text-foreground-secondary">{subtask.id}</span>
              <span className="font-medium text-foreground">{subtask.title}</span>
            </div>
            <TaskStatusBadge status={subtask.status} />
          </div>
          {subtask.description && (
            <p className="mt-1 text-sm text-foreground-secondary ml-5">{subtask.description}</p>
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

  const formatText = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    
    let parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    // Handle code blocks first
    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        parts.push(beforeText.replace(inlineCodeRegex, (_, code) => 
          `<code class="bg-background-tertiary text-foreground px-1 py-0.5 rounded text-sm font-mono">${code}</code>`
        ));
      }
      
      const language = match[1] || 'text';
      const code = match[2];
      parts.push(<CodeBlock key={match.index} code={code} language={language} />);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      parts.push(remainingText.replace(inlineCodeRegex, (_, code) => 
        `<code class="bg-background-tertiary text-foreground px-1 py-0.5 rounded text-sm font-mono">${code}</code>`
      ));
    }

    return parts.map((part, index) => 
      typeof part === 'string' ? (
        <div key={index} dangerouslySetInnerHTML={{ __html: part }} />
      ) : part
    );
  };

  return (
    <div className={`h-full flex flex-col bg-background-card border-l border-border ${className}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Hash className="w-5 h-5 text-foreground-tertiary" />
            <h1 className="text-lg font-semibold text-foreground">{task.id}</h1>
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-foreground-tertiary hover:text-foreground hover:bg-background-tertiary rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <h2 className="text-xl font-bold text-foreground mt-2">{task.title}</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Description */}
        <CollapsibleSection
          title="Description"
          icon={<FileText className="w-4 h-4 text-foreground-secondary" />}
          defaultOpen={true}
        >
          <div className="prose prose-sm max-w-none text-foreground-secondary">
            {task.description ? formatText(task.description) : (
              <p className="text-foreground-tertiary italic">No description provided</p>
            )}
          </div>
        </CollapsibleSection>

        {/* Implementation Details */}
        <CollapsibleSection
          title="Implementation Details"
          icon={<Code className="w-4 h-4 text-foreground-secondary" />}
          defaultOpen={false}
          isEmpty={!task.details}
        >
          <div className="prose prose-sm max-w-none text-foreground-secondary">
            {task.details && formatText(task.details)}
          </div>
        </CollapsibleSection>

        {/* Test Strategy */}
        <CollapsibleSection
          title="Test Strategy"
          icon={<TestTube className="w-4 h-4 text-foreground-secondary" />}
          defaultOpen={false}
          isEmpty={!task.testStrategy}
        >
          <div className="prose prose-sm max-w-none text-foreground-secondary">
            {task.testStrategy && formatText(task.testStrategy)}
          </div>
        </CollapsibleSection>

        {/* Dependencies */}
        <CollapsibleSection
          title="Dependencies"
          icon={<GitBranch className="w-4 h-4 text-foreground-secondary" />}
          defaultOpen={true}
        >
          <DependencyGraph task={task} />
        </CollapsibleSection>

        {/* Subtasks */}
        <CollapsibleSection
          title="Subtasks"
          icon={<Layers className="w-4 h-4 text-foreground-secondary" />}
          defaultOpen={true}
          isEmpty={!task.subtasks || task.subtasks.length === 0}
        >
          <SubtaskTree subtasks={task.subtasks || []} />
        </CollapsibleSection>

        {/* Raw Data */}
        <CollapsibleSection
          title="Show Raw Data"
          icon={<Code className="w-4 h-4 text-foreground-secondary" />}
          defaultOpen={false}
        >
          <CodeBlock code={JSON.stringify(task, null, 2)} language="json" />
        </CollapsibleSection>
      </div>
    </div>
  );
};