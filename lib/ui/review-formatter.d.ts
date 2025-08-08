import type { SessionReview, ActionableItem, WorkflowSuggestion, MastroConfig } from '../types/index.js';
export declare class ReviewFormatter {
    private config;
    constructor(config: MastroConfig);
    formatSessionReview(review: SessionReview, format?: 'terminal' | 'json' | 'markdown' | 'html'): string;
    formatActionableItems(items: ActionableItem[], format?: 'terminal' | 'json' | 'markdown'): string;
    formatWorkflowSuggestions(suggestions: WorkflowSuggestion[], format?: 'terminal' | 'json' | 'markdown'): string;
    private formatTerminal;
    private formatActionableItemsTerminal;
    private formatWorkflowSuggestionsTerminal;
    private formatOverallRating;
    private formatSuggestionTerminal;
    private formatBlockerTerminal;
    private formatMarkdown;
    private formatActionableItemsMarkdown;
    private formatWorkflowSuggestionsMarkdown;
    private formatJSON;
    private formatHTML;
    private getActionableIcon;
    private getSuggestionIcon;
    private getWorkflowIcon;
}
//# sourceMappingURL=review-formatter.d.ts.map