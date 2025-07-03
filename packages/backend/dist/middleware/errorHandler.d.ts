import { Request, Response, NextFunction } from 'express';
export interface EnhancedApiResponse {
    success: boolean;
    message: string;
    error: {
        code: string;
        userMessage: string;
        suggestions: string[];
        severity: string;
        recoverable: boolean;
        autoFixAttempted?: boolean;
        autoFixSuggestions?: Record<string, any>;
        learnMoreUrl?: string;
        requestId?: string;
    };
}
export declare const errorHandler: (err: Error, req: Request, res: Response, _next: NextFunction) => Promise<void>;
//# sourceMappingURL=errorHandler.d.ts.map