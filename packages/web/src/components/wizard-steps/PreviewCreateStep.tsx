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
        <Eye className="w-12 h-12 text-brand mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground">Review Your Agent Configuration</h2>
        <p className="text-foreground-secondary mt-2">
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
        <div className="bg-background-card border border-border rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Folder className="w-5 h-5 text-brand mr-2" />
            <h3 className="text-lg font-semibold text-foreground">Project Configuration</h3>
          </div>
          
          <div className="space-y-3">
            {selectedProject ? (
              <div>
                <div className="flex justify-between">
                  <span className="text-sm text-foreground-secondary">Project Name:</span>
                  <span className="text-sm font-medium text-foreground">{selectedProject.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-foreground-secondary">Project ID:</span>
                  <span className="text-sm font-medium text-foreground">{selectedProject.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-foreground-secondary">Status:</span>
                  <span className={`text-sm font-medium ${
                    selectedProject.status === 'ACTIVE' ? 'text-status-success' : 'text-foreground-secondary'
                  }`}>
                    {selectedProject.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-sm text-foreground-secondary">Project Type:</span>
                <span className="text-sm font-medium text-foreground">Custom Path</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-sm text-foreground-secondary">Project Path:</span>
              <span className="text-sm font-medium text-foreground break-all">
                {formData.projectPath}
              </span>
            </div>
          </div>
        </div>

        {/* Branch & Agent Configuration */}
        <div className="bg-background-card border border-border rounded-lg p-6">
          <div className="flex items-center mb-4">
            <GitBranch className="w-5 h-5 text-status-success mr-2" />
            <h3 className="text-lg font-semibold text-foreground">Branch & Agent</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-foreground-secondary">Branch:</span>
              <span className="text-sm font-medium text-foreground">{formData.branch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-foreground-secondary">Agent ID:</span>
              <span className="text-sm font-medium text-foreground">{effectiveAgentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-foreground-secondary">Tmux Session:</span>
              <span className="text-sm font-medium text-foreground">magents-{effectiveAgentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-foreground-secondary">Worktree Path:</span>
              <span className="text-sm font-medium text-foreground">
                ./magents-{formData.branch.replace(/[^a-zA-Z0-9]/g, '-')}
              </span>
            </div>
          </div>
        </div>

        {/* TaskMaster Integration - Only show for standard and advanced modes */}
        {formData.complexityMode !== 'simple' && (
          <div className="bg-background-card border border-border rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Wand2 className="w-5 h-5 text-brand mr-2" />
            <h3 className="text-lg font-semibold text-foreground">TaskMaster Integration</h3>
          </div>
          
          {formData.taskMasterEnabled ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground-secondary">Status:</span>
                <span className="flex items-center text-sm font-medium text-status-success">
                  <Check className="w-4 h-4 mr-1" />
                  Enabled
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-foreground-secondary">Selected Tasks:</span>
                <span className="text-sm font-medium text-foreground">
                  {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {selectedTasks.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-foreground-secondary mb-2">Tasks to Assign:</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-2 bg-background-tertiary rounded">
                        <span className="text-sm text-foreground">{task.id}: {task.title}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          task.priority === 'high' ? 'bg-status-error/20 text-status-error' :
                          task.priority === 'medium' ? 'bg-status-warning/20 text-status-warning' :
                          'bg-status-success/20 text-status-success'
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
              <span className="text-sm text-foreground-tertiary">Not enabled</span>
            </div>
          )}
        </div>
        )}

        {/* Advanced Configuration - Only show for advanced mode or if settings differ from defaults */}
        {(formData.complexityMode === 'advanced' || formData.useDocker || formData.mcpEnabled || 
          (formData.environment && Object.keys(formData.environment).length > 0)) && (
          <div className="bg-background-card border border-border rounded-lg p-6">{formData.complexityMode === 'advanced' && (
            <div className="mb-4 p-3 bg-brand/10 border border-brand/20 rounded-md">
              <div className="flex items-center">
                <Wrench className="w-5 h-5 text-brand mr-2" />
                <span className="text-sm font-medium text-brand">Advanced Mode Configuration</span>
              </div>
            </div>
          )}
          <div className="flex items-center mb-4">
            <Settings className="w-5 h-5 text-foreground-secondary mr-2" />
            <h3 className="text-lg font-semibold text-foreground">Advanced Settings</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-foreground-secondary">Auto-Accept:</span>
              <span className={`text-sm font-medium ${
                formData.autoAccept ? 'text-status-success' : 'text-status-error'
              }`}>
                {formData.autoAccept ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-foreground-secondary">Docker:</span>
              <span className={`text-sm font-medium ${
                formData.useDocker ? 'text-status-success' : 'text-foreground-secondary'
              }`}>
                {formData.useDocker ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
            {formData.useDocker && formData.dockerImage && (
              <div className="flex justify-between">
                <span className="text-sm text-foreground-secondary">Docker Image:</span>
                <span className="text-sm font-medium text-foreground">{formData.dockerImage}</span>
              </div>
            )}
            
            {formData.portRange && (
              <div className="flex justify-between">
                <span className="text-sm text-foreground-secondary">Port Range:</span>
                <span className="text-sm font-medium text-foreground">{formData.portRange}</span>
              </div>
            )}
            
            {formData.environment && Object.keys(formData.environment).length > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-foreground-secondary">Environment Variables:</span>
                <span className="text-sm font-medium text-foreground">
                  {Object.keys(formData.environment).length} variable{Object.keys(formData.environment).length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Advanced Mode Additional Details */}
            {formData.complexityMode === 'advanced' && (
              <div className="mt-4 space-y-3">
                {formData.claudeModel && (
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground-secondary">Claude Model:</span>
                    <span className="text-sm font-medium text-foreground">{formData.claudeModel}</span>
                  </div>
                )}
                
                {formData.claudeSettings.temperature !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground-secondary">Temperature:</span>
                    <span className="text-sm font-medium text-foreground">{formData.claudeSettings.temperature}</span>
                  </div>
                )}
                
                {formData.claudeSettings.maxTokens && (
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground-secondary">Max Tokens:</span>
                    <span className="text-sm font-medium text-foreground">{formData.claudeSettings.maxTokens}</span>
                  </div>
                )}
                
                {formData.resourceLimits?.memory && (
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground-secondary">Memory Limit:</span>
                    <span className="text-sm font-medium text-foreground">{formData.resourceLimits.memory}</span>
                  </div>
                )}
                
                {formData.resourceLimits?.cpu && (
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground-secondary">CPU Limit:</span>
                    <span className="text-sm font-medium text-foreground">{formData.resourceLimits.cpu} cores</span>
                  </div>
                )}
                
                {formData.dockerNetwork && (
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground-secondary">Docker Network:</span>
                    <span className="text-sm font-medium text-foreground">{formData.dockerNetwork}</span>
                  </div>
                )}
                
                {formData.dockerVolumes && formData.dockerVolumes.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground-secondary">Volume Mounts:</span>
                    <span className="text-sm font-medium text-foreground">{formData.dockerVolumes.length} configured</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Resource Estimation */}
      <div className="bg-brand/10 border border-brand/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-brand mb-4">Estimated Resource Usage</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-brand">1</div>
            <div className="text-sm text-brand/80">Git Worktree</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-brand">1</div>
            <div className="text-sm text-brand/80">Tmux Session</div>
          </div>
          {estimatedPorts > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-brand">{estimatedPorts}</div>
              <div className="text-sm text-brand/80">Reserved Ports</div>
            </div>
          )}
          {formData.useDocker && (
            <div className="text-center">
              <div className="text-2xl font-bold text-brand">1</div>
              <div className="text-sm text-brand/80">Docker Container</div>
            </div>
          )}
        </div>
      </div>

      {/* Environment Variables Preview */}
      {formData.environment && Object.keys(formData.environment).length > 0 && (
        <div className="bg-background-secondary border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Environment Variables</h3>
          <div className="space-y-2">
            {Object.entries(formData.environment).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-2 bg-background-card rounded border border-border">
                <span className="text-sm font-medium text-foreground">{key}</span>
                <span className="text-sm text-foreground-secondary">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings & Recommendations */}
      <div className="space-y-4">
        {!formData.useDocker && (
          <div className="bg-status-warning/10 border border-status-warning/20 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-status-warning mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-status-warning">Docker Not Enabled</h4>
                <p className="text-sm text-status-warning/80 mt-1">
                  Consider enabling Docker for better isolation and reproducibility, especially for production environments.
                </p>
              </div>
            </div>
          </div>
        )}

        {formData.autoAccept && (
          <div className="bg-status-warning/10 border border-status-warning/20 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-status-warning mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-status-warning">Auto-Accept Enabled</h4>
                <p className="text-sm text-status-warning/80 mt-1">
                  Auto-accept is enabled. The agent will automatically apply changes without confirmation.
                  Make sure this is appropriate for your use case.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Creation Summary */}
      <div className="bg-status-success/10 border border-status-success/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-status-success mb-4">Ready to Create Agent</h3>
        <p className="text-sm text-status-success/80 mb-4">
          Your agent configuration looks good! Click "Create Agent" to start the creation process.
          You'll see real-time progress updates as your agent is set up.
        </p>
        <div className="text-sm text-status-success/70">
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