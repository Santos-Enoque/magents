"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectManagerDB = void 0;
const fs = __importStar(require("fs"));
const shared_1 = require("@magents/shared");
/**
 * Database-backed implementation of ProjectManager
 * This replaces the file-based ProjectManager with SQLite repository usage
 */
class ProjectManagerDB {
    constructor() {
        this.initialized = false;
        this.db = new shared_1.UnifiedDatabaseService();
    }
    static getInstance() {
        if (!ProjectManagerDB.instance) {
            ProjectManagerDB.instance = new ProjectManagerDB();
        }
        return ProjectManagerDB.instance;
    }
    async ensureInitialized() {
        if (!this.initialized) {
            await this.db.initialize();
            this.initialized = true;
        }
    }
    async listProjects() {
        await this.ensureInitialized();
        const projects = await this.db.projects.findAll();
        // Convert UnifiedProjectData to Project format and populate agents
        const projectsWithAgents = await Promise.all(projects.map(async (project) => {
            const convertedProject = this.convertToProject(project);
            // Get agents for this project
            const agents = await this.db.agents.findByProject(project.id);
            convertedProject.agents = agents.map(agent => agent.id);
            return convertedProject;
        }));
        return projectsWithAgents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    async getProject(id) {
        await this.ensureInitialized();
        const project = await this.db.projects.findById(id);
        if (!project) {
            throw new Error(`Project with id ${id} not found`);
        }
        const convertedProject = this.convertToProject(project);
        // Get agents for this project
        const agents = await this.db.agents.findByProject(id);
        convertedProject.agents = agents.map(agent => agent.id);
        return convertedProject;
    }
    async createProject(options) {
        await this.ensureInitialized();
        const projectId = (0, shared_1.generateId)('proj');
        // Check if project with same name exists
        const existingProjects = await this.db.projects.findAll();
        const existingProject = existingProjects.find(p => p.name === options.name);
        if (existingProject) {
            throw new Error(`Project with name ${options.name} already exists`);
        }
        // Validate project path if provided
        if (options.path && !fs.existsSync(options.path)) {
            throw new Error(`Project path ${options.path} does not exist`);
        }
        const projectData = {
            id: projectId,
            name: options.name || `project-${projectId}`,
            path: options.path || process.cwd(),
            status: 'ACTIVE',
            maxAgents: 5,
            taskMasterEnabled: false,
            tags: [],
            agentIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {}
        };
        // Add optional fields
        if (options.ports) {
            const [start, end] = options.ports.split('-').map(Number);
            if (isNaN(start) || isNaN(end) || start >= end) {
                throw new Error('Invalid port range format. Use "start-end" format (e.g., "3000-3010")');
            }
            projectData.portRange = { start, end };
        }
        if (options.docker) {
            projectData.dockerNetwork = `magents-${projectId}`;
        }
        // Add metadata if provided
        if (options.description || options.tags) {
            projectData.metadata = {
                description: options.description,
                tags: options.tags
            };
        }
        await this.db.projects.create(projectData);
        return this.convertToProject(projectData);
    }
    async updateProject(id, updates) {
        await this.ensureInitialized();
        const existingProject = await this.db.projects.findById(id);
        if (!existingProject) {
            throw new Error(`Project with id ${id} not found`);
        }
        // Check if name is being changed and if it conflicts
        if (updates.name && updates.name !== existingProject.name) {
            const allProjects = await this.db.projects.findAll();
            const conflictingProject = allProjects.find(p => p.name === updates.name && p.id !== id);
            if (conflictingProject) {
                throw new Error(`Project with name ${updates.name} already exists`);
            }
        }
        // Validate path if being updated
        if (updates.path && !fs.existsSync(updates.path)) {
            throw new Error(`Project path ${updates.path} does not exist`);
        }
        // Convert updates to UnifiedProjectData format
        const dataUpdates = {
            name: updates.name,
            path: updates.path,
            status: updates.status,
            updatedAt: new Date()
        };
        if (updates.portRange) {
            dataUpdates.portRange = { start: updates.portRange[0], end: updates.portRange[1] };
        }
        if (updates.dockerNetwork) {
            dataUpdates.dockerNetwork = updates.dockerNetwork;
        }
        if (updates.description || updates.tags) {
            dataUpdates.metadata = {
                ...existingProject.metadata,
                description: updates.description,
                tags: updates.tags
            };
        }
        const updatedProject = await this.db.projects.update(id, dataUpdates);
        if (!updatedProject) {
            throw new Error(`Failed to update project ${id}`);
        }
        return this.convertToProject(updatedProject);
    }
    async deleteProject(id) {
        await this.ensureInitialized();
        const project = await this.db.projects.findById(id);
        if (!project) {
            throw new Error(`Project with id ${id} not found`);
        }
        // Get all agents in the project
        const agents = await this.db.agents.findByProject(id);
        // Delete all agents first (this will handle cleanup)
        for (const agent of agents) {
            await this.db.agents.delete(agent.id);
        }
        // Delete the project
        const deleted = await this.db.projects.delete(id);
        if (!deleted) {
            throw new Error(`Failed to delete project ${id}`);
        }
    }
    async addAgentToProject(projectId, agentId) {
        await this.ensureInitialized();
        // Verify project exists
        const project = await this.db.projects.findById(projectId);
        if (!project) {
            throw new Error(`Project with id ${projectId} not found`);
        }
        // Update agent's projectId
        const agent = await this.db.agents.findById(agentId);
        if (!agent) {
            throw new Error(`Agent with id ${agentId} not found`);
        }
        await this.db.agents.update(agentId, {
            projectId,
            updatedAt: new Date()
        });
        // Update project's updatedAt
        await this.db.projects.update(projectId, {
            updatedAt: new Date()
        });
        const updatedProject = await this.db.projects.findById(projectId);
        return this.convertToProject(updatedProject);
    }
    async removeAgentFromProject(projectId, agentId) {
        await this.ensureInitialized();
        // Verify project exists
        const project = await this.db.projects.findById(projectId);
        if (!project) {
            throw new Error(`Project with id ${projectId} not found`);
        }
        // Update agent to remove projectId
        const agent = await this.db.agents.findById(agentId);
        if (agent && agent.projectId === projectId) {
            await this.db.agents.update(agentId, {
                projectId: undefined,
                updatedAt: new Date()
            });
        }
        // Update project's updatedAt
        await this.db.projects.update(projectId, {
            updatedAt: new Date()
        });
        const updatedProject = await this.db.projects.findById(projectId);
        return this.convertToProject(updatedProject);
    }
    async getProjectStats(id) {
        await this.ensureInitialized();
        const project = await this.db.projects.findById(id);
        if (!project) {
            throw new Error(`Project with id ${id} not found`);
        }
        // Get agent count
        const agents = await this.db.agents.findByProject(id);
        return {
            agentCount: agents.length,
            status: project.status,
            lastActivity: project.updatedAt || project.createdAt,
            uptime: this.calculateUptime(project.createdAt)
        };
    }
    calculateUptime(createdAt) {
        const now = new Date();
        const diffMs = now.getTime() - createdAt.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (days > 0) {
            return `${days}d ${hours}h`;
        }
        else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        else {
            return `${minutes}m`;
        }
    }
    async searchProjects(query) {
        await this.ensureInitialized();
        const projects = await this.db.projects.findAll();
        const lowerQuery = query.toLowerCase();
        const filtered = projects.filter(project => {
            const description = project.metadata?.description;
            const tags = project.metadata?.tags;
            return project.name.toLowerCase().includes(lowerQuery) ||
                (description && description.toLowerCase().includes(lowerQuery)) ||
                (tags && tags.some(tag => tag.toLowerCase().includes(lowerQuery))) ||
                project.path.toLowerCase().includes(lowerQuery);
        });
        return filtered.map(this.convertToProject);
    }
    async getProjectsByStatus(status) {
        await this.ensureInitialized();
        const projects = await this.db.projects.findAll();
        const filtered = projects.filter(project => project.status === status);
        return filtered.map(this.convertToProject);
    }
    async getProjectSettings(id) {
        await this.ensureInitialized();
        // TODO: Implement project-specific settings storage
        const project = await this.db.projects.findById(id);
        if (project && project.metadata && project.metadata.settings) {
            return project.metadata.settings;
        }
        // Return default settings
        return this.getDefaultProjectSettings();
    }
    async updateProjectSettings(id, settings) {
        await this.ensureInitialized();
        // Verify project exists
        const project = await this.db.projects.findById(id);
        if (!project) {
            throw new Error(`Project with id ${id} not found`);
        }
        // Load existing settings
        const currentSettings = await this.getProjectSettings(id);
        // Merge with new settings
        const updatedSettings = {
            ...currentSettings,
            ...settings,
            updatedAt: new Date().toISOString()
        };
        // Save to database
        // TODO: Implement project-specific settings storage
        // For now, store in project metadata
        await this.db.projects.update(id, {
            metadata: { ...project.metadata, settings: updatedSettings },
            updatedAt: new Date()
        });
        return updatedSettings;
    }
    async resetProjectSettings(id) {
        await this.ensureInitialized();
        // Verify project exists
        const project = await this.db.projects.findById(id);
        if (!project) {
            throw new Error(`Project with id ${id} not found`);
        }
        // Remove settings from database
        await this.db.configRepo.delete(`project_${id}_settings`);
        // Return default settings
        return this.getDefaultProjectSettings();
    }
    /**
     * Convert UnifiedProjectData to Project format for backward compatibility
     */
    convertToProject(data) {
        // Note: agents will be populated separately when needed
        const project = {
            id: data.id,
            name: data.name,
            path: data.path,
            agents: [], // Will be populated separately
            status: data.status,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        };
        // Add optional fields
        if (data.portRange) {
            project.portRange = [data.portRange.start, data.portRange.end];
        }
        if (data.dockerNetwork) {
            project.dockerNetwork = data.dockerNetwork;
        }
        if (data.metadata) {
            if (data.metadata.description) {
                project.description = data.metadata.description;
            }
            if (data.metadata.tags) {
                project.tags = data.metadata.tags;
            }
        }
        return project;
    }
    getDefaultProjectSettings() {
        return {
            general: {
                autoCreateAgents: false,
                defaultBranch: 'main',
                maxAgents: 5,
                autoAssignTasks: false
            },
            development: {
                nodeVersion: 'lts',
                packageManager: 'npm',
                buildCommand: 'npm run build',
                testCommand: 'npm test',
                lintCommand: 'npm run lint',
                devCommand: 'npm run dev'
            },
            docker: {
                enabled: true, // Docker is now default
                image: 'magents/agent:latest',
                network: null,
                volumes: [],
                env: {}
            },
            ports: {
                autoAllocate: true,
                range: [3000, 3100],
                reserved: []
            },
            integrations: {
                taskMaster: {
                    enabled: false,
                    autoSync: false,
                    configPath: '.taskmaster/config.json'
                },
                git: {
                    autoCommit: false,
                    commitPrefix: '[Agent]',
                    pushOnComplete: false
                },
                notifications: {
                    enabled: false,
                    webhook: null,
                    events: ['agent_created', 'agent_completed', 'project_status_changed']
                }
            },
            templates: {
                enabled: false,
                defaultTemplate: 'basic',
                customTemplates: []
            },
            createdAt: new Date().toISOString(),
            version: '1.0'
        };
    }
    // Template-related methods remain mostly the same but use database for storage
    async createProjectFromTemplate(templateName, options) {
        // Get template settings
        const template = await this.getProjectTemplate(templateName);
        // Create project with template options
        const project = await this.createProject({
            ...options,
            ...template.projectDefaults
        });
        // Apply template settings
        if (template.settings) {
            await this.updateProjectSettings(project.id, template.settings);
        }
        return project;
    }
    async getProjectTemplate(templateName) {
        await this.ensureInitialized();
        // TODO: Implement template storage
        // For now, just return default template
        // Return default template
        return this.getDefaultTemplate(templateName);
    }
    async saveProjectTemplate(templateName, template) {
        await this.ensureInitialized();
        // TODO: Implement template storage
        throw new Error('Template storage not yet implemented');
    }
    async listProjectTemplates() {
        await this.ensureInitialized();
        // TODO: Implement template storage
        const templateKeys = [];
        // Include default templates
        const defaultTemplates = ['basic', 'node', 'react', 'python'];
        const allTemplates = [...new Set([...templateKeys, ...defaultTemplates])];
        return allTemplates;
    }
    getDefaultTemplate(templateName) {
        const templates = {
            basic: {
                name: 'Basic Project',
                description: 'A basic project template with minimal configuration',
                projectDefaults: {},
                settings: this.getDefaultProjectSettings()
            },
            node: {
                name: 'Node.js Project',
                description: 'A Node.js project with npm configuration',
                projectDefaults: {
                    tags: ['node', 'javascript']
                },
                settings: {
                    ...this.getDefaultProjectSettings(),
                    development: {
                        nodeVersion: 'lts',
                        packageManager: 'npm',
                        buildCommand: 'npm run build',
                        testCommand: 'npm test',
                        lintCommand: 'npm run lint',
                        devCommand: 'npm run dev'
                    }
                }
            },
            react: {
                name: 'React Project',
                description: 'A React project with modern tooling',
                projectDefaults: {
                    tags: ['react', 'javascript', 'frontend']
                },
                settings: {
                    ...this.getDefaultProjectSettings(),
                    development: {
                        nodeVersion: 'lts',
                        packageManager: 'npm',
                        buildCommand: 'npm run build',
                        testCommand: 'npm test',
                        lintCommand: 'npm run lint',
                        devCommand: 'npm run dev'
                    },
                    ports: {
                        autoAllocate: true,
                        range: [3000, 3010],
                        reserved: [3000]
                    }
                }
            },
            python: {
                name: 'Python Project',
                description: 'A Python project with virtual environment support',
                projectDefaults: {
                    tags: ['python']
                },
                settings: {
                    ...this.getDefaultProjectSettings(),
                    development: {
                        pythonVersion: '3.9',
                        packageManager: 'pip',
                        buildCommand: 'python setup.py build',
                        testCommand: 'python -m pytest',
                        lintCommand: 'flake8',
                        devCommand: 'python app.py'
                    }
                }
            }
        };
        return templates[templateName] || templates.basic;
    }
    /**
     * Migrate data from file-based storage to database
     */
    async migrateFromFileStorage() {
        await this.ensureInitialized();
        // This method can be used to migrate existing file-based projects
        // to the database. Implementation would read from the JSON files
        // and create database entries.
        return {
            success: true,
            itemsMigrated: 0,
            errors: [],
            backupPaths: [],
            duration: 0
        };
    }
}
exports.ProjectManagerDB = ProjectManagerDB;
//# sourceMappingURL=ProjectManagerDB.js.map