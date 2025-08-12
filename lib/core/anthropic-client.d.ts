import type { AIProvider, CommitContext, CommitMessage, DiffExplanation, PRDescription, CodeReview, ReviewPersona } from '../types/index.js';
interface AIConfig {
    provider: 'openai' | 'anthropic' | 'local';
    apiKey?: string;
    model: string;
    maxTokens: number;
    temperature: number;
}
export declare class AnthropicProvider implements AIProvider {
    readonly name = "anthropic";
    readonly capabilities: import('../types/index.js').AICapabilities;
    private client;
    private config;
    constructor(config: AIConfig);
    generateCommitMessage(context: CommitContext): Promise<CommitMessage>;
    refineCommitMessage(originalMessage: CommitMessage, refinementInstruction: string, context: CommitContext): Promise<CommitMessage>;
    explainChanges(context: CommitContext): Promise<DiffExplanation>;
    createPRDescription(context: CommitContext): Promise<PRDescription>;
    reviewCode(context: CommitContext, persona: ReviewPersona): Promise<CodeReview>;
    generateDocumentation(type: string, context: any, config: any): Promise<string>;
    performCustomAnalysis(prompt: string, instructions: string, maxTokens?: number, temperature?: number): Promise<string | null>;
    private buildCommitPrompt;
    private buildExplanationPrompt;
    private buildPRPrompt;
    private buildReviewPrompt;
    private buildRefinementPrompt;
    private buildDocumentationPrompt;
    private buildApiDocPrompt;
    private buildArchitectureDocPrompt;
    private buildUserGuideDocPrompt;
    private buildReadmeDocPrompt;
    private buildWorkflowDocPrompt;
    private buildIntegrationDocPrompt;
    private validateCommitMessage;
    private hasSpecificTechnicalTerms;
    private validateCodeReview;
    private validateConfidence;
    private analyzeSpecificIssue;
    private getGenericIssueAnalysis;
}
export {};
//# sourceMappingURL=anthropic-client.d.ts.map