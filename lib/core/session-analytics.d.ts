import type { DevelopmentSession, MastroConfig } from '../types/index.js';
export interface SessionAnalytics {
    sessionId: string;
    timestamp: Date;
    duration: number;
    productivity: ProductivityMetrics;
    focus: FocusMetrics;
    patterns: DetectedPattern[];
    quality: QualityMetrics;
    testingSuggestions: TestingSuggestion[];
}
export interface ProductivityMetrics {
    linesPerMinute: number;
    filesModifiedPerHour: number;
    commitFrequency: number;
    refactoringRatio: number;
    velocityScore: number;
    peakHours: number[];
    optimalSessionLength: number;
}
export interface FocusMetrics {
    focusScore: number;
    distractionEvents: number;
    deepWorkSessions: number;
    contextSwitchFrequency: number;
    focusSessionLength: number;
}
export interface DetectedPattern {
    type: 'tdd' | 'refactor_first' | 'feature_branch' | 'hotfix' | 'spike' | 'cleanup';
    confidence: number;
    evidence: string[];
    recommendations: string[];
    impact: 'positive' | 'neutral' | 'negative';
}
export interface QualityMetrics {
    testCoverageIncrease: number;
    codeComplexityTrend: 'improving' | 'stable' | 'degrading';
    documentationRatio: number;
    refactoringEfficiency: number;
    bugFixRatio: number;
}
export interface TestingSuggestion {
    type: 'unit_test' | 'integration_test' | 'e2e_test';
    file: string;
    functionName?: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    estimatedEffort: string;
    testCode?: string;
}
export interface SessionHistory {
    sessions: SessionAnalytics[];
    totalSessions: number;
    averageProductivity: ProductivityMetrics;
    personalBests: PersonalBests;
    trends: ProductivityTrends;
}
export interface PersonalBests {
    longestSession: number;
    mostProductiveSession: number;
    bestFocusScore: number;
    mostFilesInSession: number;
    fastestCommitCycle: number;
}
export interface ProductivityTrends {
    weeklyVelocity: number[];
    monthlyQuality: number[];
    focusImprovement: number;
    testingHabits: number;
    commitSizeOptimization: number;
}
/**
 * Advanced analytics engine for development sessions
 * Tracks productivity patterns, focus metrics, and provides actionable insights
 */
export declare class SessionAnalyticsEngine {
    private config;
    private analyticsPath;
    private currentAnalytics?;
    constructor(config: MastroConfig);
    /**
     * Start analytics tracking for a new session
     */
    startSession(session: DevelopmentSession): Promise<SessionAnalytics>;
    /**
     * Update analytics with current session state
     */
    updateSession(session: DevelopmentSession): Promise<SessionAnalytics>;
    /**
     * Complete session and save analytics
     */
    completeSession(session: DevelopmentSession): Promise<SessionAnalytics>;
    /**
     * Get comprehensive session history and trends
     */
    getSessionHistory(): Promise<SessionHistory>;
    /**
     * Get insights and recommendations based on session history
     */
    getInsights(): Promise<string[]>;
    private initializeProductivityMetrics;
    private initializeFocusMetrics;
    private initializeQualityMetrics;
    private calculateProductivityMetrics;
    private calculateFocusMetrics;
    private detectDevelopmentPatterns;
    private calculateQualityMetrics;
    private generateTestingSuggestions;
    private saveSessionAnalytics;
    private calculateAverageProductivity;
    private calculatePersonalBests;
    private calculateTrends;
    private countRefactoringChanges;
    private findCommonPatterns;
    private initializePersonalBests;
    private initializeTrends;
}
//# sourceMappingURL=session-analytics.d.ts.map