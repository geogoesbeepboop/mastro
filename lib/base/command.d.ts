import { Command } from '@oclif/core';
import { ConfigManager } from '../lib/config.js';
import { GitAnalyzer } from '../core/git-analyzer.js';
import { ContextEngine } from '../core/context-engine.js';
import { AIClient } from '../core/ai-client.js';
import { CacheManager } from '../core/cache-manager.js';
import type { MastroConfig, LogLevel } from '../types/index.js';
export declare abstract class BaseCommand extends Command {
    static baseFlags: {
        config: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        verbose: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-cache': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'dry-run': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    protected mastroConfig: MastroConfig;
    protected configManager: ConfigManager;
    protected gitAnalyzer: GitAnalyzer;
    protected contextEngine: ContextEngine;
    protected aiClient: AIClient;
    protected cacheManager: CacheManager;
    private spinner?;
    init(): Promise<void>;
    protected startSpinner(text: string): void;
    protected updateSpinner(text: string): void;
    protected stopSpinner(success?: boolean, text?: string): void;
    protected withSpinner<T>(text: string, operation: () => Promise<T>, successText?: string, errorText?: string): Promise<T>;
    log(message: string, level?: LogLevel): void;
    protected success(message: string): void;
    protected ensureGitRepository(): Promise<void>;
    protected handleError(error: unknown, operation: string): Promise<never>;
    private setupVerboseLogging;
    private logger;
}
//# sourceMappingURL=command.d.ts.map