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
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Circle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50';
      case 'low':
        return 'border-green-300 bg-green-50';
      default:
        return 'border-gray-300 bg-gray-50';
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
              <span className="text-sm font-mono text-gray-600">#{task.id}</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                task.priority === 'high' 
                  ? 'bg-red-200 text-red-800' 
                  : task.priority === 'medium'
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-green-200 text-green-800'
              }`}>
                {task.priority}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
          <h4 className="mt-2 font-medium text-gray-900">{task.title}</h4>
          {task.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{task.description}</p>
          )}
          {task.dependencies && task.dependencies.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
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
              ? 'bg-blue-50 border-2 border-blue-300 border-dashed'
              : 'bg-gray-50'
          }`}
        >
          {tasks.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
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
        return 'text-green-600 bg-green-100';
      case 'STOPPED':
        return 'text-red-600 bg-red-100';
      case 'ERROR':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden h-full flex flex-col">
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">{agent.id}</h3>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor()}`}>
            {agent.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-600">{agent.branch}</p>
        <p className="mt-1 text-xs text-gray-500">
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
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Task Assignment</h2>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Drag tasks from the left panel to assign them to agents
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Unassigned Tasks */}
          <div className="w-1/3 border-r flex flex-col">
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="font-medium text-gray-900">Unassigned Tasks</h3>
              <p className="text-sm text-gray-600 mt-1">
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
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
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