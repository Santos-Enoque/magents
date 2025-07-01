import { Server as SocketIOServer } from 'socket.io';
import { AgentEvent, AgentCreationProgress } from '@magents/shared';
export declare const setupWebSocket: (io: SocketIOServer) => {
    broadcastAgentEvent: (event: AgentEvent) => void;
    broadcastProjectUpdate: (projectId: string, data: Record<string, unknown>) => void;
    broadcastConfigChange: (config: unknown) => void;
    broadcastAgentProgress: (agentId: string, progress: AgentCreationProgress) => void;
};
//# sourceMappingURL=websocket.d.ts.map