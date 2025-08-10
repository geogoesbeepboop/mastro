import type { GitChange, CommitContext, CommitHistory } from '../types/index.js';
export declare class GitAnalyzer {
    private git;
    private repoRoot?;
    constructor();
    isRepository(): Promise<boolean>;
    getRepoRoot(): Promise<string>;
    getCurrentBranch(): Promise<string>;
    getCurrentCommit(): Promise<string>;
    getStagedChanges(): Promise<GitChange[]>;
    getWorkingChanges(): Promise<GitChange[]>;
    getBranchChanges(branch: string, baseBranch?: string): Promise<GitChange[]>;
    getRecentCommits(limit?: number): Promise<CommitHistory[]>;
    buildCommitContext(staged?: boolean): Promise<CommitContext>;
    private buildRepoContext;
    private detectLanguage;
    private detectFramework;
    private analyzeTeamPatterns;
    private extractCommonPrefixes;
    private extractCommonPhrases;
    private getChangeType;
    private getHunks;
    private parseDiffHunks;
    parseDiffForFile(diff: string, file: string, type: GitChange['type']): GitChange;
}
//# sourceMappingURL=git-analyzer.d.ts.map