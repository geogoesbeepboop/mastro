import type { GitChange } from '../types/index.js';
import type { ChangeRankingResult } from './semantic-change-ranker.js';
import type { TokenBudget } from './token-budget-manager.js';
export interface ComplexityWarning {
    level: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    suggestions: string[];
    impact: {
        aiQuality: 'excellent' | 'good' | 'degraded' | 'poor';
        reviewability: 'easy' | 'moderate' | 'difficult' | 'very-difficult';
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
    };
}
export interface ComplexityAnalysis {
    score: number;
    category: 'simple' | 'moderate' | 'complex' | 'very-complex';
    metrics: {
        fileCount: number;
        totalLines: number;
        criticalChanges: number;
        breakingChanges: number;
        testCoverage: number;
        frameworksAffected: number;
    };
    warnings: ComplexityWarning[];
    recommendations: string[];
    optimalSplitSuggestion?: {
        reason: string;
        suggestedCommits: Array<{
            title: string;
            files: string[];
            reasoning: string;
        }>;
    };
}
export declare class ChangeComplexityAnalyzer {
    private static readonly COMPLEXITY_THRESHOLDS;
    analyzeComplexity(changes: GitChange[], rankingResult?: ChangeRankingResult, tokenBudget?: TokenBudget): ComplexityAnalysis;
    private calculateMetrics;
    private calculateComplexityScore;
    private categorizeComplexity;
    private generateWarnings;
    private generateRecommendations;
    private analyzeOptimalSplit;
    private isBreakingChange;
    private isConfigFile;
    private isCoreImplementation;
    private isTestFile;
    private isDocFile;
    private detectFrameworks;
    private estimateTokenUsage;
}
//# sourceMappingURL=change-complexity-analyzer.d.ts.map