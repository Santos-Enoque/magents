import React from 'react';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { FeatureFlags } from '@magents/shared/src/config/features';
import { Settings, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export const FeatureSettings: React.FC = () => {
  const { features, loading, error, updateFeatures, refetch } = useFeatureFlags();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 text-foreground-tertiary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-status-error/10 border border-status-error/30 rounded-lg">
        <p className="text-status-error">{error}</p>
        <button
          onClick={refetch}
          className="mt-2 text-sm text-brand hover:text-brand-hover"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!features) {
    return null;
  }

  const handleToggle = async (feature: keyof FeatureFlags) => {
    await updateFeatures({
      [feature]: !features[feature]
    });
  };

  const featureDescriptions: Record<keyof FeatureFlags, { name: string; description: string }> = {
    taskMasterIntegration: {
      name: 'TaskMaster Integration',
      description: 'Enable integration with TaskMaster CLI for external task management'
    },
    internalTaskSystem: {
      name: 'Internal Task System',
      description: 'Use the built-in task management system'
    },
    multipleTaskIntegrations: {
      name: 'Multiple Task Integrations',
      description: 'Allow multiple task management systems to work simultaneously'
    },
    taskAnalytics: {
      name: 'Task Analytics',
      description: 'Enable advanced analytics and reporting for tasks'
    },
    aiTaskSuggestions: {
      name: 'AI Task Suggestions',
      description: 'Get AI-powered suggestions for task planning and optimization'
    },
    realtimeTaskCollaboration: {
      name: 'Real-time Collaboration',
      description: 'Enable real-time collaboration features for task management'
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Settings className="w-5 h-5 text-foreground-tertiary" />
        <h3 className="text-lg font-semibold text-foreground">Feature Settings</h3>
      </div>

      <div className="space-y-3">
        {(Object.keys(features) as Array<keyof FeatureFlags>).map((feature) => {
          const isEnabled = features[feature];
          const info = featureDescriptions[feature];

          return (
            <div
              key={feature}
              className="p-4 bg-background-card border border-border rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-1">{info.name}</h4>
                  <p className="text-sm text-foreground-secondary">{info.description}</p>
                </div>
                <button
                  onClick={() => handleToggle(feature)}
                  className={`ml-4 p-2 rounded-md transition-colors ${
                    isEnabled
                      ? 'bg-status-success/20 text-status-success hover:bg-status-success/30'
                      : 'bg-foreground-tertiary/20 text-foreground-tertiary hover:bg-foreground-tertiary/30'
                  }`}
                  title={isEnabled ? 'Disable feature' : 'Enable feature'}
                >
                  {isEnabled ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {/* Show dependencies or conflicts */}
              {feature === 'multipleTaskIntegrations' && (
                <div className="mt-2 text-xs text-foreground-tertiary">
                  Requires at least two task integrations to be enabled
                </div>
              )}
              
              {feature === 'taskAnalytics' && (features.taskMasterIntegration || features.internalTaskSystem) && (
                <div className="mt-2 text-xs text-status-success">
                  Compatible with current task integrations
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-background-tertiary rounded-lg">
        <p className="text-sm text-foreground-secondary">
          <strong>Note:</strong> These are runtime overrides. To persist changes across restarts, 
          set the corresponding environment variables or update your configuration file.
        </p>
      </div>
    </div>
  );
};