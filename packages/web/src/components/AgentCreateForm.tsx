import React, { useState } from 'react';
import { Plus, GitBranch, User, Loader2 } from 'lucide-react';
import { CreateAgentOptions } from '@magents/shared';

interface AgentCreateFormProps {
  onSubmit: (formData: AgentFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

interface AgentFormData {
  agentId: string;
  branch: string;
  autoAccept?: boolean;
  useDocker?: boolean;
  projectId?: string;
}

interface FormErrors {
  agentId?: string;
  branch?: string;
  general?: string;
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

export const AgentCreateForm: React.FC<AgentCreateFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  className = '',
}) => {
  const [formData, setFormData] = useState<AgentFormData>({
    agentId: '',
    branch: '',
    autoAccept: false,
    useDocker: false,
    projectId: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common branch suggestions
  const branchSuggestions = [
    'main',
    'master', 
    'develop',
    'feature/new-feature',
    'bugfix/issue-fix',
    'hotfix/urgent-fix',
  ];

  const handleInputChange = (field: keyof AgentFormData, value: string | boolean) => {
    const newFormData = {
      ...formData,
      [field]: value,
    };
    
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
      await onSubmit(formData);
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
  const canSubmit = formData.agentId.trim() && formData.branch.trim() && !hasValidationErrors && !isFormDisabled;

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

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

        {/* Agent ID Field */}
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

        {/* Branch Selection Field */}
        <div>
          <label htmlFor="branch" className="block text-sm font-medium text-gray-700">
            Git Branch
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <GitBranch className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              id="branch"
              name="branch"
              value={formData.branch}
              onChange={(e) => handleInputChange('branch', e.target.value)}
              disabled={isFormDisabled}
              list="branch-suggestions"
              className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.branch 
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300'
              } ${isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="Enter branch name or select from suggestions"
              aria-describedby={errors.branch ? 'branch-error' : undefined}
            />
            <datalist id="branch-suggestions">
              {branchSuggestions.map((branch) => (
                <option key={branch} value={branch} />
              ))}
            </datalist>
          </div>
          {errors.branch && (
            <p className="mt-2 text-sm text-red-600" id="branch-error">
              {errors.branch}
            </p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            The Git branch to create a worktree for. A new worktree will be created if it doesn't exist.
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

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
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
        </div>
      </form>
    </div>
  );
};

// Export the form data interface for use by parent components
export type { AgentFormData, FormErrors };