import type { DevelopmentSession, SessionReview, ReviewPersona, MastroConfig } from '../types/index.js';
export declare class ReviewEngine {
    private semanticAnalyzer;
    private impactAnalyzer;
    private complexityAnalyzer;
    private aiClient;
    private config;
    constructor(config: MastroConfig);
    reviewSession(session: DevelopmentSession, persona?: ReviewPersona): Promise<SessionReview>;
    private analyzeSessionChanges;
    private generateActionableItems;
    private generateWorkflowSuggestions;
    private generateLearningPoints;
    private sessionToCommitContext;
    private determineScope;
    private createEmptySessionReview;
    private mapSuggestionTypeToActionable;
    private mapSeverityToPriority;
    private generateActionableTitle;
    private estimateEffort;
    private priorityWeight;
}
//# sourceMappingURL=review-engine.d.ts.map