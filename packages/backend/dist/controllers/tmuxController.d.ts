export declare const tmuxController: {
    getSessionContent(sessionName: string, windowName?: string, lines?: number): Promise<{
        sessionName: string;
        windowName: string;
        windows: string[];
        activeWindow: string;
        content: string;
        lines: number;
        timestamp: string;
    }>;
    getSessionInfo(sessionName: string): Promise<{
        sessionName: string;
        windows: string[];
        activeWindow: string;
        exists: boolean;
    }>;
    sendCommand(sessionName: string, command: string, windowName?: string): Promise<{
        sessionName: string;
        windowName: string | undefined;
        command: string;
        timestamp: string;
        success: boolean;
    }>;
    listSessions(): Promise<{
        sessions: string[];
        count: number;
    }>;
};
//# sourceMappingURL=tmuxController.d.ts.map