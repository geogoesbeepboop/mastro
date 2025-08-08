import type { StreamingResponse, StreamingOptions, DevelopmentSession, SessionReview, ReviewPersona, CommitContext, CommitMessage, DiffExplanation } from '../types/index.js';
interface StreamingAIConfig {
    provider: 'openai' | 'anthropic' | 'local';
    apiKey?: string;
    model: string;
    maxTokens: number;
    temperature: number;
}
export declare class StreamingAIClient {
    private client;
    private config;
    constructor(config: StreamingAIConfig);
    streamCommitMessage(context: CommitContext, options: StreamingOptions): AsyncGenerator<StreamingResponse<CommitMessage>>;
    streamExplainChanges(context: CommitContext, options: StreamingOptions): AsyncGenerator<StreamingResponse<DiffExplanation>>;
    streamSessionReview(session: DevelopmentSession, persona: ReviewPersona, options: StreamingOptions): AsyncGenerator<StreamingResponse<SessionReview>>;
    generateCommitMessage(context: CommitContext): Promise<CommitMessage>;
    explainChanges(context: CommitContext): Promise<DiffExplanation>;
    private buildCommitPrompt;
    private buildExplanationPrompt;
    private buildReviewPrompt;
    private buildReviewSystemPrompt;
    private validateCommitMessage;
    private sessionToCommitContext;
    private determineScope;
}
export {};
//# sourceMappingURL=streaming-client.d.ts.map