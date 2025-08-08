import type { CommitContext, CommitMessage, DiffExplanation, PRDescription, CodeReview } from '../types/index.js';
interface CacheConfig {
    enabled: boolean;
    ttl: number;
    maxSize: number;
}
export declare class CacheManager {
    private memoryCache;
    private config;
    constructor(config: CacheConfig);
    get<T>(key: string, type: string): Promise<T | null>;
    set<T>(key: string, value: T, type: string, context?: CommitContext): Promise<void>;
    getCachedCommitMessage(context: CommitContext): Promise<CommitMessage | null>;
    setCachedCommitMessage(context: CommitContext, message: CommitMessage): Promise<void>;
    getCachedExplanation(context: CommitContext): Promise<DiffExplanation | null>;
    setCachedExplanation(context: CommitContext, explanation: DiffExplanation): Promise<void>;
    getCachedPRDescription(context: CommitContext): Promise<PRDescription | null>;
    setCachedPRDescription(context: CommitContext, pr: PRDescription): Promise<void>;
    getCachedReview(context: CommitContext): Promise<CodeReview | null>;
    setCachedReview(context: CommitContext, review: CodeReview): Promise<void>;
    clear(): Promise<void>;
    getStats(): Promise<{
        memory: any;
    }>;
    close(): void;
    private generateContextKey;
}
export {};
//# sourceMappingURL=cache-manager.d.ts.map