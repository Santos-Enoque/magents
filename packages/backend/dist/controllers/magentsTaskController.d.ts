import { Request, Response } from 'express';
export declare class MagentsTaskController {
    /**
     * Quick start Task Master for a project
     */
    quickStart(req: Request, res: Response): Promise<void>;
    /**
     * Auto-analyze project and generate tasks
     */
    autoAnalyze(req: Request, res: Response): Promise<void>;
    /**
     * Get simplified task list
     */
    getSimplifiedTasks(req: Request, res: Response): Promise<void>;
    /**
     * Get next available task
     */
    getNextTask(req: Request, res: Response): Promise<void>;
    /**
     * Create a simple task
     */
    createSimpleTask(req: Request, res: Response): Promise<void>;
}
export declare const magentsTaskController: MagentsTaskController;
//# sourceMappingURL=magentsTaskController.d.ts.map