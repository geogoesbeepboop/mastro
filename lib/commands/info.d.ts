import { BaseCommand } from '../base/command.js';
export default class Info extends BaseCommand {
    static description: string;
    static examples: string[];
    static flags: {
        config: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        verbose: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-cache': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'dry-run': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
    private displayAsciiArt;
    private displayToolInfo;
    private displayConfiguration;
    private displaySystemInfo;
}
//# sourceMappingURL=info.d.ts.map