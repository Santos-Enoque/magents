import React, { useState, useEffect } from 'react';
import { GitBranch, Tag, RefreshCw, AlertCircle } from 'lucide-react';
import { WizardFormData } from '../AgentCreationWizard';

interface BranchManagementStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

// Common branch naming patterns
const BRANCH_TEMPLATES = [
  { prefix: 'feature/', description: 'New feature development' },
  { prefix: 'bugfix/', description: 'Bug fixes' },
  { prefix: 'hotfix/', description: 'Critical fixes' },
  { prefix: 'release/', description: 'Release preparation' },
  { prefix: 'experiment/', description: 'Experimental work' },
  { prefix: 'refactor/', description: 'Code refactoring' }
];

export const BranchManagementStep: React.FC<BranchManagementStepProps> = ({
  formData,
  updateFormData
}) => {
  const [customBranch, setCustomBranch] = useState('');
  const [agentIdInput, setAgentIdInput] = useState('');
  const [branchError, setBranchError] = useState('');
  const [agentIdError, setAgentIdError] = useState('');

  // Initialize from form data
  useEffect(() => {
    setCustomBranch(formData.branch || '');
    setAgentIdInput(formData.agentId || '');
  }, [formData.branch, formData.agentId]);

  // Validate branch name
  const validateBranchName = (branch: string): string => {
    if (!branch.trim()) {
      return 'Branch name is required';
    }
    if (branch.length < 3) {
      return 'Branch name must be at least 3 characters';
    }
    if (!/^[a-zA-Z0-9/_-]+$/.test(branch)) {
      return 'Branch name can only contain letters, numbers, forward slashes, hyphens, and underscores';
    }
    if (branch.startsWith('/') || branch.endsWith('/')) {
      return 'Branch name cannot start or end with a forward slash';
    }
    if (branch.includes('//')) {
      return 'Branch name cannot contain consecutive forward slashes';
    }
    return '';
  };

  // Validate agent ID
  const validateAgentId = (agentId: string): string => {
    if (!agentId.trim()) {
      return ''; // Agent ID is optional
    }
    if (agentId.length < 3) {
      return 'Agent ID must be at least 3 characters';
    }
    if (agentId.length > 50) {
      return 'Agent ID must be less than 50 characters';
    }
    if (!/^[a-z0-9-]+$/.test(agentId)) {
      return 'Agent ID can only contain lowercase letters, numbers, and hyphens';
    }
    if (agentId.startsWith('-') || agentId.endsWith('-')) {
      return 'Agent ID cannot start or end with a hyphen';
    }
    if (agentId.includes('--')) {
      return 'Agent ID cannot contain consecutive hyphens';
    }
    return '';
  };

  // Handle branch selection from template
  const handleBranchTemplate = (prefix: string) => {
    const newBranch = prefix;
    setCustomBranch(newBranch);
    const error = validateBranchName(newBranch);
    setBranchError(error);
    updateFormData({ branch: error ? '' : newBranch });
  };

  // Handle custom branch input
  const handleBranchChange = (value: string) => {
    setCustomBranch(value);
    const error = validateBranchName(value);
    setBranchError(error);
    updateFormData({ branch: error ? '' : value });
  };

  // Handle agent ID input
  const handleAgentIdChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setAgentIdInput(sanitized);
    const error = validateAgentId(sanitized);
    setAgentIdError(error);
    updateFormData({ agentId: error ? undefined : sanitized || undefined });
  };

  // Auto-generate agent ID from branch name
  const generateAgentIdFromBranch = () => {
    if (customBranch) {
      const generated = customBranch
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 40);
      
      if (generated) {
        setAgentIdInput(generated);
        const error = validateAgentId(generated);
        setAgentIdError(error);
        updateFormData({ agentId: error ? undefined : generated });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Branch Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Branch Name <span className="text-red-500">*</span>
        </label>
        
        {/* Branch Templates */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {BRANCH_TEMPLATES.map((template) => (
            <button
              key={template.prefix}
              onClick={() => handleBranchTemplate(template.prefix)}
              className="p-3 text-left border border-gray-200 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors"
              title={template.description}
            >
              <div className="flex items-center space-x-2">
                <GitBranch className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{template.prefix}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{template.description}</p>
            </button>
          ))}
        </div>

        {/* Custom Branch Input */}
        <div className="relative">
          <GitBranch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="feature/my-new-feature"
            value={customBranch}
            onChange={(e) => handleBranchChange(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              branchError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {branchError && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              {branchError}
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500 mt-2">
          This will be the Git branch where your agent will work. If the branch doesn't exist, it will be created.
        </p>
      </div>

      {/* Agent ID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Agent ID <span className="text-gray-400">(optional)</span>
          </label>
          <button
            onClick={generateAgentIdFromBranch}
            disabled={!customBranch}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Generate from branch
          </button>
        </div>

        <div className="relative">
          <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="my-agent-id"
            value={agentIdInput}
            onChange={(e) => handleAgentIdChange(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              agentIdError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {agentIdError && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              {agentIdError}
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500 mt-2">
          A unique identifier for your agent. If not provided, one will be generated automatically.
          Must be lowercase with only letters, numbers, and hyphens.
        </p>
      </div>

      {/* Configuration Preview */}
      {formData.branch && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Configuration Preview</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Branch:</span>
              <span className="font-medium text-gray-900">{formData.branch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Agent ID:</span>
              <span className="font-medium text-gray-900">
                {formData.agentId || '(auto-generated)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tmux Session:</span>
              <span className="font-medium text-gray-900">
                magent-{formData.agentId || 'auto-id'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Worktree Path:</span>
              <span className="font-medium text-gray-900">
                ./magent-{formData.branch.replace(/[^a-zA-Z0-9]/g, '-')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Best Practices */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Branch Naming Best Practices</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use descriptive names that reflect the work being done</li>
          <li>• Follow a consistent naming convention (e.g., feature/task-description)</li>
          <li>• Keep names concise but meaningful</li>
          <li>• Avoid special characters except forward slashes, hyphens, and underscores</li>
          <li>• Use lowercase for better compatibility across systems</li>
        </ul>
      </div>
    </div>
  );
};