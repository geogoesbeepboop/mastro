import type { CommitMessage, DiffExplanation, PRDescription, CodeReview, MastroConfig } from '../types/index.js';
export declare class UIRenderer {
    private config;
    constructor(config: MastroConfig);
    renderCommitMessage(message: CommitMessage): string;
    renderDiffExplanation(explanation: DiffExplanation): string;
    renderPRDescription(pr: PRDescription): string;
    renderCodeReview(review: CodeReview): string;
    renderError(message: string, details?: string): string;
    renderSuccess(message: string): string;
    renderInfo(message: string): string;
    private renderCommitMessagePlain;
    private renderDiffExplanationPlain;
    private renderPRDescriptionPlain;
    private renderCodeReviewPlain;
    private getTypeColor;
    private renderConfidence;
    renderRisk(risk: string): string;
    private renderScope;
    private renderRating;
    private renderSuggestion;
    renderTitle(title: string): string;
    renderSection(title: string, items: string[]): string;
    renderHighlight(text: string): string;
    renderMuted(text: string): string;
    renderPriority(priority: 'high' | 'medium' | 'low'): string;
    renderWarning(text: string): string;
}
//# sourceMappingURL=renderer.d.ts.map