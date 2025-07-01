import { MagentsConfig } from '../types';
export declare class TmuxService {
    createSession(sessionName: string, workingDir: string, config: MagentsConfig): Promise<void>;
    sessionExists(sessionName: string): boolean;
    attachToSession(sessionName: string): Promise<void>;
    killSession(sessionName: string): Promise<void>;
    listSessions(): string[];
    getSessionWindows(sessionName: string): string[];
    capturePane(sessionName: string, windowName?: string, lines?: number): string;
    getSessionInfo(sessionName: string): {
        windows: string[];
        activeWindow: string;
    } | null;
    sendCommand(sessionName: string, command: string, windowName?: string): void;
}
//# sourceMappingURL=TmuxService.d.ts.map