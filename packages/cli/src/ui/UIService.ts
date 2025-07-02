import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';
import Table from 'cli-table3';
import ora, { Ora } from 'ora';
import logSymbols from 'log-symbols';
import figures from 'figures';
import cliSpinners from 'cli-spinners';
import { MAGENTS_LOGO, MAGENTS_BANNER } from './ascii-art';

export type ColorName = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'muted' | 'highlight';

export interface UITheme {
  colors: Record<ColorName, typeof chalk>;
  gradient: any; // gradient-string types
  icons: typeof logSymbols & {
    agent: string;
    worktree: string;
    tmux: string;
    claude: string;
    config: string;
    git: string;
  };
}

export class UIService {
  private static instance: UIService;
  private theme: UITheme;

  private constructor() {
    // Create a beautiful gradient similar to Claude Code
    const magentsGradient = gradient(['#FF6B6B', '#4ECDC4', '#45B7D1']);
    
    this.theme = {
      colors: {
        primary: chalk.hex('#4ECDC4'),
        success: chalk.hex('#26de81'),
        warning: chalk.hex('#FED330'),
        error: chalk.hex('#FC5C65'),
        info: chalk.hex('#45B7D1'),
        muted: chalk.gray,
        highlight: chalk.hex('#A55EEA')
      },
      gradient: magentsGradient,
      icons: {
        ...logSymbols,
        agent: figures.circleFilled,
        worktree: figures.triangleRight,
        tmux: figures.squareSmallFilled,
        claude: figures.star,
        config: figures.pointer,
        git: figures.arrowRight
      }
    };
  }

  static getInstance(): UIService {
    if (!UIService.instance) {
      UIService.instance = new UIService();
    }
    return UIService.instance;
  }

  // Header with gradient
  header(text: string, showLogo: boolean = false): void {
    if (showLogo) {
      console.log('\n' + this.theme.gradient(MAGENTS_LOGO));
      console.log(this.theme.gradient(MAGENTS_BANNER));
    } else {
      console.log('\n' + this.theme.gradient(figures.line.repeat(60)));
      console.log(this.theme.gradient(text.padStart(35 + text.length/2).padEnd(60)));
      console.log(this.theme.gradient(figures.line.repeat(60)) + '\n');
    }
  }

  // Styled box for important information
  box(content: string, title?: string, color: ColorName = 'primary'): void {
    const options: any = {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: this.getColorHex(color),
      title,
      titleAlignment: 'center'
    };
    
    console.log(boxen(content, options));
  }

  // Success message with icon
  success(message: string): void {
    console.log(`${this.theme.icons.success} ${this.theme.colors.success(message)}`);
  }

  // Error message with icon
  error(message: string): void {
    console.log(`${this.theme.icons.error} ${this.theme.colors.error(message)}`);
  }

  // Warning message with icon
  warning(message: string): void {
    console.log(`${this.theme.icons.warning} ${this.theme.colors.warning(message)}`);
  }

  // Info message with icon
  info(message: string): void {
    console.log(`${this.theme.icons.info} ${this.theme.colors.info(message)}`);
  }

  // Muted text for less important information
  muted(message: string): void {
    console.log(this.theme.colors.muted(message));
  }

  // Create a spinner with custom style
  spinner(text: string, spinnerName: keyof typeof cliSpinners = 'dots12'): Ora {
    return ora({
      text: this.theme.colors.info(text),
      spinner: cliSpinners[spinnerName],
      color: 'cyan'
    });
  }

  // Create a beautiful table
  table(headers: string[], rows: string[][], options?: any): void {
    const table = new Table({
      head: headers.map(h => this.theme.colors.primary.bold(h)),
      style: {
        head: [],
        border: [],
        'padding-left': 2,
        'padding-right': 2,
        ...options?.style
      },
      chars: {
        'top': '═',
        'top-mid': '╤',
        'top-left': '╔',
        'top-right': '╗',
        'bottom': '═',
        'bottom-mid': '╧',
        'bottom-left': '╚',
        'bottom-right': '╝',
        'left': '║',
        'left-mid': '╠',
        'mid': '─',
        'mid-mid': '┼',
        'right': '║',
        'right-mid': '╣',
        'middle': '│'
      },
      wordWrap: true,
      ...options
    });

    rows.forEach(row => {
      table.push(row);
    });

    console.log(table.toString());
  }

  // Display agent details in a structured format
  agentDetails(agent: {
    id: string;
    branch: string;
    worktreePath: string;
    tmuxSession: string;
    status: string;
    createdAt: Date;
  }): void {
    const details = [
      `${this.theme.icons.agent} ${this.theme.colors.primary.bold('Agent ID:')} ${agent.id}`,
      `${this.theme.icons.git} ${this.theme.colors.primary.bold('Branch:')} ${agent.branch}`,
      `${this.theme.icons.worktree} ${this.theme.colors.primary.bold('Worktree:')} ${this.theme.colors.muted(agent.worktreePath)}`,
      `${this.theme.icons.tmux} ${this.theme.colors.primary.bold('Tmux Session:')} ${agent.tmuxSession}`,
      `${this.theme.icons.info} ${this.theme.colors.primary.bold('Status:')} ${this.getStatusColor(agent.status)(agent.status)}`,
      `${this.theme.icons.info} ${this.theme.colors.primary.bold('Created:')} ${this.theme.colors.muted(agent.createdAt.toLocaleString())}`
    ].join('\n');

    this.box(details, `Agent: ${agent.id}`, 'primary');
  }

  // Display multiple agents in a table
  agentList(agents: Array<{
    id: string;
    branch: string;
    status: string;
    createdAt: Date;
  }>): void {
    if (agents.length === 0) {
      this.info('No active agents found.');
      return;
    }

    const headers = ['#', 'ID', 'Branch', 'Status', 'Created'];
    const rows = agents.map((agent, index) => [
      this.theme.colors.muted(`${index + 1}`),
      this.theme.colors.highlight(agent.id),
      this.theme.colors.info(agent.branch),
      this.getStatusColor(agent.status)(agent.status),
      this.theme.colors.muted(agent.createdAt.toLocaleString())
    ]);

    this.table(headers, rows);
  }

  // Section divider
  divider(text?: string): void {
    const line = figures.line.repeat(50);
    if (text) {
      const padding = Math.floor((50 - text.length - 2) / 2);
      const paddedText = `${figures.line.repeat(padding)} ${text} ${figures.line.repeat(padding)}`;
      console.log('\n' + this.theme.colors.muted(paddedText.substring(0, 50)) + '\n');
    } else {
      console.log('\n' + this.theme.colors.muted(line) + '\n');
    }
  }

  // Step indicator for multi-step processes
  step(current: number, total: number, description: string): void {
    const progress = `[${current}/${total}]`;
    console.log(`${this.theme.colors.primary.bold(progress)} ${description}`);
  }

  // Command suggestion
  command(cmd: string, description?: string): void {
    const formattedCmd = `  ${this.theme.colors.highlight('$')} ${this.theme.colors.primary.bold(cmd)}`;
    if (description) {
      console.log(`${formattedCmd} ${this.theme.colors.muted(`# ${description}`)}`);
    } else {
      console.log(formattedCmd);
    }
  }

  // Key-value pair display
  keyValue(key: string, value: string, icon?: string): void {
    const iconStr = icon ? `${icon} ` : '';
    console.log(`${iconStr}${this.theme.colors.primary.bold(key + ':')} ${value}`);
  }

  // Display a helpful tip
  tip(message: string): void {
    console.log(`${chalk.cyan('💡')} ${chalk.cyan(message)}`);
  }

  // Display an example command
  example(command: string): void {
    console.log(`${chalk.gray('Example:')} ${chalk.white(command)}`);
  }

  // Display a list of items
  list(items: string[]): void {
    items.forEach(item => {
      console.log(`  ${chalk.gray('•')} ${item}`);
    });
  }

  // Helper to get status color
  private getStatusColor(status: string): typeof chalk {
    switch (status.toLowerCase()) {
      case 'active':
      case 'running':
      case 'success':
        return this.theme.colors.success;
      case 'stopped':
      case 'inactive':
        return this.theme.colors.warning;
      case 'error':
      case 'failed':
        return this.theme.colors.error;
      default:
        return this.theme.colors.info;
    }
  }

  // Helper to get color hex value
  private getColorHex(color: ColorName): string {
    const colorMap: Record<ColorName, string> = {
      primary: '#4ECDC4',
      success: '#26de81',
      warning: '#FED330',
      error: '#FC5C65',
      info: '#45B7D1',
      muted: '#808080',
      highlight: '#A55EEA'
    };
    return colorMap[color];
  }
}

// Export singleton instance
export const ui = UIService.getInstance();