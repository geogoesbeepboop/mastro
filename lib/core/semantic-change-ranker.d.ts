import type { GitChange } from '../types/index.js';
export interface ChangeImportance {
    score: number;
    category: 'critical' | 'high' | 'medium' | 'low';
    reasons: string[];
    tokens: number;
}
export interface RankedChange extends GitChange {
    importance: ChangeImportance;
}
export interface ChangeRankingResult {
    rankedChanges: RankedChange[];
    totalTokens: number;
    breakdown: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
}
export declare class SemanticChangeRanker {
    private static readonly CRITICAL_PATTERNS;
    private static readonly HIGH_PATTERNS;
    private static readonly FILE_IMPORTANCE;
    rankChanges(changes: GitChange[]): ChangeRankingResult;
    private analyzeChangeImportance;
    private getFileImportanceScore;
    private getChangeTypeScore;
    private analyzeContentImportance;
    private analyzeHunkImportance;
    private analyzeLineImportance;
    private getSizeImportanceScore;
    private categorizeScore;
    private estimateTokenCount;
    /**
     * Get the top N most important changes within a token budget
     */
    selectOptimalChanges(ranking: ChangeRankingResult, tokenBudget: number): RankedChange[];
}
//# sourceMappingURL=semantic-change-ranker.d.ts.map