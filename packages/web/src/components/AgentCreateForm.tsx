import React, { useState, useEffect, useCallback } from 'react';
import { Plus, GitBranch, User, Loader2, FolderOpen, ChevronRight, ChevronLeft, Check, AlertCircle, Info } from 'lucide-react';
import { CreateAgentOptions, GitRepositoryInfo, ProjectValidationResult } from '@magents/shared';
import { DirectoryBrowser } from './DirectoryBrowser';
import { apiService } from '../services/api';

interface AgentCreateFormProps {
  onSubmit: (formData: AgentFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

interface AgentFormData {
  agentId: string;
  branch: string;
  projectPath?: string;
  createNewBranch?: boolean;
  baseBranch?: string;
  autoAccept?: boolean;
  useDocker?: boolean;
  projectId?: string;
}

interface FormErrors {
  agentId?: string;
  branch?: string;
  projectPath?: string;
  general?: string;
}

type WizardStep = 'project' | 'branch' | 'agent' | 'review';

interface StepConfig {
  id: WizardStep;
  title: string;
  description: string;
  icon: React.ReactNode;
}

// Validation rules and functions
const VALIDATION_RULES = {
  agentId: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
    message: 'Agent ID must be 2-50 characters, start with alphanumeric, and contain only letters, numbers, hyphens, and underscores',
  },
  branch: {
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9][a-zA-Z0-9_.\/-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/,
    message: 'Branch name must be a valid Git branch name (letters, numbers, hyphens, slashes, dots, underscores)',
  },
} as const;

// Validation helper functions
const validateAgentId = (value: string): string | undefined => {
  const trimmed = value.trim();
  
  if (!trimmed && VALIDATION_RULES.agentId.required) {
    return 'Agent ID is required';
  }
  
  if (trimmed.length < VALIDATION_RULES.agentId.minLength) {
    return `Agent ID must be at least ${VALIDATION_RULES.agentId.minLength} characters`;
  }
  
  if (trimmed.length > VALIDATION_RULES.agentId.maxLength) {
    return `Agent ID must be no more than ${VALIDATION_RULES.agentId.maxLength} characters`;
  }
  
  if (!VALIDATION_RULES.agentId.pattern.test(trimmed)) {
    return VALIDATION_RULES.agentId.message;
  }
  
  return undefined;
};

const validateBranch = (value: string): string | undefined => {
  const trimmed = value.trim();
  
  if (!trimmed && VALIDATION_RULES.branch.required) {
    return 'Branch name is required';
  }
  
  if (trimmed.length < VALIDATION_RULES.branch.minLength) {
    return 'Branch name cannot be empty';
  }
  
  if (trimmed.length > VALIDATION_RULES.branch.maxLength) {
    return `Branch name must be no more than ${VALIDATION_RULES.branch.maxLength} characters`;
  }
  
  // Check for invalid Git branch characters
  if (trimmed.includes('..') || trimmed.includes('//')) {
    return 'Branch name cannot contain consecutive dots or slashes';
  }
  
  if (trimmed.startsWith('.') || trimmed.endsWith('.')) {
    return 'Branch name cannot start or end with a dot';
  }
  
  if (trimmed.startsWith('/') || trimmed.endsWith('/')) {
    return 'Branch name cannot start or end with a slash';
  }
  
  if (trimmed.includes(' ')) {
    return 'Branch name cannot contain spaces';
  }
  
  // Check for Git-reserved names
  const reservedNames = ['HEAD', 'refs', 'index', 'objects', 'hooks'];
  if (reservedNames.some(name => trimmed.toLowerCase().startsWith(name.toLowerCase()))) {
    return 'Branch name cannot start with reserved Git names';
  }
  
  if (!VALIDATION_RULES.branch.pattern.test(trimmed)) {
    return VALIDATION_RULES.branch.message;
  }
  
  return undefined;
};

const validateForm = (formData: AgentFormData): FormErrors => {
  const errors: FormErrors = {};
  
  // Validate project path
  if (!formData.projectPath?.trim()) {
    errors.projectPath = 'Project path is required';
  }
  
  const agentIdError = validateAgentId(formData.agentId);
  if (agentIdError) {
    errors.agentId = agentIdError;
  }
  
  const branchError = validateBranch(formData.branch);
  if (branchError) {
    errors.branch = branchError;
  }
  
  return errors;
};

const WIZARD_STEPS: StepConfig[] = [
  {
    id: 'project',
    title: 'Select Project',
    description: 'Choose a Git repository for your agent',
    icon: <FolderOpen className="w-5 h-5" />
  },
  {
    id: 'branch',
    title: 'Configure Branch',
    description: 'Select or create a Git branch',
    icon: <GitBranch className="w-5 h-5" />
  },
  {
    id: 'agent',
    title: 'Agent Details',
    description: 'Configure agent settings',
    icon: <User className="w-5 h-5" />
  },
  {
    id: 'review',
    title: 'Review & Create',
    description: 'Confirm your configuration',
    icon: <Check className="w-5 h-5" />
  }
];

export const AgentCreateForm: React.FC<AgentCreateFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  className = '',
}) => {
  const [formData, setFormData] = useState<AgentFormData>({
    agentId: '',
    branch: '',
    projectPath: '',
    createNewBranch: false,
    baseBranch: 'main',
    autoAccept: false,
    useDocker: false,
    projectId: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('project');
  const [projectInfo, setProjectInfo] = useState<GitRepositoryInfo | null>(null);
  const [projectValidation, setProjectValidation] = useState<ProjectValidationResult | null>(null);
  const [isLoadingProjectInfo, setIsLoadingProjectInfo] = useState(false);
  const [showDirectoryBrowser, setShowDirectoryBrowser] = useState(false);

  // Fetch project metadata when project path changes
  useEffect(() => {
    if (formData.projectPath) {
      fetchProjectMetadata(formData.projectPath);
    } else {
      setProjectInfo(null);
      setProjectValidation(null);
    }
  }, [formData.projectPath]);

  const fetchProjectMetadata = useCallback(async (path: string) => {
    setIsLoadingProjectInfo(true);
    setErrors(prev => ({ ...prev, projectPath: undefined }));
    
    try {
      // Validate the project first
      const validation = await apiService.validateProject(path);
      setProjectValidation(validation);
      
      if (validation.isValid && validation.gitInfo) {
        // Get detailed metadata
        const metadata = await apiService.getProjectMetadata(path);
        setProjectInfo(metadata);
        
        // Auto-set current branch if not already set
        if (!formData.branch && metadata.currentBranch) {
          setFormData(prev => ({
            ...prev,
            branch: metadata.currentBranch!,
            baseBranch: metadata.currentBranch!
          }));
        }
      } else {
        setProjectInfo(null);
        if (validation.errors.length > 0) {
          setErrors(prev => ({ ...prev, projectPath: validation.errors[0] }));
        }
      }
    } catch (error) {
      setProjectInfo(null);
      setProjectValidation(null);
      setErrors(prev => ({
        ...prev,
        projectPath: error instanceof Error ? error.message : 'Failed to validate project'
      }));
    } finally {
      setIsLoadingProjectInfo(false);
    }
  }, [formData.branch]);

  const handleProjectSelect = (path: string) => {
    setFormData(prev => ({ ...prev, projectPath: path }));
    setShowDirectoryBrowser(false);
  };

  // Get available branches from project info
  const availableBranches = projectInfo?.branches || [];
  
  // Common branch suggestions for new branches
  const branchPrefixes = [
    'feature/',
    'bugfix/',
    'hotfix/',
    'release/',
    'chore/',
  ];

  const handleInputChange = (field: keyof AgentFormData, value: string | boolean) => {
    const newFormData = {
      ...formData,
      [field]: value,
    };
    
    // Handle branch creation toggle
    if (field === 'createNewBranch' && value === true) {
      newFormData.branch = ''; // Clear branch when switching to create new
    }
    
    setFormData(newFormData);

    // Validate on change for immediate feedback
    if (typeof value === 'string' && (field === 'agentId' || field === 'branch')) {
      let fieldError: string | undefined;
      
      if (field === 'agentId') {
        fieldError = validateAgentId(value);
      } else if (field === 'branch') {
        fieldError = validateBranch(value);
      }
      
      setErrors(prev => ({
        ...prev,
        [field]: fieldError,
        // Clear general error when user starts correcting field errors
        general: fieldError ? prev.general : undefined,
      }));
    } else {
      // Clear errors for non-string fields (checkboxes)
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  // Step navigation
  const canProceedToNextStep = useCallback(() => {
    switch (currentStep) {
      case 'project':
        return !!formData.projectPath && projectValidation?.isValid;
      case 'branch':
        if (formData.createNewBranch) {
          return !!formData.branch && !validateBranch(formData.branch);
        }
        return !!formData.branch;
      case 'agent':
        return !!formData.agentId && !validateAgentId(formData.agentId);
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, formData, projectValidation]);

  const goToNextStep = () => {
    const stepIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);
    if (stepIndex < WIZARD_STEPS.length - 1 && canProceedToNextStep()) {
      setCurrentStep(WIZARD_STEPS[stepIndex + 1].id);
    }
  };

  const goToPreviousStep = () => {
    const stepIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(WIZARD_STEPS[stepIndex - 1].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading || isSubmitting) return;

    // Validate entire form before submission
    const validationErrors = validateForm(formData);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Include project path in the submission
      const submissionData = {
        ...formData,
        // If creating a new branch, include the base branch info
        branch: formData.createNewBranch ? 
          `${formData.baseBranch}:${formData.branch}` : 
          formData.branch
      };
      await onSubmit(submissionData);
      // Reset form on successful submission
      setFormData({
        agentId: '',
        branch: '',
        autoAccept: false,
        useDocker: false,
        projectId: '',
      });
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to create agent',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = isLoading || isSubmitting;
  
  // Check if form is valid for submission
  const currentValidationErrors = validateForm(formData);
  const hasValidationErrors = Object.keys(currentValidationErrors).length > 0;
  const canSubmit = currentStep === 'review' && 
    formData.agentId.trim() && 
    formData.branch.trim() && 
    formData.projectPath && 
    projectValidation?.isValid && 
    !hasValidationErrors && 
    !isFormDisabled;

  // Render step indicator
  const renderStepIndicator = () => {
    const currentStepIndex = WIZARD_STEPS.findIndex(s => s.id === currentStep);
    
    return (
      <div className="flex items-center justify-between mb-8">
        {WIZARD_STEPS.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${isActive ? 'bg-blue-600 text-white' : ''}
                  ${isCompleted ? 'bg-green-600 text-white' : ''}
                  ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-500' : ''}
                `}>
                  {isCompleted ? <Check className="w-5 h-5" /> : step.icon}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    isActive ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
              {index < WIZARD_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`bg-white shadow-lg rounded-lg ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <Plus className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Create New Agent</h3>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Create a new Claude Code agent with a dedicated Git worktree and tmux session
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {renderStepIndicator()}
        
        <div className="space-y-6">
          {/* General Error Message */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{errors.general}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Project Selection */}
          {currentStep === 'project' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Project Directory
                </label>
                <div className="mt-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.projectPath || ''}
                      onChange={(e) => handleInputChange('projectPath', e.target.value)}
                      disabled={isFormDisabled}
                      className={`flex-1 block w-full px-3 py-2 border rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.projectPath
                          ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300'
                      } ${isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      placeholder="/path/to/your/project"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDirectoryBrowser(true)}
                      disabled={isFormDisabled}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                  {errors.projectPath && (
                    <p className="mt-2 text-sm text-red-600">{errors.projectPath}</p>
                  )}
                </div>
              </div>

              {/* Project Info Display */}
              {isLoadingProjectInfo && (
                <div className="flex items-center text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating project...
                </div>
              )}

              {projectInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <Info className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">Git Repository Detected</p>
                      <div className="mt-1 text-blue-700 space-y-1">
                        <p>Current branch: <span className="font-mono">{projectInfo.currentBranch}</span></p>
                        <p>Branches available: {projectInfo.branches?.length || 0}</p>
                        {projectInfo.lastCommit && (
                          <p className="text-xs">Last commit: {projectInfo.lastCommit.message.substring(0, 50)}...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {projectValidation && !projectValidation.isValid && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-900">Validation Warnings</p>
                      <ul className="mt-1 text-yellow-700 list-disc list-inside">
                        {projectValidation.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Branch Configuration */}
          {currentStep === 'branch' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Configuration
                </label>
                
                {/* Branch Mode Selection */}
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="branchMode"
                      checked={!formData.createNewBranch}
                      onChange={() => handleInputChange('createNewBranch', false)}
                      disabled={isFormDisabled}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-900">Use existing branch</span>
                  </label>
                  
                  {!formData.createNewBranch && availableBranches.length > 0 && (
                    <div className="ml-6">
                      <select
                        value={formData.branch}
                        onChange={(e) => handleInputChange('branch', e.target.value)}
                        disabled={isFormDisabled}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="">Select a branch</option>
                        {availableBranches.map((branch) => (
                          <option key={branch} value={branch}>
                            {branch} {branch === projectInfo?.currentBranch && '(current)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="branchMode"
                      checked={formData.createNewBranch}
                      onChange={() => handleInputChange('createNewBranch', true)}
                      disabled={isFormDisabled}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-900">Create new branch</span>
                  </label>
                  
                  {formData.createNewBranch && (
                    <div className="ml-6 space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700">Base branch</label>
                        <select
                          value={formData.baseBranch}
                          onChange={(e) => handleInputChange('baseBranch', e.target.value)}
                          disabled={isFormDisabled}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          {availableBranches.map((branch) => (
                            <option key={branch} value={branch}>
                              {branch} {branch === projectInfo?.currentBranch && '(current)'}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-700">New branch name</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <GitBranch className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={formData.branch}
                            onChange={(e) => handleInputChange('branch', e.target.value)}
                            disabled={isFormDisabled}
                            className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                              errors.branch
                                ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                                : 'border-gray-300'
                            } ${isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            placeholder="feature/new-feature"
                            list="branch-prefixes"
                          />
                          <datalist id="branch-prefixes">
                            {branchPrefixes.map((prefix) => (
                              <option key={prefix} value={prefix} />
                            ))}
                          </datalist>
                        </div>
                        {errors.branch && (
                          <p className="mt-2 text-sm text-red-600">{errors.branch}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Agent Details */}
          {currentStep === 'agent' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="agentId" className="block text-sm font-medium text-gray-700">
                  Agent ID
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="agentId"
                    name="agentId"
                    value={formData.agentId}
                    onChange={(e) => handleInputChange('agentId', e.target.value)}
                    disabled={isFormDisabled}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.agentId
                        ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300'
                    } ${isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="Enter unique agent identifier"
                    aria-describedby={errors.agentId ? 'agentId-error' : undefined}
                  />
                </div>
                {errors.agentId && (
                  <p className="mt-2 text-sm text-red-600" id="agentId-error">
                    {errors.agentId}
                  </p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  A unique identifier for this agent. Use alphanumeric characters, hyphens, and underscores.
                </p>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Options</h4>
                
                {/* Auto Accept */}
                <div className="flex items-center">
                  <input
                    id="autoAccept"
                    name="autoAccept"
                    type="checkbox"
                    checked={formData.autoAccept}
                    onChange={(e) => handleInputChange('autoAccept', e.target.checked)}
                    disabled={isFormDisabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <label htmlFor="autoAccept" className="ml-2 block text-sm text-gray-900">
                    Auto-accept Claude suggestions
                  </label>
                </div>

                {/* Use Docker */}
                <div className="flex items-center">
                  <input
                    id="useDocker"
                    name="useDocker"
                    type="checkbox"
                    checked={formData.useDocker}
                    onChange={(e) => handleInputChange('useDocker', e.target.checked)}
                    disabled={isFormDisabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <label htmlFor="useDocker" className="ml-2 block text-sm text-gray-900">
                    Use Docker container (experimental)
                  </label>
                </div>
              </div>

              {/* Project ID Field (Optional) */}
              <div>
                <label htmlFor="projectId" className="block text-sm font-medium text-gray-700">
                  Project ID (Optional)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="projectId"
                    name="projectId"
                    value={formData.projectId}
                    onChange={(e) => handleInputChange('projectId', e.target.value)}
                    disabled={isFormDisabled}
                    className={`block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    placeholder="Optional project identifier"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Associate this agent with a specific project for better organization.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Review Configuration</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Project</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">{formData.projectPath}</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Repository</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {projectInfo?.currentBranch && (
                          <span className="inline-flex items-center">
                            <GitBranch className="w-4 h-4 mr-1" />
                            {formData.createNewBranch ? 
                              `${formData.baseBranch} → ${formData.branch} (new)` : 
                              formData.branch
                            }
                          </span>
                        )}
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Agent ID</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">{formData.agentId}</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Options</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <div className="space-y-1">
                          {formData.autoAccept && <span className="block">• Auto-accept suggestions</span>}
                          {formData.useDocker && <span className="block">• Docker container</span>}
                          {formData.projectId && <span className="block">• Project ID: {formData.projectId}</span>}
                          {!formData.autoAccept && !formData.useDocker && !formData.projectId && (
                            <span className="text-gray-500 italic">Default settings</span>
                          )}
                        </div>
                      </dd>
                    </div>
                  </div>
                  
                  {projectInfo && (
                    <div className="pt-4 border-t border-gray-200">
                      <dt className="text-sm font-medium text-gray-500">Git Repository Info</dt>
                      <dd className="mt-2 text-sm text-gray-900">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>Current branch: <span className="font-mono">{projectInfo.currentBranch}</span></div>
                          <div>Total branches: {projectInfo.branches?.length || 0}</div>
                          {projectInfo.lastCommit && (
                            <div className="sm:col-span-2 text-xs text-gray-600">
                              Last commit: {projectInfo.lastCommit.message}
                            </div>
                          )}
                        </div>
                      </dd>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <Info className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">What will happen:</p>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      <li>A new Git worktree will be created at a temporary location</li>
                      {formData.createNewBranch && (
                        <li>New branch '{formData.branch}' will be created from '{formData.baseBranch}'</li>
                      )}
                      <li>A new tmux session will be started for the agent</li>
                      <li>Claude Code will be initialized in the worktree</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}


        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="flex space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isFormDisabled}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            )}
            
            {currentStep !== 'project' && (
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={isFormDisabled}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </button>
            )}
          </div>
          
          <div>
            {currentStep !== 'review' ? (
              <button
                type="button"
                onClick={goToNextStep}
                disabled={!canProceedToNextStep() || isFormDisabled}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Agent...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Agent
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
      
      {/* Directory Browser Modal */}
      {showDirectoryBrowser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowDirectoryBrowser(false)}></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              <div className="mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Select Project Directory</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a directory containing a Git repository for your agent.
                </p>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <DirectoryBrowser
                  onSelectProject={handleProjectSelect}
                  showOnlyGitRepos={true}
                  selectedPath={formData.projectPath}
                  className="border-0"
                />
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDirectoryBrowser(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export the form data interface for use by parent components
export type { AgentFormData, FormErrors, WizardStep };