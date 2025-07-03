import React, { useState } from 'react';
import { HelpCircle, X, ChevronRight, ChevronDown, Book, Code, Settings, Wrench } from 'lucide-react';

interface AdvancedModeHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const helpSections = [
  {
    id: 'docker',
    title: 'Docker Configuration',
    icon: '🐳',
    content: [
      {
        title: 'Container Images',
        description: 'Choose from pre-configured development environments or specify custom Docker images. Each image comes with specific tools and runtime environments optimized for different programming languages.'
      },
      {
        title: 'Volume Mounting',
        description: 'Mount host directories into containers to persist data and share files between the host system and agent containers. Use format: /host/path:/container/path'
      },
      {
        title: 'Network Configuration',
        description: 'Configure container networking modes (bridge, host, custom networks) to control how agents communicate with external services and each other.'
      }
    ]
  },
  {
    id: 'claude',
    title: 'Claude Model Tuning',
    icon: '🤖',
    content: [
      {
        title: 'Model Selection',
        description: 'Choose specific Claude models (Sonnet, Haiku, Opus) based on your performance and cost requirements. Different models excel at different types of tasks.'
      },
      {
        title: 'Temperature Settings',
        description: 'Control response creativity and consistency. Lower values (0.1-0.3) for precise, deterministic responses. Higher values (0.7-1.0) for creative, varied outputs.'
      },
      {
        title: 'Token Limits',
        description: 'Set maximum response length. Higher limits allow for more detailed responses but consume more resources. Optimize based on your specific use case.'
      },
      {
        title: 'Custom Instructions',
        description: 'Provide agent-specific behavior guidelines and context that will be included with every request to Claude.'
      }
    ]
  },
  {
    id: 'mcp',
    title: 'MCP Server Integration',
    icon: '🔌',
    content: [
      {
        title: 'What is MCP?',
        description: 'Model Context Protocol (MCP) allows agents to connect to external tools and services, extending their capabilities beyond basic text generation.'
      },
      {
        title: 'Server Configuration',
        description: 'Configure MCP servers by specifying the command, arguments, and environment variables needed to start each server. Common examples include database connectors, API clients, and development tools.'
      },
      {
        title: 'Use Cases',
        description: 'Connect agents to databases, file systems, APIs, development tools, version control systems, and custom business logic through MCP servers.'
      }
    ]
  },
  {
    id: 'resources',
    title: 'Resource Management',
    icon: '⚡',
    content: [
      {
        title: 'Memory Limits',
        description: 'Set container memory limits to prevent agents from consuming excessive system resources. Use formats like "512m", "1g", "2g".'
      },
      {
        title: 'CPU Allocation',
        description: 'Limit CPU usage per agent to ensure fair resource distribution across multiple agents. Specify as decimal values (e.g., 0.5 = half a CPU core).'
      },
      {
        title: 'Port Management',
        description: 'Reserve port ranges for agent services and prevent conflicts. Useful when agents need to run web servers, APIs, or other network services.'
      }
    ]
  },
  {
    id: 'templates',
    title: 'Configuration Templates',
    icon: '📋',
    content: [
      {
        title: 'Pre-built Templates',
        description: 'Use tested configurations for common scenarios: Development (full debugging tools), Production (secure and optimized), Research (analysis-focused), Minimal (lightweight setup).'
      },
      {
        title: 'Import/Export',
        description: 'Save successful configurations and share them across projects or team members. Export configurations as JSON files for version control.'
      },
      {
        title: 'Custom Templates',
        description: 'Create your own templates by configuring an agent and exporting the settings. Build a library of templates for different project types or team standards.'
      }
    ]
  }
];

export const AdvancedModeHelp: React.FC<AdvancedModeHelpProps> = ({ isOpen, onClose }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center">
            <Wrench className="w-6 h-6 text-purple-600 mr-3" />
            <h2 className="text-xl font-semibold text-purple-900">Advanced Mode Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="mb-6">
            <p className="text-gray-600 leading-relaxed">
              Advanced Mode gives you complete control over agent configuration, enabling fine-tuned setups 
              for complex development workflows, production deployments, and specialized use cases. 
              Explore the sections below to learn about each feature.
            </p>
          </div>

          <div className="space-y-4">
            {helpSections.map((section) => (
              <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{section.icon}</span>
                    <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                  </div>
                  {expandedSection === section.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {expandedSection === section.id && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    <div className="space-y-4">
                      {section.content.map((item, index) => (
                        <div key={index} className="border-l-4 border-purple-200 pl-4">
                          <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Tips */}
          <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-3 flex items-center">
              <Book className="w-5 h-5 mr-2" />
              Quick Tips for Advanced Mode
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• Start with a configuration template and customize from there</li>
              <li>• Use the export feature to backup working configurations</li>
              <li>• Test resource limits with simple tasks before applying to complex workflows</li>
              <li>• Enable MCP servers only when you need their specific functionality</li>
              <li>• Lower Claude temperature settings for coding tasks, higher for creative work</li>
              <li>• Use Docker for better isolation, especially in team environments</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedModeHelp;