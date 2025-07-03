export declare class TaskMasterCommand {
    private configManager;
    constructor();
    execute(action: string, options?: any): Promise<void>;
    private promptToEnable;
    private isTaskMasterAvailable;
    private handleMissingTaskMaster;
    private showStatus;
    private enableTaskMaster;
    private disableTaskMaster;
    private installTaskMaster;
    private hasTaskMasterProject;
    private passThrough;
}
export declare const taskMasterCommand: TaskMasterCommand;
//# sourceMappingURL=taskmaster.d.ts.map