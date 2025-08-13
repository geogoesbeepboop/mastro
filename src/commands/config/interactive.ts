import {Flags} from '@oclif/core';
import {BaseCommand} from '../../base/command.js';
import {InteractiveUI} from '../../ui/interactive.js';
import type {MastroConfig} from '../../types/index.js';

export default class ConfigInteractive extends BaseCommand {
  static override description = 'Interactive configuration wizard for mastro';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --global'
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    global: Flags.boolean({
      char: 'g',
      description: 'configure global settings',
      default: false
    })
  };

  public async run(): Promise<void> {
    const {flags} = await this.parse(ConfigInteractive);

    try {
      const interactiveUI = new InteractiveUI(this.mastroConfig);
      
      this.log('🚀 Mastro Interactive Configuration', 'info');
      this.log('Use arrow keys to navigate, Enter to select, and Ctrl+C to exit\n');

      // Load current config
      const currentConfig = await this.configManager.load();
      let updatedConfig: Partial<MastroConfig> = {};

      // Main configuration menu
      const configSections = [
        { key: 'ai', label: '🤖 AI Configuration (Provider, Model, API Key)' },
        { key: 'git', label: '📝 Git Configuration (Branch, Diff Size)' },
        { key: 'team', label: '👥 Team Configuration (Commit Style, Review Persona)' },
        { key: 'cache', label: '💾 Cache Configuration (TTL, Size)' },
        { key: 'ui', label: '🎨 UI Configuration (Colors, Spinner)' },
        { key: 'review', label: '📋 Review Current Configuration' },
        { key: 'save', label: '💾 Save and Exit' },
        { key: 'exit', label: '❌ Exit without Saving' }
      ];

      let configuring = true;
      while (configuring) {
        const selectedSection = await interactiveUI.selectFromList(
          configSections,
          section => section.label,
          'Select configuration section'
        );

        if (!selectedSection) {
          configuring = false;
          continue;
        }

        switch (selectedSection.key) {
          case 'ai':
            updatedConfig.ai = await this.configureAI(interactiveUI, currentConfig.ai);
            break;
          case 'git':
            updatedConfig.git = await this.configureGit(interactiveUI, currentConfig.git);
            break;
          case 'team':
            updatedConfig.team = await this.configureTeam(interactiveUI, currentConfig.team);
            break;
          case 'cache':
            updatedConfig.cache = await this.configureCache(interactiveUI, currentConfig.cache);
            break;
          case 'ui':
            updatedConfig.ui = await this.configureUI(interactiveUI, currentConfig.ui);
            break;
          case 'review':
            await this.reviewConfiguration(interactiveUI, { ...currentConfig, ...updatedConfig });
            break;
          case 'save':
            // Merge updated config with current config to ensure all required sections exist
            const mergedConfig = { ...currentConfig, ...updatedConfig };
            await this.saveConfiguration(mergedConfig, flags.global);
            configuring = false;
            break;
          case 'exit':
            const confirmExit = await interactiveUI.confirmAction(
              'Exit without saving changes?',
              false
            );
            if (confirmExit) {
              configuring = false;
            }
            break;
        }
      }

      interactiveUI.cleanup();

    } catch (error) {
      await this.handleError(error, 'configure mastro interactively');
    }
  }

  private async configureAI(ui: InteractiveUI, currentAI: MastroConfig['ai']): Promise<MastroConfig['ai']> {
    this.log('\n🤖 AI Configuration', 'info');

    // Provider selection
    const providers = ['openai', 'anthropic'];
    const selectedProvider = await ui.selectFromList(
      providers,
      provider => provider === 'openai' 
        ? 'OpenAI (ChatGPT)' 
        : 'Anthropic (Claude)',
      'Select AI provider',
      currentAI.provider
    ) || currentAI.provider;

    // Model selection based on provider
    const models = selectedProvider === 'anthropic' 
      ? ['claude-sonnet-4-0']
      : ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-5-mini'];
    
    const selectedModel = await ui.selectFromList(
      models,
      model => model,
      'Select AI model',
      currentAI.model
    ) || currentAI.model;

    // API Key input
    const currentKeyMasked = currentAI.apiKey ? '*'.repeat(20) : 'Not set';
    const updateKey = await ui.confirmAction(
      `Current API key: ${currentKeyMasked}. Update API key?`,
      false
    );

    let apiKey = currentAI.apiKey;
    if (updateKey) {
      const keyName = selectedProvider === 'anthropic' ? 'Anthropic' : 'OpenAI';
      const newKey = await ui.getTextInput(
        `Enter your ${keyName} API key`,
        undefined,
        true // hide input
      );
      if (newKey) {
        apiKey = newKey;
      }
    }

    // Max tokens
    const maxTokensStr = await ui.getTextInput(
      'Max tokens per request',
      currentAI.maxTokens.toString()
    );
    const maxTokens = maxTokensStr ? parseInt(maxTokensStr, 10) : currentAI.maxTokens;

    // Temperature
    const temperatureStr = await ui.getTextInput(
      'Temperature (0.0-2.0)',
      currentAI.temperature.toString()
    );
    const temperature = temperatureStr ? parseFloat(temperatureStr) : currentAI.temperature;

    return {
      provider: selectedProvider as 'openai' | 'anthropic',
      apiKey,
      model: selectedModel,
      maxTokens: isNaN(maxTokens) ? currentAI.maxTokens : Math.max(100, Math.min(4000, maxTokens)),
      temperature: isNaN(temperature) ? currentAI.temperature : Math.max(0, Math.min(2, temperature))
    };
  }

  private async configureGit(ui: InteractiveUI, currentGit: MastroConfig['git']): Promise<MastroConfig['git']> {
    this.log('\n📝 Git Configuration', 'info');

    const defaultBranch = await ui.getTextInput(
      'Default branch name',
      currentGit.defaultBranch
    ) || currentGit.defaultBranch;

    const includeUntracked = await ui.confirmAction(
      'Include untracked files in analysis?',
      currentGit.includeUntracked
    );

    const maxDiffSizeStr = await ui.getTextInput(
      'Maximum diff size (lines)',
      currentGit.maxDiffSize.toString()
    );
    const maxDiffSize = maxDiffSizeStr ? parseInt(maxDiffSizeStr, 10) : currentGit.maxDiffSize;

    return {
      defaultBranch,
      includeUntracked,
      maxDiffSize: isNaN(maxDiffSize) ? currentGit.maxDiffSize : Math.max(1000, Math.min(100000, maxDiffSize))
    };
  }

  private async configureTeam(ui: InteractiveUI, currentTeam: MastroConfig['team']): Promise<MastroConfig['team']> {
    this.log('\n👥 Team Configuration', 'info');

    // Commit style
    const commitStyles = ['conventional', 'custom'];
    const commitStyle = await ui.selectFromList(
      commitStyles,
      style => style === 'conventional' 
        ? 'Conventional Commits (feat:, fix:, etc.)' 
        : 'Custom team style',
      'Select commit message style',
      currentTeam.commitStyle
    ) || currentTeam.commitStyle;

    // Max commit message length
    const maxLengthStr = await ui.getTextInput(
      'Maximum commit message length',
      currentTeam.maxLength.toString()
    );
    const maxLength = maxLengthStr ? parseInt(maxLengthStr, 10) : currentTeam.maxLength;

    // Review persona configuration
    const reviewPersona = await this.configureReviewPersona(ui, currentTeam.reviewPersona);

    return {
      commitStyle: commitStyle as 'conventional' | 'custom',
      prefixes: commitStyle === 'conventional' 
        ? ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore']
        : ['update', 'add', 'remove', 'change'],
      maxLength: isNaN(maxLength) ? currentTeam.maxLength : Math.max(50, Math.min(200, maxLength)),
      commonPhrases: currentTeam.commonPhrases,
      reviewPersona
    };
  }

  private async configureReviewPersona(ui: InteractiveUI, currentPersona: MastroConfig['team']['reviewPersona']) {
    this.log('\n📋 Review Persona Configuration', 'info');

    const name = await ui.getTextInput(
      'Reviewer persona name',
      currentPersona.name
    ) || currentPersona.name;

    const strictnessOptions = ['lenient', 'moderate', 'strict'];
    const strictness = await ui.selectFromList(
      strictnessOptions,
      s => s,
      'Select review strictness',
      currentPersona.strictness
    ) || currentPersona.strictness;

    const focusOptions = ['security', 'performance', 'maintainability', 'testing'];
    const currentFocusSet = new Set(currentPersona.focus);
    const selectedFocus: typeof focusOptions = [];

    for (const focus of focusOptions) {
      const shouldInclude = await ui.confirmAction(
        `Focus on ${focus}?`,
        currentFocusSet.has(focus as any)
      );
      if (shouldInclude) {
        selectedFocus.push(focus);
      }
    }

    return {
      name,
      focus: selectedFocus as ('security' | 'performance' | 'maintainability' | 'testing')[],
      strictness: strictness as 'lenient' | 'moderate' | 'strict',
      customRules: currentPersona.customRules
    };
  }

  private async configureCache(ui: InteractiveUI, currentCache: MastroConfig['cache']): Promise<MastroConfig['cache']> {
    this.log('\n💾 Cache Configuration', 'info');

    const enabled = await ui.confirmAction(
      'Enable caching?',
      currentCache.enabled
    );

    const ttlStr = await ui.getTextInput(
      'Cache TTL (seconds)',
      currentCache.ttl.toString()
    );
    const ttl = ttlStr ? parseInt(ttlStr, 10) : currentCache.ttl;

    const maxSizeStr = await ui.getTextInput(
      'Maximum cache entries',
      currentCache.maxSize.toString()
    );
    const maxSize = maxSizeStr ? parseInt(maxSizeStr, 10) : currentCache.maxSize;

    return {
      enabled,
      ttl: isNaN(ttl) ? currentCache.ttl : Math.max(60, Math.min(86400, ttl)),
      maxSize: isNaN(maxSize) ? currentCache.maxSize : Math.max(10, Math.min(10000, maxSize))
    };
  }

  private async configureUI(ui: InteractiveUI, currentUI: MastroConfig['ui']): Promise<MastroConfig['ui']> {
    this.log('\n🎨 UI Configuration', 'info');

    const spinner = await ui.confirmAction(
      'Show loading spinners?',
      currentUI.spinner
    );

    const colors = await ui.confirmAction(
      'Use colored output?',
      currentUI.colors
    );

    const interactive = await ui.confirmAction(
      'Enable interactive mode?',
      currentUI.interactive
    );

    return {
      spinner,
      colors,
      interactive
    };
  }

  private async reviewConfiguration(ui: InteractiveUI, config: MastroConfig): Promise<void> {
    this.log('\n📋 Current Configuration', 'info');
    
    const sections = [
      `🤖 AI: ${config.ai.provider} (${config.ai.model})`,
      `📝 Git: ${config.git.defaultBranch} branch, ${config.git.maxDiffSize} max diff`,
      `👥 Team: ${config.team.commitStyle} commits, ${config.team.maxLength} chars max`,
      `📋 Review: ${config.team.reviewPersona.name} (${config.team.reviewPersona.strictness})`,
      `💾 Cache: ${config.cache.enabled ? 'enabled' : 'disabled'} (${config.cache.ttl}s TTL)`,
      `🎨 UI: ${config.ui.colors ? 'colors' : 'no colors'}, ${config.ui.spinner ? 'spinner' : 'no spinner'}`
    ];

    for (const section of sections) {
      this.log(`  ${section}`);
    }

    await ui.confirmAction('\nPress Enter to continue', true);
  }

  private async saveConfiguration(config: MastroConfig, global: boolean): Promise<void> {
    try {
      await this.configManager.save(config, global);
      const configPath = this.configManager.getConfigPath(global);
      this.success(`Configuration saved to ${configPath}`);
    } catch (error) {
      this.error(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}