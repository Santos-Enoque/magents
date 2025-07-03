import { Agent, Project, MagentsConfig, ApiResponse, PaginatedResponse, CreateAgentOptions, DirectoryItem, ProjectValidationResult, GitRepositoryInfo, ProjectDiscoveryOptions, TaskMasterTask } from '@magents/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Enhanced error interface for frontend
export interface EnhancedError extends Error {
  code?: string;
  severity?: string;
  suggestions?: string[];
  recoverable?: boolean;
  autoFixAttempted?: boolean;
  autoFixSuggestions?: Record<string, any>;
  learnMoreUrl?: string;
  requestId?: string;
}

class ApiService {
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      
      // Check if it's an enhanced error response
      if (errorData.error && typeof errorData.error === 'object') {
        const enhancedError = new Error(errorData.error.userMessage || errorData.message || 'Request failed') as EnhancedError;
        enhancedError.code = errorData.error.code;
        enhancedError.severity = errorData.error.severity;
        enhancedError.suggestions = errorData.error.suggestions || [];
        enhancedError.recoverable = errorData.error.recoverable;
        enhancedError.autoFixAttempted = errorData.error.autoFixAttempted;
        enhancedError.autoFixSuggestions = errorData.error.autoFixSuggestions;
        enhancedError.learnMoreUrl = errorData.error.learnMoreUrl;
        enhancedError.requestId = errorData.error.requestId;
        throw enhancedError;
      }
      
      // Fallback to original error handling
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data: ApiResponse<T> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data.data as T;
  }

  // Helper to format enhanced error for display
  formatError(error: EnhancedError): string {
    let message = error.message;
    
    if (error.suggestions && error.suggestions.length > 0) {
      message += '\n\nSuggestions:\n';
      error.suggestions.forEach((suggestion, index) => {
        message += `${index + 1}. ${suggestion}\n`;
      });
    }
    
    if (error.autoFixSuggestions) {
      message += '\nAuto-fix suggestions:\n';
      Object.entries(error.autoFixSuggestions).forEach(([key, value]) => {
        message += `• ${key}: ${value}\n`;
      });
    }
    
    if (error.learnMoreUrl) {
      message += `\nLearn more: ${error.learnMoreUrl}`;
    }
    
    return message;
  }

  // Health
  async getHealth() {
    return this.request<any>('/api/health');
  }

  // Agents
  async getAgents(params?: { page?: number; limit?: number; status?: string }) {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    const response = await this.request<Agent[]>(`/api/agents${queryString}`);
    return Array.isArray(response) ? response : [];
  }

  async getAgent(id: string) {
    return this.request<Agent>(`/api/agents/${id}`);
  }

  async createAgent(options: CreateAgentOptions) {
    // Log the request for debugging
    console.log('Creating agent with options:', options);
    
    try {
      const result = await this.request<Agent>('/api/agents', {
        method: 'POST',
        body: JSON.stringify(options),
      });
      
      console.log('Agent created successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to create agent:', error);
      
      // Enhanced error handling with specific error types
      if (error instanceof Error) {
        // Check for common error scenarios
        if (error.message.includes('already exists')) {
          throw new Error(`Agent with ID "${options.agentId || options.branch}" already exists. Please use a different ID or branch name.`);
        }
        
        if (error.message.includes('branch')) {
          throw new Error(`Invalid branch name "${options.branch}". Please check that the branch exists or can be created.`);
        }
        
        if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new Error('Network error: Please check your connection and try again.');
        }
        
        if (error.message.includes('validation')) {
          throw new Error('Validation error: Please check your input and try again.');
        }
        
        // Re-throw with original message if no specific handling
        throw error;
      }
      
      throw new Error('Unknown error occurred while creating agent');
    }
  }

  async updateAgentStatus(id: string, status: string) {
    return this.request<Agent>(`/api/agents/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async startAgent(id: string) {
    return this.request<Agent>(`/api/agents/${id}/start`, {
      method: 'POST',
    });
  }

  async stopAgent(id: string) {
    return this.request<Agent>(`/api/agents/${id}/stop`, {
      method: 'POST',
    });
  }

  async deleteAgent(id: string, removeWorktree: boolean = false) {
    return this.request<void>(`/api/agents/${id}?removeWorktree=${removeWorktree}`, {
      method: 'DELETE',
    });
  }

  async assignAgentToProject(agentId: string, projectId: string) {
    return this.request<Agent>(`/api/agents/${agentId}/project`, {
      method: 'PUT',
      body: JSON.stringify({ projectId }),
    });
  }

  async unassignAgentFromProject(agentId: string) {
    return this.request<Agent>(`/api/agents/${agentId}/project`, {
      method: 'DELETE',
    });
  }

  async getAgentsByProject(projectId: string) {
    const response = await this.request<Agent[]>(`/api/agents/project/${projectId}`);
    return Array.isArray(response) ? response : [];
  }

  // Projects
  async getProjects() {
    const response = await this.request<Project[]>('/api/projects');
    return Array.isArray(response) ? response : [];
  }

  async getProject(id: string) {
    return this.request<Project>(`/api/projects/${id}`);
  }

  async createProject(options: any) {
    return this.request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async updateProject(id: string, updates: any) {
    return this.request<Project>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteProject(id: string) {
    return this.request<void>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async addAgentToProject(projectId: string, agentId: string) {
    return this.request<Project>(`/api/projects/${projectId}/agents/${agentId}`, {
      method: 'POST',
    });
  }

  async removeAgentFromProject(projectId: string, agentId: string) {
    return this.request<Project>(`/api/projects/${projectId}/agents/${agentId}`, {
      method: 'DELETE',
    });
  }

  async getProjectStats(id: string) {
    return this.request<any>(`/api/projects/${id}/stats`);
  }

  async searchProjects(query: string) {
    const response = await this.request<Project[]>(`/api/projects/search/${encodeURIComponent(query)}`);
    return Array.isArray(response) ? response : [];
  }

  async getProjectsByStatus(status: 'ACTIVE' | 'INACTIVE') {
    const response = await this.request<Project[]>(`/api/projects/status/${status}`);
    return Array.isArray(response) ? response : [];
  }

  // Project Discovery
  async discoverProjects(options: ProjectDiscoveryOptions) {
    const queryParams = new URLSearchParams({
      path: options.path,
      ...(options.maxDepth && { maxDepth: options.maxDepth.toString() }),
      ...(options.includeHidden && { includeHidden: 'true' })
    });
    
    return this.request<DirectoryItem[]>(`/api/projects/discover?${queryParams}`);
  }

  async validateProject(path: string) {
    const queryParams = new URLSearchParams({ path });
    return this.request<ProjectValidationResult>(`/api/projects/validate?${queryParams}`);
  }

  async getProjectMetadata(path: string) {
    const queryParams = new URLSearchParams({ path });
    return this.request<GitRepositoryInfo>(`/api/projects/metadata?${queryParams}`);
  }

  // Config
  async getConfig() {
    return this.request<MagentsConfig>('/api/config');
  }

  async updateConfig(updates: Partial<MagentsConfig>) {
    return this.request<MagentsConfig>('/api/config', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async resetConfig() {
    return this.request<MagentsConfig>('/api/config/reset', {
      method: 'POST',
    });
  }

  // TaskMaster
  async detectTaskMaster(path: string) {
    const queryParams = new URLSearchParams({ path });
    return this.request<any>(`/api/taskmaster/detect?${queryParams}`);
  }

  async getTaskMasterTasks(path: string) {
    const queryParams = new URLSearchParams({ path });
    return this.request<TaskMasterTask[]>(`/api/taskmaster/tasks?${queryParams}`);
  }

  async getTaskMasterTask(path: string, taskId: string) {
    const queryParams = new URLSearchParams({ path });
    return this.request<TaskMasterTask>(`/api/taskmaster/tasks/${taskId}?${queryParams}`);
  }

  async createTaskMasterTask(path: string, title: string, description?: string, priority?: string) {
    return this.request<TaskMasterTask>('/api/taskmaster/tasks', {
      method: 'POST',
      body: JSON.stringify({ path, title, description, priority }),
    });
  }

  async updateTaskMasterStatus(path: string, taskId: string, status: string) {
    const queryParams = new URLSearchParams({ path });
    return this.request<void>(`/api/taskmaster/tasks/${taskId}/status?${queryParams}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async assignTaskToAgent(agentId: string, taskId: string, projectPath: string) {
    return this.request<any>(`/api/agents/${agentId}/assign-task`, {
      method: 'POST',
      body: JSON.stringify({ taskId, projectPath }),
    });
  }

  async getAvailableAgentsForProject(projectPath: string) {
    const queryParams = new URLSearchParams({ path: projectPath });
    return this.request<any[]>(`/api/taskmaster/agents?${queryParams}`);
  }

  async getTaskMasterStatistics(path: string) {
    const queryParams = new URLSearchParams({ path });
    return this.request<any>(`/api/taskmaster/statistics?${queryParams}`);
  }
}

export const apiService = new ApiService();