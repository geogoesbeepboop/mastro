import { BaseCommand } from '../../base/command.js';
export default class DocsAutoUpdate extends BaseCommand {
    static description: string;
    static examples: string[];
    static flags: {
        preview: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'doc-types': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        threshold: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'output-dir': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'auto-commit': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        force: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        config: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        verbose: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-cache': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'dry-run': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
    private parseDocTypes;
    private parseThreshold;
    private displayPreview;
    private displayUpdateSummary;
    private buildRepoContext;
    private autoCommitUpdates;
}
//# sourceMappingURL=auto-update.d.ts.map