import type {
  AIProvider,
  CommitContext,
  CommitMessage,
  DiffExplanation,
  PRDescription,
  CodeReview,
  ReviewPersona
} from '../types/index.js';
import { OpenAIProvider } from './openai-client.js';
import { AnthropicProvider } from './anthropic-client.js';

interface AIConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export class AIClient {
  private provider: AIProvider;

  constructor(config: AIConfig) {
    switch (config.provider) {
      case 'openai':
        this.provider = new OpenAIProvider(config);
        break;
      case 'anthropic':
        this.provider = new AnthropicProvider(config);
        break;
      case 'local':
        throw new Error('Local provider not yet implemented');
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }

  async generateCommitMessage(context: CommitContext): Promise<CommitMessage> {
    return this.provider.generateCommitMessage(context);
  }

  async refineCommitMessage(originalMessage: CommitMessage, refinementInstruction: string, context: CommitContext): Promise<CommitMessage> {
    return this.provider.refineCommitMessage(originalMessage, refinementInstruction, context);
  }

  async explainChanges(context: CommitContext): Promise<DiffExplanation> {
    return this.provider.explainChanges(context);
  }

  async createPRDescription(context: CommitContext): Promise<PRDescription> {
    return this.provider.createPRDescription(context);
  }

  async reviewCode(context: CommitContext, persona: ReviewPersona): Promise<CodeReview> {
    return this.provider.reviewCode(context, persona);
  }

  async generateDocumentation(type: string, context: any, config: any): Promise<string> {
    return this.provider.generateDocumentation(type, context, config);
  }

  async performCustomAnalysis(prompt: string, instructions: string, maxTokens?: number, temperature?: number): Promise<string | null> {
    return this.provider.performCustomAnalysis(prompt, instructions, maxTokens, temperature);
  }
}