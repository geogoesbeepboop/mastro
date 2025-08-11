import { BaseCommand } from '../base/command.js';
export default class Commit extends BaseCommand {
    static description: string;
    static examples: string[];
    static flags: {
        interactive: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        template: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        learn: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'subcommand-context': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        config: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        verbose: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-cache': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'dry-run': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    private renderer;
    private interactiveUI;
    private isSubcommand;
    run(): Promise<void>;
    private handleCommitRefinement;
    private refineCommitMessage;
    private applyCommit;
    private learnFromCommit;
}
//# sourceMappingURL=commit.d.ts.map