import React from 'react';
import { AgentCreationProgress as ProgressType, AgentCreationStep } from '@magents/shared';
import { CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react';

interface AgentCreationProgressProps {
  progress: ProgressType;
  agentId: string;
}

const StepIcon: React.FC<{ step: AgentCreationStep }> = ({ step }) => {
  switch (step.status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'in-progress':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Circle className="w-5 h-5 text-gray-300" />;
  }
};

export const AgentCreationProgress: React.FC<AgentCreationProgressProps> = ({
  progress,
  agentId
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Creating Agent: {agentId}
          </h3>
          <span className="text-sm text-gray-500">
            {progress.percentage}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-2">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
        
        {/* Current Step Message */}
        <p className="mt-2 text-sm text-gray-600">
          {progress.message}
        </p>
        
        {/* Error Message */}
        {progress.error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{progress.error}</p>
          </div>
        )}
      </div>

      {/* Step List */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Progress Steps</h4>
        
        {/* Create an array of steps to display current step properly */}
        {Array.from({ length: progress.totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCurrentStep = stepNumber === progress.step;
          const step = isCurrentStep ? progress.currentStep : {
            id: `step-${stepNumber}`,
            name: `Step ${stepNumber}`,
            description: `Step ${stepNumber}`,
            status: stepNumber < progress.step ? 'completed' as const : 'pending' as const
          };
          
          return (
            <div
              key={step.id}
              className={`flex items-center space-x-3 p-3 rounded-md transition-colors ${
                isCurrentStep 
                  ? 'bg-blue-50 border border-blue-200' 
                  : step.status === 'completed'
                    ? 'bg-green-50'
                    : 'bg-gray-50'
              }`}
            >
              <StepIcon step={step} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  step.status === 'error' 
                    ? 'text-red-700' 
                    : step.status === 'completed'
                      ? 'text-green-700'
                      : step.status === 'in-progress'
                        ? 'text-blue-700'
                        : 'text-gray-700'
                }`}>
                  {step.name}
                </p>
                <p className="text-xs text-gray-500">
                  {step.description}
                </p>
                {step.error && (
                  <p className="text-xs text-red-600 mt-1">
                    {step.error}
                  </p>
                )}
              </div>
              {step.startTime && step.endTime && (
                <div className="text-xs text-gray-400">
                  {Math.round((step.endTime.getTime() - step.startTime.getTime()) / 1000)}s
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};