import type { MastroConfig } from '../types/index.js';
export declare class ConfigManager {
    private readonly localConfigPath;
    private readonly globalConfigPath;
    private config?;
    constructor(configPath?: string);
    load(): Promise<MastroConfig>;
    save(config: Partial<MastroConfig>, global?: boolean): Promise<void>;
    createDefaultConfig(global?: boolean): Promise<void>;
    getConfigPath(global?: boolean): string;
    hasLocalConfig(): boolean;
    hasGlobalConfig(): boolean;
    validateConfig(config: unknown): Promise<{
        valid: boolean;
        errors?: string[];
    }>;
    private getDefaultConfig;
    private loadConfigFile;
    private mergeConfigs;
    private applyEnvironmentVariables;
}
//# sourceMappingURL=config.d.ts.map