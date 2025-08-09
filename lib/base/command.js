import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import ora from 'ora';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';
import { ConfigManager } from '../lib/config.js';
import { GitAnalyzer } from '../core/git-analyzer.js';
import { ContextEngine } from '../core/context-engine.js';
import { AIClient } from '../core/ai-client.js';
import { CacheManager } from '../core/cache-manager.js';
export class BaseCommand extends Command {
    static baseFlags = {
        config: Flags.string({
            char: 'c',
            description: 'path to config file',
            env: 'MASTRO_CONFIG'
        }),
        verbose: Flags.boolean({
            char: 'v',
            description: 'enable verbose logging'
        }),
        'no-cache': Flags.boolean({
            description: 'disable caching',
            default: false
        }),
        'dry-run': Flags.boolean({
            description: 'preview without making changes',
            default: false
        })
    };
    mastroConfig;
    configManager;
    gitAnalyzer;
    contextEngine;
    aiClient;
    cacheManager;
    spinner;
    async init() {
        await super.init();
        // Load .env file if it exists
        loadDotenv({ path: resolve(process.cwd(), '.env') });
        const { flags } = await this.parse();
        // Initialize config
        this.configManager = new ConfigManager(flags['config']);
        this.mastroConfig = await this.configManager.load();
        // Initialize core services
        this.gitAnalyzer = new GitAnalyzer();
        this.contextEngine = new ContextEngine(this.mastroConfig);
        this.aiClient = new AIClient(this.mastroConfig.ai);
        this.cacheManager = new CacheManager(this.mastroConfig.cache);
        // Setup logging
        if (flags['verbose']) {
            this.setupVerboseLogging();
        }
    }
    startSpinner(text) {
        if (this.mastroConfig.ui.spinner) {
            this.spinner = ora({
                text,
                color: 'cyan',
                spinner: 'dots'
            }).start();
        }
        else {
            // Fallback to simple text output when spinner is disabled
            console.log(`⏳ ${text}`);
        }
    }
    updateSpinner(text) {
        if (this.spinner) {
            this.spinner.text = text;
        }
        else if (!this.mastroConfig.ui.spinner) {
            // Fallback to simple text output when spinner is disabled
            console.log(`⏳ ${text}`);
        }
    }
    stopSpinner(success = true, text) {
        if (this.spinner) {
            if (success) {
                this.spinner.succeed(text);
            }
            else {
                this.spinner.fail(text);
            }
            this.spinner = undefined;
        }
        else if (!this.mastroConfig.ui.spinner && text) {
            // Fallback to simple text output when spinner is disabled
            const icon = success ? '✓' : '✗';
            console.log(`${icon} ${text}`);
        }
    }
    log(message, level = 'info') {
        if (!this.mastroConfig.ui.colors) {
            this.logger(message);
            return;
        }
        switch (level) {
            case 'debug':
                this.logger(chalk.gray(`[DEBUG] ${message}`));
                break;
            case 'info':
                this.logger(chalk.blue(`ℹ ${message}`));
                break;
            case 'warn':
                this.logger(chalk.yellow(`⚠ ${message}`));
                break;
            case 'error':
                this.logger(chalk.red(`✗ ${message}`));
                break;
        }
    }
    success(message) {
        if (this.mastroConfig.ui.colors) {
            this.logger(chalk.green(`✓ ${message}`));
        }
        else {
            this.logger(message);
        }
    }
    async ensureGitRepository() {
        const isRepo = await this.gitAnalyzer.isRepository();
        if (!isRepo) {
            this.error('Not a git repository. Please run this command from within a git repository.');
        }
    }
    async handleError(error, operation) {
        this.stopSpinner(false, `Failed to ${operation}`);
        if (error instanceof Error) {
            this.log(`Error during ${operation}: ${error.message}`, 'error');
            if (error.stack && this.mastroConfig.ui.interactive) {
                this.log(`Stack trace: ${error.stack}`, 'debug');
            }
        }
        else {
            this.log(`Unknown error during ${operation}`, 'error');
        }
        this.exit(1);
    }
    setupVerboseLogging() {
        const originalLog = this.logger;
        this.logger = (message) => {
            const timestamp = new Date().toISOString();
            originalLog(`[${timestamp}] ${message}`);
        };
    }
    logger(message) {
        console.log(message);
    }
}
//# sourceMappingURL=command.js.map