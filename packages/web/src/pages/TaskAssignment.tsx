import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { TaskAssignment as TaskAssignmentComponent } from '../components/TaskAssignment';
import { apiService } from '../services/api';
import { AlertCircle } from 'lucide-react';

export const TaskAssignment: React.FC = () => {
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
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Checking for TaskMaster configuration...</p>
        </div>
      </Layout>
    );
  }

  if (!hasTaskMaster) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">TaskMaster Not Configured</h2>
          <p className="text-gray-600 mb-6 max-w-md">
            This project does not have TaskMaster configured. To use task assignment, 
            you need to initialize TaskMaster in your project.
          </p>
          <div className="bg-gray-100 rounded-lg p-4 max-w-md">
            <p className="font-mono text-sm text-gray-700">
              task-master init
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <TaskAssignmentComponent projectPath={projectPath} />
    </Layout>
  );
};