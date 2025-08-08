import type { GitChange, MastroConfig } from '../types/index.js';
import { SemanticAnalyzer } from '../analyzers/semantic-analyzer.js';
import { ImpactAnalyzer } from '../analyzers/impact-analyzer.js';
export interface CommitBoundary {
    id: string;
    files: GitChange[];
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
    estimatedComplexity: number;
    dependencies: string[];
    theme: string;
}
export interface StagingStrategy {
    strategy: 'progressive' | 'parallel' | 'sequential';
    commits: {
        boundary: CommitBoundary;
        suggestedMessage: {
            title: string;
            type: string;
            body?: string;
        };
        rationale: string;
        risk: 'low' | 'medium' | 'high';
        estimatedTime: string;
    }[];
    warnings: string[];
    overallRisk: 'low' | 'medium' | 'high';
}
export interface FileRelationship {
    file1: string;
    file2: string;
    relationshipType: 'import' | 'similar_changes' | 'shared_function' | 'test_pair' | 'config_related';
    strength: number;
}
/**
 * Analyzes working directory changes to detect logical commit boundaries
 * and suggest optimal staging strategies for better commit hygiene.
 */
export declare class CommitBoundaryAnalyzer {
    private config;
    private semanticAnalyzer;
    private impactAnalyzer;
    constructor(config: MastroConfig, semanticAnalyzer: SemanticAnalyzer, impactAnalyzer: ImpactAnalyzer);
    /**
     * Main entry point: analyze all working changes and detect commit boundaries
     */
    analyzeCommitBoundaries(changes: GitChange[]): Promise<CommitBoundary[]>;
    /**
     * Generate a staging strategy with specific commit recommendations
     */
    suggestStagingStrategy(boundaries: CommitBoundary[]): Promise<StagingStrategy>;
    /**
     * Analyze relationships between files to identify which should be committed together
     */
    private analyzeFileRelationships;
    /**
     * Group changes by their impact type (business logic, UI, tests, docs, etc.)
     */
    private groupByImpact;
    /**
     * Build a dependency graph to understand which changes depend on others
     */
    private buildDependencyGraph;
    /**
     * Use ML-style clustering to detect logical boundaries
     */
    private detectBoundariesML;
    /**
     * Optimize boundaries by merging small ones and splitting large ones
     */
    private optimizeBoundaries;
    private checkImportRelationship;
    private checkTestRelationship;
    private checkSimilarChanges;
    private checkConfigRelationship;
    private categorizeImpactType;
    private determinePriority;
    private calculateComplexity;
    private detectTheme;
    private findFileDependencies;
    private findBoundaryDependencies;
    private extractFunctionNames;
    private splitLargeBoundary;
    private tryMergeSmallBoundary;
    private generateCommitMessage;
    private inferCommitType;
    private inferScope;
    private generateDescription;
    private findCommonPath;
    private generateRationale;
    private assessCommitRisk;
    private estimateCommitTime;
    private identifyPotentialIssues;
    private determineOptimalStrategy;
    private assessOverallRisk;
}
//# sourceMappingURL=commit-boundary-analyzer.d.ts.map