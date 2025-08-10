import { BaseCommand } from '../../base/command.js';
export default class PRCreate extends BaseCommand {
    static description: string;
    static examples: string[];
    static flags: {
        template: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        title: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        draft: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'migration-check': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'base-branch': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'head-branch': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        format: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'skip-review': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        push: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        config: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        verbose: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-cache': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'dry-run': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    private sessionTracker;
    private reviewEngine;
    private workflowAnalyzer;
    private streamingRenderer;
    private reviewFormatter;
    run(): Promise<void>;
    private validateBranchState;
    private pushBranch;
    private performPrePRReview;
    private detectMigrations;
    private generatePRContext;
    private createPRTemplate;
    private generateDefaultTitle;
    private generatePRDescription;
    private outputPRResults;
    private outputTerminalPR;
    private outputMarkdownPR;
    private createActualPR;
    private getRemoteRepositoryInfo;
    private createGitHubPR;
    private createGitLabPR;
    private formatPRBodyForGitHub;
    private formatPRBodyForGitLab;
    private handleStagedChanges;
    private confirm;
}
//# sourceMappingURL=create.d.ts.map