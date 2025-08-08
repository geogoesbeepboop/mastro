import type { MastroConfig, CommitContext, SemanticChange, ImpactAnalysis } from '../types/index.js';
export declare class ContextEngine {
    private config;
    private projectRoot;
    constructor(config: MastroConfig);
    analyzeSemanticChanges(context: CommitContext): Promise<SemanticChange[]>;
    analyzeImpact(context: CommitContext): Promise<ImpactAnalysis>;
    extractDependencies(filePath: string): Promise<string[]>;
    private analyzeFileChange;
    private inferChangeType;
    private detectNewFeatures;
    private detectBugFixes;
    private detectRefactoring;
    private extractScope;
    private generateDescription;
    private calculateConfidence;
    private detectSemanticPatterns;
    private explainReasoning;
    private consolidateChanges;
    private mergeDescriptions;
    private identifyAffectedComponents;
    private identifyPotentialIssues;
    private generateTestingRecommendations;
    private assessRisk;
    private assessScope;
}
//# sourceMappingURL=context-engine.d.ts.map