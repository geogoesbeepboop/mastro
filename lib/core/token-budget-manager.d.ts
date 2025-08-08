import type { RankedChange, ChangeRankingResult } from './semantic-change-ranker.js';
export interface TokenBudget {
    total: number;
    systemPrompt: number;
    userPrompt: number;
    available: number;
    reserved: number;
}
export interface CompressionLevel {
    name: 'full' | 'moderate' | 'aggressive' | 'minimal';
    tokenLimit: number;
    strategies: CompressionStrategy[];
}
export interface CompressionStrategy {
    name: string;
    description: string;
    apply: (changes: RankedChange[]) => RankedChange[];
}
export interface BudgetAllocation {
    level: CompressionLevel;
    selectedChanges: RankedChange[];
    compressionSummary: string;
    tokenUsage: {
        used: number;
        available: number;
        efficiency: number;
    };
    warnings: string[];
}
export declare class TokenBudgetManager {
    private static readonly MODEL_LIMITS;
    private static readonly COMPRESSION_LEVELS;
    calculateBudget(modelName: string, promptType: 'commit' | 'explain' | 'pr' | 'review'): TokenBudget;
    allocateTokens(rankingResult: ChangeRankingResult, budget: TokenBudget, prioritizeQuality?: boolean): BudgetAllocation;
    private selectCompressionLevel;
    private selectChangesByImportance;
    private estimateTokenUsage;
    private estimateChangeTokens;
    private generateCompressionSummary;
    /**
     * Analyze if the user should consider breaking their changes into smaller commits
     */
    analyzeCommitSizeRecommendation(rankingResult: ChangeRankingResult, budget: TokenBudget): {
        shouldSplit: boolean;
        recommendation: string;
        suggestedBreakdown: string[];
    };
}
//# sourceMappingURL=token-budget-manager.d.ts.map