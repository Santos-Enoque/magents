"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
exports.healthRoutes = router;
router.get('/', (req, res) => {
    const response = {
        success: true,
        message: 'Magents Backend API is healthy',
        data: {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development'
        }
    };
    res.json(response);
});
//# sourceMappingURL=health.js.map