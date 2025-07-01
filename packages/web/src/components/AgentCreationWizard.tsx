import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, Folder, GitBranch, Settings, Eye, Wand2 } from 'lucide-react';
import { CreateAgentOptions, Project, TaskMasterTask } from '@magents/shared';

// Import step components
import { ProjectSelectionStep } from './wizard-steps/ProjectSelectionStep';
import { BranchManagementStep } from './wizard-steps/BranchManagementStep';
import { TaskMasterIntegrationStep } from './wizard-steps/TaskMasterIntegrationStep';
import { AdvancedConfigurationStep } from './wizard-steps/AdvancedConfigurationStep';
import { PreviewCreateStep } from './wizard-steps/PreviewCreateStep';

// Step definitions
export interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isValid: boolean;
  isOptional?: boolean;
}

// Form data interface
export interface WizardFormData {
  // Step 1: Project Selection
  projectId?: string;
  projectPath?: string;
  
  // Step 2: Branch Management
  branch: string;
  agentId?: string;
  
  // Step 3: TaskMaster Integration
  taskMasterEnabled: boolean;
  selectedTasks: string[];
  
  // Step 4: Advanced Configuration
  autoAccept: boolean;
  useDocker: boolean;
  dockerImage?: string;
  portRange?: string;
  environment?: Record<string, string>;
  
  // Step 5: Preview & Create (no form data, just display)
}

interface AgentCreationWizardProps {
  onSubmit: (options: CreateAgentOptions) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  projects?: Project[];
  tasks?: TaskMasterTask[];
}

// Wizard templates for common use cases
const WIZARD_TEMPLATES = {
  quickStart: {
    name: "Quick Start",
    description: "Fast setup with minimal configuration",
    data: {
      branch: "feature/quick-agent",
      autoAccept: true,
      useDocker: false,
      taskMasterEnabled: false,
      selectedTasks: []
    }
  },
  development: {
    name: "Development Agent",
    description: "Full development environment with TaskMaster",
    data: {
      branch: "feature/dev-agent",
      autoAccept: false,
      useDocker: true,
      taskMasterEnabled: true,
      selectedTasks: []
    }
  },
  production: {
    name: "Production Agent",
    description: "Secure agent for production tasks",
    data: {
      branch: "release/prod-agent",
      autoAccept: false,
      useDocker: true,
      taskMasterEnabled: true,
      selectedTasks: []
    }
  }
};

export const AgentCreationWizard: React.FC<AgentCreationWizardProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  projects = [],
  tasks = []
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>({
    branch: '',
    autoAccept: true,
    useDocker: false,
    taskMasterEnabled: false,
    selectedTasks: []
  });

  // Define wizard steps with dynamic validation
  const steps: WizardStep[] = [
    {
      id: 'project',
      title: 'Project Selection',
      description: 'Choose or specify the project for your agent',
      icon: Folder,
      isValid: !!(formData.projectId || (formData.projectPath && formData.projectPath.trim()))
    },
    {
      id: 'branch',
      title: 'Branch Management',
      description: 'Configure branch and agent identification',
      icon: GitBranch,
      isValid: !!formData.branch.trim() && formData.branch.length >= 3 && 
               /^[a-zA-Z0-9/_-]+$/.test(formData.branch) &&
               !formData.branch.startsWith('/') && !formData.branch.endsWith('/') &&
               !formData.branch.includes('//')
    },
    {
      id: 'taskmaster',
      title: 'TaskMaster Integration',
      description: 'Optional task assignment and tracking',
      icon: Wand2,
      isValid: true,
      isOptional: true
    },
    {
      id: 'advanced',
      title: 'Advanced Configuration',
      description: 'Docker, ports, and environment settings',
      icon: Settings,
      isValid: true,
      isOptional: true
    },
    {
      id: 'preview',
      title: 'Preview & Create',
      description: 'Review settings and create your agent',
      icon: Eye,
      isValid: true
    }
  ];

  // Check if current step is valid
  const isCurrentStepValid = steps[currentStep]?.isValid || false;
  const canProceed = isCurrentStepValid || steps[currentStep]?.isOptional;

  // Navigation handlers
  const goToNextStep = () => {
    if (currentStep < steps.length - 1 && canProceed) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  };

  // Apply template
  const applyTemplate = (templateKey: keyof typeof WIZARD_TEMPLATES) => {
    const template = WIZARD_TEMPLATES[templateKey];
    setFormData(prev => ({
      ...prev,
      ...template.data
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (currentStep === steps.length - 1) {
      const options: CreateAgentOptions = {
        branch: formData.branch,
        agentId: formData.agentId?.trim() || undefined,
        projectId: formData.projectId?.trim() || undefined,
        projectPath: formData.projectPath?.trim() || undefined,
        autoAccept: formData.autoAccept,
        useDocker: formData.useDocker,
        environment: formData.environment && Object.keys(formData.environment).length > 0 
          ? formData.environment 
          : undefined
      };

      await onSubmit(options);
    } else {
      goToNextStep();
    }
  };

  // Update form data helper
  const updateFormData = (updates: Partial<WizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Persist form data to localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('agentWizardFormData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('Failed to parse saved wizard data:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('agentWizardFormData', JSON.stringify(formData));
  }, [formData]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isValid = step.isValid;
            
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <button
                  onClick={() => goToStep(index)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-green-600 text-white'
                      : isValid
                      ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      : 'bg-red-100 text-red-600'
                  }`}
                  disabled={isLoading}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <StepIcon className="w-6 h-6" />
                  )}
                </button>
                <div className="mt-2 text-center">
                  <p className={`text-sm font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400 max-w-24">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-px bg-gray-300 w-full mt-4 ${
                    isCompleted ? 'bg-green-300' : ''
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Wizard Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6 min-h-96">
        {/* Templates (show on first step) */}
        {currentStep === 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {Object.entries(WIZARD_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => applyTemplate(key as keyof typeof WIZARD_TEMPLATES)}
                  className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                  disabled={isLoading}
                >
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                </button>
              ))}
            </div>
            <hr className="mb-6" />
          </div>
        )}

        {/* Step Content will be rendered here */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {steps[currentStep]?.title}
          </h2>
          <p className="text-gray-600 mb-6">
            {steps[currentStep]?.description}
          </p>
          
          {/* Step-specific content */}
          {currentStep === 0 && (
            <ProjectSelectionStep
              formData={formData}
              updateFormData={updateFormData}
              projects={projects}
            />
          )}
          
          {currentStep === 1 && (
            <BranchManagementStep
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          
          {currentStep === 2 && (
            <TaskMasterIntegrationStep
              formData={formData}
              updateFormData={updateFormData}
              tasks={tasks}
            />
          )}
          
          {currentStep === 3 && (
            <AdvancedConfigurationStep
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          
          {currentStep === 4 && (
            <PreviewCreateStep
              formData={formData}
              projects={projects}
              tasks={tasks}
            />
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={currentStep === 0 ? onCancel : goToPreviousStep}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 0 ? 'Cancel' : 'Previous'}
        </button>

        <div className="text-center">
          <span className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canProceed || isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentStep === steps.length - 1 ? (
            isLoading ? 'Creating...' : 'Create Agent'
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};