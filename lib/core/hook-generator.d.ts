import type { MastroConfig, ReviewPersona } from '../types/index.js';
export interface HookConfig {
    type: 'pre-commit' | 'pre-push' | 'commit-msg';
    enabled: boolean;
    strictness: 'lenient' | 'moderate' | 'strict';
    criticalThreshold: number;
    highThreshold: number;
    persona: ReviewPersona;
    customRules: string[];
    skipPatterns: string[];
    timeoutSeconds: number;
}
export interface HookValidationResult {
    passed: boolean;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    blockers: string[];
    warnings: string[];
    executionTime: number;
    suggestions: string[];
}
/**
 * Generates and manages intelligent pre-commit hooks with AI-powered validation
 */
export declare class HookGenerator {
    private config;
    private gitHooksPath;
    constructor(config: MastroConfig);
    /**
     * Generate and install pre-commit hook with AI validation
     */
    generatePreCommitHook(hookConfig: HookConfig): Promise<void>;
    /**
     * Generate and install pre-push hook for additional validation
     */
    generatePrePushHook(hookConfig: HookConfig): Promise<void>;
    /**
     * Generate commit-msg hook for message validation
     */
    generateCommitMsgHook(hookConfig: HookConfig): Promise<void>;
    /**
     * Install comprehensive hook suite
     */
    installHookSuite(hookConfig: HookConfig): Promise<void>;
    /**
     * Uninstall mastro hooks and restore backups
     */
    uninstallHooks(): Promise<void>;
    /**
     * Validate current hook configuration and suggest improvements
     */
    validateHookSetup(): Promise<HookValidationResult>;
    private buildPreCommitHookContent;
    private buildPrePushHookContent;
    private buildCommitMsgHookContent;
    private backupExistingHooks;
    private saveHookConfig;
    /**
     * Get default hook configuration based on project type and team patterns
     */
    static getDefaultConfig(config: MastroConfig): HookConfig;
}
//# sourceMappingURL=hook-generator.d.ts.map