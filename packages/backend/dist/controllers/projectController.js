"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectController = void 0;
const ProjectService_1 = require("../services/ProjectService");
// Use the ProjectService factory to get the appropriate implementation
const getProjectManager = () => ProjectService_1.ProjectService.getInstance();
exports.projectController = {
    async listProjects() {
        return await getProjectManager().listProjects();
    },
    async getProject(id) {
        return await getProjectManager().getProject(id);
    },
    async createProject(options) {
        return await getProjectManager().createProject(options);
    },
    async updateProject(id, updates) {
        return await getProjectManager().updateProject(id, updates);
    },
    async deleteProject(id) {
        return await getProjectManager().deleteProject(id);
    },
    async addAgentToProject(projectId, agentId) {
        return await getProjectManager().addAgentToProject(projectId, agentId);
    },
    async removeAgentFromProject(projectId, agentId) {
        return await getProjectManager().removeAgentFromProject(projectId, agentId);
    },
    async getProjectStats(id) {
        return await getProjectManager().getProjectStats(id);
    },
    async searchProjects(query) {
        return await getProjectManager().searchProjects(query);
    },
    async getProjectsByStatus(status) {
        return await getProjectManager().getProjectsByStatus(status);
    },
    async getProjectSettings(id) {
        return await getProjectManager().getProjectSettings(id);
    },
    async updateProjectSettings(id, settings) {
        return await getProjectManager().updateProjectSettings(id, settings);
    },
    async resetProjectSettings(id) {
        return await getProjectManager().resetProjectSettings(id);
    },
    async createProjectFromTemplate(templateName, options) {
        return await getProjectManager().createProjectFromTemplate(templateName, options);
    },
    async getProjectTemplate(templateName) {
        return await getProjectManager().getProjectTemplate(templateName);
    },
    async saveProjectTemplate(templateName, template) {
        return await getProjectManager().saveProjectTemplate(templateName, template);
    },
    async listProjectTemplates() {
        return await getProjectManager().listProjectTemplates();
    }
};
//# sourceMappingURL=projectController.js.map