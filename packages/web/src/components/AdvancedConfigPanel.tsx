import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Container, 
  Shield, 
  Plus, 
  X, 
  AlertCircle, 
  Code2, 
  Network, 
  FileText,
  Download,
  Upload,
  Save,
  RotateCcw
} from 'lucide-react';

// Types for advanced configuration
export interface AdvancedAgentConfig {
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
}

interface MCPServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface AdvancedConfigPanelProps {
  config: AdvancedAgentConfig;
  onChange: (config: AdvancedAgentConfig) => void;
  readonly?: boolean;
  showTemplates?: boolean;
}

// Predefined Docker images
const DOCKER_IMAGES = [
  { name: 'node:18-alpine', description: 'Lightweight Node.js 18 environment', category: 'Node.js' },
  { name: 'node:20-alpine', description: 'Lightweight Node.js 20 environment', category: 'Node.js' },
  { name: 'python:3.11-alpine', description: 'Lightweight Python 3.11 environment', category: 'Python' },
  { name: 'python:3.12-alpine', description: 'Lightweight Python 3.12 environment', category: 'Python' },
  { name: 'ubuntu:22.04', description: 'Full Ubuntu 22.04 environment', category: 'Linux' },
  { name: 'debian:bookworm-slim', description: 'Lightweight Debian environment', category: 'Linux' },
  { name: 'alpine:latest', description: 'Minimal Alpine Linux', category: 'Linux' },
  { name: 'rust:alpine', description: 'Rust development environment', category: 'Rust' },
  { name: 'golang:alpine', description: 'Go development environment', category: 'Go' },
];

// Configuration Templates
const CONFIG_TEMPLATES = {
  minimal: {
    name: 'Minimal Configuration',
    description: 'Basic agent with minimal overhead',
    config: {
      autoAccept: false,
      useDocker: false,
      mcpEnabled: false,
      isolationMode: 'none' as const,
      claudeSettings: {}
    }
  },
  development: {
    name: 'Development Setup',
    description: 'Full development environment with Docker',
    config: {
      autoAccept: false,
      useDocker: true,
      dockerImage: 'node:20-alpine',
      portRange: '3000-3010',
      mcpEnabled: true,
      isolationMode: 'container' as const,
      environment: {
        NODE_ENV: 'development',
        DEBUG: 'true'
      },
      claudeSettings: {
        temperature: 0.7,
        maxTokens: 4000
      }
    }
  },
  production: {
    name: 'Production Ready',
    description: 'Secure production environment',
    config: {
      autoAccept: false,
      useDocker: true,
      dockerImage: 'node:18-alpine',
      dockerNetwork: 'isolated',
      portRange: '8000-8010',
      mcpEnabled: true,
      isolationMode: 'container' as const,
      environment: {
        NODE_ENV: 'production'
      },
      resourceLimits: {
        memory: '512m',
        cpu: 0.5
      },
      claudeSettings: {
        temperature: 0.3,
        maxTokens: 2000
      }
    }
  },
  research: {
    name: 'Research & Analysis',
    description: 'Optimized for research tasks',
    config: {
      autoAccept: true,
      useDocker: true,
      dockerImage: 'python:3.12-alpine',
      portRange: '5000-5010',
      mcpEnabled: true,
      isolationMode: 'container' as const,
      environment: {
        PYTHONPATH: '/workspace',
        JUPYTER_ENABLE: 'true'
      },
      claudeSettings: {
        temperature: 0.1,
        maxTokens: 8000,
        customInstructions: 'Focus on thorough analysis and detailed explanations.'
      }
    }
  }
};

// Claude models
const CLAUDE_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
  'claude-3-opus-20240229'
];

export const AdvancedConfigPanel: React.FC<AdvancedConfigPanelProps> = ({
  config,
  onChange,
  readonly = false,
  showTemplates = true
}) => {
  const [activeTab, setActiveTab] = useState<'security' | 'docker' | 'ports' | 'environment' | 'mcp' | 'claude' | 'advanced'>('security');
  const [portRangeError, setPortRangeError] = useState('');
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [newMCPServer, setNewMCPServer] = useState<Partial<MCPServer>>({});

  // Update configuration helper
  const updateConfig = (updates: Partial<AdvancedAgentConfig>) => {
    if (!readonly) {
      onChange({ ...config, ...updates });
    }
  };

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
    if (!error) {
      updateConfig({ portRange: value || undefined });
    }
  };

  // Add environment variable
  const addEnvironmentVariable = () => {
    if (newEnvKey.trim() && newEnvValue.trim()) {
      const currentEnv = config.environment || {};
      updateConfig({
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
    if (config.environment) {
      const { [key]: removed, ...rest } = config.environment;
      updateConfig({
        environment: Object.keys(rest).length > 0 ? rest : undefined
      });
    }
  };

  // Add MCP server
  const addMCPServer = () => {
    if (newMCPServer.name && newMCPServer.command) {
      const currentServers = config.mcpServers || [];
      updateConfig({
        mcpServers: [
          ...currentServers,
          {
            name: newMCPServer.name,
            command: newMCPServer.command,
            args: newMCPServer.args || [],
            env: newMCPServer.env || {}
          }
        ]
      });
      setNewMCPServer({});
    }
  };

  // Remove MCP server
  const removeMCPServer = (index: number) => {
    const currentServers = config.mcpServers || [];
    const newServers = currentServers.filter((_, i) => i !== index);
    updateConfig({
      mcpServers: newServers.length > 0 ? newServers : undefined
    });
  };

  // Apply template
  const applyTemplate = (templateKey: keyof typeof CONFIG_TEMPLATES) => {
    const template = CONFIG_TEMPLATES[templateKey];
    updateConfig(template.config);
  };

  // Export configuration
  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import configuration
  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedConfig = JSON.parse(e.target?.result as string);
          updateConfig(importedConfig);
        } catch (error) {
          alert('Invalid configuration file');
        }
      };
      reader.readAsText(file);
    }
  };

  // Reset to default configuration
  const resetToDefault = () => {
    updateConfig(CONFIG_TEMPLATES.minimal.config);
  };

  const tabs = [
    { id: 'security', label: 'Security & Automation', icon: Shield },
    { id: 'docker', label: 'Docker', icon: Container },
    { id: 'ports', label: 'Ports & Network', icon: Network },
    { id: 'environment', label: 'Environment', icon: FileText },
    { id: 'mcp', label: 'MCP Servers', icon: Code2 },
    { id: 'claude', label: 'Claude Settings', icon: Settings },
    { id: 'advanced', label: 'Advanced', icon: AlertCircle }
  ] as const;

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Advanced Agent Configuration</h3>
          
          {!readonly && (
            <div className="flex space-x-2">
              <button
                onClick={exportConfig}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                title="Export Configuration"
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </button>
              
              <label className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <Upload className="w-4 h-4 mr-1" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={importConfig}
                  className="hidden"
                />
              </label>
              
              <button
                onClick={resetToDefault}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                title="Reset to Default"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Configuration Templates */}
        {showTemplates && !readonly && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Templates</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(CONFIG_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => applyTemplate(key as keyof typeof CONFIG_TEMPLATES)}
                  className="p-3 text-left border border-gray-200 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <h5 className="font-medium text-sm text-gray-900">{template.name}</h5>
                  <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-4" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`-ml-0.5 mr-2 h-5 w-5 ${
                  isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Security & Automation Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="flex items-start space-x-3">
              <div className="flex h-6 items-center">
                <input
                  id="auto-accept"
                  type="checkbox"
                  checked={config.autoAccept}
                  onChange={(e) => updateConfig({ autoAccept: e.target.checked })}
                  disabled={readonly}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="auto-accept" className="text-sm font-medium text-gray-900">
                  Auto-Accept Changes
                </label>
                <p className="text-sm text-gray-500">
                  Automatically accept file changes without prompting. Recommended for routine tasks.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="claude-model" className="block text-sm font-medium text-gray-700 mb-2">
                Claude Model
              </label>
              <select
                id="claude-model"
                value={config.claudeModel || ''}
                onChange={(e) => updateConfig({ claudeModel: e.target.value || undefined })}
                disabled={readonly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Default Model</option>
                {CLAUDE_MODELS.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="isolation-mode" className="block text-sm font-medium text-gray-700 mb-2">
                Isolation Mode
              </label>
              <select
                id="isolation-mode"
                value={config.isolationMode}
                onChange={(e) => updateConfig({ isolationMode: e.target.value as any })}
                disabled={readonly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="none">No Isolation</option>
                <option value="process">Process Isolation</option>
                <option value="container">Container Isolation</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Choose the level of isolation for the agent environment.
              </p>
            </div>
          </div>
        )}

        {/* Docker Tab */}
        {activeTab === 'docker' && (
          <div className="space-y-6">
            <div className="flex items-start space-x-3">
              <div className="flex h-6 items-center">
                <input
                  id="use-docker"
                  type="checkbox"
                  checked={config.useDocker}
                  onChange={(e) => updateConfig({ useDocker: e.target.checked })}
                  disabled={readonly}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="use-docker" className="text-sm font-medium text-gray-900">
                  Enable Docker Container
                </label>
                <p className="text-sm text-gray-500">
                  Run agents in isolated Docker containers for enhanced security and consistency.
                </p>
              </div>
            </div>

            {config.useDocker && (
              <div className="ml-7 space-y-4">
                <div>
                  <label htmlFor="docker-image" className="block text-sm font-medium text-gray-700 mb-2">
                    Docker Image
                  </label>
                  <select
                    id="docker-image"
                    value={config.dockerImage || ''}
                    onChange={(e) => updateConfig({ dockerImage: e.target.value || undefined })}
                    disabled={readonly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Docker image...</option>
                    {DOCKER_IMAGES.map((image) => (
                      <optgroup key={image.category} label={image.category}>
                        <option value={image.name}>
                          {image.name} - {image.description}
                        </option>
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="custom-docker-image" className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Docker Image
                  </label>
                  <input
                    id="custom-docker-image"
                    type="text"
                    placeholder="custom/image:tag"
                    value={config.dockerImage && !DOCKER_IMAGES.find(img => img.name === config.dockerImage) ? config.dockerImage : ''}
                    onChange={(e) => updateConfig({ dockerImage: e.target.value || undefined })}
                    disabled={readonly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Or specify a custom Docker image from any registry.
                  </p>
                </div>

                <div>
                  <label htmlFor="docker-network" className="block text-sm font-medium text-gray-700 mb-2">
                    Docker Network
                  </label>
                  <input
                    id="docker-network"
                    type="text"
                    placeholder="bridge, host, or custom network name"
                    value={config.dockerNetwork || ''}
                    onChange={(e) => updateConfig({ dockerNetwork: e.target.value || undefined })}
                    disabled={readonly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Specify the Docker network mode or custom network name.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Docker Volumes
                  </label>
                  <div className="space-y-2">
                    {config.dockerVolumes?.map((volume, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={volume}
                          onChange={(e) => {
                            const newVolumes = [...(config.dockerVolumes || [])];
                            newVolumes[index] = e.target.value;
                            updateConfig({ dockerVolumes: newVolumes });
                          }}
                          disabled={readonly}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="/host/path:/container/path"
                        />
                        <button
                          onClick={() => {
                            const newVolumes = config.dockerVolumes?.filter((_, i) => i !== index);
                            updateConfig({ dockerVolumes: newVolumes?.length ? newVolumes : undefined });
                          }}
                          disabled={readonly}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newVolumes = [...(config.dockerVolumes || []), ''];
                        updateConfig({ dockerVolumes: newVolumes });
                      }}
                      disabled={readonly}
                      className="inline-flex items-center px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-400"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Volume Mount
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Mount host directories into the container. Format: /host/path:/container/path
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ports & Network Tab */}
        {activeTab === 'ports' && (
          <div className="space-y-6">
            <div>
              <label htmlFor="port-range" className="block text-sm font-medium text-gray-700 mb-2">
                Port Range
              </label>
              <input
                id="port-range"
                type="text"
                placeholder="3000-3010"
                value={config.portRange || ''}
                onChange={(e) => handlePortRangeChange(e.target.value)}
                disabled={readonly}
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
                Reserve a range of ports for agent services. Format: start-end (e.g., 3000-3010)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reserved Ports
              </label>
              <div className="space-y-2">
                {config.reservedPorts?.map((port, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1024"
                      max="65535"
                      value={port}
                      onChange={(e) => {
                        const newPorts = [...(config.reservedPorts || [])];
                        newPorts[index] = parseInt(e.target.value);
                        updateConfig({ reservedPorts: newPorts });
                      }}
                      disabled={readonly}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => {
                        const newPorts = config.reservedPorts?.filter((_, i) => i !== index);
                        updateConfig({ reservedPorts: newPorts?.length ? newPorts : undefined });
                      }}
                      disabled={readonly}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newPorts = [...(config.reservedPorts || []), 3000];
                    updateConfig({ reservedPorts: newPorts });
                  }}
                  disabled={readonly}
                  className="inline-flex items-center px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-400"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Reserve Port
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Specify individual ports to reserve and prevent conflicts.
              </p>
            </div>
          </div>
        )}

        {/* Environment Tab */}
        {activeTab === 'environment' && (
          <div className="space-y-6">
            {/* Existing Environment Variables */}
            {config.environment && Object.keys(config.environment).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Current Variables</h4>
                {Object.entries(config.environment).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
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
                      disabled={readonly}
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
              <h4 className="text-sm font-medium text-gray-700 mb-3">Add Environment Variable</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Variable name (e.g., NODE_ENV)"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value)}
                  disabled={readonly}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Variable value"
                  value={newEnvValue}
                  onChange={(e) => setNewEnvValue(e.target.value)}
                  disabled={readonly}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={addEnvironmentVariable}
                disabled={readonly || !newEnvKey.trim() || !newEnvValue.trim()}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Variable
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-amber-900 mb-2">Security Notice</h4>
              <p className="text-sm text-amber-800">
                Avoid storing sensitive information like API keys or passwords in environment variables. 
                Use secure secret management instead.
              </p>
            </div>
          </div>
        )}

        {/* MCP Servers Tab */}
        {activeTab === 'mcp' && (
          <div className="space-y-6">
            <div className="flex items-start space-x-3">
              <div className="flex h-6 items-center">
                <input
                  id="mcp-enabled"
                  type="checkbox"
                  checked={config.mcpEnabled}
                  onChange={(e) => updateConfig({ mcpEnabled: e.target.checked })}
                  disabled={readonly}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="mcp-enabled" className="text-sm font-medium text-gray-900">
                  Enable MCP (Model Context Protocol)
                </label>
                <p className="text-sm text-gray-500">
                  Allow agents to connect to MCP servers for extended functionality.
                </p>
              </div>
            </div>

            {config.mcpEnabled && (
              <div className="ml-7 space-y-4">
                {/* Existing MCP Servers */}
                {config.mcpServers && config.mcpServers.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Configured Servers</h4>
                    {config.mcpServers.map((server, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">{server.name}</h5>
                          <button
                            onClick={() => removeMCPServer(index)}
                            disabled={readonly}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p><strong>Command:</strong> {server.command}</p>
                          {server.args.length > 0 && (
                            <p><strong>Args:</strong> {server.args.join(' ')}</p>
                          )}
                          {server.env && Object.keys(server.env).length > 0 && (
                            <p><strong>Environment:</strong> {Object.keys(server.env).length} variables</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New MCP Server */}
                <div className="border border-dashed border-gray-300 rounded-md p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Add MCP Server</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Server name"
                      value={newMCPServer.name || ''}
                      onChange={(e) => setNewMCPServer({ ...newMCPServer, name: e.target.value })}
                      disabled={readonly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Command (e.g., npx, python)"
                      value={newMCPServer.command || ''}
                      onChange={(e) => setNewMCPServer({ ...newMCPServer, command: e.target.value })}
                      disabled={readonly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Arguments (space-separated)"
                      value={newMCPServer.args?.join(' ') || ''}
                      onChange={(e) => setNewMCPServer({ 
                        ...newMCPServer, 
                        args: e.target.value.split(' ').filter(arg => arg.trim()) 
                      })}
                      disabled={readonly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={addMCPServer}
                      disabled={readonly || !newMCPServer.name || !newMCPServer.command}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Server
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Claude Settings Tab */}
        {activeTab === 'claude' && (
          <div className="space-y-6">
            <div>
              <label htmlFor="claude-max-tokens" className="block text-sm font-medium text-gray-700 mb-2">
                Max Tokens
              </label>
              <input
                id="claude-max-tokens"
                type="number"
                min="100"
                max="200000"
                value={config.claudeSettings.maxTokens || ''}
                onChange={(e) => updateConfig({ 
                  claudeSettings: { 
                    ...config.claudeSettings, 
                    maxTokens: e.target.value ? parseInt(e.target.value) : undefined 
                  } 
                })}
                disabled={readonly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="4000"
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum number of tokens for Claude responses (100-200000).
              </p>
            </div>

            <div>
              <label htmlFor="claude-temperature" className="block text-sm font-medium text-gray-700 mb-2">
                Temperature
              </label>
              <input
                id="claude-temperature"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={config.claudeSettings.temperature || ''}
                onChange={(e) => updateConfig({ 
                  claudeSettings: { 
                    ...config.claudeSettings, 
                    temperature: e.target.value ? parseFloat(e.target.value) : undefined 
                  } 
                })}
                disabled={readonly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.7"
              />
              <p className="text-sm text-gray-500 mt-1">
                Controls randomness in responses (0.0 = deterministic, 1.0 = very random).
              </p>
            </div>

            <div>
              <label htmlFor="claude-top-p" className="block text-sm font-medium text-gray-700 mb-2">
                Top P
              </label>
              <input
                id="claude-top-p"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={config.claudeSettings.topP || ''}
                onChange={(e) => updateConfig({ 
                  claudeSettings: { 
                    ...config.claudeSettings, 
                    topP: e.target.value ? parseFloat(e.target.value) : undefined 
                  } 
                })}
                disabled={readonly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.9"
              />
              <p className="text-sm text-gray-500 mt-1">
                Nucleus sampling parameter for response diversity.
              </p>
            </div>

            <div>
              <label htmlFor="claude-instructions" className="block text-sm font-medium text-gray-700 mb-2">
                Custom Instructions
              </label>
              <textarea
                id="claude-instructions"
                rows={4}
                value={config.claudeSettings.customInstructions || ''}
                onChange={(e) => updateConfig({ 
                  claudeSettings: { 
                    ...config.claudeSettings, 
                    customInstructions: e.target.value || undefined 
                  } 
                })}
                disabled={readonly}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add custom instructions for Claude behavior..."
              />
              <p className="text-sm text-gray-500 mt-1">
                Custom instructions to guide Claude's behavior for this agent.
              </p>
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource Limits
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="memory-limit" className="block text-xs font-medium text-gray-600 mb-1">
                    Memory Limit
                  </label>
                  <input
                    id="memory-limit"
                    type="text"
                    placeholder="512m, 1g, 2g"
                    value={config.resourceLimits?.memory || ''}
                    onChange={(e) => updateConfig({ 
                      resourceLimits: { 
                        ...config.resourceLimits, 
                        memory: e.target.value || undefined 
                      } 
                    })}
                    disabled={readonly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="cpu-limit" className="block text-xs font-medium text-gray-600 mb-1">
                    CPU Limit
                  </label>
                  <input
                    id="cpu-limit"
                    type="number"
                    min="0.1"
                    max="8"
                    step="0.1"
                    placeholder="1.0"
                    value={config.resourceLimits?.cpu || ''}
                    onChange={(e) => updateConfig({ 
                      resourceLimits: { 
                        ...config.resourceLimits, 
                        cpu: e.target.value ? parseFloat(e.target.value) : undefined 
                      } 
                    })}
                    disabled={readonly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Set resource limits for container-based agents.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-red-900 mb-2">Advanced Configuration Warning</h4>
              <p className="text-sm text-red-800">
                These settings affect agent performance and security. Only modify if you understand the implications.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};