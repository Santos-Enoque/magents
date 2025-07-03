import React, { useState, useEffect } from 'react';
import { HelpCircle, X, ArrowRight, ArrowUp, Lightbulb, BookOpen, Users, Zap } from 'lucide-react';
import { ComplexityMode } from './AgentCreationWizard';

interface ContextualHelpSystemProps {
  currentMode: ComplexityMode;
  currentStep: string;
  formData: any;
  onUpgradeMode: (mode: ComplexityMode) => void;
  onCloseHelp?: () => void;
}

interface HelpContent {
  id: string;
  title: string;
  description: string;
  content: string[];
  upgradePrompt?: {
    targetMode: ComplexityMode;
    reason: string;
    benefits: string[];
  };
  tips: string[];
}

const getHelpContent = (mode: ComplexityMode, step: string, formData: any): HelpContent => {
  const baseContent: Record<string, Record<ComplexityMode, HelpContent>> = {
    mode: {
      simple: {
        id: 'mode-simple',
        title: 'Simple Mode - Quick Start',
        description: 'Get started quickly with minimal configuration',
        content: [
          'Simple Mode is perfect for getting started quickly without complex setup.',
          'Your agent will be created with smart defaults that work for most common scenarios.',
          'All you need to specify is which project to work on.'
        ],
        upgradePrompt: {
          targetMode: 'standard',
          reason: 'Need more control over your agent configuration?',
          benefits: ['Custom branch naming', 'TaskMaster integration for organized workflows', 'Agent identification options']
        },
        tips: [
          'Perfect for quick prototyping and testing',
          'All essential features are included',
          'You can always upgrade to more advanced modes later'
        ]
      },
      standard: {
        id: 'mode-standard',
        title: 'Standard Mode - Balanced Control',
        description: 'Common configurations with practical customization options',
        content: [
          'Standard Mode provides the most commonly needed configuration options.',
          'You can customize branch names, integrate with TaskMaster, and set up basic agent identification.',
          'This mode strikes a balance between simplicity and functionality.'
        ],
        upgradePrompt: {
          targetMode: 'advanced',
          reason: 'Working on complex projects that need Docker or MCP integration?',
          benefits: ['Docker containerization', 'MCP server integration', 'Claude parameter tuning', 'Resource management']
        },
        tips: [
          'Ideal for most development workflows',
          'TaskMaster integration helps organize complex projects',
          'Custom branch names improve Git workflow organization'
        ]
      },
      advanced: {
        id: 'mode-advanced',
        title: 'Advanced Mode - Complete Control',
        description: 'Full access to all power-user features and customization',
        content: [
          'Advanced Mode gives you complete control over every aspect of your agent configuration.',
          'Configure Docker containers, MCP servers, Claude parameters, and resource limits.',
          'Use configuration templates and export/import settings for team consistency.'
        ],
        tips: [
          'Use configuration templates for common setups',
          'Export configurations to share with your team',
          'Docker containers provide better isolation and security',
          'MCP servers extend agent capabilities significantly'
        ]
      }
    },
    project: {
      simple: {
        id: 'project-simple',
        title: 'Project Selection - Simple',
        description: 'Choose the project your agent will work on',
        content: [
          'Select the project directory where your agent will operate.',
          'The agent will automatically detect the project type and configure appropriate settings.',
          'Browse your local directories or enter a path directly.'
        ],
        upgradePrompt: {
          targetMode: 'standard',
          reason: 'Want to organize work with multiple agents or custom branches?',
          benefits: ['Branch management', 'TaskMaster integration', 'Better project organization']
        },
        tips: [
          'Choose a Git repository for best results',
          'The agent will work within this directory',
          'Project type detection helps optimize agent behavior'
        ]
      },
      standard: {
        id: 'project-standard',
        title: 'Project Selection - Standard',
        description: 'Choose your project and plan agent organization',
        content: [
          'Select your project and consider how this agent fits into your workflow.',
          'Think about branch naming conventions and whether you need TaskMaster integration.',
          'Multiple agents can work on the same project with different branches.'
        ],
        upgradePrompt: {
          targetMode: 'advanced',
          reason: 'Need Docker isolation or MCP integrations for this project?',
          benefits: ['Container isolation', 'Advanced integrations', 'Resource control']
        },
        tips: [
          'Use descriptive project organization',
          'Consider your team\'s workflow patterns',
          'TaskMaster can help manage complex feature development'
        ]
      },
      advanced: {
        id: 'project-advanced',
        title: 'Project Selection - Advanced',
        description: 'Strategic project setup with full configuration options',
        content: [
          'Consider the full architecture for this agent including containerization and integrations.',
          'Plan for Docker networking, MCP server requirements, and resource allocation.',
          'Use configuration templates to maintain consistency across similar projects.'
        ],
        tips: [
          'Plan container networking if using multiple agents',
          'Consider MCP server requirements early',
          'Use templates for consistent team setups',
          'Export successful configurations for reuse'
        ]
      }
    },
    branch: {
      simple: {
        id: 'branch-simple',
        title: 'Quick Branch Setup',
        description: 'Create a branch for your agent to work on',
        content: [
          'Choose a simple branch name for your work.',
          'The agent will work in isolation on this branch.',
          'You can merge changes back when ready.'
        ],
        tips: [
          'Use descriptive branch names',
          'Keep it simple and clear'
        ]
      },
      standard: {
        id: 'branch-standard',
        title: 'Branch Management',
        description: 'Configure Git branches and agent identification',
        content: [
          'Create a new branch for this agent to work on.',
          'Use descriptive branch names that reflect the work being done.',
          'The agent ID helps identify this specific agent instance.'
        ],
        upgradePrompt: {
          targetMode: 'advanced',
          reason: 'Working with complex branching strategies or team workflows?',
          benefits: ['Advanced Git integration', 'Container isolation', 'Enhanced automation']
        },
        tips: [
          'Use conventional branch naming (feature/, bugfix/, etc.)',
          'Agent IDs should be unique and descriptive',
          'Consider your Git workflow when naming branches'
        ]
      },
      advanced: {
        id: 'branch-advanced',
        title: 'Branch Management - Advanced',
        description: 'Strategic branch setup with automation in mind',
        content: [
          'Plan branch strategy considering container isolation and automation.',
          'Agent IDs become important for container naming and resource allocation.',
          'Consider how this fits into CI/CD and deployment strategies.'
        ],
        tips: [
          'Branch names affect Docker container naming',
          'Consider automated deployment implications',
          'Plan for multi-agent coordination',
          'Use consistent naming conventions'
        ]
      }
    },
    taskmaster: {
      simple: {
        id: 'taskmaster-simple',
        title: 'Task Selection',
        description: 'Choose tasks for your agent',
        content: [
          'Select one or more tasks for the agent to work on.',
          'Tasks help organize and track work progress.'
        ],
        tips: [
          'Start with a single task',
          'You can assign more tasks later'
        ]
      },
      standard: {
        id: 'taskmaster-standard',
        title: 'TaskMaster Integration',
        description: 'Organize work with intelligent task management',
        content: [
          'TaskMaster helps break down complex features into manageable tasks.',
          'Select specific tasks for this agent to focus on.',
          'Task assignment helps maintain project organization and progress tracking.'
        ],
        upgradePrompt: {
          targetMode: 'advanced',
          reason: 'Need sophisticated automation and integration capabilities?',
          benefits: ['Docker-based task isolation', 'MCP integrations', 'Advanced automation']
        },
        tips: [
          'Start with high-priority tasks',
          'TaskMaster integration works well with branch naming',
          'Consider task dependencies when selecting',
          'Regular task updates help track progress'
        ]
      },
      advanced: {
        id: 'taskmaster-advanced',
        title: 'TaskMaster Integration - Advanced',
        description: 'Enterprise-grade task management with full automation',
        content: [
          'Combine TaskMaster with Docker containers for isolated task execution.',
          'Use MCP servers to extend TaskMaster capabilities.',
          'Plan for automated task assignment and completion tracking.'
        ],
        tips: [
          'Container isolation improves task reliability',
          'MCP servers can automate task reporting',
          'Consider resource allocation per task type',
          'Use templates for consistent task environments'
        ]
      }
    },
    advanced: {
      simple: {
        id: 'advanced-simple',
        title: 'Basic Settings',
        description: 'Essential configuration options',
        content: [
          'These settings are configured automatically.',
          'Focus on your branch name and task selection.'
        ],
        tips: [
          'Default settings work well for most cases'
        ]
      },
      standard: {
        id: 'advanced-standard',
        title: 'Standard Configuration',
        description: 'Common configuration options',
        content: [
          'Adjust Docker settings if needed.',
          'Configure basic automation options.',
          'Set up environment variables.'
        ],
        tips: [
          'Use templates when available',
          'Test configurations before committing'
        ]
      },
      advanced: {
        id: 'advanced-config',
        title: 'Advanced Configuration',
        description: 'Power-user features for sophisticated setups',
        content: [
          'Configure Docker containers for isolation and consistency.',
          'Set up MCP servers to extend agent capabilities.',
          'Fine-tune Claude parameters for optimal performance.',
          'Manage resources and networking for complex scenarios.'
        ],
        tips: [
          'Start with configuration templates',
          'Export working configurations for reuse',
          'Test resource limits with simple tasks first',
          'Document custom MCP server setups for your team'
        ]
      }
    }
  };

  const stepContent = baseContent[step]?.[mode];
  if (stepContent) return stepContent;

  // Fallback content
  return {
    id: `${step}-${mode}`,
    title: `${step.charAt(0).toUpperCase() + step.slice(1)} - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`,
    description: 'Configuration guidance for this step',
    content: ['Configure this step according to your project needs.'],
    tips: ['Take your time to configure this step properly']
  };
};

// Smart upgrade suggestions based on user patterns
const getSmartUpgradeSuggestions = (currentMode: ComplexityMode, formData: any): Array<{
  reason: string;
  targetMode: ComplexityMode;
  benefits: string[];
  trigger: string;
}> => {
  const suggestions = [];

  if (currentMode === 'simple') {
    // Suggest Standard if user seems to be doing more complex work
    if (formData.projectPath && formData.projectPath.includes('enterprise') || 
        formData.branch && formData.branch !== `feature/agent-${Date.now()}`) {
      suggestions.push({
        reason: 'Your project setup suggests you might benefit from more organizational features',
        targetMode: 'standard' as ComplexityMode,
        benefits: ['TaskMaster integration for complex projects', 'Custom branch management', 'Better agent organization'],
        trigger: 'Project complexity detected'
      });
    }
  }

  if (currentMode === 'standard') {
    // Suggest Advanced if user is working with multiple services or complex infrastructure
    if (formData.taskMasterEnabled || 
        (formData.selectedTasks && formData.selectedTasks.length > 3) ||
        formData.projectPath?.includes('microservice') ||
        formData.projectPath?.includes('docker')) {
      suggestions.push({
        reason: 'Your workflow suggests you might benefit from container isolation and advanced integrations',
        targetMode: 'advanced' as ComplexityMode,
        benefits: ['Docker container isolation', 'MCP server integrations', 'Resource management', 'Configuration templates'],
        trigger: 'Complex workflow detected'
      });
    }
  }

  return suggestions;
};

export const ContextualHelpSystem: React.FC<ContextualHelpSystemProps> = ({
  currentMode,
  currentStep,
  formData,
  onUpgradeMode,
  onCloseHelp
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasSeenHelp, setHasSeenHelp] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('content');

  const helpContent = getHelpContent(currentMode, currentStep, formData);
  const smartSuggestions = getSmartUpgradeSuggestions(currentMode, formData);

  // Auto-show help for new users or complex steps
  useEffect(() => {
    const helpKey = `help-seen-${currentStep}-${currentMode}`;
    const hasSeenThisHelp = localStorage.getItem(helpKey);
    
    if (!hasSeenThisHelp && (currentStep === 'mode' || currentStep === 'advanced')) {
      setIsVisible(true);
    }
  }, [currentStep, currentMode]);

  const markHelpAsSeen = () => {
    const helpKey = `help-seen-${currentStep}-${currentMode}`;
    localStorage.setItem(helpKey, 'true');
    setHasSeenHelp(true);
  };

  const handleClose = () => {
    markHelpAsSeen();
    setIsVisible(false);
    onCloseHelp?.();
  };

  const handleUpgrade = (targetMode: ComplexityMode) => {
    onUpgradeMode(targetMode);
    handleClose();
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-6 right-6 bg-brand text-white p-3 rounded-full shadow-lg hover:bg-brand-hover transition-colors z-40"
        title="Get contextual help"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white border border-gray-200 rounded-lg shadow-2xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center">
          <BookOpen className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="font-semibold text-blue-900">{helpContent.title}</h3>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        <p className="text-sm text-gray-600">{helpContent.description}</p>

        {/* Main Content */}
        <div>
          <button
            onClick={() => setExpandedSection(expandedSection === 'content' ? null : 'content')}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>How this works</span>
            <ArrowRight className={`w-4 h-4 transition-transform ${expandedSection === 'content' ? 'rotate-90' : ''}`} />
          </button>
          {expandedSection === 'content' && (
            <div className="mt-2 space-y-2">
              {helpContent.content.map((paragraph, index) => (
                <p key={index} className="text-sm text-gray-600 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Tips */}
        <div>
          <button
            onClick={() => setExpandedSection(expandedSection === 'tips' ? null : 'tips')}
            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span className="flex items-center">
              <Lightbulb className="w-4 h-4 mr-1" />
              Tips & Best Practices
            </span>
            <ArrowRight className={`w-4 h-4 transition-transform ${expandedSection === 'tips' ? 'rotate-90' : ''}`} />
          </button>
          {expandedSection === 'tips' && (
            <div className="mt-2 space-y-1">
              {helpContent.tips.map((tip, index) => (
                <div key={index} className="flex items-start text-sm text-gray-600">
                  <span className="text-blue-500 mr-2 flex-shrink-0">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Smart Upgrade Suggestions */}
        {smartSuggestions.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center mb-3">
              <ArrowUp className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-900">Smart Suggestions</span>
            </div>
            {smartSuggestions.map((suggestion, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
                <p className="text-sm text-green-800 mb-2">{suggestion.reason}</p>
                <div className="space-y-1 mb-3">
                  {suggestion.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center text-xs text-green-700">
                      <Zap className="w-3 h-3 mr-1" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleUpgrade(suggestion.targetMode)}
                  className="w-full bg-green-600 text-white text-sm py-2 rounded hover:bg-green-700 transition-colors"
                >
                  Upgrade to {suggestion.targetMode.charAt(0).toUpperCase() + suggestion.targetMode.slice(1)} Mode
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Manual Upgrade Prompt */}
        {helpContent.upgradePrompt && !smartSuggestions.length && (
          <div className="border-t border-gray-200 pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex items-start">
                <ArrowUp className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">{helpContent.upgradePrompt.reason}</p>
                  <div className="space-y-1 mb-3">
                    {helpContent.upgradePrompt.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center text-xs text-blue-700">
                        <span className="w-1 h-1 bg-blue-600 rounded-full mr-2" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleUpgrade(helpContent.upgradePrompt!.targetMode)}
                    className="text-sm text-blue-700 hover:text-blue-900 font-medium"
                  >
                    Try {helpContent.upgradePrompt.targetMode.charAt(0).toUpperCase() + helpContent.upgradePrompt.targetMode.slice(1)} Mode →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
        <button
          onClick={handleClose}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Don't show this again for this step
        </button>
      </div>
    </div>
  );
};