import type { DevelopmentSession, SessionPattern, WorkflowSuggestion, GitChange, MastroConfig, PRTemplate } from '../types/index.js';
export interface WorkflowMetrics {
    sessionDuration: number;
    commitFrequency: number;
    changeVelocity: number;
    testCoverage: number;
    codeQuality: number;
    refactoringRatio: number;
}
export interface TeamWorkflowInsights {
    commonPatterns: string[];
    developmentStyle: 'test-driven' | 'feature-first' | 'iterative' | 'mixed';
    qualityMetrics: WorkflowMetrics;
    recommendations: WorkflowSuggestion[];
    antiPatterns: string[];
}
export interface DevelopmentAntiPattern {
    type: 'large-commits' | 'no-tests' | 'mixed-concerns' | 'breaking-changes';
    severity: 'low' | 'medium' | 'high';
    description: string;
    evidence: string[];
    suggestion: string;
}
export declare class WorkflowAnalyzer {
    private semanticAnalyzer;
    private gitAnalyzer;
    private config;
    constructor(config: MastroConfig);
    analyzeWorkflowPatterns(session: DevelopmentSession): Promise<SessionPattern[]>;
    detectPRType(session: DevelopmentSession, providedChanges?: GitChange[]): Promise<PRTemplate['type']>;
    generateWorkflowSuggestions(session: DevelopmentSession): Promise<WorkflowSuggestion[]>;
    analyzeTeamWorkflow(recentSessions: DevelopmentSession[]): Promise<TeamWorkflowInsights>;
    optimizeCommitStrategy(session: DevelopmentSession): Promise<string[]>;
    private detectTDDPattern;
    private detectFeatureFlagPattern;
    private detectMicrocommitPattern;
    private detectRefactoringSprintPattern;
    private detectDocumentationPattern;
    private detectHotfixPattern;
    private detectAntiPatterns;
    private extractCommonPatterns;
    private inferDevelopmentStyle;
    private calculateQualityMetrics;
    private generateTeamRecommendations;
    private detectTeamAntiPatterns;
    private groupFilesByLogicalBoundary;
    private describeFileGroup;
    private detectCodeDuplication;
    private identifyFileConcerns;
    private mapAntiPatternToSuggestionType;
    private isTestFile;
    private isDocFile;
    private isConfigFile;
}
//# sourceMappingURL=workflow-analyzer.d.ts.map