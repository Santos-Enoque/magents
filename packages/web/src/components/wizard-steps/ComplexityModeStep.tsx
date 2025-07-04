import React, { useState } from 'react';
import { Zap, Settings2, Wrench, ArrowUp, ArrowDown, AlertTriangle, Info, HelpCircle, ChevronDown } from 'lucide-react';
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

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showModeHelp, setShowModeHelp] = useState<ComplexityMode | null>(null);
  
  const selectedMode = COMPLEXITY_MODES.find(m => m.mode === formData.complexityMode);
  const SelectedIcon = selectedMode?.icon || Zap;
  
  return (
    <div className="space-y-6">
      {/* Dropdown Selection */}
      <div className="relative max-w-md">
        <label className="block text-sm font-medium text-foreground mb-2">
          Select Complexity Mode
        </label>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-background-secondary border border-border rounded-lg hover:bg-background-tertiary transition-colors"
        >
          <div className="flex items-center">
            <SelectedIcon className="w-5 h-5 text-brand mr-3" />
            <div className="text-left">
              <div className="font-medium text-foreground">{selectedMode?.title}</div>
              <div className="text-sm text-foreground-secondary">{selectedMode?.description}</div>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-foreground-secondary transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isDropdownOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute top-full left-0 right-0 mt-2 bg-background-card border border-border rounded-lg shadow-lg z-20">
              {COMPLEXITY_MODES.map((option) => {
                const Icon = option.icon;
                const isSelected = formData.complexityMode === option.mode;
                
                return (
                  <button
                    key={option.mode}
                    onClick={() => {
                      handleModeSelection(option.mode);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-background-secondary transition-colors ${option.mode !== 'simple' ? 'border-t border-border' : ''}`}
                  >
                    <div className="flex items-center">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-brand' : 'text-foreground-secondary'} mr-3`} />
                      <div className="text-left">
                        <div className={`font-medium ${isSelected ? 'text-brand' : 'text-foreground'} flex items-center gap-2`}>
                          {option.title}
                          {option.recommended && (
                            <span className="text-xs px-2 py-0.5 bg-brand/10 text-brand rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-foreground-secondary">{option.description}</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowModeHelp(option.mode);
                      }}
                      className="p-1 hover:bg-background-tertiary rounded-md transition-colors ml-2"
                    >
                      <HelpCircle className="w-4 h-4 text-foreground-secondary" />
                    </button>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      
      {/* Mode Help Modal */}
      {showModeHelp && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModeHelp(null)}>
          <div className="bg-background-card rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  {(() => {
                    const mode = COMPLEXITY_MODES.find(m => m.mode === showModeHelp);
                    const Icon = mode?.icon || Zap;
                    return (
                      <>
                        <Icon className="w-5 h-5 text-brand mr-2" />
                        {mode?.title}
                      </>
                    );
                  })()}
                </h3>
                <button
                  onClick={() => setShowModeHelp(null)}
                  className="text-foreground-secondary hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-foreground-secondary mb-4">
                {COMPLEXITY_MODES.find(m => m.mode === showModeHelp)?.description}
              </p>
              
              <div>
                <h4 className="font-medium text-foreground mb-2">Features:</h4>
                <ul className="space-y-1">
                  {COMPLEXITY_MODES.find(m => m.mode === showModeHelp)?.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <span className="text-status-success mr-2">✓</span>
                      <span className="text-foreground-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button
                onClick={() => setShowModeHelp(null)}
                className="mt-6 w-full px-4 py-2 bg-brand text-white rounded-md hover:bg-brand-hover transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Comparison */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-background-secondary px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">Feature Comparison</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
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
        <div className="bg-brand/5 border border-brand/20 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <Wrench className="w-5 h-5 mr-2 text-brand" />
            Advanced Mode Features Preview
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-brand rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <h5 className="font-medium text-foreground">Docker Configuration</h5>
                  <p className="text-sm text-foreground-secondary">Choose from multiple Docker images, configure networks, volumes, and container settings</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-brand rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <h5 className="font-medium text-foreground">Claude Model Tuning</h5>
                  <p className="text-sm text-foreground-secondary">Select specific Claude models and fine-tune parameters like temperature and token limits</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-brand rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <h5 className="font-medium text-foreground">MCP Server Management</h5>
                  <p className="text-sm text-foreground-secondary">Connect to Model Context Protocol servers for extended functionality and integrations</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-brand rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <h5 className="font-medium text-foreground">Resource Management</h5>
                  <p className="text-sm text-foreground-secondary">Set memory and CPU limits, configure port ranges, and manage system resources</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-brand rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <h5 className="font-medium text-foreground">Configuration Templates</h5>
                  <p className="text-sm text-foreground-secondary">Use pre-built templates for different scenarios or create custom configurations</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-brand rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div>
                  <h5 className="font-medium text-foreground">Import/Export Settings</h5>
                  <p className="text-sm text-foreground-secondary">Save and share agent configurations across projects and teams</p>
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
          <div className="mt-3 p-3 bg-status-info/10 border border-status-info/20 rounded-md">
            <div className="flex items-start">
              <Info className="w-4 h-4 text-status-info mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-xs text-foreground-secondary">
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