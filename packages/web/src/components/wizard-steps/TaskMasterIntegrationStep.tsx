import React, { useState } from 'react';
import { Wand2, Search, CheckSquare, Square, Filter, AlertTriangle } from 'lucide-react';
import { TaskMasterTask } from '@magents/shared';
import { WizardFormData } from '../AgentCreationWizard';

interface TaskMasterIntegrationStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
  tasks: TaskMasterTask[];
}

const PRIORITY_COLORS = {
  high: 'bg-red-900 text-red-200',
  medium: 'bg-yellow-900 text-yellow-200',
  low: 'bg-green-900 text-green-200'
};

const STATUS_COLORS = {
  pending: 'bg-gray-700 text-gray-200',
  'in-progress': 'bg-blue-900 text-blue-200',
  done: 'bg-green-900 text-green-200',
  blocked: 'bg-red-900 text-red-200',
  cancelled: 'bg-gray-700 text-gray-300'
};

export const TaskMasterIntegrationStep: React.FC<TaskMasterIntegrationStepProps> = ({
  formData,
  updateFormData,
  tasks
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Get available tasks (not done or cancelled)
  const availableTasks = filteredTasks.filter(task => 
    !['done', 'cancelled'].includes(task.status)
  );

  // Toggle TaskMaster integration
  const toggleTaskMaster = (enabled: boolean) => {
    updateFormData({
      taskMasterEnabled: enabled,
      selectedTasks: enabled ? formData.selectedTasks : []
    });
  };

  // Toggle task selection
  const toggleTaskSelection = (taskId: string) => {
    const currentTasks = formData.selectedTasks || [];
    const newTasks = currentTasks.includes(taskId)
      ? currentTasks.filter(id => id !== taskId)
      : [...currentTasks, taskId];
    
    updateFormData({ selectedTasks: newTasks });
  };

  // Select all available tasks
  const selectAllTasks = () => {
    const allTaskIds = availableTasks.map(task => task.id);
    updateFormData({ selectedTasks: allTaskIds });
  };

  // Clear all selections
  const clearAllTasks = () => {
    updateFormData({ selectedTasks: [] });
  };

  return (
    <div className="space-y-6">
      {/* TaskMaster Toggle */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => toggleTaskMaster(!formData.taskMasterEnabled)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            formData.taskMasterEnabled ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              formData.taskMasterEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <div>
          <h3 className="text-sm font-medium text-foreground">Enable TaskMaster Integration</h3>
          <p className="text-sm text-foreground-secondary">
            Assign specific tasks to this agent for automated tracking and execution
          </p>
        </div>
      </div>

      {!formData.taskMasterEnabled ? (
        /* Disabled State */
        <div className="text-center py-8 bg-background-secondary rounded-lg border-2 border-dashed border-border">
          <Wand2 className="w-12 h-12 text-foreground-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">TaskMaster Integration Disabled</h3>
          <p className="text-foreground-secondary mb-4">
            Enable TaskMaster integration to assign specific tasks to your agent.
            This allows for automated task tracking and progress monitoring.
          </p>
          <button
            onClick={() => toggleTaskMaster(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand-hover"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Enable TaskMaster
          </button>
        </div>
      ) : (
        /* Enabled State - Task Selection */
        <div className="space-y-4">
          {tasks.length === 0 ? (
            /* No Tasks Available */
            <div className="text-center py-8 bg-status-warning/10 rounded-lg border border-status-warning/30">
              <AlertTriangle className="w-12 h-12 text-status-warning mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Tasks Available</h3>
              <p className="text-foreground-secondary mb-4">
                No TaskMaster tasks were found for this project. You can still create the agent
                and assign tasks later from the dashboard.
              </p>
              <div className="text-sm text-foreground-tertiary">
                <p>To add tasks, use TaskMaster CLI:</p>
                <code className="bg-background-tertiary px-2 py-1 rounded mt-1 inline-block text-foreground">
                  task-master add-task --prompt="Task description"
                </code>
              </div>
            </div>
          ) : (
            <div>
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-tertiary w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand bg-background-secondary text-foreground placeholder-foreground-tertiary"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand bg-background-secondary text-foreground"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-brand focus:border-brand bg-background-secondary text-foreground"
                  >
                    <option value="all">All Priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Bulk Actions */}
              {availableTasks.length > 0 && (
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-foreground-secondary">
                    {formData.selectedTasks.length} of {availableTasks.length} tasks selected
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={selectAllTasks}
                      className="text-sm text-brand hover:text-brand-hover"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearAllTasks}
                      className="text-sm text-foreground-secondary hover:text-foreground"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}

              {/* Task List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-foreground-tertiary">
                    <Filter className="w-8 h-8 mx-auto mb-2" />
                    <p>No tasks match your current filters</p>
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const isSelected = formData.selectedTasks.includes(task.id);
                    const isAvailable = !['done', 'cancelled'].includes(task.status);
                    
                    return (
                      <button
                        key={task.id}
                        onClick={() => isAvailable && toggleTaskSelection(task.id)}
                        disabled={!isAvailable}
                        className={`w-full p-4 border rounded-lg text-left transition-colors ${
                          isAvailable
                            ? isSelected
                              ? 'border-brand bg-brand/10'
                              : 'border-border hover:border-brand hover:bg-background-secondary'
                            : 'border-border bg-background-secondary opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="pt-1">
                            {isAvailable ? (
                              isSelected ? (
                                <CheckSquare className="w-5 h-5 text-brand" />
                              ) : (
                                <Square className="w-5 h-5 text-foreground-tertiary" />
                              )
                            ) : (
                              <Square className="w-5 h-5 text-foreground-tertiary opacity-50" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-foreground mb-1">
                                  {task.id}: {task.title}
                                </h4>
                                {task.description && (
                                  <p className="text-sm text-foreground-secondary mb-2 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex flex-col items-end space-y-1 ml-4">
                                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[task.status]}`}>
                                  {task.status}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                            
                            {task.dependencies && task.dependencies.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-foreground-tertiary">
                                  Depends on: {task.dependencies.join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Selection Summary */}
          {formData.selectedTasks.length > 0 && (
            <div className="bg-brand/10 border border-brand/30 rounded-md p-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Selected Tasks Summary</h4>
              <p className="text-sm text-foreground-secondary mb-3">
                {formData.selectedTasks.length} task{formData.selectedTasks.length !== 1 ? 's' : ''} will be assigned to this agent
              </p>
              <div className="space-y-1">
                {formData.selectedTasks.slice(0, 3).map(taskId => {
                  const task = tasks.find(t => t.id === taskId);
                  return task ? (
                    <div key={taskId} className="text-sm text-foreground-secondary">
                      • {task.id}: {task.title}
                    </div>
                  ) : null;
                })}
                {formData.selectedTasks.length > 3 && (
                  <div className="text-sm text-foreground-tertiary">
                    ... and {formData.selectedTasks.length - 3} more task{formData.selectedTasks.length - 3 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};