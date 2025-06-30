"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configRoutes = void 0;
const express_1 = require("express");
const configController_1 = require("../controllers/configController");
const router = (0, express_1.Router)();
exports.configRoutes = router;
// GET /api/config - Get current configuration
router.get('/', async (req, res, next) => {
    try {
        const config = await configController_1.configController.getConfig();
        const response = {
            success: true,
            data: config
        };
        res.json(response);
    }
    catch (error) {
        next(error);
    }
});
// PUT /api/config - Update configuration
router.put('/', async (req, res, next) => {
    try {
        const updates = req.body;
        const config = await configController_1.configController.updateConfig(updates);
        const response = {
            success: true,
            message: 'Configuration updated successfully',
            data: config
        };
        res.json(response);
    }
    catch (error) {
        next(error);
    }
});
// POST /api/config/reset - Reset configuration to defaults
router.post('/reset', async (req, res, next) => {
    try {
        const config = await configController_1.configController.resetConfig();
        const response = {
            success: true,
            message: 'Configuration reset to defaults',
            data: config
        };
        res.json(response);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=config.js.map