import type { CommitContext, DocumentationType } from '../types/index.js';
export interface ChangeTypeAnalysis {
    type: ChangeCategory;
    confidence: number;
    affectedDocTypes: DocumentationType[];
    reasoning: string;
    suggestedActions: string[];
}
export type ChangeCategory = 'feature-addition' | 'bug-fix' | 'refactor' | 'breaking-change' | 'performance-improvement' | 'security-fix' | 'documentation' | 'testing' | 'configuration' | 'dependency-update' | 'deployment' | 'api-change';
export declare class ChangeDetector {
    analyzeChanges(context: CommitContext): Promise<ChangeTypeAnalysis[]>;
    private analyzeIndividualChange;
    private analyzeApiChange;
    private analyzeTestChange;
    private analyzeConfigChange;
    private analyzeDocumentationChange;
    private analyzeSecurityChange;
    private analyzePerformanceChange;
    private analyzeDeploymentChange;
    private analyzeSourceCodeChange;
    private consolidateAnalyses;
    private mergeAnalyses;
    private extractChangeContent;
    private isApiFile;
    private isTestFile;
    private isConfigFile;
    private isDocumentationFile;
    private isDeploymentFile;
    private isSourceFile;
    private isSecurityRelated;
    private isPerformanceRelated;
    private detectBreakingChanges;
    private detectBugFix;
    private detectRefactor;
}
//# sourceMappingURL=change-detector.d.ts.map