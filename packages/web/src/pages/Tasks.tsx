import React, { useState, useEffect } from 'react';
import { TaskBrowser } from '../components/TaskBrowser';
import { TaskPreview } from '../components/TaskPreview';
import { TaskMasterTask } from '@magents/shared';
import { apiService } from '../services/api';
import { AlertCircle } from 'lucide-react';
import '../styles/TaskBrowserOverrides.css';

export const Tasks: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState<TaskMasterTask | null>(null);
  const [projectPath, setProjectPath] = useState<string>('');
  const [hasTaskMaster, setHasTaskMaster] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTaskMaster = async () => {
      try {
        // Get the first project or use a default path
        const projects = await apiService.getProjects();
        
        if (projects.length > 0) {
          const path = projects[0].path;
          setProjectPath(path);
          
          const detection = await apiService.detectTaskMaster(path);
          setHasTaskMaster(detection.isConfigured);
        } else {
          // If no projects, try the magents root path
          const path = '/Users/santossafrao/Development/personal/magents';
          setProjectPath(path);
          
          const detection = await apiService.detectTaskMaster(path);
          setHasTaskMaster(detection.isConfigured);
        }
      } catch (error) {
        console.error('Failed to detect TaskMaster:', error);
        setHasTaskMaster(false);
      } finally {
        setLoading(false);
      }
    };

    checkTaskMaster();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-foreground-secondary">Checking for TaskMaster configuration...</p>
      </div>
    );
  }

  if (!hasTaskMaster) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AlertCircle className="w-16 h-16 text-status-warning mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">TaskMaster Not Configured</h2>
        <p className="text-foreground-secondary mb-6 max-w-md">
          This project does not have TaskMaster configured. To use the task browser, 
          you need to initialize TaskMaster in your project.
        </p>
        <div className="bg-background-tertiary rounded-lg p-4 max-w-md border border-border">
          <p className="font-mono text-sm text-foreground">
            task-master init
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
        {/* Task Browser - Left Panel */}
        <div className="w-1/2 border-r border-border bg-background-secondary task-browser-container">
          <TaskBrowser
            projectPath={projectPath}
            onTaskSelect={setSelectedTask}
          />
        </div>

        {/* Task Details - Right Panel */}
        <div className="w-1/2 bg-background">
          {selectedTask ? (
            <TaskPreview 
              task={selectedTask} 
              onClose={() => setSelectedTask(null)}
              className="h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-foreground-tertiary">
              <p>Select a task to view details</p>
            </div>
          )}
        </div>
      </div>
  );
};