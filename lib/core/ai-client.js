import { OpenAIProvider } from './openai-client.js';
import { AnthropicProvider } from './anthropic-client.js';
export class AIClient {
    provider;
    constructor(config) {
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
    async generateCommitMessage(context) {
        return this.provider.generateCommitMessage(context);
    }
    async refineCommitMessage(originalMessage, refinementInstruction, context) {
        return this.provider.refineCommitMessage(originalMessage, refinementInstruction, context);
    }
    async explainChanges(context) {
        return this.provider.explainChanges(context);
    }
    async createPRDescription(context) {
        return this.provider.createPRDescription(context);
    }
    async reviewCode(context, persona) {
        return this.provider.reviewCode(context, persona);
    }
    async generateDocumentation(type, context, config) {
        return this.provider.generateDocumentation(type, context, config);
    }
    async performCustomAnalysis(prompt, instructions, maxTokens, temperature) {
        return this.provider.performCustomAnalysis(prompt, instructions, maxTokens, temperature);
    }
}
//# sourceMappingURL=ai-client.js.map