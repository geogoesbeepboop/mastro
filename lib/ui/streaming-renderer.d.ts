import { UIRenderer } from './renderer.js';
import type { StreamingResponse, StreamingOptions, SessionReview, MastroConfig } from '../types/index.js';
export declare class StreamingRenderer extends UIRenderer {
    private loadingManager;
    constructor(config: MastroConfig);
    renderStreamingCommitMessage<T>(streamGenerator: AsyncGenerator<StreamingResponse<T>>, options?: Partial<StreamingOptions>): Promise<T | null>;
    renderStreamingExplanation<T>(streamGenerator: AsyncGenerator<StreamingResponse<T>>, options?: Partial<StreamingOptions>): Promise<T | null>;
    renderStreamingReview<T>(streamGenerator: AsyncGenerator<StreamingResponse<T>>, options?: Partial<StreamingOptions>): Promise<T | null>;
    private renderPartialCommitMessage;
    private renderFinalCommitMessage;
    private renderPartialExplanation;
    private renderFinalExplanation;
    private renderPartialReview;
    private renderFinalReview;
    renderSessionReview(review: SessionReview): void;
    private renderActionableItem;
    private renderWorkflowSuggestion;
    private renderBlocker;
    private renderReviewSuggestion;
    private renderOverallRating;
    protected normalizeRating(rating: any): string;
    private isCommitMessage;
    private isDiffExplanation;
    private isSessionReview;
    private clearCurrentLine;
    cleanup(): void;
}
//# sourceMappingURL=streaming-renderer.d.ts.map