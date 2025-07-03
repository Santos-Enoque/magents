"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.io = exports.app = exports.websocketService = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const shared_1 = require("@magents/shared");
const agents_1 = require("./routes/agents");
const projects_1 = require("./routes/projects");
const config_1 = require("./routes/config");
const health_1 = require("./routes/health");
const taskmaster_1 = require("./routes/taskmaster");
const metrics_1 = require("./routes/metrics");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./middleware/logger");
const websocket_1 = require("./services/websocket");
const DatabaseService_1 = require("./services/DatabaseService");
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
exports.server = server;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:4000",
        methods: ["GET", "POST"]
    }
});
exports.io = io;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(logger_1.logger);
// Routes
app.use(shared_1.API_ENDPOINTS.HEALTH, health_1.healthRoutes);
app.use(shared_1.API_ENDPOINTS.AGENTS, agents_1.agentRoutes);
app.use(shared_1.API_ENDPOINTS.PROJECTS, projects_1.projectRoutes);
app.use(shared_1.API_ENDPOINTS.CONFIG, config_1.configRoutes);
app.use('/api/taskmaster', taskmaster_1.taskMasterRoutes);
app.use('/api/metrics', metrics_1.metricsRoutes);
// WebSocket setup
const websocketService = (0, websocket_1.setupWebSocket)(io);
exports.websocketService = websocketService;
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
// Initialize database service
async function initializeServices() {
    try {
        console.log('🔧 Initializing services...');
        const dbService = DatabaseService_1.DatabaseService.getInstance();
        await dbService.initialize();
        console.log('✅ Services initialized successfully');
    }
    catch (error) {
        console.error('❌ Failed to initialize services:', error);
        // Don't exit - fallback to file-based storage
    }
}
// Start server
const PORT = parseInt(process.env.PORT || shared_1.PORT_RANGES.BACKEND_DEFAULT.toString(), 10);
const HOST = process.env.HOST || 'localhost';
// Initialize services first, then start server
initializeServices().then(() => {
    server.listen(PORT, HOST, () => {
        console.log(`🚀 Magents Backend Server running on http://${HOST}:${PORT}`);
        console.log(`📡 WebSocket server running on ws://${HOST}:${PORT}`);
        console.log(`🌐 API available at http://${HOST}:${PORT}/api`);
    });
}).catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
// Graceful shutdown
async function gracefulShutdown(signal) {
    console.log(`${signal} received, shutting down gracefully`);
    try {
        // Shutdown database service
        const dbService = DatabaseService_1.DatabaseService.getInstance();
        await dbService.shutdown();
    }
    catch (error) {
        console.error('Error shutting down database service:', error);
    }
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
//# sourceMappingURL=server.js.map