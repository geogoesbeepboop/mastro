import { BaseCommand } from '../../base/command.js';
export default class ConfigInteractive extends BaseCommand {
    static description: string;
    static examples: string[];
    static flags: {
        global: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        config: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        verbose: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-cache': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'dry-run': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
    private configureAI;
    private configureGit;
    private configureTeam;
    private configureReviewPersona;
    private configureCache;
    private configureUI;
    private reviewConfiguration;
    private saveConfiguration;
}
//# sourceMappingURL=interactive.d.ts.map