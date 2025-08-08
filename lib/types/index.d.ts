export interface GitChange {
    file: string;
    type: 'added' | 'modified' | 'deleted' | 'renamed';
    insertions: number;
    deletions: number;
    oldFile?: string;
    hunks: GitHunk[];
}
export interface GitHunk {
    header: string;
    lines: GitLine[];
    startLine: number;
    endLine: number;
}
export interface GitLine {
    content: string;
    type: 'added' | 'removed' | 'context';
    lineNumber?: number;
}
export interface CommitContext {
    changes: GitChange[];
    branch: string;
    repository: RepoContext;
    staged: boolean;
    workingDir: string;
    metadata: {
        totalInsertions: number;
        totalDeletions: number;
        fileCount: number;
        changeComplexity: 'low' | 'medium' | 'high';
    };
}
export interface RepoContext {
    name: string;
    root: string;
    language: string;
    framework?: string;
    patterns: TeamPatterns;
    recentCommits: CommitHistory[];
}
export interface TeamPatterns {
    commitStyle: 'conventional' | 'custom';
    prefixes: string[];
    maxLength: number;
    commonPhrases: string[];
    reviewPersona: ReviewPersona;
}
export interface ReviewPersona {
    name: string;
    focus: ('security' | 'performance' | 'maintainability' | 'testing')[];
    strictness: 'lenient' | 'moderate' | 'strict';
    customRules: string[];
}
export interface CommitHistory {
    hash: string;
    message: string;
    author: string;
    date: Date;
    files: string[];
}
export interface CommitMessage {
    title: string;
    body?: string;
    type: string;
    scope?: string;
    confidence: number;
    reasoning: string;
    warnings?: string[];
    recommendations?: string[];
}
export interface DiffExplanation {
    summary: string;
    impact: ImpactAnalysis;
    technicalDetails: string[];
    businessContext?: string;
    migrationNotes?: string[];
    architecturalConsiderations?: string[];
    complexityWarnings?: any[];
    recommendations?: string[];
    compressionNote?: string;
}
export interface ImpactAnalysis {
    risk: 'low' | 'medium' | 'high' | 'critical';
    scope: 'local' | 'module' | 'system';
    affectedComponents: string[];
    potentialIssues: string[];
    testingRecommendations: string[];
}
export interface PRDescription {
    title: string;
    description: string;
    checklist: string[];
    testingInstructions: string[];
    breakingChanges?: string[];
    dependencies?: string[];
}
export interface CodeReview {
    overall: ReviewSummary;
    suggestions: ReviewSuggestion[];
    compliments: string[];
    blockers: ReviewSuggestion[];
}
export interface ReviewSummary {
    rating: 'excellent' | 'good' | 'needs-work' | 'major-issues';
    confidence: number;
    summary: string;
}
export interface ReviewSuggestion {
    file: string;
    line?: number;
    type: 'bug' | 'performance' | 'security' | 'maintainability' | 'style';
    severity: 'info' | 'warning' | 'error';
    message: string;
    suggestion?: string;
    confidence: number;
}
export interface AIProvider {
    name: string;
    generateCommitMessage(context: CommitContext): Promise<CommitMessage>;
    explainChanges(context: CommitContext): Promise<DiffExplanation>;
    createPRDescription(context: CommitContext): Promise<PRDescription>;
    reviewCode(context: CommitContext, persona: ReviewPersona): Promise<CodeReview>;
}
export interface CacheEntry<T> {
    key: string;
    value: T;
    timestamp: number;
    ttl: number;
    similarity?: number;
}
export interface MastroConfig {
    ai: {
        provider: 'openai' | 'anthropic' | 'local';
        apiKey?: string;
        model: string;
        maxTokens: number;
        temperature: number;
    };
    git: {
        defaultBranch: string;
        includeUntracked: boolean;
        maxDiffSize: number;
    };
    cache: {
        enabled: boolean;
        ttl: number;
        maxSize: number;
    };
    team: TeamPatterns;
    ui: {
        spinner: boolean;
        colors: boolean;
        interactive: boolean;
    };
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type ChangeType = 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';
export interface SemanticChange {
    type: ChangeType;
    scope?: string;
    description: string;
    files: string[];
    confidence: number;
    reasoning: string;
}
//# sourceMappingURL=index.d.ts.map