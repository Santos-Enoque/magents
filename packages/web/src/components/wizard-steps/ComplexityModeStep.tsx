import React, { useState } from 'react';
import { Zap, Settings2, Wrench, ArrowUp, ArrowDown, AlertTriangle, Info } from 'lucide-react';
import { ComplexityMode, WizardFormData } from '../AgentCreationWizard';
import { ModeChangeConfirmModal } from '../ModeChangeConfirmModal';

interface ComplexityModeStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

interface ModeOption {
  mode: ComplexityMode;
  title: string;
  description: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
}

const COMPLEXITY_MODES: ModeOption[] = [
  {
    mode: 'simple',
    title: 'Simple Mode',
    description: 'Quick setup with minimal configuration',
    features: [
      'Select project and create agent',
      'Automatic branch naming',
      'Default settings',
      'Perfect for getting started'
    ],
    icon: Zap,
    recommended: true
  },
  {
    mode: 'standard',
    title: 'Standard Mode',
    description: 'Common configurations with some customization',
    features: [
      'Custom branch naming',
      'Agent ID customization',
      'TaskMaster integration',
      'Ideal for regular development'
    ],
    icon: Settings2
  },
  {
    mode: 'advanced',
    title: 'Advanced Mode',
    description: 'Full control over all agent settings and power-user features',
    features: [
      'All standard features',
      'Complete Docker configuration',
      'Environment variables & secrets',
      'MCP server setup & management',
      'Resource limits & isolation',
      'Claude model & parameter tuning',
      'Port allocation & networking',
      'Configuration templates & export',
      'Complete customization control'
    ],
    icon: Wrench
  }
];

export const ComplexityModeStep: React.FC<ComplexityModeStepProps> = ({
  formData,
  updateFormData
}) => {
  const [showModeChangeModal, setShowModeChangeModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<ComplexityMode | null>(null);

  // Check if user has configured advanced features
  const hasAdvancedConfig = () => {
    return formData.useDocker || 
           formData.mcpEnabled || 
           (formData.environment && Object.keys(formData.environment).length > 0) ||
           formData.claudeModel ||
           formData.claudeSettings.temperature !== undefined ||
           formData.claudeSettings.maxTokens ||
           formData.resourceLimits?.memory ||
           formData.resourceLimits?.cpu ||
           formData.dockerNetwork ||
           (formData.dockerVolumes && formData.dockerVolumes.length > 0) ||
           (formData.reservedPorts && formData.reservedPorts.length > 0) ||
           formData.portRange;
  };

  // Check if user has configured standard features
  const hasStandardConfig = () => {
    return formData.taskMasterEnabled ||
           (formData.selectedTasks && formData.selectedTasks.length > 0) ||
           (formData.branch !== `feature/agent-${Date.now()}` && formData.branch.trim() !== '');
  };

  // Get what data would be lost when switching modes
  const getDataLoss = (fromMode: ComplexityMode, toMode: ComplexityMode): string[] => {
    const loss: string[] = [];
    
    if (fromMode === 'advanced' && (toMode === 'standard' || toMode === 'simple')) {
      if (formData.useDocker) loss.push('Docker configuration');
      if (formData.mcpEnabled) loss.push('MCP server settings');
      if (formData.environment && Object.keys(formData.environment).length > 0) loss.push('Environment variables');
      if (formData.claudeModel) loss.push('Claude model selection');
      if (formData.claudeSettings.temperature !== undefined) loss.push('Claude temperature settings');
      if (formData.claudeSettings.maxTokens) loss.push('Claude token limits');
      if (formData.resourceLimits?.memory || formData.resourceLimits?.cpu) loss.push('Resource limits');
      if (formData.dockerNetwork) loss.push('Docker network configuration');
      if (formData.dockerVolumes && formData.dockerVolumes.length > 0) loss.push('Docker volume mounts');
      if (formData.portRange || (formData.reservedPorts && formData.reservedPorts.length > 0)) loss.push('Port management settings');
    }
    
    if (fromMode === 'standard' && toMode === 'simple') {
      if (formData.taskMasterEnabled) loss.push('TaskMaster integration');
      if (formData.selectedTasks && formData.selectedTasks.length > 0) loss.push('Selected tasks');
      if (formData.branch !== `feature/agent-${Date.now()}`) loss.push('Custom branch name');
    }
    
    return loss;
  };

  // Get what new features would be available
  const getNewFeatures = (fromMode: ComplexityMode, toMode: ComplexityMode): string[] => {
    const features: string[] = [];
    
    if (fromMode === 'simple' && (toMode === 'standard' || toMode === 'advanced')) {
      features.push('Custom branch naming');
      features.push('Agent ID customization');
      features.push('TaskMaster integration');
    }
    
    if ((fromMode === 'simple' || fromMode === 'standard') && toMode === 'advanced') {
      features.push('Docker configuration');
      features.push('Environment variables');
      features.push('MCP server setup');
      features.push('Claude model tuning');
      features.push('Resource limits');
      features.push('Port management');
      features.push('Configuration templates');
    }
    
    return features;
  };

  // Apply mode defaults when switching
  const applyModeDefaults = (mode: ComplexityMode, preserveCompatibleData = true) => {
    const updates: Partial<WizardFormData> = { complexityMode: mode };
    
    if (mode === 'simple') {
      // Simple mode: minimal configuration
      if (!preserveCompatibleData || !hasStandardConfig()) {
        updates.branch = `feature/agent-${Date.now()}`;
        updates.taskMasterEnabled = false;
        updates.selectedTasks = [];
      }
      
      // Always clear advanced settings in simple mode
      updates.useDocker = false;
      updates.mcpEnabled = false;
      updates.environment = undefined;
      updates.claudeModel = undefined;
      updates.claudeSettings = {};
      updates.resourceLimits = undefined;
      updates.dockerNetwork = undefined;
      updates.dockerVolumes = undefined;
      updates.portRange = undefined;
      updates.reservedPorts = undefined;
      updates.autoAccept = true;
      updates.isolationMode = 'none';
    } else if (mode === 'standard') {
      // Standard mode: common configurations
      updates.autoAccept = true;
      updates.useDocker = false;
      updates.mcpEnabled = false;
      updates.isolationMode = 'none';
      
      // Clear advanced-only settings
      if (!preserveCompatibleData) {
        updates.environment = undefined;
        updates.claudeModel = undefined;
        updates.claudeSettings = {};
        updates.resourceLimits = undefined;
        updates.dockerNetwork = undefined;
        updates.dockerVolumes = undefined;
        updates.portRange = undefined;
        updates.reservedPorts = undefined;
      }
    } else if (mode === 'advanced') {
      // Advanced mode: keep all existing settings, no defaults to override user choices
      if (!preserveCompatibleData) {
        updates.autoAccept = false;
        updates.useDocker = true;
        updates.mcpEnabled = false;
        updates.isolationMode = 'container';
      }
    }
    
    updateFormData(updates);
  };

  const handleModeSelection = (mode: ComplexityMode) => {
    // Check if this is just an initial selection or a mode change
    const isInitialSelection = !formData.complexityMode || formData.complexityMode === mode;
    const currentMode = formData.complexityMode;
    
    if (isInitialSelection) {
      // Initial selection - apply defaults without confirmation
      applyModeDefaults(mode, false);
      return;
    }
    
    // Check if switching would cause data loss
    const dataLoss = getDataLoss(currentMode, mode);
    const newFeatures = getNewFeatures(currentMode, mode);
    
    if (dataLoss.length > 0 || (currentMode !== mode)) {
      // Show confirmation modal for mode changes
      setPendingMode(mode);
      setShowModeChangeModal(true);
    } else {
      // No data loss, switch immediately
      applyModeDefaults(mode, true);
    }
  };

  const handleModeChangeConfirm = () => {
    if (pendingMode) {
      applyModeDefaults(pendingMode, true);
      setShowModeChangeModal(false);
      setPendingMode(null);
    }
  };

  const handleModeChangeCancel = () => {
    setShowModeChangeModal(false);
    setPendingMode(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COMPLEXITY_MODES.map((option) => {
          const Icon = option.icon;
          const isSelected = formData.complexityMode === option.mode;
          
          return (
            <button
              key={option.mode}
              onClick={() => handleModeSelection(option.mode)}
              className={`
                relative p-6 rounded-lg border-2 transition-all text-left
                ${isSelected 
                  ? 'border-brand bg-brand/10 shadow-lg' 
                  : 'border-border hover:border-brand/50 hover:bg-background-secondary'
                }
              `}
            >
              {option.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-brand text-white text-xs px-2 py-1 rounded-full">
                    Recommended
                  </span>
                </div>
              )}
              
              <div className="flex items-center mb-3">
                <Icon className={`w-8 h-8 ${isSelected ? 'text-brand' : 'text-foreground-secondary'}`} />
                <h3 className={`ml-3 text-lg font-semibold ${isSelected ? 'text-brand' : 'text-foreground'}`}>
                  {option.title}
                </h3>
              </div>
              
              <p className="text-sm text-foreground-secondary mb-4">
                {option.description}
              </p>
              
              <ul className="space-y-2">
                {option.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <span className={`mr-2 ${isSelected ? 'text-brand' : 'text-status-success'}`}>✓</span>
                    <span className="text-foreground-secondary">{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Mode comparison table */}
      <div className="mt-8 border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-background-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-foreground">Feature</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-foreground">Simple</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-foreground">Standard</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-foreground">Advanced</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="px-4 py-3 text-sm text-foreground-secondary">Project Selection</td>
              <td className="text-center px-4 py-3">✓</td>
              <td className="text-center px-4 py-3">✓</td>
              <td className="text-center px-4 py-3">✓</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-foreground-secondary">Custom Branch Names</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">✓</td>
              <td className="text-center px-4 py-3">✓</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-foreground-secondary">TaskMaster Integration</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">✓</td>
              <td className="text-center px-4 py-3">✓</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-foreground-secondary">Docker Configuration</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">✓</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-foreground-secondary">Environment Variables</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">✓</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-foreground-secondary">MCP Servers</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">✓</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-foreground-secondary">Claude Model Selection</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">✓</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-foreground-secondary">Resource Limits</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">✓</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-foreground-secondary">Port Management</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">✓</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-foreground-secondary">Configuration Templates</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">—</td>
              <td className="text-center px-4 py-3">✓</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Advanced Mode Feature Preview */}
      {formData.complexityMode === 'advanced' && (
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
            <Wrench className="w-5 h-5 mr-2" />
            Advanced Mode Features Preview
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <h5 className="font-medium text-purple-900">Docker Configuration</h5>
                  <p className="text-sm text-purple-700">Choose from multiple Docker images, configure networks, volumes, and container settings</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <h5 className="font-medium text-purple-900">Claude Model Tuning</h5>
                  <p className="text-sm text-purple-700">Select specific Claude models and fine-tune parameters like temperature and token limits</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <h5 className="font-medium text-purple-900">MCP Server Management</h5>
                  <p className="text-sm text-purple-700">Connect to Model Context Protocol servers for extended functionality and integrations</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <h5 className="font-medium text-purple-900">Resource Management</h5>
                  <p className="text-sm text-purple-700">Set memory and CPU limits, configure port ranges, and manage system resources</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <h5 className="font-medium text-purple-900">Configuration Templates</h5>
                  <p className="text-sm text-purple-700">Use pre-built templates for different scenarios or create custom configurations</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <h5 className="font-medium text-purple-900">Import/Export Settings</h5>
                  <p className="text-sm text-purple-700">Save and share agent configurations across projects and teams</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current selection info */}
      <div className="mt-6 bg-background-tertiary border border-border rounded-lg p-4">
        <p className="text-sm text-foreground-secondary">
          <span className="font-medium text-foreground">Selected mode:</span> {' '}
          <span className="text-brand font-medium capitalize">{formData.complexityMode} Mode</span>
        </p>
        <p className="text-sm text-foreground-secondary mt-1">
          {COMPLEXITY_MODES.find(m => m.mode === formData.complexityMode)?.description}
        </p>
        
        {/* Mode switching guidance */}
        {(hasAdvancedConfig() || hasStandardConfig()) && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-xs text-blue-800">
                  You can switch to a different complexity mode at any time. Your compatible settings will be preserved, 
                  and you'll be notified if any configurations would be lost.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mode Change Confirmation Modal */}
      {showModeChangeModal && pendingMode && (
        <ModeChangeConfirmModal
          isOpen={showModeChangeModal}
          currentMode={formData.complexityMode}
          targetMode={pendingMode}
          onConfirm={handleModeChangeConfirm}
          onCancel={handleModeChangeCancel}
          dataLoss={getDataLoss(formData.complexityMode, pendingMode)}
          newFeatures={getNewFeatures(formData.complexityMode, pendingMode)}
        />
      )}
    </div>
  );
};