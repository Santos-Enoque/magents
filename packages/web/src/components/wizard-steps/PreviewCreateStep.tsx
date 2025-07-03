import React from 'react';
import { Eye, GitBranch, Folder, Settings, Wand2, Tag, Check, AlertTriangle, Zap, Settings2, Wrench } from 'lucide-react';
import { Project, TaskMasterTask } from '@magents/shared';
import { WizardFormData, ComplexityMode } from '../AgentCreationWizard';

interface PreviewCreateStepProps {
  formData: WizardFormData;
  projects: Project[];
  tasks: TaskMasterTask[];
}

export const PreviewCreateStep: React.FC<PreviewCreateStepProps> = ({
  formData,
  projects,
  tasks
}) => {
  // Get selected project
  const selectedProject = formData.projectId 
    ? projects.find(p => p.id === formData.projectId)
    : null;

  // Get selected tasks
  const selectedTasks = formData.selectedTasks.map(taskId => 
    tasks.find(task => task.id === taskId)
  ).filter(Boolean) as TaskMasterTask[];

  // Generate agent ID if not provided
  const effectiveAgentId = formData.agentId || 
    formData.branch.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // Calculate estimated resources
  const estimatedPorts = formData.portRange ? 
    formData.portRange.split('-').map(Number).reduce((acc, val, idx) => idx === 0 ? val : val - acc + 1, 0) : 0;

  // Get complexity mode icon
  const getModeIcon = (mode: ComplexityMode) => {
    switch (mode) {
      case 'simple': return Zap;
      case 'standard': return Settings2;
      case 'advanced': return Wrench;
    }
  };
  const ModeIcon = getModeIcon(formData.complexityMode);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Eye className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Review Your Agent Configuration</h2>
        <p className="text-gray-600 mt-2">
          Please review all settings before creating your agent. You can go back to make changes if needed.
        </p>
      </div>

      {/* Complexity Mode Display */}
      <div className="bg-brand/10 border border-brand/20 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-center">
          <ModeIcon className="w-5 h-5 text-brand mr-2" />
          <span className="text-sm font-medium text-brand capitalize">
            {formData.complexityMode} Mode Configuration
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Folder className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Project Configuration</h3>
          </div>
          
          <div className="space-y-3">
            {selectedProject ? (
              <div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Project Name:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedProject.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Project ID:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedProject.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`text-sm font-medium ${
                    selectedProject.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {selectedProject.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Project Type:</span>
                <span className="text-sm font-medium text-gray-900">Custom Path</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Project Path:</span>
              <span className="text-sm font-medium text-gray-900 break-all">
                {formData.projectPath}
              </span>
            </div>
          </div>
        </div>

        {/* Branch & Agent Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <GitBranch className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Branch & Agent</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Branch:</span>
              <span className="text-sm font-medium text-gray-900">{formData.branch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Agent ID:</span>
              <span className="text-sm font-medium text-gray-900">{effectiveAgentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tmux Session:</span>
              <span className="text-sm font-medium text-gray-900">magents-{effectiveAgentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Worktree Path:</span>
              <span className="text-sm font-medium text-gray-900">
                ./magents-{formData.branch.replace(/[^a-zA-Z0-9]/g, '-')}
              </span>
            </div>
          </div>
        </div>

        {/* TaskMaster Integration - Only show for standard and advanced modes */}
        {formData.complexityMode !== 'simple' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Wand2 className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">TaskMaster Integration</h3>
          </div>
          
          {formData.taskMasterEnabled ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className="flex items-center text-sm font-medium text-green-600">
                  <Check className="w-4 h-4 mr-1" />
                  Enabled
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Selected Tasks:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {selectedTasks.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Tasks to Assign:</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-900">{task.id}: {task.title}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          task.priority === 'high' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <span className="text-sm text-gray-500">Not enabled</span>
            </div>
          )}
        </div>
        )}

        {/* Advanced Configuration - Only show for advanced mode or if settings differ from defaults */}
        {(formData.complexityMode === 'advanced' || formData.useDocker || formData.mcpEnabled || 
          (formData.environment && Object.keys(formData.environment).length > 0)) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">{formData.complexityMode === 'advanced' && (
            <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-md">
              <div className="flex items-center">
                <Wrench className="w-5 h-5 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-purple-900">Advanced Mode Configuration</span>
              </div>
            </div>
          )}
          <div className="flex items-center mb-4">
            <Settings className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Auto-Accept:</span>
              <span className={`text-sm font-medium ${
                formData.autoAccept ? 'text-green-600' : 'text-red-600'
              }`}>
                {formData.autoAccept ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Docker:</span>
              <span className={`text-sm font-medium ${
                formData.useDocker ? 'text-green-600' : 'text-gray-600'
              }`}>
                {formData.useDocker ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            {formData.useDocker && formData.dockerImage && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Docker Image:</span>
                <span className="text-sm font-medium text-gray-900">{formData.dockerImage}</span>
              </div>
            )}
            
            {formData.portRange && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Port Range:</span>
                <span className="text-sm font-medium text-gray-900">{formData.portRange}</span>
              </div>
            )}
            
            {formData.environment && Object.keys(formData.environment).length > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Environment Variables:</span>
                <span className="text-sm font-medium text-gray-900">
                  {Object.keys(formData.environment).length} variable{Object.keys(formData.environment).length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Advanced Mode Additional Details */}
            {formData.complexityMode === 'advanced' && (
              <div className="mt-4 space-y-3">
                {formData.claudeModel && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Claude Model:</span>
                    <span className="text-sm font-medium text-gray-900">{formData.claudeModel}</span>
                  </div>
                )}
                
                {formData.claudeSettings.temperature !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Temperature:</span>
                    <span className="text-sm font-medium text-gray-900">{formData.claudeSettings.temperature}</span>
                  </div>
                )}
                
                {formData.claudeSettings.maxTokens && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Max Tokens:</span>
                    <span className="text-sm font-medium text-gray-900">{formData.claudeSettings.maxTokens}</span>
                  </div>
                )}
                
                {formData.resourceLimits?.memory && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Memory Limit:</span>
                    <span className="text-sm font-medium text-gray-900">{formData.resourceLimits.memory}</span>
                  </div>
                )}
                
                {formData.resourceLimits?.cpu && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">CPU Limit:</span>
                    <span className="text-sm font-medium text-gray-900">{formData.resourceLimits.cpu} cores</span>
                  </div>
                )}
                
                {formData.dockerNetwork && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Docker Network:</span>
                    <span className="text-sm font-medium text-gray-900">{formData.dockerNetwork}</span>
                  </div>
                )}
                
                {formData.dockerVolumes && formData.dockerVolumes.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Volume Mounts:</span>
                    <span className="text-sm font-medium text-gray-900">{formData.dockerVolumes.length} configured</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Resource Estimation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Estimated Resource Usage</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">1</div>
            <div className="text-sm text-blue-800">Git Worktree</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">1</div>
            <div className="text-sm text-blue-800">Tmux Session</div>
          </div>
          {estimatedPorts > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{estimatedPorts}</div>
              <div className="text-sm text-blue-800">Reserved Ports</div>
            </div>
          )}
          {formData.useDocker && (
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">1</div>
              <div className="text-sm text-blue-800">Docker Container</div>
            </div>
          )}
        </div>
      </div>

      {/* Environment Variables Preview */}
      {formData.environment && Object.keys(formData.environment).length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Environment Variables</h3>
          <div className="space-y-2">
            {Object.entries(formData.environment).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-2 bg-white rounded border">
                <span className="text-sm font-medium text-gray-700">{key}</span>
                <span className="text-sm text-gray-600">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings & Recommendations */}
      <div className="space-y-4">
        {!formData.useDocker && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Docker Not Enabled</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Consider enabling Docker for better isolation and reproducibility, especially for production environments.
                </p>
              </div>
            </div>
          </div>
        )}

        {formData.autoAccept && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Auto-Accept Enabled</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Auto-accept is enabled. The agent will automatically apply changes without confirmation.
                  Make sure this is appropriate for your use case.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Creation Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4">Ready to Create Agent</h3>
        <p className="text-sm text-green-800 mb-4">
          Your agent configuration looks good! Click "Create Agent" to start the creation process.
          You'll see real-time progress updates as your agent is set up.
        </p>
        <div className="text-sm text-green-700">
          <strong>What happens next:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Git worktree will be created for branch "{formData.branch}"</li>
            <li>Tmux session "magent-{effectiveAgentId}" will be started</li>
            {formData.useDocker && <li>Docker container will be prepared and started</li>}
            <li>Claude Code will be launched in the agent environment</li>
            {formData.taskMasterEnabled && selectedTasks.length > 0 && (
              <li>{selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} will be assigned to the agent</li>
            )}
            <li>Agent will be registered and ready for use</li>
          </ul>
        </div>
      </div>
    </div>
  );
};