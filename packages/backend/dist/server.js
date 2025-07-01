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
const tmux_1 = require("./routes/tmux");
const taskmaster_1 = require("./routes/taskmaster");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./middleware/logger");
const websocket_1 = require("./services/websocket");
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
exports.server = server;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
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
app.use('/api/tmux', tmux_1.tmuxRoutes);
app.use('/api/taskmaster', taskmaster_1.taskMasterRoutes);
// WebSocket setup
const websocketService = (0, websocket_1.setupWebSocket)(io);
exports.websocketService = websocketService;
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
// Start server
const PORT = parseInt(process.env.PORT || shared_1.PORT_RANGES.BACKEND_DEFAULT.toString(), 10);
const HOST = process.env.HOST || 'localhost';
server.listen(PORT, HOST, () => {
    console.log(`🚀 Magents Backend Server running on http://${HOST}:${PORT}`);
    console.log(`📡 WebSocket server running on ws://${HOST}:${PORT}`);
    console.log(`🌐 API available at http://${HOST}:${PORT}/api`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});
//# sourceMappingURL=server.js.map