import { BaseCommand } from '../base/command.js';
export default class Explain extends BaseCommand {
    static args: {
        revision: import("@oclif/core/lib/interfaces/parser.js").Arg<string, Record<string, unknown>>;
    };
    static description: string;
    static examples: string[];
    static flags: {
        impact: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        audience: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        format: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'max-commits': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<number, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        config: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        verbose: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-cache': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'dry-run': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    private renderer;
    run(): Promise<void>;
    private parseRevision;
    private analyzeSingleCommit;
    private analyzeCommitRange;
    private analyzeBranch;
    private buildRepoContext;
    private enhanceExplanation;
    private formatOutput;
    private formatMarkdown;
    private sanitizeContext;
}
//# sourceMappingURL=explain.d.ts.map