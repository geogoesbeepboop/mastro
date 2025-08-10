import type { DevelopmentSession, GitChange, MastroConfig } from '../types/index.js';
export declare class SessionTracker {
    private git;
    private gitAnalyzer;
    private currentSession?;
    private config;
    constructor(config: MastroConfig);
    initializeSession(): Promise<DevelopmentSession>;
    getCurrentSession(): Promise<DevelopmentSession>;
    updateSessionState(): Promise<void>;
    getWorkingDirectoryChanges(): Promise<GitChange[]>;
    private analyzeFileChange;
    private calculateSessionStats;
    private determineComplexity;
    private assessSessionRisk;
    private detectSessionPatterns;
    resetSession(): Promise<void>;
    private getCurrentCommit;
    hasSessionChanges(): Promise<boolean>;
    /**
     * Check if there are commits ahead of the remote branch
     * This helps detect committed but unpushed changes
     */
    hasUnpushedCommits(): Promise<boolean>;
}
//# sourceMappingURL=session-tracker.d.ts.map