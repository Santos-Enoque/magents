export interface ProjectAnalysis {
    projectType: string;
    languages: string[];
    frameworks: string[];
    testingTools: string[];
    hasTests: boolean;
    hasDocker: boolean;
    hasCI: boolean;
    packageManager: string;
    suggestedTasks: TaskSuggestion[];
}
export interface TaskSuggestion {
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    complexity: number;
    category: string;
    rationale: string;
    assignToAgent?: string;
}
export declare class AssignCommand {
    private configManager;
    private agentManager;
    private gitService;
    constructor();
    execute(options: {
        analyze?: boolean;
        autoCreate?: boolean;
        projectPath?: string;
        maxTasks?: number;
        category?: string;
        priority?: string;
        agent?: string;
        dryRun?: boolean;
        mode?: string;
    }): Promise<void>;
    private analyzeProject;
    private getAllFiles;
    private generateBasicTasks;
    private checkTaskMaster;
    private setupTaskMaster;
    private generateTasksWithAI;
    private generatePRDFromAnalysis;
    private displayAnalysis;
    private displayTasks;
    private createTasksInTaskMaster;
    private assignTasksToAgents;
}
export declare const assignCommand: AssignCommand;
//# sourceMappingURL=assign.d.ts.map