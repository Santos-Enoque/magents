import { Agent, Project, MagentsConfig, ApiResponse } from '@magents/shared';

// Mock data for testing
const mockAgents: Agent[] = [
  {
    id: 'demo-agent-1',
    branch: 'feature/dashboard',
    worktreePath: '/tmp/magents-demo-agent-1',
    tmuxSession: 'magent-demo-agent-1',
    status: 'RUNNING',
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
    updatedAt: new Date(Date.now() - 3600000), // 1 hour ago
    projectId: 'demo-project'
  },
  {
    id: 'demo-agent-2', 
    branch: 'main',
    worktreePath: '/tmp/magents-demo-agent-2',
    tmuxSession: 'magent-demo-agent-2',
    status: 'STOPPED',
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
    updatedAt: new Date(Date.now() - 7200000), // 2 hours ago
    projectId: 'demo-project'
  },
  {
    id: 'demo-agent-3',
    branch: 'hotfix/urgent-fix',
    worktreePath: '/tmp/magents-demo-agent-3', 
    tmuxSession: 'magent-demo-agent-3',
    status: 'ERROR',
    createdAt: new Date(Date.now() - 259200000), // 3 days ago
    updatedAt: new Date(Date.now() - 1800000), // 30 minutes ago
    projectId: 'demo-project-2'
  }
];

const mockProjects: Project[] = [
  {
    id: 'demo-project',
    name: 'Magents Dashboard',
    path: '/Users/dev/magents',
    agents: ['demo-agent-1', 'demo-agent-2'],
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 604800000), // 1 week ago
    description: 'Multi-agent development workflow manager'
  },
  {
    id: 'demo-project-2',
    name: 'Claude Integration',
    path: '/Users/dev/claude-integration',
    agents: ['demo-agent-3'],
    status: 'ACTIVE', 
    createdAt: new Date(Date.now() - 1209600000), // 2 weeks ago
    description: 'Claude Code integration and automation'
  }
];

const mockConfig: MagentsConfig = {
  DEFAULT_BASE_BRANCH: 'main',
  TMUX_SESSION_PREFIX: 'magent',
  WORKTREE_PREFIX: 'magent',
  MAX_AGENTS: 10,
  CLAUDE_CODE_PATH: 'claude',
  CLAUDE_AUTO_ACCEPT: true,
  DOCKER_ENABLED: false,
  DOCKER_IMAGE: 'node:18-alpine'
};

class MockApiService {
  private delay(ms: number = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private success<T>(data: T): T {
    return data;
  }

  async getHealth() {
    await this.delay(100);
    return this.success({ status: 'ok', timestamp: Date.now() });
  }

  async getAgents() {
    await this.delay(300);
    return this.success(mockAgents);
  }

  async getAgent(id: string) {
    await this.delay(200);
    const agent = mockAgents.find(a => a.id === id);
    if (!agent) throw new Error(`Agent ${id} not found`);
    return this.success(agent);
  }

  async startAgent(id: string) {
    await this.delay(1000);
    const agent = mockAgents.find(a => a.id === id);
    if (!agent) throw new Error(`Agent ${id} not found`);
    
    agent.status = 'RUNNING';
    agent.updatedAt = new Date();
    return this.success(agent);
  }

  async stopAgent(id: string) {
    await this.delay(800);
    const agent = mockAgents.find(a => a.id === id);
    if (!agent) throw new Error(`Agent ${id} not found`);
    
    agent.status = 'STOPPED';
    agent.updatedAt = new Date();
    return this.success(agent);
  }

  async deleteAgent(id: string) {
    await this.delay(600);
    const index = mockAgents.findIndex(a => a.id === id);
    if (index === -1) throw new Error(`Agent ${id} not found`);
    
    mockAgents.splice(index, 1);
    return this.success(undefined);
  }

  async getProjects() {
    await this.delay(400);
    return this.success(mockProjects);
  }

  async getProject(id: string) {
    await this.delay(200);
    const project = mockProjects.find(p => p.id === id);
    if (!project) throw new Error(`Project ${id} not found`);
    return this.success(project);
  }

  async getConfig() {
    await this.delay(150);
    return this.success(mockConfig);
  }

  // Add all the other methods from the real API service
  async createAgent(options: any) {
    await this.delay(2000);
    const newAgent: Agent = {
      id: options.agentId || `agent-${Date.now()}`,
      branch: options.branch,
      worktreePath: `/tmp/magents-${options.agentId || Date.now()}`,
      tmuxSession: `magent-${options.agentId || Date.now()}`,
      status: 'STOPPED',
      createdAt: new Date(),
      projectId: options.projectId
    };
    mockAgents.push(newAgent);
    return this.success(newAgent);
  }

  async updateAgentStatus(id: string, status: string) {
    await this.delay(300);
    const agent = mockAgents.find(a => a.id === id);
    if (!agent) throw new Error(`Agent ${id} not found`);
    
    agent.status = status as any;
    agent.updatedAt = new Date();
    return this.success(agent);
  }

  // Mock implementations for other methods
  async assignAgentToProject(agentId: string, projectId: string) {
    await this.delay(400);
    const agent = mockAgents.find(a => a.id === agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    agent.projectId = projectId;
    return this.success(agent);
  }

  async unassignAgentFromProject(agentId: string) {
    await this.delay(400);
    const agent = mockAgents.find(a => a.id === agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    delete agent.projectId;
    return this.success(agent);
  }

  async getAgentsByProject(projectId: string) {
    await this.delay(300);
    return this.success(mockAgents.filter(a => a.projectId === projectId));
  }

  async createProject(options: any) {
    await this.delay(1500);
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: options.name || 'New Project',
      path: options.path || '/tmp/new-project',
      agents: [],
      status: 'ACTIVE',
      createdAt: new Date(),
      description: options.description
    };
    mockProjects.push(newProject);
    return this.success(newProject);
  }

  async updateProject(id: string, updates: any) {
    await this.delay(400);
    const project = mockProjects.find(p => p.id === id);
    if (!project) throw new Error(`Project ${id} not found`);
    Object.assign(project, updates);
    return this.success(project);
  }

  async deleteProject(id: string) {
    await this.delay(500);
    const index = mockProjects.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Project ${id} not found`);
    mockProjects.splice(index, 1);
    return this.success(undefined);
  }

  async updateConfig(updates: any) {
    await this.delay(300);
    Object.assign(mockConfig, updates);
    return this.success(mockConfig);
  }

  async resetConfig() {
    await this.delay(500);
    return this.success(mockConfig);
  }

  // Add placeholder implementations for other methods
  async addAgentToProject() { return this.success({}); }
  async removeAgentFromProject() { return this.success({}); }
  async getProjectStats() { return this.success({}); }
  async searchProjects() { return this.success([]); }
  async getProjectsByStatus() { return this.success([]); }
  async discoverProjects() { return this.success([]); }
  async validateProject() { return this.success({}); }
  async getProjectMetadata() { return this.success({}); }
  async detectTaskMaster() { return this.success({}); }
  async getTaskMasterTasks() { return this.success([]); }
  async getTaskMasterTask() { return this.success({}); }
  async createTaskMasterTask() { return this.success({}); }
  async updateTaskMasterStatus() { return this.success({}); }
  async assignTaskToAgent() { return this.success({}); }
  async getTaskMasterStatistics() { return this.success({}); }
}

export const mockApiService = new MockApiService();