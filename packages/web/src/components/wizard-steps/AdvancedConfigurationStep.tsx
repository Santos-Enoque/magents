import React, { useState } from 'react';
import { Settings, Container, Shield, Plus, X, AlertCircle } from 'lucide-react';
import { WizardFormData } from '../AgentCreationWizard';

interface AdvancedConfigurationStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

const DOCKER_IMAGES = [
  { name: 'node:18-alpine', description: 'Lightweight Node.js 18 environment' },
  { name: 'node:20-alpine', description: 'Lightweight Node.js 20 environment' },
  { name: 'python:3.11-alpine', description: 'Lightweight Python 3.11 environment' },
  { name: 'python:3.12-alpine', description: 'Lightweight Python 3.12 environment' },
  { name: 'ubuntu:22.04', description: 'Full Ubuntu 22.04 environment' },
  { name: 'debian:bookworm-slim', description: 'Lightweight Debian environment' }
];

export const AdvancedConfigurationStep: React.FC<AdvancedConfigurationStepProps> = ({
  formData,
  updateFormData
}) => {
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [portRangeError, setPortRangeError] = useState('');

  // Validate port range
  const validatePortRange = (range: string): string => {
    if (!range.trim()) return '';
    
    const match = range.match(/^(\d+)-(\d+)$/);
    if (!match) {
      return 'Port range must be in format: start-end (e.g., 3000-3010)';
    }
    
    const start = parseInt(match[1]);
    const end = parseInt(match[2]);
    
    if (start < 1024 || end < 1024) {
      return 'Ports must be 1024 or higher';
    }
    
    if (start >= end) {
      return 'Start port must be less than end port';
    }
    
    if (end - start > 100) {
      return 'Port range cannot exceed 100 ports';
    }
    
    return '';
  };

  // Handle port range change
  const handlePortRangeChange = (value: string) => {
    const error = validatePortRange(value);
    setPortRangeError(error);
    updateFormData({ portRange: error ? undefined : value || undefined });
  };

  // Add environment variable
  const addEnvironmentVariable = () => {
    if (newEnvKey.trim() && newEnvValue.trim()) {
      const currentEnv = formData.environment || {};
      updateFormData({
        environment: {
          ...currentEnv,
          [newEnvKey.trim()]: newEnvValue.trim()
        }
      });
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  // Remove environment variable
  const removeEnvironmentVariable = (key: string) => {
    if (formData.environment) {
      const { [key]: removed, ...rest } = formData.environment;
      updateFormData({
        environment: Object.keys(rest).length > 0 ? rest : undefined
      });
    }
  };

  // Handle Docker image selection
  const handleDockerImageChange = (image: string) => {
    updateFormData({ dockerImage: image || undefined });
  };

  return (
    <div className="space-y-6">
      {/* Auto-Accept Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Security & Automation
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <button
              onClick={() => updateFormData({ autoAccept: !formData.autoAccept })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                formData.autoAccept ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  formData.autoAccept ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <h4 className="text-sm font-medium text-gray-900">Auto-Accept Changes</h4>
              <p className="text-sm text-gray-500">
                Automatically accept file changes without prompting. Recommended for routine tasks.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Docker Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Container className="w-5 h-5 mr-2" />
          Container Configuration
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <button
              onClick={() => updateFormData({ useDocker: !formData.useDocker })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                formData.useDocker ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  formData.useDocker ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <h4 className="text-sm font-medium text-gray-900">Use Docker Container</h4>
              <p className="text-sm text-gray-500">
                Run the agent in an isolated Docker container for enhanced security and consistency.
              </p>
            </div>
          </div>

          {formData.useDocker && (
            <div className="ml-14 space-y-4">
              {/* Docker Image Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Docker Image
                </label>
                <select
                  value={formData.dockerImage || ''}
                  onChange={(e) => handleDockerImageChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an image...</option>
                  {DOCKER_IMAGES.map((image) => (
                    <option key={image.name} value={image.name}>
                      {image.name} - {image.description}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Choose a Docker image that matches your project's requirements.
                </p>
              </div>

              {/* Custom Docker Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Docker Image
                </label>
                <input
                  type="text"
                  placeholder="custom/image:tag"
                  value={formData.dockerImage && !DOCKER_IMAGES.find(img => img.name === formData.dockerImage) ? formData.dockerImage : ''}
                  onChange={(e) => handleDockerImageChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Or specify a custom Docker image from any registry.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Port Management */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Port Configuration</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Port Range <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="3000-3010"
            value={formData.portRange || ''}
            onChange={(e) => handlePortRangeChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              portRangeError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {portRangeError && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              {portRangeError}
            </div>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Reserve a range of ports for your agent's services. Format: start-end (e.g., 3000-3010)
          </p>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Environment Variables</h3>
        
        {/* Existing Environment Variables */}
        {formData.environment && Object.keys(formData.environment).length > 0 && (
          <div className="space-y-2">
            {Object.entries(formData.environment).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md"
              >
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{key}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">{value}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeEnvironmentVariable(key)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Environment Variable */}
        <div className="border border-dashed border-gray-300 rounded-md p-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              placeholder="Variable name"
              value={newEnvKey}
              onChange={(e) => setNewEnvKey(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Variable value"
              value={newEnvValue}
              onChange={(e) => setNewEnvValue(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={addEnvironmentVariable}
            disabled={!newEnvKey.trim() || !newEnvValue.trim()}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Variable
          </button>
        </div>
        
        <p className="text-sm text-gray-500">
          Add environment variables that will be available to your agent during execution.
        </p>
      </div>

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
        </div>
      </div>

      {/* Best Practices */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Configuration Best Practices</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Enable Docker for better isolation and reproducibility</li>
          <li>• Use auto-accept for trusted, routine tasks only</li>
          <li>• Reserve port ranges to avoid conflicts with other services</li>
          <li>• Set environment variables for configuration, not secrets</li>
          <li>• Choose Docker images that match your project's technology stack</li>
        </ul>
      </div>
    </div>
  );
};