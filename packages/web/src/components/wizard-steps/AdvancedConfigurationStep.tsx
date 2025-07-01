import React, { useMemo } from 'react';
import { Settings } from 'lucide-react';
import { WizardFormData } from '../AgentCreationWizard';
import { AdvancedConfigPanel, AdvancedAgentConfig } from '../AdvancedConfigPanel';

interface AdvancedConfigurationStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

export const AdvancedConfigurationStep: React.FC<AdvancedConfigurationStepProps> = ({
  formData,
  updateFormData
}) => {
  // Convert WizardFormData to AdvancedAgentConfig
  const advancedConfig: AdvancedAgentConfig = useMemo(() => ({
    // Security & Automation
    autoAccept: formData.autoAccept,
    claudeModel: formData.claudeModel,
    
    // Docker Configuration
    useDocker: formData.useDocker,
    dockerImage: formData.dockerImage,
    dockerNetwork: formData.dockerNetwork,
    dockerVolumes: formData.dockerVolumes,
    
    // Port Management
    portRange: formData.portRange,
    reservedPorts: formData.reservedPorts,
    
    // Environment Variables
    environment: formData.environment,
    
    // MCP Configuration
    mcpEnabled: formData.mcpEnabled,
    mcpServers: formData.mcpServers,
    
    // Claude Settings
    claudeSettings: formData.claudeSettings,
    
    // Advanced Settings
    isolationMode: formData.isolationMode,
    resourceLimits: formData.resourceLimits
  }), [formData]);

  // Handle configuration changes from AdvancedConfigPanel
  const handleConfigChange = (config: AdvancedAgentConfig) => {
    updateFormData({
      // Security & Automation
      autoAccept: config.autoAccept,
      claudeModel: config.claudeModel,
      
      // Docker Configuration
      useDocker: config.useDocker,
      dockerImage: config.dockerImage,
      dockerNetwork: config.dockerNetwork,
      dockerVolumes: config.dockerVolumes,
      
      // Port Management
      portRange: config.portRange,
      reservedPorts: config.reservedPorts,
      
      // Environment Variables
      environment: config.environment,
      
      // MCP Configuration
      mcpEnabled: config.mcpEnabled,
      mcpServers: config.mcpServers,
      
      // Claude Settings
      claudeSettings: config.claudeSettings,
      
      // Advanced Settings
      isolationMode: config.isolationMode,
      resourceLimits: config.resourceLimits
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Advanced Agent Configuration
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Configure Docker settings, environment variables, and advanced agent options.
        </p>
      </div>

      {/* Advanced Configuration Panel */}
      <AdvancedConfigPanel
        config={advancedConfig}
        onChange={handleConfigChange}
        readonly={false}
        showTemplates={true}
      />

      {/* Configuration Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Configuration Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600">Auto-Accept:</span>
              <span className={`ml-2 font-medium ${formData.autoAccept ? 'text-green-600' : 'text-red-600'}`}>
                {formData.autoAccept ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Docker:</span>
              <span className={`ml-2 font-medium ${formData.useDocker ? 'text-green-600' : 'text-gray-600'}`}>
                {formData.useDocker ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600">MCP:</span>
              <span className={`ml-2 font-medium ${formData.mcpEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                {formData.mcpEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Isolation:</span>
              <span className="ml-2 font-medium text-gray-900 capitalize">{formData.isolationMode}</span>
            </div>
          </div>
          
          {formData.useDocker && formData.dockerImage && (
            <div>
              <span className="text-gray-600">Docker Image:</span>
              <span className="ml-2 font-medium text-gray-900">{formData.dockerImage}</span>
            </div>
          )}
          
          {formData.portRange && (
            <div>
              <span className="text-gray-600">Port Range:</span>
              <span className="ml-2 font-medium text-gray-900">{formData.portRange}</span>
            </div>
          )}
          
          {formData.environment && Object.keys(formData.environment).length > 0 && (
            <div>
              <span className="text-gray-600">Environment Variables:</span>
              <span className="ml-2 font-medium text-gray-900">
                {Object.keys(formData.environment).length} variable{Object.keys(formData.environment).length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {formData.mcpServers && formData.mcpServers.length > 0 && (
            <div>
              <span className="text-gray-600">MCP Servers:</span>
              <span className="ml-2 font-medium text-gray-900">
                {formData.mcpServers.length} server{formData.mcpServers.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Best Practices */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Configuration Best Practices</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Enable Docker for better isolation and reproducibility</li>
          <li>• Use auto-accept for trusted, routine tasks only</li>
          <li>• Configure MCP servers to extend agent capabilities</li>
          <li>• Set appropriate resource limits for container-based agents</li>
          <li>• Use environment variables for configuration, not secrets</li>
        </ul>
      </div>
    </div>
  );
};