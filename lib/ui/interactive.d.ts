import type { CommitMessage, MastroConfig } from '../types/index.js';
interface RefinementOptions {
    message: string;
    suggestions: string[];
    allowCustom: boolean;
}
export declare class InteractiveUI {
    private config;
    private readline;
    constructor(config: MastroConfig);
    promptForRefinement(options: RefinementOptions): Promise<string | null>;
    confirmAction(message: string, defaultYes?: boolean): Promise<boolean>;
    selectFromList<T>(items: T[], displayFn: (item: T) => string, message?: string): Promise<T | null>;
    getTextInput(prompt: string, defaultValue?: string): Promise<string | null>;
    showProgressiveEnhancement(initialMessage: CommitMessage, enhancedMessage: CommitMessage, onSelect: (message: CommitMessage) => void): Promise<void>;
    cleanup(): void;
}
export declare function createRefinementSuggestions(type: 'commit' | 'explanation' | 'pr' | 'review'): string[];
export {};
//# sourceMappingURL=interactive.d.ts.map