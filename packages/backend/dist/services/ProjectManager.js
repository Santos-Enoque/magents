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
exports.ProjectManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const shared_1 = require("@magents/shared");
class ProjectManager {
    constructor() {
        this.projects = new Map();
        this.projectsDir = path.join(os.homedir(), '.magents', 'projects');
        this.projectsFile = path.join(this.projectsDir, 'projects.json');
        this.initializeStorage();
        this.loadProjects();
    }
    static getInstance() {
        if (!ProjectManager.instance) {
            ProjectManager.instance = new ProjectManager();
        }
        return ProjectManager.instance;
    }
    initializeStorage() {
        // Create projects directory
        if (!fs.existsSync(this.projectsDir)) {
            fs.mkdirSync(this.projectsDir, { recursive: true });
        }
        // Create projects file if it doesn't exist
        if (!fs.existsSync(this.projectsFile)) {
            this.saveProjects();
        }
    }
    loadProjects() {
        try {
            if (fs.existsSync(this.projectsFile)) {
                const content = fs.readFileSync(this.projectsFile, 'utf8');
                const projectsData = JSON.parse(content);
                this.projects.clear();
                projectsData.forEach((project) => {
                    // Ensure dates are properly parsed
                    project.createdAt = new Date(project.createdAt);
                    if (project.updatedAt) {
                        project.updatedAt = new Date(project.updatedAt);
                    }
                    this.projects.set(project.id, project);
                });
            }
        }
        catch (error) {
            console.error('Error loading projects:', error);
            this.projects.clear();
        }
    }
    saveProjects() {
        try {
            const projectsArray = Array.from(this.projects.values());
            fs.writeFileSync(this.projectsFile, JSON.stringify(projectsArray, null, 2));
        }
        catch (error) {
            console.error('Error saving projects:', error);
            throw new Error(`Failed to save projects: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async listProjects() {
        this.loadProjects(); // Reload from file to get latest data
        return Array.from(this.projects.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    async getProject(id) {
        this.loadProjects(); // Reload from file to get latest data
        const project = this.projects.get(id);
        if (!project) {
            throw new Error(`Project with id ${id} not found`);
        }
        return project;
    }
    async createProject(options) {
        this.loadProjects(); // Reload from file to get latest data
        const projectId = (0, shared_1.generateId)('proj');
        // Check if project with same name exists
        const existingProject = Array.from(this.projects.values()).find(p => p.name === options.name);
        if (existingProject) {
            throw new Error(`Project with name ${options.name} already exists`);
        }
        // Validate project path if provided
        if (options.path && !fs.existsSync(options.path)) {
            throw new Error(`Project path ${options.path} does not exist`);
        }
        const project = {
            id: projectId,
            name: options.name || `project-${projectId}`,
            path: options.path || process.cwd(),
            agents: [],
            status: 'ACTIVE',
            createdAt: new Date()
        };
        // Add optional fields
        if (options.ports) {
            const [start, end] = options.ports.split('-').map(Number);
            if (isNaN(start) || isNaN(end) || start >= end) {
                throw new Error('Invalid port range format. Use "start-end" format (e.g., "3000-3010")');
            }
            project.portRange = [start, end];
        }
        if (options.docker) {
            project.dockerNetwork = `magents-${projectId}`;
        }
        // Add metadata if provided
        if (options.description) {
            project.description = options.description;
        }
        if (options.tags) {
            project.tags = options.tags;
        }
        this.projects.set(projectId, project);
        this.saveProjects();
        return project;
    }
    async updateProject(id, updates) {
        this.loadProjects(); // Reload from file to get latest data
        const project = this.projects.get(id);
        if (!project) {
            throw new Error(`Project with id ${id} not found`);
        }
        // Check if name is being changed and if it conflicts
        if (updates.name && updates.name !== project.name) {
            const existingProject = Array.from(this.projects.values()).find(p => p.name === updates.name && p.id !== id);
            if (existingProject) {
                throw new Error(`Project with name ${updates.name} already exists`);
            }
        }
        // Validate path if being updated
        if (updates.path && !fs.existsSync(updates.path)) {
            throw new Error(`Project path ${updates.path} does not exist`);
        }
        // Update allowed fields
        const updatedProject = {
            ...project,
            ...updates,
            id: project.id, // Preserve original ID
            createdAt: project.createdAt, // Preserve creation date
            updatedAt: new Date()
        };
        this.projects.set(id, updatedProject);
        this.saveProjects();
        return updatedProject;
    }
    async deleteProject(id) {
        this.loadProjects(); // Reload from file to get latest data
        const project = this.projects.get(id);
        if (!project) {
            throw new Error(`Project with id ${id} not found`);
        }
        // TODO: In a real implementation, this would:
        // 1. Stop all agents in the project
        // 2. Clean up docker networks
        // 3. Remove worktrees
        // 4. Optionally clean up project files
        this.projects.delete(id);
        this.saveProjects();
    }
    async addAgentToProject(projectId, agentId) {
        const project = await this.getProject(projectId);
        if (!project.agents.includes(agentId)) {
            project.agents.push(agentId);
            project.updatedAt = new Date();
            this.projects.set(projectId, project);
            this.saveProjects();
        }
        return project;
    }
    async removeAgentFromProject(projectId, agentId) {
        const project = await this.getProject(projectId);
        const agentIndex = project.agents.indexOf(agentId);
        if (agentIndex > -1) {
            project.agents.splice(agentIndex, 1);
            project.updatedAt = new Date();
            this.projects.set(projectId, project);
            this.saveProjects();
        }
        return project;
    }
    async getProjectStats(id) {
        const project = await this.getProject(id);
        return {
            agentCount: project.agents.length,
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
        const projects = await this.listProjects();
        const lowerQuery = query.toLowerCase();
        return projects.filter(project => project.name.toLowerCase().includes(lowerQuery) ||
            (project.description && project.description.toLowerCase().includes(lowerQuery)) ||
            (project.tags && project.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) ||
            project.path.toLowerCase().includes(lowerQuery));
    }
    async getProjectsByStatus(status) {
        const projects = await this.listProjects();
        return projects.filter(project => project.status === status);
    }
    async getProjectSettings(id) {
        const project = await this.getProject(id);
        const settingsFile = path.join(this.projectsDir, `${id}_settings.json`);
        try {
            if (fs.existsSync(settingsFile)) {
                const content = fs.readFileSync(settingsFile, 'utf8');
                return JSON.parse(content);
            }
        }
        catch (error) {
            console.error(`Error loading settings for project ${id}:`, error);
        }
        // Return default settings
        return this.getDefaultProjectSettings();
    }
    async updateProjectSettings(id, settings) {
        const project = await this.getProject(id);
        const settingsFile = path.join(this.projectsDir, `${id}_settings.json`);
        try {
            // Load existing settings
            const currentSettings = await this.getProjectSettings(id);
            // Merge with new settings
            const updatedSettings = {
                ...currentSettings,
                ...settings,
                updatedAt: new Date().toISOString()
            };
            // Save to file
            fs.writeFileSync(settingsFile, JSON.stringify(updatedSettings, null, 2));
            return updatedSettings;
        }
        catch (error) {
            console.error(`Error saving settings for project ${id}:`, error);
            throw new Error(`Failed to update project settings: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async resetProjectSettings(id) {
        const project = await this.getProject(id);
        const settingsFile = path.join(this.projectsDir, `${id}_settings.json`);
        // Remove settings file
        if (fs.existsSync(settingsFile)) {
            fs.unlinkSync(settingsFile);
        }
        // Return default settings
        return this.getDefaultProjectSettings();
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
                enabled: false,
                image: 'node:lts',
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
        const templatesFile = path.join(this.projectsDir, 'templates.json');
        try {
            if (fs.existsSync(templatesFile)) {
                const content = fs.readFileSync(templatesFile, 'utf8');
                const templates = JSON.parse(content);
                const template = templates[templateName];
                if (template) {
                    return template;
                }
            }
        }
        catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
        }
        // Return default template
        return this.getDefaultTemplate(templateName);
    }
    async saveProjectTemplate(templateName, template) {
        const templatesFile = path.join(this.projectsDir, 'templates.json');
        try {
            let templates = {};
            // Load existing templates
            if (fs.existsSync(templatesFile)) {
                const content = fs.readFileSync(templatesFile, 'utf8');
                templates = JSON.parse(content);
            }
            // Add/update template
            templates[templateName] = {
                ...template,
                updatedAt: new Date().toISOString()
            };
            // Save to file
            fs.writeFileSync(templatesFile, JSON.stringify(templates, null, 2));
        }
        catch (error) {
            console.error(`Error saving template ${templateName}:`, error);
            throw new Error(`Failed to save project template: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async listProjectTemplates() {
        const templatesFile = path.join(this.projectsDir, 'templates.json');
        try {
            if (fs.existsSync(templatesFile)) {
                const content = fs.readFileSync(templatesFile, 'utf8');
                const templates = JSON.parse(content);
                return Object.keys(templates);
            }
        }
        catch (error) {
            console.error('Error loading project templates:', error);
        }
        return ['basic', 'node', 'react', 'python'];
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
}
exports.ProjectManager = ProjectManager;
//# sourceMappingURL=ProjectManager.js.map