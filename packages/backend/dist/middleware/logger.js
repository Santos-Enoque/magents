"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const shared_1 = require("@magents/shared");
const logger = (req, res, next) => {
    const start = Date.now();
    const { method, url, ip } = req;
    // Log request
    console.log((0, shared_1.formatLogMessage)('info', `${method} ${url}`, { ip, userAgent: req.get('User-Agent') }));
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        const level = statusCode >= 400 ? 'error' : 'info';
        console.log((0, shared_1.formatLogMessage)(level, `${method} ${url} - ${statusCode}`, {
            duration: `${duration}ms`,
            ip,
            statusCode
        }));
    });
    next();
};
exports.logger = logger;
//# sourceMappingURL=logger.js.map