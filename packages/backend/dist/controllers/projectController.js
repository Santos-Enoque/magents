"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectController = void 0;
const ProjectManager_1 = require("../services/ProjectManager");
const projectManager = ProjectManager_1.ProjectManager.getInstance();
exports.projectController = {
    async listProjects() {
        return await projectManager.listProjects();
    },
    async getProject(id) {
        return await projectManager.getProject(id);
    },
    async createProject(options) {
        return await projectManager.createProject(options);
    },
    async updateProject(id, updates) {
        return await projectManager.updateProject(id, updates);
    },
    async deleteProject(id) {
        return await projectManager.deleteProject(id);
    },
    async addAgentToProject(projectId, agentId) {
        return await projectManager.addAgentToProject(projectId, agentId);
    },
    async removeAgentFromProject(projectId, agentId) {
        return await projectManager.removeAgentFromProject(projectId, agentId);
    },
    async getProjectStats(id) {
        return await projectManager.getProjectStats(id);
    },
    async searchProjects(query) {
        return await projectManager.searchProjects(query);
    },
    async getProjectsByStatus(status) {
        return await projectManager.getProjectsByStatus(status);
    },
    async getProjectSettings(id) {
        return await projectManager.getProjectSettings(id);
    },
    async updateProjectSettings(id, settings) {
        return await projectManager.updateProjectSettings(id, settings);
    },
    async resetProjectSettings(id) {
        return await projectManager.resetProjectSettings(id);
    },
    async createProjectFromTemplate(templateName, options) {
        return await projectManager.createProjectFromTemplate(templateName, options);
    },
    async getProjectTemplate(templateName) {
        return await projectManager.getProjectTemplate(templateName);
    },
    async saveProjectTemplate(templateName, template) {
        return await projectManager.saveProjectTemplate(templateName, template);
    },
    async listProjectTemplates() {
        return await projectManager.listProjectTemplates();
    }
};
//# sourceMappingURL=projectController.js.map