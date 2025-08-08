import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { z } from 'zod';
// Zod schemas for validation
const ReviewPersonaSchema = z.object({
    name: z.string(),
    focus: z.array(z.enum(['security', 'performance', 'maintainability', 'testing'])),
    strictness: z.enum(['lenient', 'moderate', 'strict']),
    customRules: z.array(z.string())
});
const TeamPatternsSchema = z.object({
    commitStyle: z.enum(['conventional', 'custom']),
    prefixes: z.array(z.string()),
    maxLength: z.number().min(50).max(200),
    commonPhrases: z.array(z.string()),
    reviewPersona: ReviewPersonaSchema
});
const MastroConfigSchema = z.object({
    ai: z.object({
        provider: z.enum(['openai', 'anthropic', 'local']),
        apiKey: z.string().optional(),
        model: z.string(),
        maxTokens: z.number().min(100).max(4000),
        temperature: z.number().min(0).max(2)
    }),
    git: z.object({
        defaultBranch: z.string(),
        includeUntracked: z.boolean(),
        maxDiffSize: z.number().min(1000).max(100000)
    }),
    cache: z.object({
        enabled: z.boolean(),
        ttl: z.number().min(60).max(86400), // 1 minute to 24 hours
        maxSize: z.number().min(10).max(10000)
    }),
    team: TeamPatternsSchema,
    ui: z.object({
        spinner: z.boolean(),
        colors: z.boolean(),
        interactive: z.boolean()
    })
});
export class ConfigManager {
    localConfigPath;
    globalConfigPath;
    config;
    constructor(configPath) {
        this.localConfigPath = configPath || join(process.cwd(), 'mastro.config.json');
        this.globalConfigPath = join(homedir(), '.mastro', 'config.json');
    }
    async load() {
        if (this.config) {
            return this.config;
        }
        // Start with default configuration
        const defaultConfig = this.getDefaultConfig();
        // Merge with global config if it exists
        const globalConfig = this.loadConfigFile(this.globalConfigPath);
        const mergedGlobal = globalConfig ? this.mergeConfigs(defaultConfig, globalConfig) : defaultConfig;
        // Merge with local config if it exists
        const localConfig = this.loadConfigFile(this.localConfigPath);
        const mergedLocal = localConfig ? this.mergeConfigs(mergedGlobal, localConfig) : mergedGlobal;
        // Apply environment variables
        const finalConfig = this.applyEnvironmentVariables(mergedLocal);
        // Validate the final configuration
        try {
            this.config = MastroConfigSchema.parse(finalConfig);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n');
                throw new Error(`Invalid configuration:\n${issues}`);
            }
            throw error;
        }
        return this.config;
    }
    async save(config, global = false) {
        const targetPath = global ? this.globalConfigPath : this.localConfigPath;
        const currentConfig = this.loadConfigFile(targetPath) || {};
        const mergedConfig = this.mergeConfigs(currentConfig, config);
        try {
            // Validate before saving
            MastroConfigSchema.parse(mergedConfig);
            // Ensure directory exists
            const configDir = targetPath.includes('.mastro') ? join(homedir(), '.mastro') : process.cwd();
            if (!existsSync(configDir)) {
                await import('fs').then(fs => fs.promises.mkdir(configDir, { recursive: true }));
            }
            writeFileSync(targetPath, JSON.stringify(mergedConfig, null, 2));
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n');
                throw new Error(`Cannot save invalid configuration:\n${issues}`);
            }
            throw error;
        }
    }
    async createDefaultConfig(global = false) {
        const defaultConfig = this.getDefaultConfig();
        await this.save(defaultConfig, global);
    }
    getConfigPath(global = false) {
        return global ? this.globalConfigPath : this.localConfigPath;
    }
    hasLocalConfig() {
        return existsSync(this.localConfigPath);
    }
    hasGlobalConfig() {
        return existsSync(this.globalConfigPath);
    }
    async validateConfig(config) {
        try {
            MastroConfigSchema.parse(config);
            return { valid: true };
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
                return { valid: false, errors };
            }
            return { valid: false, errors: ['Unknown validation error'] };
        }
    }
    getDefaultConfig() {
        return {
            ai: {
                provider: 'openai',
                apiKey: process.env.OPENAI_API_KEY,
                model: 'gpt-4o-mini',
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
                ttl: 3600, // 1 hour
                maxSize: 1000
            },
            team: {
                commitStyle: 'conventional',
                prefixes: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
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
    }
    loadConfigFile(path) {
        try {
            if (!existsSync(path)) {
                return null;
            }
            const content = readFileSync(path, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            console.warn(`Warning: Failed to load config from ${path}:`, error instanceof Error ? error.message : error);
            return null;
        }
    }
    mergeConfigs(base, override) {
        const result = { ...base };
        for (const [key, value] of Object.entries(override)) {
            if (value !== undefined) {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    result[key] = this.mergeConfigs(result[key] || {}, value);
                }
                else {
                    result[key] = value;
                }
            }
        }
        return result;
    }
    applyEnvironmentVariables(config) {
        const envConfig = {};
        // AI configuration from environment
        if (process.env.MASTRO_AI_PROVIDER) {
            envConfig.ai = {
                ...config.ai,
                provider: process.env.MASTRO_AI_PROVIDER
            };
        }
        if (process.env.OPENAI_API_KEY) {
            envConfig.ai = {
                ...envConfig.ai || config.ai,
                apiKey: process.env.OPENAI_API_KEY
            };
        }
        if (process.env.MASTRO_AI_MODEL) {
            envConfig.ai = {
                ...envConfig.ai || config.ai,
                model: process.env.MASTRO_AI_MODEL
            };
        }
        if (process.env.MASTRO_AI_MAX_TOKENS) {
            const maxTokens = parseInt(process.env.MASTRO_AI_MAX_TOKENS, 10);
            if (!isNaN(maxTokens)) {
                envConfig.ai = {
                    ...envConfig.ai || config.ai,
                    maxTokens
                };
            }
        }
        if (process.env.MASTRO_AI_TEMPERATURE) {
            const temperature = parseFloat(process.env.MASTRO_AI_TEMPERATURE);
            if (!isNaN(temperature)) {
                envConfig.ai = {
                    ...envConfig.ai || config.ai,
                    temperature
                };
            }
        }
        // Git configuration from environment
        if (process.env.MASTRO_DEFAULT_BRANCH) {
            envConfig.git = {
                ...config.git,
                defaultBranch: process.env.MASTRO_DEFAULT_BRANCH
            };
        }
        if (process.env.MASTRO_INCLUDE_UNTRACKED) {
            envConfig.git = {
                ...envConfig.git || config.git,
                includeUntracked: process.env.MASTRO_INCLUDE_UNTRACKED === 'true'
            };
        }
        if (process.env.MASTRO_MAX_DIFF_SIZE) {
            const maxDiffSize = parseInt(process.env.MASTRO_MAX_DIFF_SIZE, 10);
            if (!isNaN(maxDiffSize)) {
                envConfig.git = {
                    ...envConfig.git || config.git,
                    maxDiffSize
                };
            }
        }
        // Cache configuration from environment
        if (process.env.MASTRO_CACHE_ENABLED) {
            envConfig.cache = {
                ...config.cache,
                enabled: process.env.MASTRO_CACHE_ENABLED === 'true'
            };
        }
        if (process.env.MASTRO_CACHE_TTL) {
            const ttl = parseInt(process.env.MASTRO_CACHE_TTL, 10);
            if (!isNaN(ttl)) {
                envConfig.cache = {
                    ...envConfig.cache || config.cache,
                    ttl
                };
            }
        }
        if (process.env.MASTRO_CACHE_MAX_SIZE) {
            const maxSize = parseInt(process.env.MASTRO_CACHE_MAX_SIZE, 10);
            if (!isNaN(maxSize)) {
                envConfig.cache = {
                    ...envConfig.cache || config.cache,
                    maxSize
                };
            }
        }
        // UI configuration from environment
        if (process.env.MASTRO_NO_SPINNER) {
            envConfig.ui = {
                ...config.ui,
                spinner: process.env.MASTRO_NO_SPINNER !== 'true'
            };
        }
        if (process.env.MASTRO_NO_COLORS || process.env.NO_COLOR) {
            envConfig.ui = {
                ...envConfig.ui || config.ui,
                colors: false
            };
        }
        if (process.env.MASTRO_NON_INTERACTIVE) {
            envConfig.ui = {
                ...envConfig.ui || config.ui,
                interactive: process.env.MASTRO_NON_INTERACTIVE !== 'true'
            };
        }
        // Team configuration from environment
        if (process.env.MASTRO_COMMIT_STYLE) {
            envConfig.team = {
                ...config.team,
                commitStyle: process.env.MASTRO_COMMIT_STYLE
            };
        }
        if (process.env.MASTRO_MAX_COMMIT_LENGTH) {
            const maxLength = parseInt(process.env.MASTRO_MAX_COMMIT_LENGTH, 10);
            if (!isNaN(maxLength)) {
                envConfig.team = {
                    ...envConfig.team || config.team,
                    maxLength
                };
            }
        }
        if (process.env.MASTRO_REVIEW_STRICTNESS) {
            envConfig.team = {
                ...envConfig.team || config.team,
                reviewPersona: {
                    ...config.team.reviewPersona,
                    strictness: process.env.MASTRO_REVIEW_STRICTNESS
                }
            };
        }
        return this.mergeConfigs(config, envConfig);
    }
}
//# sourceMappingURL=config.js.map