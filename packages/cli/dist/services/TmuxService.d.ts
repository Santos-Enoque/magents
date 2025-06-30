import { MagentsConfig } from '../types';
export declare class TmuxService {
    createSession(sessionName: string, workingDir: string, config: MagentsConfig): Promise<void>;
    sessionExists(sessionName: string): boolean;
    attachToSession(sessionName: string): Promise<void>;
    killSession(sessionName: string): Promise<void>;
    listSessions(): string[];
}
//# sourceMappingURL=TmuxService.d.ts.map