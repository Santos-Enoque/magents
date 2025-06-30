import { Server as SocketIOServer } from 'socket.io';
import { AgentEvent } from '@magents/shared';
export declare const setupWebSocket: (io: SocketIOServer) => {
    broadcastAgentEvent: (event: AgentEvent) => void;
    broadcastProjectUpdate: (projectId: string, data: any) => void;
    broadcastConfigChange: (config: any) => void;
};
//# sourceMappingURL=websocket.d.ts.map