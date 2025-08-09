import { BaseCommand } from '../base/command.js';
export default class Split extends BaseCommand {
    static description: string;
    static examples: string[];
    static flags: {
        'auto-stage': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'dry-run': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        format: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        interactive: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'min-boundary-size': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<number, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'max-boundary-size': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<number, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        config: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        verbose: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-cache': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    private renderer;
    private interactiveUI;
    private boundaryAnalyzer;
    run(): Promise<void>;
    private outputTerminal;
    private outputJSON;
    private outputMarkdown;
    private handleInteractiveMode;
    private handleAutoStaging;
    private displayNextSteps;
    private handleMergeBoundaries;
    private handleSplitBoundary;
    private handleReorderCommits;
    private handleModifyMessages;
    private generateSimpleCommitMessage;
    private getChangeTypeIcon;
    private determineChangeType;
}
//# sourceMappingURL=split.d.ts.map