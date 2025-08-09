import type { CommitContext, CommitMessage, DiffExplanation, PRDescription, CodeReview, ReviewPersona } from '../types/index.js';
interface AIConfig {
    provider: 'openai' | 'anthropic' | 'local';
    apiKey?: string;
    model: string;
    maxTokens: number;
    temperature: number;
}
export declare class AIClient {
    private provider;
    constructor(config: AIConfig);
    generateCommitMessage(context: CommitContext): Promise<CommitMessage>;
    refineCommitMessage(originalMessage: CommitMessage, refinementInstruction: string, context: CommitContext): Promise<CommitMessage>;
    explainChanges(context: CommitContext): Promise<DiffExplanation>;
    createPRDescription(context: CommitContext): Promise<PRDescription>;
    reviewCode(context: CommitContext, persona: ReviewPersona): Promise<CodeReview>;
}
export {};
//# sourceMappingURL=ai-client.d.ts.map