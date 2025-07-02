import chalk from 'chalk';
import { Ora } from 'ora';
import logSymbols from 'log-symbols';
import cliSpinners from 'cli-spinners';
import { MagentsError } from '@magents/shared';
export type ColorName = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'muted' | 'highlight';
export interface UITheme {
    colors: Record<ColorName, typeof chalk>;
    gradient: any;
    icons: typeof logSymbols & {
        agent: string;
        worktree: string;
        tmux: string;
        claude: string;
        config: string;
        git: string;
    };
}
export declare class UIService {
    private static instance;
    private theme;
    private constructor();
    static getInstance(): UIService;
    header(text: string, showLogo?: boolean): void;
    box(content: string, title?: string, color?: ColorName): void;
    success(message: string): void;
    error(message: string): void;
    enhancedError(error: MagentsError | Error): void;
    errorSummary(errors: MagentsError[], title?: string): void;
    warning(message: string): void;
    info(message: string): void;
    muted(message: string): void;
    spinner(text: string, spinnerName?: keyof typeof cliSpinners): Ora;
    table(headers: string[], rows: string[][], options?: any): void;
    agentDetails(agent: {
        id: string;
        branch: string;
        worktreePath: string;
        tmuxSession: string;
        status: string;
        createdAt: Date;
    }): void;
    agentList(agents: Array<{
        id: string;
        branch: string;
        status: string;
        createdAt: Date;
    }>): void;
    divider(text?: string): void;
    step(current: number, total: number, description: string): void;
    command(cmd: string, description?: string): void;
    keyValue(key: string, value: string, icon?: string): void;
    tip(message: string): void;
    example(command: string): void;
    list(items: string[]): void;
    private getStatusColor;
    private getColorHex;
    private getSeverityIcon;
    private getSeverityColor;
}
export declare const ui: UIService;
//# sourceMappingURL=UIService.d.ts.map