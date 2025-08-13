import { BaseCommand } from '../base/command.js';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export default class Info extends BaseCommand {
    static description = 'Display mastro information, ASCII art, and tool metadata';
    static examples = [
        '<%= config.bin %> <%= command.id %>'
    ];
    static flags = {
        ...BaseCommand.baseFlags
    };
    async run() {
        try {
            await this.displayAsciiArt();
            await this.displayToolInfo();
            await this.displayConfiguration();
            await this.displaySystemInfo();
        }
        catch (error) {
            await this.handleError(error, 'display info');
        }
    }
    async displayAsciiArt() {
        const art = `
${chalk.cyan('███╗   ███╗ █████╗ ███████╗████████╗██████╗  ██████╗ ')}
${chalk.cyan('████╗ ████║██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗')}
${chalk.cyan('██╔████╔██║███████║███████╗   ██║   ██████╔╝██║   ██║')}
${chalk.cyan('██║╚██╔╝██║██╔══██║╚════██║   ██║   ██╔══██╗██║   ██║')}
${chalk.cyan('██║ ╚═╝ ██║██║  ██║███████║   ██║   ██║  ██║╚██████╔╝')}
${chalk.cyan('╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ')}
                                                          
${chalk.green('🤖 AI-Powered Git Workflow Assistant')}
${chalk.gray('Making your git workflow smarter, one commit at a time')}
    `;
        console.log(art);
    }
    async displayToolInfo() {
        try {
            // Try to read package.json from multiple possible locations
            let packageJson;
            const possiblePaths = [
                join(__dirname, '../../package.json'),
                join(__dirname, '../../../package.json'),
                join(process.cwd(), 'package.json')
            ];
            for (const path of possiblePaths) {
                try {
                    const content = readFileSync(path, 'utf-8');
                    packageJson = JSON.parse(content);
                    if (packageJson.name === 'mastro' || packageJson.name?.includes('mastro')) {
                        break;
                    }
                }
                catch {
                    continue;
                }
            }
            if (!packageJson) {
                packageJson = { version: 'unknown', description: 'AI-powered Git workflow assistant' };
            }
            const info = [
                { label: 'Version', value: packageJson.version || 'unknown', icon: '📦' },
                { label: 'Description', value: packageJson.description || 'AI-powered Git workflow assistant', icon: '📝' },
                { label: 'License', value: packageJson.license || 'unknown', icon: '⚖️' },
                { label: 'Homepage', value: packageJson.homepage || 'N/A', icon: '🌐' },
                { label: 'Repository', value: packageJson.repository?.url || 'N/A', icon: '📂' }
            ];
            console.log(chalk.yellow('\n📊 Tool Information'));
            console.log(chalk.gray('─'.repeat(50)));
            for (const item of info) {
                const label = chalk.blue(item.label.padEnd(15));
                const value = item.value.length > 60 ? item.value.substring(0, 57) + '...' : item.value;
                console.log(`${item.icon} ${label}: ${value}`);
            }
        }
        catch (error) {
            this.log('Unable to read package information', 'warn');
        }
    }
    async displayConfiguration() {
        try {
            const config = await this.configManager.load();
            console.log(chalk.yellow('\n⚙️  Current Configuration'));
            console.log(chalk.gray('─'.repeat(50)));
            const configInfo = [
                {
                    section: '🤖 AI Configuration',
                    items: [
                        `Provider: ${config.ai.provider}`,
                        `Model: ${config.ai.model}`,
                        `Max Tokens: ${config.ai.maxTokens}`,
                        `Temperature: ${config.ai.temperature}`,
                        `API Key: ${config.ai.apiKey ? chalk.green('✓ Set') : chalk.red('✗ Not set')}`
                    ]
                },
                {
                    section: '📝 Git Configuration',
                    items: [
                        `Default Branch: ${config.git.defaultBranch}`,
                        `Include Untracked: ${config.git.includeUntracked ? 'Yes' : 'No'}`,
                        `Max Diff Size: ${config.git.maxDiffSize} lines`
                    ]
                },
                {
                    section: '👥 Team Configuration',
                    items: [
                        `Commit Style: ${config.team.commitStyle}`,
                        `Max Length: ${config.team.maxLength} chars`,
                        `Review Persona: ${config.team.reviewPersona.name} (${config.team.reviewPersona.strictness})`,
                        `Focus Areas: ${config.team.reviewPersona.focus.join(', ')}`
                    ]
                },
                {
                    section: '💾 Cache Configuration',
                    items: [
                        `Enabled: ${config.cache.enabled ? 'Yes' : 'No'}`,
                        `TTL: ${config.cache.ttl} seconds`,
                        `Max Size: ${config.cache.maxSize} entries`
                    ]
                },
                {
                    section: '🎨 UI Configuration',
                    items: [
                        `Colors: ${config.ui.colors ? 'Enabled' : 'Disabled'}`,
                        `Spinner: ${config.ui.spinner ? 'Enabled' : 'Disabled'}`,
                        `Interactive: ${config.ui.interactive ? 'Enabled' : 'Disabled'}`
                    ]
                }
            ];
            for (const section of configInfo) {
                console.log(chalk.cyan(`\n${section.section}`));
                for (const item of section.items) {
                    console.log(`  ${item}`);
                }
            }
            // Configuration files info
            console.log(chalk.cyan('\n📁 Configuration Files'));
            const globalPath = this.configManager.getConfigPath(true);
            const localPath = this.configManager.getConfigPath(false);
            console.log(`  Global: ${globalPath} ${this.configManager.hasGlobalConfig() ? chalk.green('✓') : chalk.gray('✗')}`);
            console.log(`  Local:  ${localPath} ${this.configManager.hasLocalConfig() ? chalk.green('✓') : chalk.gray('✗')}`);
        }
        catch (error) {
            this.log('Unable to load configuration', 'warn');
        }
    }
    async displaySystemInfo() {
        console.log(chalk.yellow('\n🖥️  System Information'));
        console.log(chalk.gray('─'.repeat(50)));
        const systemInfo = [
            { label: 'Node.js Version', value: process.version, icon: '🟢' },
            { label: 'Platform', value: process.platform, icon: '💻' },
            { label: 'Architecture', value: process.arch, icon: '🏗️' },
            { label: 'Working Directory', value: process.cwd(), icon: '📂' },
            { label: 'User', value: process.env.USER || process.env.USERNAME || 'unknown', icon: '👤' }
        ];
        // Git info
        try {
            const { execSync } = await import('child_process');
            const gitVersion = execSync('git --version', { encoding: 'utf-8' }).trim();
            systemInfo.push({ label: 'Git Version', value: gitVersion, icon: '📝' });
        }
        catch {
            systemInfo.push({ label: 'Git Version', value: 'Not available', icon: '❌' });
        }
        // Environment variables
        const envVars = [
            'OPENAI_API_KEY',
            'ANTHROPIC_API_KEY',
            'MASTRO_AI_PROVIDER',
            'MASTRO_AI_MODEL',
            'NO_COLOR',
            'CI'
        ];
        const envInfo = envVars.map(key => ({
            label: key,
            value: process.env[key] ? chalk.green('Set') : chalk.gray('Not set'),
            icon: '🌍'
        }));
        for (const item of systemInfo) {
            const label = chalk.blue(item.label.padEnd(20));
            const value = typeof item.value === 'string' && item.value.length > 50
                ? item.value.substring(0, 47) + '...'
                : item.value;
            console.log(`${item.icon} ${label}: ${value}`);
        }
        console.log(chalk.cyan('\n🌍 Environment Variables'));
        for (const item of envInfo) {
            const label = chalk.blue(item.label.padEnd(20));
            console.log(`${item.icon} ${label}: ${item.value}`);
        }
        // Available commands
        console.log(chalk.yellow('\n🚀 Available Commands'));
        console.log(chalk.gray('─'.repeat(50)));
        const commands = [
            { name: 'commit', description: 'Generate AI-powered commit messages' },
            { name: 'explain', description: 'Explain code changes with AI analysis' },
            { name: 'review', description: 'Conduct AI-powered code reviews' },
            { name: 'pr create', description: 'Create PR descriptions automatically' },
            { name: 'docs generate', description: 'Generate project documentation' },
            { name: 'config init', description: 'Initialize mastro configuration' },
            { name: 'config interactive', description: 'Interactive configuration wizard' },
            { name: 'flow', description: 'Run mastro workflow analysis' },
            { name: 'analytics', description: 'Analyze repository metrics' },
            { name: 'info', description: 'Display this information (current command)' }
        ];
        for (const cmd of commands) {
            const name = chalk.green(cmd.name.padEnd(20));
            console.log(`🔧 ${name}: ${cmd.description}`);
        }
        console.log(chalk.gray(`\nFor detailed help on any command, run: ${chalk.cyan('mastro <command> --help')}`));
        console.log(chalk.gray(`Visit the documentation: ${chalk.cyan('https://github.com/yourusername/mastro')}`));
    }
}
//# sourceMappingURL=info.js.map