import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base/command.js';
import { InteractiveUI } from '../../ui/interactive.js';
export default class ConfigInit extends BaseCommand {
    static description = 'Initialize mastro configuration';
    static examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> --global'
    ];
    static flags = {
        ...BaseCommand.baseFlags,
        global: Flags.boolean({
            char: 'g',
            description: 'create global configuration',
            default: false
        }),
        force: Flags.boolean({
            char: 'f',
            description: 'overwrite existing configuration',
            default: false
        })
    };
    async run() {
        const { flags } = await this.parse(ConfigInit);
        try {
            const interactiveUI = new InteractiveUI(this.mastroConfig);
            // Check if config already exists
            const hasExisting = flags.global ? this.configManager.hasGlobalConfig() : this.configManager.hasLocalConfig();
            if (hasExisting && !flags.force) {
                const overwrite = await interactiveUI.confirmAction(`Configuration already exists at ${this.configManager.getConfigPath(flags.global)}. Overwrite?`, false);
                if (!overwrite) {
                    this.log('Configuration initialization cancelled', 'info');
                    return;
                }
            }
            this.log(`Creating ${flags.global ? 'global' : 'local'} configuration...`, 'info');
            // Get API key
            let apiKey = process.env['OPENAI_API_KEY'];
            if (!apiKey && this.mastroConfig.ui.interactive) {
                const inputResult = await interactiveUI.getTextInput('Enter your OpenAI API key (or press Enter to skip)', undefined);
                if (inputResult) {
                    apiKey = inputResult;
                }
            }
            // Get model preference
            const models = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
            let selectedModel = 'gpt-4o-mini';
            if (this.mastroConfig.ui.interactive) {
                const modelChoice = await interactiveUI.selectFromList(models, model => model, 'Select AI model');
                if (modelChoice) {
                    selectedModel = modelChoice;
                }
            }
            // Get commit style preference
            const commitStyles = ['conventional', 'custom'];
            let commitStyle = 'conventional';
            if (this.mastroConfig.ui.interactive) {
                const styleChoice = await interactiveUI.selectFromList(commitStyles, style => style === 'conventional' ? 'Conventional Commits (feat: fix: etc.)' : 'Custom team style', 'Select commit message style');
                if (styleChoice) {
                    commitStyle = styleChoice;
                }
            }
            // Create configuration
            const config = {
                ai: {
                    provider: 'openai',
                    apiKey,
                    model: selectedModel,
                    maxTokens: 1000,
                    temperature: 0.3
                },
                git: {
                    defaultBranch: 'main',
                    includeUntracked: false,
                    maxDiffSize: 10000
                },
                cache: {
                    enabled: true,
                    ttl: 3600,
                    maxSize: 1000
                },
                team: {
                    commitStyle: commitStyle,
                    prefixes: commitStyle === 'conventional'
                        ? ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore']
                        : ['update', 'add', 'remove', 'change'],
                    maxLength: 72,
                    commonPhrases: ['update', 'add', 'remove', 'fix', 'improve'],
                    reviewPersona: {
                        name: 'Senior Engineer',
                        focus: ['maintainability', 'performance'],
                        strictness: 'moderate',
                        customRules: []
                    }
                },
                ui: {
                    spinner: true,
                    colors: true,
                    interactive: true
                }
            };
            // Save configuration
            await this.configManager.save(config, flags.global);
            this.success(`Configuration created at ${this.configManager.getConfigPath(flags.global)}`);
            if (!apiKey) {
                this.log('⚠️  No API key configured. Set OPENAI_API_KEY environment variable or update the config file.', 'warn');
            }
            interactiveUI.cleanup();
        }
        catch (error) {
            await this.handleError(error, 'initialize configuration');
        }
    }
}
//# sourceMappingURL=init.js.map