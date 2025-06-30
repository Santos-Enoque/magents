"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRoutes = void 0;
const express_1 = require("express");
const projectController_1 = require("../controllers/projectController");
const router = (0, express_1.Router)();
exports.projectRoutes = router;
// GET /api/projects - List all projects
router.get('/', async (req, res, next) => {
    try {
        const projects = await projectController_1.projectController.listProjects();
        const response = {
            success: true,
            data: projects
        };
        res.json(response);
    }
    catch (error) {
        next(error);
    }
});
// GET /api/projects/:id - Get specific project
router.get('/:id', async (req, res, next) => {
    try {
        const project = await projectController_1.projectController.getProject(req.params.id);
        const response = {
            success: true,
            data: project
        };
        res.json(response);
    }
    catch (error) {
        next(error);
    }
});
// POST /api/projects - Create new project
router.post('/', async (req, res, next) => {
    try {
        const options = req.body;
        const project = await projectController_1.projectController.createProject(options);
        const response = {
            success: true,
            message: 'Project created successfully',
            data: project
        };
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
});
// PUT /api/projects/:id - Update project
router.put('/:id', async (req, res, next) => {
    try {
        const updates = req.body;
        const project = await projectController_1.projectController.updateProject(req.params.id, updates);
        const response = {
            success: true,
            message: 'Project updated successfully',
            data: project
        };
        res.json(response);
    }
    catch (error) {
        next(error);
    }
});
// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res, next) => {
    try {
        await projectController_1.projectController.deleteProject(req.params.id);
        const response = {
            success: true,
            message: 'Project deleted successfully'
        };
        res.json(response);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=projects.js.map