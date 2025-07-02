"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const magentsTaskController_1 = require("../controllers/magentsTaskController");
const router = (0, express_1.Router)();
// Quick start Task Master
router.post('/quick-start', (req, res) => magentsTaskController_1.magentsTaskController.quickStart(req, res));
// Auto-analyze project
router.post('/auto-analyze', (req, res) => magentsTaskController_1.magentsTaskController.autoAnalyze(req, res));
// Get simplified tasks
router.get('/tasks', (req, res) => magentsTaskController_1.magentsTaskController.getSimplifiedTasks(req, res));
// Get next task
router.get('/next-task', (req, res) => magentsTaskController_1.magentsTaskController.getNextTask(req, res));
// Create simple task
router.post('/tasks', (req, res) => magentsTaskController_1.magentsTaskController.createSimpleTask(req, res));
exports.default = router;
//# sourceMappingURL=magentsTasks.js.map