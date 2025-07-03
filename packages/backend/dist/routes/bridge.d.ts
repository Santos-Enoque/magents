/**
 * GUI-CLI Integration Bridge API Routes
 *
 * Provides WebSocket and SSE endpoints for real-time synchronization
 * between GUI and CLI interfaces.
 */
import { WebSocket } from 'ws';
declare const router: import("express-serve-static-core").Router;
/**
 * WebSocket upgrade handler (to be used with express server)
 */
export declare const handleWebSocketUpgrade: (ws: WebSocket, req: any) => void;
export default router;
//# sourceMappingURL=bridge.d.ts.map