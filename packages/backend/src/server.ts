import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { API_ENDPOINTS, WS_EVENTS, PORT_RANGES } from '@magents/shared';
import { agentRoutes } from './routes/agents';
import { projectRoutes } from './routes/projects';
import { configRoutes } from './routes/config';
import { healthRoutes } from './routes/health';
import { taskMasterRoutes } from './routes/taskmaster';
import { metricsRoutes } from './routes/metrics';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';
import { setupWebSocket } from './services/websocket';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:4000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Routes
app.use(API_ENDPOINTS.HEALTH, healthRoutes);
app.use(API_ENDPOINTS.AGENTS, agentRoutes);
app.use(API_ENDPOINTS.PROJECTS, projectRoutes);
app.use(API_ENDPOINTS.CONFIG, configRoutes);
app.use('/api/taskmaster', taskMasterRoutes);
app.use('/api/metrics', metricsRoutes);

// WebSocket setup
const websocketService = setupWebSocket(io);

// Export WebSocket service for use in controllers
export { websocketService };

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = parseInt(process.env.PORT || PORT_RANGES.BACKEND_DEFAULT.toString(), 10);
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

export { app, io, server };