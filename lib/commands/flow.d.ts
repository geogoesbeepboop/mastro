import { BaseCommand } from '../base/command.js';
export default class Flow extends BaseCommand {
    static description: string;
    static examples: string[];
    static flags: {
        auto: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        continue: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'skip-review': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'skip-docs': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'skip-pr': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'skip-analytics': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'dry-run': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'max-boundaries': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<number, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        validate: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        recover: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        force: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        config: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        verbose: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-cache': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    private renderer;
    private interactiveUI;
    private workflowManager;
    private boundaryAnalyzer;
    run(): Promise<void>;
    private startNewWorkflow;
    private continueWorkflow;
    private planWorkflow;
    private executeWorkflow;
    private completeWorkflow;
    private stageBoundaryFiles;
    private reviewBoundary;
    private handleReviewDeclined;
    private commitBoundary;
    private generateDocumentation;
    private generateWorkflowDocumentation;
    private getGeneratedDocFiles;
    private createPullRequest;
    private trackWorkflowAnalytics;
    private executeReviewCommand;
    private executeCommitCommand;
    private executeAnalyticsCommand;
    private displayWorkflowOverview;
    private displayWorkflowProgress;
    private displayWorkflowPlan;
    private displayWorkflowSummary;
    private getWorkflowSteps;
    private formatDuration;
    private sleep;
    private validateWorkflowState;
    private recoverWorkflow;
    private executeWorkflowStep;
    private handleWorkflowStepError;
    private performWorkflowValidation;
    private displayValidationResults;
    private analyzeWorkflowForRecovery;
    private displayRecoveryAnalysis;
    private generateRecoveryOptions;
    private executeRecoveryStrategy;
    private displayErrorDetails;
    private showDetailedErrorAnalysis;
    private attemptAutomatedRecovery;
    private generateTroubleshootingSuggestions;
    private analyzePossibleCauses;
    private generateRecoveryActions;
    /**
     * Validate that we're on an appropriate branch for workflow operations
     */
    private validateBranchState;
}
//# sourceMappingURL=flow.d.ts.map