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
import { featureRoutes } from './routes/features';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';
import { setupWebSocket } from './services/websocket';
import { DatabaseService } from './services/DatabaseService';
import { registerTaskMasterIntegration } from '@magents/shared/src/integrations/taskmaster/registry';
import { registerInternalTaskIntegration } from '@magents/shared/src/integrations/internal';

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
app.use('/api/features', featureRoutes);

// WebSocket setup
const websocketService = setupWebSocket(io);

// Export WebSocket service for use in controllers
export { websocketService };

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database service
async function initializeServices() {
  try {
    console.log('🔧 Initializing services...');
    const dbService = DatabaseService.getInstance();
    await dbService.initialize();
    
    // Register task integrations
    console.log('📋 Registering task integrations...');
    registerTaskMasterIntegration();
    registerInternalTaskIntegration();
    
    console.log('✅ Services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    // Don't exit - fallback to file-based storage
  }
}

// Start server
const PORT = parseInt(process.env.PORT || PORT_RANGES.BACKEND_DEFAULT.toString(), 10);
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
async function gracefulShutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);
  
  try {
    // Shutdown database service
    const dbService = DatabaseService.getInstance();
    await dbService.shutdown();
  } catch (error) {
    console.error('Error shutting down database service:', error);
  }
  
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, io, server };