import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { TaskMasterTask, Agent } from '@magents/shared';
import { apiService } from '../services/api';
import { toast } from 'react-toastify';
import { 
  Hash, 
  User, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Circle,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface TaskAssignmentProps {
  projectPath: string;
}

interface TaskListProps {
  tasks: TaskMasterTask[];
  droppableId: string;
  isDraggingOver?: boolean;
}

interface AgentPanelProps {
  agent: Agent;
  assignedTasks: TaskMasterTask[];
  isDraggingOver?: boolean;
}

const TaskCard: React.FC<{ task: TaskMasterTask; index: number; isDragging?: boolean }> = ({ 
  task, 
  index, 
  isDragging 
}) => {
  const getStatusIcon = () => {
    switch (task.status) {
      case 'done':
        return <CheckCircle className="w-4 h-4 text-status-success" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-brand" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4 text-status-error" />;
      default:
        return <Circle className="w-4 h-4 text-status-warning" />;
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high':
        return 'border-red-700 bg-red-900/20';
      case 'medium':
        return 'border-yellow-700 bg-yellow-900/20';
      case 'low':
        return 'border-green-700 bg-green-900/20';
      default:
        return 'border-border bg-background-secondary';
    }
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-3 mb-2 border rounded-lg transition-all cursor-move ${
            getPriorityColor()
          } ${
            isDragging || snapshot.isDragging
              ? 'shadow-lg opacity-90 rotate-2'
              : 'shadow-sm hover:shadow-md'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="text-sm font-mono text-foreground-secondary">#{task.id}</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                task.priority === 'high' 
                  ? 'bg-red-900 text-red-200' 
                  : task.priority === 'medium'
                  ? 'bg-yellow-900 text-yellow-200'
                  : 'bg-green-900 text-green-200'
              }`}>
                {task.priority}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-foreground-tertiary" />
          </div>
          <h4 className="mt-2 font-medium text-foreground">{task.title}</h4>
          {task.description && (
            <p className="mt-1 text-sm text-foreground-secondary line-clamp-2">{task.description}</p>
          )}
          {task.dependencies && task.dependencies.length > 0 && (
            <div className="mt-2 text-xs text-foreground-tertiary">
              Dependencies: {task.dependencies.join(', ')}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

const TaskList: React.FC<TaskListProps> = ({ tasks, droppableId, isDraggingOver }) => {
  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`h-full p-4 rounded-lg transition-colors ${
            isDraggingOver || snapshot.isDraggingOver
              ? 'bg-brand/10 border-2 border-brand border-dashed'
              : 'bg-background-secondary'
          }`}
        >
          {tasks.length === 0 ? (
            <p className="text-center text-foreground-tertiary py-8">
              {droppableId === 'unassigned' 
                ? 'No unassigned tasks' 
                : 'Drop tasks here to assign'}
            </p>
          ) : (
            tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} />
            ))
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

const AgentPanel: React.FC<AgentPanelProps> = ({ agent, assignedTasks, isDraggingOver }) => {
  const getStatusColor = () => {
    switch (agent.status) {
      case 'RUNNING':
        return 'text-status-success bg-status-success/20';
      case 'STOPPED':
        return 'text-status-error bg-status-error/20';
      case 'ERROR':
        return 'text-status-error bg-status-error/20';
      default:
        return 'text-foreground-secondary bg-background-tertiary';
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden h-full flex flex-col">
      <div className="p-4 bg-background-card border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-foreground-secondary" />
            <h3 className="font-semibold text-foreground">{agent.id}</h3>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor()}`}>
            {agent.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-foreground-secondary">{agent.branch}</p>
        <p className="mt-1 text-xs text-foreground-tertiary">
          {assignedTasks.length} task{assignedTasks.length !== 1 ? 's' : ''} assigned
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <TaskList 
          tasks={assignedTasks} 
          droppableId={`agent-${agent.id}`} 
          isDraggingOver={isDraggingOver}
        />
      </div>
    </div>
  );
};

export const TaskAssignment: React.FC<TaskAssignmentProps> = ({ projectPath }) => {
  const [tasks, setTasks] = useState<TaskMasterTask[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [taskAssignments, setTaskAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [tasksData, agentsData] = await Promise.all([
        apiService.getTaskMasterTasks(projectPath),
        apiService.getAgents()
      ]);

      setTasks(tasksData);
      setAgents(agentsData.filter(a => a.status === 'RUNNING'));

      // Initialize task assignments from agent configs
      const assignments: Record<string, string> = {};
      agentsData.forEach(agent => {
        if (agent.config?.taskId) {
          assignments[agent.config.taskId] = agent.id;
        }
      });
      setTaskAssignments(assignments);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load tasks and agents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectPath]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside the list
    if (!destination) return;

    // No movement
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const taskId = draggableId;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Check if task is being assigned to an agent
    if (destination.droppableId.startsWith('agent-')) {
      const agentId = destination.droppableId.replace('agent-', '');
      const agent = agents.find(a => a.id === agentId);
      
      if (!agent) return;

      // Check for dependencies
      if (task.dependencies && task.dependencies.length > 0) {
        const unmetDependencies = task.dependencies.filter(depId => {
          const depTask = tasks.find(t => t.id === depId);
          return depTask && depTask.status !== 'done';
        });

        if (unmetDependencies.length > 0) {
          toast.warning(
            `Cannot assign task: Dependencies ${unmetDependencies.join(', ')} are not complete`,
            { autoClose: 5000 }
          );
          return;
        }
      }

      // Confirm assignment
      const confirmed = window.confirm(
        `Assign task "${task.title}" to agent ${agentId}?`
      );

      if (!confirmed) return;

      try {
        await apiService.assignTaskToAgent(agentId, taskId, projectPath);
        
        setTaskAssignments(prev => ({
          ...prev,
          [taskId]: agentId
        }));

        toast.success(`Task assigned to agent ${agentId}`);
      } catch (error) {
        console.error('Failed to assign task:', error);
        toast.error('Failed to assign task');
      }
    } else if (destination.droppableId === 'unassigned') {
      // Unassigning a task
      const previousAgentId = taskAssignments[taskId];
      if (previousAgentId) {
        const confirmed = window.confirm(
          `Remove task "${task.title}" from agent ${previousAgentId}?`
        );

        if (!confirmed) return;

        setTaskAssignments(prev => {
          const newAssignments = { ...prev };
          delete newAssignments[taskId];
          return newAssignments;
        });

        toast.info('Task unassigned');
      }
    }
  };

  const getUnassignedTasks = () => {
    return tasks.filter(task => 
      !taskAssignments[task.id] && 
      task.status !== 'done' && 
      task.status !== 'cancelled'
    );
  };

  const getAgentTasks = (agentId: string) => {
    return tasks.filter(task => taskAssignments[task.id] === agentId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 text-foreground-tertiary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border bg-background-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Task Assignment</h2>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="p-2 text-foreground-secondary hover:bg-background-secondary rounded-md transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="mt-1 text-sm text-foreground-secondary">
          Drag tasks from the left panel to assign them to agents
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Unassigned Tasks */}
          <div className="w-1/3 border-r border-border flex flex-col">
            <div className="p-4 bg-background-secondary border-b border-border">
              <h3 className="font-medium text-foreground">Unassigned Tasks</h3>
              <p className="text-sm text-foreground-secondary mt-1">
                {getUnassignedTasks().length} tasks available
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TaskList tasks={getUnassignedTasks()} droppableId="unassigned" />
            </div>
          </div>

          {/* Agents */}
          <div className="flex-1 p-4">
            {agents.length === 0 ? (
              <div className="flex items-center justify-center h-full text-foreground-tertiary">
                <div className="text-center">
                  <User className="w-12 h-12 mx-auto mb-4 text-foreground-tertiary" />
                  <p>No running agents available</p>
                  <p className="text-sm mt-2">Start an agent to assign tasks</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
                {agents.map(agent => (
                  <AgentPanel
                    key={agent.id}
                    agent={agent}
                    assignedTasks={getAgentTasks(agent.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};