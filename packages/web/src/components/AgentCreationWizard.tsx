import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, Folder, GitBranch, Settings, Eye, Wand2 } from 'lucide-react';
import { CreateAgentOptions, Project, TaskMasterTask } from '@magents/shared';
import { ComplexityModeIndicator } from './ComplexityModeIndicator';
import { ContextualHelpSystem } from './ContextualHelpSystem';
import { FeatureDiscoveryTour } from './FeatureDiscoveryTour';

// Import step components
import { ComplexityModeStep } from './wizard-steps/ComplexityModeStep';
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

// MCP Server interface
interface MCPServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

// Complexity mode type
export type ComplexityMode = 'simple' | 'standard' | 'advanced';

// Form data interface
export interface WizardFormData {
  // Complexity Mode Selection
  complexityMode: ComplexityMode;
  
  // Step 1: Project Selection
  projectId?: string;
  projectPath?: string;
  
  // Step 2: Branch Management
  branch: string;
  agentId?: string;
  
  // Step 3: TaskMaster Integration
  taskMasterEnabled: boolean;
  selectedTasks: string[];
  
  // Step 4: Advanced Configuration - Extended to match AdvancedConfigPanel
  // Security & Automation
  autoAccept: boolean;
  claudeModel?: string;
  
  // Docker Configuration
  useDocker: boolean;
  dockerImage?: string;
  dockerNetwork?: string;
  dockerVolumes?: string[];
  
  // Port Management
  portRange?: string;
  reservedPorts?: number[];
  
  // Environment Variables
  environment?: Record<string, string>;
  
  // MCP Configuration
  mcpEnabled: boolean;
  mcpServers?: MCPServer[];
  
  // Claude Settings
  claudeSettings: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    customInstructions?: string;
  };
  
  // Advanced Settings
  isolationMode: 'none' | 'process' | 'container';
  resourceLimits?: {
    memory?: string;
    cpu?: number;
  };
  
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
  const [previousMode, setPreviousMode] = useState<ComplexityMode | null>(null);
  const [formData, setFormData] = useState<WizardFormData>({
    // Complexity Mode
    complexityMode: 'simple',
    // Step 2: Branch Management - Auto-generate for simple mode
    branch: `feature/agent-${Date.now()}`,
    
    // Step 3: TaskMaster Integration
    taskMasterEnabled: false,
    selectedTasks: [],
    
    // Step 4: Advanced Configuration
    // Security & Automation
    autoAccept: true,
    
    // Docker Configuration
    useDocker: true,
    
    // MCP Configuration
    mcpEnabled: false,
    
    // Claude Settings
    claudeSettings: {},
    
    // Advanced Settings
    isolationMode: 'none'
  });

  // Define wizard steps based on complexity mode
  const getStepsForMode = (mode: ComplexityMode): WizardStep[] => {
    const baseSteps: WizardStep[] = [
      {
        id: 'mode',
        title: 'Complexity Mode',
        description: 'Choose your experience level',
        icon: Wand2,
        isValid: true
      },
      {
        id: 'project',
        title: 'Project Selection',
        description: 'Choose or specify the project for your agent',
        icon: Folder,
        isValid: !!(formData.projectId || (formData.projectPath && formData.projectPath.trim()))
      },
    ];

    if (mode === 'simple') {
      // Simple mode: Only essential steps
      return [
        ...baseSteps,
        {
          id: 'preview',
          title: 'Preview & Create',
          description: 'Review settings and create your agent',
          icon: Eye,
          isValid: true
        }
      ];
    } else if (mode === 'standard') {
      // Standard mode: Include branch management and optional taskmaster
      return [
        ...baseSteps,
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
          id: 'preview',
          title: 'Preview & Create',
          description: 'Review settings and create your agent',
          icon: Eye,
          isValid: true
        }
      ];
    } else {
      // Advanced mode: All steps
      return [
        ...baseSteps,
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
    }
  };

  const steps = getStepsForMode(formData.complexityMode);

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
      // Clear saved data on successful submission
      clearSavedData();
    } else {
      goToNextStep();
    }
  };

  // Update form data helper
  const updateFormData = (updates: Partial<WizardFormData>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      
      // If complexity mode changed, track for tour display and adjust current step if needed
      if (updates.complexityMode && updates.complexityMode !== prev.complexityMode) {
        setPreviousMode(prev.complexityMode);
        
        const newSteps = getStepsForMode(updates.complexityMode);
        const currentStepId = steps[currentStep]?.id;
        
        // Find the equivalent step in the new mode
        const newStepIndex = newSteps.findIndex(step => step.id === currentStepId);
        
        // If current step doesn't exist in new mode, go to the last valid step
        if (newStepIndex === -1) {
          // Delay the step change to avoid state update conflicts
          setTimeout(() => {
            const maxStep = Math.min(currentStep, newSteps.length - 1);
            setCurrentStep(maxStep);
          }, 0);
        }
      }
      
      return newData;
    });
  };

  // Persist form data to localStorage with versioning
  useEffect(() => {
    const savedData = localStorage.getItem('agentWizardFormData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Add version checking for future compatibility
        if (parsed.version || parsed.complexityMode) {
          setFormData(prev => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        console.warn('Failed to parse saved wizard data:', error);
        // Clear corrupted data
        localStorage.removeItem('agentWizardFormData');
      }
    }
  }, []);

  useEffect(() => {
    // Add version info for future compatibility
    const dataToSave = {
      ...formData,
      version: '1.0',
      lastModified: Date.now()
    };
    localStorage.setItem('agentWizardFormData', JSON.stringify(dataToSave));
  }, [formData]);

  // Clear saved data when form is successfully submitted
  const clearSavedData = () => {
    localStorage.removeItem('agentWizardFormData');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with Mode Indicator */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create New Agent</h1>
          <p className="text-foreground-secondary mt-1">Configure your agent with the right level of complexity</p>
        </div>
        {formData.complexityMode && (
          <ComplexityModeIndicator 
            currentMode={formData.complexityMode}
            onModeChange={(mode) => updateFormData({ complexityMode: mode })}
            onModeChangeRequest={(mode) => {
              // Navigate to mode selection step for proper mode change flow
              setCurrentStep(0);
              // The ComplexityModeStep will handle the confirmation
            }}
            showQuickSwitch={true}
          />
        )}
      </div>

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
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-brand text-white shadow-glow'
                      : isCompleted
                      ? 'bg-status-success text-white'
                      : isValid
                      ? 'bg-background-tertiary text-foreground-secondary hover:bg-background-secondary'
                      : 'bg-status-error/20 text-status-error'
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
                    isActive ? 'text-brand' : isCompleted ? 'text-status-success' : 'text-foreground-secondary'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-foreground-tertiary max-w-24">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-px w-full mt-4 ${
                    isCompleted ? 'bg-status-success' : 'bg-border'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Wizard Content */}
      <div className="bg-background-card rounded-lg shadow-sm border border-border p-6 min-h-[28rem]">

        {/* Step Content will be rendered here */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {steps[currentStep]?.title}
          </h2>
          <p className="text-foreground-secondary mb-6">
            {steps[currentStep]?.description}
          </p>
          
          {/* Step-specific content */}
          {steps[currentStep]?.id === 'mode' && (
            <ComplexityModeStep
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          
          {steps[currentStep]?.id === 'project' && (
            <ProjectSelectionStep
              formData={formData}
              updateFormData={updateFormData}
              projects={projects}
            />
          )}
          
          {steps[currentStep]?.id === 'branch' && (
            <BranchManagementStep
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          
          {steps[currentStep]?.id === 'taskmaster' && (
            <TaskMasterIntegrationStep
              formData={formData}
              updateFormData={updateFormData}
              tasks={tasks}
            />
          )}
          
          {steps[currentStep]?.id === 'advanced' && (
            <AdvancedConfigurationStep
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          
          {steps[currentStep]?.id === 'preview' && (
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
          className="inline-flex items-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-background-secondary hover:bg-background-tertiary disabled:opacity-50 transition-colors"
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 0 ? 'Cancel' : 'Previous'}
        </button>

        <div className="text-center">
          <span className="text-sm text-foreground-secondary">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canProceed || isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Contextual Help System */}
      <ContextualHelpSystem
        currentMode={formData.complexityMode}
        currentStep={steps[currentStep]?.id || 'mode'}
        formData={formData}
        onUpgradeMode={(mode) => {
          updateFormData({ complexityMode: mode });
          // Navigate back to mode selection step to show the change
          setCurrentStep(0);
        }}
      />

      {/* Feature Discovery Tour */}
      <FeatureDiscoveryTour
        currentMode={formData.complexityMode}
        previousMode={previousMode}
        onComplete={() => setPreviousMode(null)}
        onSkip={() => setPreviousMode(null)}
      />
    </div>
  );
};