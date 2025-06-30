import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { COLORS } from '@magents/shared';

export const Dashboard: React.FC = () => {
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiService.getAgents(),
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getProjects(),
  });

  const runningAgents = agents.filter(agent => agent.status === 'RUNNING').length;
  const stoppedAgents = agents.filter(agent => agent.status === 'STOPPED').length;
  const activeProjects = projects.filter(project => project.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your Magents system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <div className="h-6 w-6 bg-green-600 rounded-full"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Running Agents</p>
              <p className="text-2xl font-bold text-gray-900">
                {agentsLoading ? '...' : runningAgents}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gray-100">
              <div className="h-6 w-6 bg-gray-600 rounded-full"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Stopped Agents</p>
              <p className="text-2xl font-bold text-gray-900">
                {agentsLoading ? '...' : stoppedAgents}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <div className="h-6 w-6 bg-blue-600 rounded-full"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900">
                {projectsLoading ? '...' : activeProjects}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <div className="h-6 w-6 bg-purple-600 rounded-full"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Agents</p>
              <p className="text-2xl font-bold text-gray-900">
                {agentsLoading ? '...' : agents.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Agents</h2>
          <div className="space-y-3">
            {agentsLoading ? (
              <div className="text-gray-500">Loading...</div>
            ) : agents.slice(0, 5).map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-gray-900">{agent.id}</p>
                  <p className="text-sm text-gray-600">{agent.branch}</p>
                </div>
                <span 
                  className={`px-2 py-1 text-xs rounded-full ${
                    agent.status === 'RUNNING' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {agent.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Projects</h2>
          <div className="space-y-3">
            {projectsLoading ? (
              <div className="text-gray-500">Loading...</div>
            ) : projects.slice(0, 5).map((project) => (
              <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-gray-900">{project.name}</p>
                  <p className="text-sm text-gray-600">{project.agents.length} agents</p>
                </div>
                <span 
                  className={`px-2 py-1 text-xs rounded-full ${
                    project.status === 'ACTIVE' 
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {project.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};