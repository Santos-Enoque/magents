import React, { useState, useEffect } from 'react';
import { ArrowRight, X, Sparkles, Check, ArrowLeft } from 'lucide-react';
import { ComplexityMode } from './AgentCreationWizard';

interface FeatureDiscoveryTourProps {
  currentMode: ComplexityMode;
  previousMode: ComplexityMode | null;
  onComplete: () => void;
  onSkip: () => void;
}

interface TourStep {
  id: string;
  title: string;
  description: string;
  feature: string;
  benefits: string[];
  actionText: string;
  visual?: string; // Could be used for screenshots/gifs in the future
}

const getTourSteps = (fromMode: ComplexityMode | null, toMode: ComplexityMode): TourStep[] => {
  const steps: TourStep[] = [];

  if (fromMode === 'simple' && toMode === 'standard') {
    steps.push(
      {
        id: 'branch-management',
        title: 'Custom Branch Management',
        description: 'You can now create custom branch names and manage agent identification for better organization.',
        feature: 'Branch & Agent Control',
        benefits: [
          'Create meaningful branch names',
          'Better Git workflow organization',
          'Unique agent identification'
        ],
        actionText: 'Try creating a custom branch name'
      },
      {
        id: 'taskmaster-integration',
        title: 'TaskMaster Integration',
        description: 'Connect with TaskMaster to break down complex features into manageable tasks and track progress.',
        feature: 'Intelligent Task Management',
        benefits: [
          'Organized project workflow',
          'Task progress tracking',
          'Better feature planning'
        ],
        actionText: 'Explore TaskMaster integration'
      }
    );
  }

  if (fromMode === 'simple' && toMode === 'advanced') {
    steps.push(
      {
        id: 'docker-power',
        title: 'Docker Containerization',
        description: 'Run your agents in isolated Docker containers for better security, consistency, and resource management.',
        feature: 'Container Isolation',
        benefits: [
          'Isolated execution environment',
          'Consistent development experience',
          'Resource control and limits'
        ],
        actionText: 'Configure Docker settings'
      },
      {
        id: 'mcp-integration',
        title: 'MCP Server Integration',
        description: 'Connect to Model Context Protocol servers to extend your agent capabilities with external tools and services.',
        feature: 'External Integrations',
        benefits: [
          'Database connectivity',
          'API integrations',
          'Custom tool development'
        ],
        actionText: 'Set up MCP servers'
      },
      {
        id: 'claude-tuning',
        title: 'Claude Parameter Tuning',
        description: 'Fine-tune Claude\'s behavior with model selection, temperature control, and custom instructions.',
        feature: 'AI Optimization',
        benefits: [
          'Optimized responses for your use case',
          'Consistent AI behavior',
          'Performance optimization'
        ],
        actionText: 'Customize Claude settings'
      }
    );
  }

  if (fromMode === 'standard' && toMode === 'advanced') {
    steps.push(
      {
        id: 'docker-power',
        title: 'Docker Containerization',
        description: 'Upgrade your development workflow with Docker containers for isolation and consistency.',
        feature: 'Professional Development',
        benefits: [
          'Production-like environments',
          'Team consistency',
          'Advanced debugging capabilities'
        ],
        actionText: 'Enable Docker mode'
      },
      {
        id: 'advanced-automation',
        title: 'Advanced Automation',
        description: 'Combine all features for sophisticated automation workflows with resource management.',
        feature: 'Enterprise Features',
        benefits: [
          'Resource limits and monitoring',
          'Configuration templates',
          'Team collaboration tools'
        ],
        actionText: 'Explore advanced features'
      }
    );
  }

  return steps;
};

export const FeatureDiscoveryTour: React.FC<FeatureDiscoveryTourProps> = ({
  currentMode,
  previousMode,
  onComplete,
  onSkip
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const tourSteps = getTourSteps(previousMode, currentMode);

  useEffect(() => {
    // Show tour if user upgraded modes and there are new features to discover
    if (previousMode && tourSteps.length > 0) {
      const tourKey = `tour-${previousMode}-to-${currentMode}`;
      const hasSeenTour = localStorage.getItem(tourKey);
      
      if (!hasSeenTour) {
        setIsVisible(true);
      }
    }
  }, [previousMode, currentMode, tourSteps.length]);

  const handleNext = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleComplete = () => {
    const tourKey = `tour-${previousMode}-to-${currentMode}`;
    localStorage.setItem(tourKey, 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    const tourKey = `tour-${previousMode}-to-${currentMode}`;
    localStorage.setItem(tourKey, 'true');
    setIsVisible(false);
    onSkip();
  };

  if (!isVisible || tourSteps.length === 0) {
    return null;
  }

  const currentStep = tourSteps[currentStepIndex];
  const isLastStep = currentStepIndex === tourSteps.length - 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Sparkles className="w-6 h-6 mr-3" />
              <h2 className="text-xl font-bold">Welcome to {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Mode!</h2>
            </div>
            <button
              onClick={handleSkip}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex space-x-2">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full flex-1 transition-colors ${
                  index <= currentStepIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
          
          <p className="text-white/90 text-sm mt-2">
            Step {currentStepIndex + 1} of {tourSteps.length}: Discover new features
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{currentStep.title}</h3>
            <div className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              {currentStep.feature}
            </div>
          </div>

          <p className="text-gray-600 mb-6 leading-relaxed">
            {currentStep.description}
          </p>

          {/* Benefits */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Key Benefits:</h4>
            <div className="space-y-2">
              {currentStep.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center text-sm text-gray-700">
                  <Check className="w-4 h-4 text-green-600 mr-3 flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-purple-800 mb-2">
              <strong>Try it now:</strong> {currentStep.actionText}
            </p>
            <p className="text-xs text-purple-600">
              You can explore this feature in the next steps of the wizard.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-gray-50 p-4 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip tour
            </button>
            
            <button
              onClick={handleNext}
              className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all"
            >
              {isLastStep ? 'Get Started' : 'Next'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};