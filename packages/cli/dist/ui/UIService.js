"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ui = exports.UIService = void 0;
const chalk_1 = __importDefault(require("chalk"));
const gradient_string_1 = __importDefault(require("gradient-string"));
const boxen_1 = __importDefault(require("boxen"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const ora_1 = __importDefault(require("ora"));
const log_symbols_1 = __importDefault(require("log-symbols"));
const figures_1 = __importDefault(require("figures"));
const cli_spinners_1 = __importDefault(require("cli-spinners"));
const ascii_art_1 = require("./ascii-art");
class UIService {
    constructor() {
        // Create a beautiful gradient similar to Claude Code
        const magentsGradient = (0, gradient_string_1.default)(['#FF6B6B', '#4ECDC4', '#45B7D1']);
        this.theme = {
            colors: {
                primary: chalk_1.default.hex('#4ECDC4'),
                success: chalk_1.default.hex('#26de81'),
                warning: chalk_1.default.hex('#FED330'),
                error: chalk_1.default.hex('#FC5C65'),
                info: chalk_1.default.hex('#45B7D1'),
                muted: chalk_1.default.gray,
                highlight: chalk_1.default.hex('#A55EEA')
            },
            gradient: magentsGradient,
            icons: {
                ...log_symbols_1.default,
                agent: figures_1.default.circleFilled,
                worktree: figures_1.default.triangleRight,
                tmux: figures_1.default.squareSmallFilled,
                claude: figures_1.default.star,
                config: figures_1.default.pointer,
                git: figures_1.default.arrowRight
            }
        };
    }
    static getInstance() {
        if (!UIService.instance) {
            UIService.instance = new UIService();
        }
        return UIService.instance;
    }
    // Header with gradient
    header(text, showLogo = false) {
        if (showLogo) {
            console.log('\n' + this.theme.gradient(ascii_art_1.MAGENTS_LOGO));
            console.log(this.theme.gradient(ascii_art_1.MAGENTS_BANNER));
        }
        else {
            console.log('\n' + this.theme.gradient(figures_1.default.line.repeat(60)));
            console.log(this.theme.gradient(text.padStart(35 + text.length / 2).padEnd(60)));
            console.log(this.theme.gradient(figures_1.default.line.repeat(60)) + '\n');
        }
    }
    // Styled box for important information
    box(content, title, color = 'primary') {
        const options = {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: this.getColorHex(color),
            title,
            titleAlignment: 'center'
        };
        console.log((0, boxen_1.default)(content, options));
    }
    // Success message with icon
    success(message) {
        console.log(`${this.theme.icons.success} ${this.theme.colors.success(message)}`);
    }
    // Error message with icon
    error(message) {
        console.log(`${this.theme.icons.error} ${this.theme.colors.error(message)}`);
    }
    // Warning message with icon
    warning(message) {
        console.log(`${this.theme.icons.warning} ${this.theme.colors.warning(message)}`);
    }
    // Info message with icon
    info(message) {
        console.log(`${this.theme.icons.info} ${this.theme.colors.info(message)}`);
    }
    // Muted text for less important information
    muted(message) {
        console.log(this.theme.colors.muted(message));
    }
    // Create a spinner with custom style
    spinner(text, spinnerName = 'dots12') {
        return (0, ora_1.default)({
            text: this.theme.colors.info(text),
            spinner: cli_spinners_1.default[spinnerName],
            color: 'cyan'
        });
    }
    // Create a beautiful table
    table(headers, rows, options) {
        const table = new cli_table3_1.default({
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
    agentDetails(agent) {
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
    agentList(agents) {
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
    divider(text) {
        const line = figures_1.default.line.repeat(50);
        if (text) {
            const padding = Math.floor((50 - text.length - 2) / 2);
            const paddedText = `${figures_1.default.line.repeat(padding)} ${text} ${figures_1.default.line.repeat(padding)}`;
            console.log('\n' + this.theme.colors.muted(paddedText.substring(0, 50)) + '\n');
        }
        else {
            console.log('\n' + this.theme.colors.muted(line) + '\n');
        }
    }
    // Step indicator for multi-step processes
    step(current, total, description) {
        const progress = `[${current}/${total}]`;
        console.log(`${this.theme.colors.primary.bold(progress)} ${description}`);
    }
    // Command suggestion
    command(cmd, description) {
        const formattedCmd = `  ${this.theme.colors.highlight('$')} ${this.theme.colors.primary.bold(cmd)}`;
        if (description) {
            console.log(`${formattedCmd} ${this.theme.colors.muted(`# ${description}`)}`);
        }
        else {
            console.log(formattedCmd);
        }
    }
    // Key-value pair display
    keyValue(key, value, icon) {
        const iconStr = icon ? `${icon} ` : '';
        console.log(`${iconStr}${this.theme.colors.primary.bold(key + ':')} ${value}`);
    }
    // Helper to get status color
    getStatusColor(status) {
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
    getColorHex(color) {
        const colorMap = {
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
exports.UIService = UIService;
// Export singleton instance
exports.ui = UIService.getInstance();
//# sourceMappingURL=UIService.js.map