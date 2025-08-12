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
            // Get AI provider preference
            const providers = ['openai', 'anthropic'];
            let selectedProvider = 'openai';
            if (this.mastroConfig.ui.interactive) {
                const providerChoice = await interactiveUI.selectFromList(providers, provider => provider === 'openai' ? 'OpenAI (ChatGPT)' : 'Anthropic (Claude)', 'Select AI provider');
                if (providerChoice) {
                    selectedProvider = providerChoice;
                }
            }
            // Get API key based on provider
            let apiKey = selectedProvider === 'anthropic' ? process.env['ANTHROPIC_API_KEY'] : process.env['OPENAI_API_KEY'];
            if (!apiKey && this.mastroConfig.ui.interactive) {
                const keyName = selectedProvider === 'anthropic' ? 'Anthropic' : 'OpenAI';
                const inputResult = await interactiveUI.getTextInput(`Enter your ${keyName} API key (or press Enter to skip)`, undefined);
                if (inputResult) {
                    apiKey = inputResult;
                }
            }
            // Get model preference based on provider
            const models = selectedProvider === 'anthropic'
                ? ['claude-sonnet-4-0']
                : ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-5-mini'];
            let selectedModel = selectedProvider === 'anthropic' ? 'claude-sonnet-4-0' : 'gpt-4o-mini';
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
                    provider: selectedProvider,
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
                const envVar = selectedProvider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
                this.log(`⚠️  No API key configured. Set ${envVar} environment variable or update the config file.`, 'warn');
            }
            interactiveUI.cleanup();
        }
        catch (error) {
            await this.handleError(error, 'initialize configuration');
        }
    }
}
//# sourceMappingURL=init.js.map