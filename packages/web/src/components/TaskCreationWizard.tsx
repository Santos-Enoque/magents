import React, { useState, useEffect } from 'react';
import { TaskMasterTask } from '@magents/shared';
import { apiService } from '../services/api';
import { X, ArrowRight, ArrowLeft, Save, Plus, Trash2, Search, AlertCircle, Check, RefreshCw } from 'lucide-react';

interface TaskCreationWizardProps {
  projectPath: string;
  onClose: () => void;
  onTaskCreated: (task: TaskMasterTask) => void;
  existingTasks?: TaskMasterTask[];
}

interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dependencies: string[];
  details: string;
  testStrategy: string;
  subtasks: {
    title: string;
    description: string;
  }[];
}

interface ValidationErrors {
  title?: string;
  description?: string;
  subtasks?: { [index: number]: { title?: string; description?: string } };
}

const taskTemplates = [
  {
    id: 'feature',
    name: 'Feature Implementation',
    template: {
      priority: 'medium' as const,
      testStrategy: 'Unit tests for core functionality, integration tests for API endpoints, E2E tests for user flows',
      subtasks: [
        { title: 'Design and plan implementation', description: 'Create technical design document and implementation plan' },
        { title: 'Implement core functionality', description: 'Build the main feature logic and business rules' },
        { title: 'Add tests', description: 'Write unit tests, integration tests, and E2E tests' },
        { title: 'Update documentation', description: 'Update API docs, user guides, and code comments' }
      ]
    }
  },
  {
    id: 'bugfix',
    name: 'Bug Fix',
    template: {
      priority: 'high' as const,
      testStrategy: 'Regression tests to prevent reoccurrence, unit tests for the fix',
      subtasks: [
        { title: 'Reproduce and diagnose issue', description: 'Create minimal reproduction and identify root cause' },
        { title: 'Implement fix', description: 'Apply the fix and ensure it resolves the issue' },
        { title: 'Add regression tests', description: 'Write tests to prevent the bug from reoccurring' }
      ]
    }
  },
  {
    id: 'refactor',
    name: 'Code Refactoring',
    template: {
      priority: 'low' as const,
      testStrategy: 'Ensure existing tests pass, add tests for any new patterns or abstractions',
      subtasks: [
        { title: 'Analyze current implementation', description: 'Review existing code and identify refactoring opportunities' },
        { title: 'Plan refactoring approach', description: 'Design the new structure and migration strategy' },
        { title: 'Implement refactoring', description: 'Apply changes incrementally with tests passing at each step' },
        { title: 'Update affected components', description: 'Update all components using the refactored code' }
      ]
    }
  },
  {
    id: 'research',
    name: 'Research Task',
    template: {
      priority: 'medium' as const,
      testStrategy: 'Proof of concept implementation, performance benchmarks if applicable',
      subtasks: [
        { title: 'Research and analysis', description: 'Investigate options and gather requirements' },
        { title: 'Create proof of concept', description: 'Build a minimal implementation to validate approach' },
        { title: 'Document findings', description: 'Create documentation of research results and recommendations' }
      ]
    }
  }
];

export const TaskCreationWizard: React.FC<TaskCreationWizardProps> = ({
  projectPath,
  onClose,
  onTaskCreated,
  existingTasks = []
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'medium',
    dependencies: [],
    details: '',
    testStrategy: '',
    subtasks: []
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [dependencySearch, setDependencySearch] = useState('');
  const [showDependencyPicker, setShowDependencyPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const steps = [
    { id: 'template', title: 'Choose Template' },
    { id: 'basic', title: 'Basic Information' },
    { id: 'details', title: 'Implementation Details' },
    { id: 'dependencies', title: 'Dependencies' },
    { id: 'subtasks', title: 'Subtasks' },
    { id: 'review', title: 'Review & Create' }
  ];

  // Filter tasks for dependency picker
  const filteredTasks = existingTasks.filter(task => {
    const searchLower = dependencySearch.toLowerCase();
    return (
      !formData.dependencies.includes(task.id) &&
      (task.id.toLowerCase().includes(searchLower) ||
        task.title.toLowerCase().includes(searchLower))
    );
  });

  // Validation functions
  const validateStep = (step: number): boolean => {
    const errors: ValidationErrors = {};

    switch (step) {
      case 1: // Basic Information
        if (!formData.title.trim()) {
          errors.title = 'Title is required';
        } else if (formData.title.length < 5) {
          errors.title = 'Title must be at least 5 characters';
        }
        
        if (!formData.description.trim()) {
          errors.description = 'Description is required';
        } else if (formData.description.length < 10) {
          errors.description = 'Description must be at least 10 characters';
        }
        break;

      case 4: // Subtasks
        const subtaskErrors: ValidationErrors['subtasks'] = {};
        formData.subtasks.forEach((subtask, index) => {
          const subtaskError: { title?: string; description?: string } = {};
          if (!subtask.title.trim()) {
            subtaskError.title = 'Subtask title is required';
          }
          if (!subtask.description.trim()) {
            subtaskError.description = 'Subtask description is required';
          }
          if (Object.keys(subtaskError).length > 0) {
            subtaskErrors[index] = subtaskError;
          }
        });
        if (Object.keys(subtaskErrors).length > 0) {
          errors.subtasks = subtaskErrors;
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 0 || validateStep(currentStep)) {
      setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(currentStep - 1, 0));
  };

  const handleTemplateSelect = (template: typeof taskTemplates[0]) => {
    setFormData(prev => ({
      ...prev,
      priority: template.template.priority,
      testStrategy: template.template.testStrategy,
      subtasks: template.template.subtasks.map(st => ({ ...st }))
    }));
    handleNext();
  };

  const handleAddDependency = (taskId: string) => {
    setFormData(prev => ({
      ...prev,
      dependencies: [...prev.dependencies, taskId]
    }));
    setDependencySearch('');
  };

  const handleRemoveDependency = (taskId: string) => {
    setFormData(prev => ({
      ...prev,
      dependencies: prev.dependencies.filter(id => id !== taskId)
    }));
  };

  const handleAddSubtask = () => {
    setFormData(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, { title: '', description: '' }]
    }));
  };

  const handleRemoveSubtask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, i) => i !== index)
    }));
    // Clear validation errors for removed subtask
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      if (newErrors.subtasks) {
        delete newErrors.subtasks[index];
        // Reindex remaining errors
        const reindexed: ValidationErrors['subtasks'] = {};
        Object.entries(newErrors.subtasks).forEach(([key, value]) => {
          const oldIndex = parseInt(key);
          if (oldIndex > index) {
            reindexed[oldIndex - 1] = value;
          } else {
            reindexed[oldIndex] = value;
          }
        });
        newErrors.subtasks = reindexed;
      }
      return newErrors;
    });
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const newTask = await apiService.createTaskMasterTask(
        projectPath,
        formData.title,
        formData.description,
        formData.priority
      );

      // Note: The API currently doesn't support all fields, so we're creating a complete task object
      // for the UI. In a real implementation, all fields would be handled by the backend.
      const completeTask: TaskMasterTask = {
        ...newTask,
        dependencies: formData.dependencies.length > 0 ? formData.dependencies : undefined,
        details: formData.details || undefined,
        testStrategy: formData.testStrategy || undefined,
        subtasks: formData.subtasks.length > 0 ? formData.subtasks.map((st, index) => ({
          id: `${newTask.id}.${index + 1}`,
          title: st.title,
          description: st.description,
          status: 'pending' as const,
          priority: 'medium' as const
        })) : undefined
      };

      onTaskCreated(completeTask);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        if (currentStep === steps.length - 1) {
          handleSubmit();
        } else {
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, formData]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Template Selection
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Choose a Task Template</h3>
            <p className="text-sm text-gray-600 mb-6">
              Select a template to pre-fill common fields, or skip to create a custom task.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {taskTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="p-4 border rounded-lg text-left hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <h4 className="font-medium mb-2">{template.name}</h4>
                  <p className="text-sm text-gray-600">
                    Priority: {template.template.priority} • {template.template.subtasks.length} subtasks
                  </p>
                </button>
              ))}
            </div>
            <button
              onClick={handleNext}
              className="w-full mt-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Skip and create custom task →
            </button>
          </div>
        );

      case 1: // Basic Information
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.title ? 'border-red-500' : ''
                }`}
                placeholder="e.g., Implement user authentication"
              />
              {validationErrors.title && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.description ? 'border-red-500' : ''
                }`}
                rows={4}
                placeholder="Describe what needs to be done..."
              />
              {validationErrors.description && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        );

      case 2: // Implementation Details
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Implementation Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Implementation Details
              </label>
              <textarea
                value={formData.details}
                onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={6}
                placeholder="Technical details, approach, considerations..."
              />
              <p className="mt-1 text-sm text-gray-500">
                Provide technical details about how this task should be implemented.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Strategy
              </label>
              <textarea
                value={formData.testStrategy}
                onChange={(e) => setFormData(prev => ({ ...prev, testStrategy: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="How should this be tested?"
              />
              <p className="mt-1 text-sm text-gray-500">
                Describe the testing approach for this task.
              </p>
            </div>
          </div>
        );

      case 3: // Dependencies
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Task Dependencies</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                This task depends on:
              </label>
              
              {formData.dependencies.length > 0 && (
                <div className="mb-4 space-y-2">
                  {formData.dependencies.map(depId => {
                    const depTask = existingTasks.find(t => t.id === depId);
                    return (
                      <div
                        key={depId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                      >
                        <div>
                          <span className="font-mono text-sm text-gray-600">#{depId}</span>
                          {depTask && (
                            <span className="ml-2 text-sm">{depTask.title}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveDependency(depId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={dependencySearch}
                  onChange={(e) => setDependencySearch(e.target.value)}
                  onFocus={() => setShowDependencyPicker(true)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search tasks by ID or title..."
                />
              </div>

              {showDependencyPicker && dependencySearch && (
                <div className="mt-2 max-h-60 overflow-y-auto border rounded-md shadow-lg bg-white">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.slice(0, 10).map(task => (
                      <button
                        key={task.id}
                        onClick={() => {
                          handleAddDependency(task.id);
                          setShowDependencyPicker(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono text-sm text-gray-600">#{task.id}</span>
                          <span className="ml-2 text-sm">{task.title}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          task.status === 'done' ? 'bg-green-100 text-green-700' :
                          task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {task.status}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No matching tasks found
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-sm text-gray-500">
              Dependencies ensure this task won't be started until the selected tasks are completed.
            </p>
          </div>
        );

      case 4: // Subtasks
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Subtasks</h3>
              <button
                onClick={handleAddSubtask}
                className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Subtask</span>
              </button>
            </div>

            {formData.subtasks.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-4">No subtasks added yet</p>
                <button
                  onClick={handleAddSubtask}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Add your first subtask
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.subtasks.map((subtask, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">
                        Subtask {index + 1}
                      </span>
                      <button
                        onClick={() => handleRemoveSubtask(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <input
                          type="text"
                          value={subtask.title}
                          onChange={(e) => {
                            const newSubtasks = [...formData.subtasks];
                            newSubtasks[index].title = e.target.value;
                            setFormData(prev => ({ ...prev, subtasks: newSubtasks }));
                          }}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            validationErrors.subtasks?.[index]?.title ? 'border-red-500' : ''
                          }`}
                          placeholder="Subtask title"
                        />
                        {validationErrors.subtasks?.[index]?.title && (
                          <p className="mt-1 text-sm text-red-600">
                            {validationErrors.subtasks[index].title}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <textarea
                          value={subtask.description}
                          onChange={(e) => {
                            const newSubtasks = [...formData.subtasks];
                            newSubtasks[index].description = e.target.value;
                            setFormData(prev => ({ ...prev, subtasks: newSubtasks }));
                          }}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            validationErrors.subtasks?.[index]?.description ? 'border-red-500' : ''
                          }`}
                          rows={2}
                          placeholder="Subtask description"
                        />
                        {validationErrors.subtasks?.[index]?.description && (
                          <p className="mt-1 text-sm text-red-600">
                            {validationErrors.subtasks[index].description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 5: // Review
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Review Task Details</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Basic Information</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex">
                    <dt className="font-medium text-gray-600 w-24">Title:</dt>
                    <dd className="flex-1">{formData.title}</dd>
                  </div>
                  <div className="flex">
                    <dt className="font-medium text-gray-600 w-24">Priority:</dt>
                    <dd className="flex-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        formData.priority === 'high' ? 'bg-red-100 text-red-700' :
                        formData.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {formData.priority}
                      </span>
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="font-medium text-gray-600 w-24">Description:</dt>
                    <dd className="flex-1">{formData.description}</dd>
                  </div>
                </dl>
              </div>

              {(formData.details || formData.testStrategy) && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">Implementation</h4>
                  <dl className="space-y-2 text-sm">
                    {formData.details && (
                      <div>
                        <dt className="font-medium text-gray-600 mb-1">Details:</dt>
                        <dd className="text-gray-700 whitespace-pre-wrap">{formData.details}</dd>
                      </div>
                    )}
                    {formData.testStrategy && (
                      <div>
                        <dt className="font-medium text-gray-600 mb-1">Test Strategy:</dt>
                        <dd className="text-gray-700 whitespace-pre-wrap">{formData.testStrategy}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {formData.dependencies.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">Dependencies</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {formData.dependencies.map(depId => {
                      const depTask = existingTasks.find(t => t.id === depId);
                      return (
                        <li key={depId}>
                          <span className="font-mono text-gray-600">#{depId}</span>
                          {depTask && <span className="ml-2">{depTask.title}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {formData.subtasks.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Subtasks ({formData.subtasks.length})
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    {formData.subtasks.map((subtask, index) => (
                      <li key={index}>
                        <span className="font-medium">{subtask.title}</span>
                        <p className="ml-6 text-gray-600">{subtask.description}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {submitError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">{submitError}</div>
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                Review the task details above. Click "Create Task" to add this task to your TaskMaster project.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create New Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index < currentStep
                        ? 'bg-green-600 text-white'
                        : index === currentStep
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm ${
                      index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      index < currentStep ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Create Task</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};