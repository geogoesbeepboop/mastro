import type { CommitMessage, DiffExplanation, PRDescription, CodeReview, MastroConfig } from '../types/index.js';
export declare class UIRenderer {
    private config;
    constructor(config: MastroConfig);
    renderCommitMessage(message: CommitMessage): string;
    renderDiffExplanation(explanation: DiffExplanation): string;
    renderPRDescription(pr: PRDescription): string;
    renderCodeReview(review: CodeReview): string;
    renderError(message: string, details?: string): string;
    renderWarning(message: string): string;
    renderSuccess(message: string): string;
    renderInfo(message: string): string;
    private renderCommitMessagePlain;
    private renderDiffExplanationPlain;
    private renderPRDescriptionPlain;
    private renderCodeReviewPlain;
    private getTypeColor;
    private renderConfidence;
    private renderRisk;
    private renderScope;
    private renderRating;
    private renderSuggestion;
}
//# sourceMappingURL=renderer.d.ts.map