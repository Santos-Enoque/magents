import { Server as SocketIOServer } from 'socket.io';
declare const app: import("express-serve-static-core").Express;
declare const server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
declare const io: SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
declare const websocketService: {
    broadcastAgentEvent: (event: import("@magents/shared").AgentEvent) => void;
    broadcastProjectUpdate: (projectId: string, data: Record<string, unknown>) => void;
    broadcastConfigChange: (config: unknown) => void;
    broadcastAgentProgress: (agentId: string, progress: import("@magents/shared").AgentCreationProgress) => void;
};
export { websocketService };
export { app, io, server };
//# sourceMappingURL=server.d.ts.map