import {Command, Flags} from '@oclif/core';
import chalk from 'chalk';
import ora, {Ora} from 'ora';
import {config as loadDotenv} from 'dotenv';
import {resolve} from 'path';
import {ConfigManager} from '../lib/config.js';
import {GitAnalyzer} from '../core/git-analyzer.js';
import {ContextEngine} from '../core/context-engine.js';
import {AIClient} from '../core/ai-client.js';
import {CacheManager} from '../core/cache-manager.js';
import type {MastroConfig, LogLevel} from '../types/index.js';

export abstract class BaseCommand extends Command {
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

  protected mastroConfig!: MastroConfig;
  protected configManager!: ConfigManager;
  protected gitAnalyzer!: GitAnalyzer;
  protected contextEngine!: ContextEngine;
  protected aiClient!: AIClient;
  protected cacheManager!: CacheManager;

  private spinner?: Ora;

  public override async init(): Promise<void> {
    await super.init();
    
    // Load .env file if it exists
    loadDotenv({path: resolve(process.cwd(), '.env')});
    
    const {flags} = await this.parse();
    
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

  protected startSpinner(text: string): void {
    if (this.mastroConfig.ui.spinner && !this.mastroConfig.ui.interactive) {
      this.spinner = ora({
        text,
        color: 'cyan',
        spinner: 'dots'
      }).start();
    }
  }

  protected updateSpinner(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  protected stopSpinner(success = true, text?: string): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(text);
      } else {
        this.spinner.fail(text);
      }
      this.spinner = undefined;
    }
  }

  public log(message: string, level: LogLevel = 'info'): void {
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

  protected success(message: string): void {
    if (this.mastroConfig.ui.colors) {
      this.logger(chalk.green(`✓ ${message}`));
    } else {
      this.logger(message);
    }
  }

  protected async ensureGitRepository(): Promise<void> {
    const isRepo = await this.gitAnalyzer.isRepository();
    if (!isRepo) {
      this.error('Not a git repository. Please run this command from within a git repository.');
    }
  }

  protected async handleError(error: unknown, operation: string): Promise<never> {
    this.stopSpinner(false, `Failed to ${operation}`);
    
    if (error instanceof Error) {
      this.log(`Error during ${operation}: ${error.message}`, 'error');
      if (error.stack && this.mastroConfig.ui.interactive) {
        this.log(`Stack trace: ${error.stack}`, 'debug');
      }
    } else {
      this.log(`Unknown error during ${operation}`, 'error');
    }
    
    this.exit(1);
  }

  private setupVerboseLogging(): void {
    const originalLog = this.logger;
    this.logger = (message: string): void => {
      const timestamp = new Date().toISOString();
      originalLog(`[${timestamp}] ${message}`);
    };
  }

  private logger(message: string): void {
    console.log(message);
  }
}