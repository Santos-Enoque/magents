import { Agent, Project, MagentsConfig, ApiResponse, PaginatedResponse, CreateAgentOptions } from '@magents/shared';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data: ApiResponse<T> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data.data as T;
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

  async deleteAgent(id: string, removeWorktree: boolean = false) {
    return this.request<void>(`/api/agents/${id}?removeWorktree=${removeWorktree}`, {
      method: 'DELETE',
    });
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
}

export const apiService = new ApiService();