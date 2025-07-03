/**
 * Standard Command Implementations for GUI-CLI Integration
 *
 * Provides concrete implementations of common commands that can be
 * executed from both GUI and CLI interfaces.
 */
import { ICommand, CommandOptions, CoreCommandResult } from './index';
/**
 * Agent Management Commands
 */
export declare class CreateAgentCommand implements ICommand {
    name: string;
    description: string;
    category: "agent";
    requiredParams: string[];
    optionalParams: string[];
    execute(options: CommandOptions): Promise<CoreCommandResult>;
}
export declare class StartAgentCommand implements ICommand {
    name: string;
    description: string;
    category: "agent";
    requiredParams: string[];
    optionalParams: never[];
    execute(options: CommandOptions): Promise<CoreCommandResult>;
}
export declare class StopAgentCommand implements ICommand {
    name: string;
    description: string;
    category: "agent";
    requiredParams: string[];
    optionalParams: string[];
    execute(options: CommandOptions): Promise<CoreCommandResult>;
}
export declare class DeleteAgentCommand implements ICommand {
    name: string;
    description: string;
    category: "agent";
    requiredParams: string[];
    optionalParams: string[];
    execute(options: CommandOptions): Promise<CoreCommandResult>;
}
export declare class ListAgentsCommand implements ICommand {
    name: string;
    description: string;
    category: "agent";
    requiredParams: never[];
    optionalParams: string[];
    execute(options: CommandOptions): Promise<CoreCommandResult>;
}
/**
 * Project Management Commands
 */
export declare class CreateProjectCommand implements ICommand {
    name: string;
    description: string;
    category: "project";
    requiredParams: string[];
    optionalParams: string[];
    execute(options: CommandOptions): Promise<CoreCommandResult>;
}
export declare class ListProjectsCommand implements ICommand {
    name: string;
    description: string;
    category: "project";
    requiredParams: never[];
    optionalParams: string[];
    execute(options: CommandOptions): Promise<CoreCommandResult>;
}
/**
 * System Commands
 */
export declare class SystemStatusCommand implements ICommand {
    name: string;
    description: string;
    category: "system";
    requiredParams: never[];
    optionalParams: string[];
    execute(options: CommandOptions): Promise<CoreCommandResult>;
}
export declare class CleanupCommand implements ICommand {
    name: string;
    description: string;
    category: "system";
    requiredParams: never[];
    optionalParams: string[];
    execute(options: CommandOptions): Promise<CoreCommandResult>;
}
/**
 * Configuration Commands
 */
export declare class ConfigGetCommand implements ICommand {
    name: string;
    description: string;
    category: "config";
    requiredParams: string[];
    optionalParams: never[];
    execute(options: CommandOptions): Promise<CoreCommandResult>;
}
export declare class ConfigSetCommand implements ICommand {
    name: string;
    description: string;
    category: "config";
    requiredParams: string[];
    optionalParams: never[];
    execute(options: CommandOptions): Promise<CoreCommandResult>;
}
export declare const STANDARD_COMMANDS: (typeof CreateAgentCommand | typeof CreateProjectCommand | typeof SystemStatusCommand | typeof ConfigGetCommand)[];
//# sourceMappingURL=commands.d.ts.map