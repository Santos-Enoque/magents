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
const ConfigManager_1 = require("../config/ConfigManager");
class ProjectManager {
    constructor() {
        this.configManager = ConfigManager_1.ConfigManager.getInstance();
        this.projectsDir = path.join(this.configManager.getAgentsDir(), 'projects');
        // Ensure projects directory exists
        if (!fs.existsSync(this.projectsDir)) {
            fs.mkdirSync(this.projectsDir, { recursive: true });
        }
    }
    async createProject(options) {
        try {
            const projectId = `project-${Date.now()}`;
            const projectName = options.name || path.basename(options.path);
            const portRange = options.portRange || [3000, 3010];
            // Validate path exists
            if (!fs.existsSync(options.path)) {
                return {
                    success: false,
                    message: `Project path does not exist: ${options.path}`
                };
            }
            // Check if project already exists for this path
            const existingProject = this.getProjectByPath(options.path);
            if (existingProject) {
                return {
                    success: false,
                    message: `Project already exists for path: ${options.path}`
                };
            }
            const project = {
                id: projectId,
                path: path.resolve(options.path),
                name: projectName,
                agents: [],
                portRange,
                status: 'ACTIVE',
                createdAt: new Date()
            };
            // Save project
            this.saveProject(project);
            return {
                success: true,
                message: `Project '${projectName}' created successfully!`,
                data: project
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Failed to create project: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    getAllProjects() {
        if (!fs.existsSync(this.projectsDir)) {
            return [];
        }
        const projects = [];
        const files = fs.readdirSync(this.projectsDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const projectPath = path.join(this.projectsDir, file);
                    const data = fs.readFileSync(projectPath, 'utf8');
                    const project = JSON.parse(data);
                    projects.push(project);
                }
                catch (error) {
                    console.warn(`Error loading project ${file}:`, error);
                }
            }
        }
        return projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    getProject(projectId) {
        const projectPath = path.join(this.projectsDir, `${projectId}.json`);
        if (!fs.existsSync(projectPath)) {
            return null;
        }
        try {
            const data = fs.readFileSync(projectPath, 'utf8');
            return JSON.parse(data);
        }
        catch (error) {
            console.error(`Error loading project ${projectId}:`, error);
            return null;
        }
    }
    getProjectByPath(projectPath) {
        const resolvedPath = path.resolve(projectPath);
        const projects = this.getAllProjects();
        return projects.find(p => p.path === resolvedPath) || null;
    }
    addAgentToProject(projectId, agentId) {
        const project = this.getProject(projectId);
        if (!project) {
            return false;
        }
        if (!project.agents.includes(agentId)) {
            project.agents.push(agentId);
            this.saveProject(project);
        }
        return true;
    }
    removeAgentFromProject(projectId, agentId) {
        const project = this.getProject(projectId);
        if (!project) {
            return false;
        }
        const index = project.agents.indexOf(agentId);
        if (index > -1) {
            project.agents.splice(index, 1);
            this.saveProject(project);
        }
        return true;
    }
    async stopProject(projectId) {
        try {
            const project = this.getProject(projectId);
            if (!project) {
                return {
                    success: false,
                    message: `Project '${projectId}' not found`
                };
            }
            // Update project status
            project.status = 'STOPPED';
            this.saveProject(project);
            return {
                success: true,
                message: `Project '${project.name}' stopped successfully`
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Failed to stop project: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    async removeProject(projectId) {
        try {
            const project = this.getProject(projectId);
            if (!project) {
                return {
                    success: false,
                    message: `Project '${projectId}' not found`
                };
            }
            if (project.agents.length > 0) {
                return {
                    success: false,
                    message: `Cannot remove project with active agents. Stop all agents first.`
                };
            }
            // Remove project file
            const projectPath = path.join(this.projectsDir, `${projectId}.json`);
            fs.unlinkSync(projectPath);
            return {
                success: true,
                message: `Project '${project.name}' removed successfully`
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Failed to remove project: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    saveProject(project) {
        const projectPath = path.join(this.projectsDir, `${project.id}.json`);
        fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
    }
}
exports.ProjectManager = ProjectManager;
//# sourceMappingURL=ProjectManager.js.map