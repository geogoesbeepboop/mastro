import { BaseCommand } from '../../base/command.js';
export default class DocsIndex extends BaseCommand {
    static args: {
        type: import("@oclif/core/lib/interfaces/parser.js").Arg<string, Record<string, unknown>>;
    };
    static description: string;
    static examples: string[];
    static flags: {
        'output-dir': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'include-private': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'include-todos': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'generate-mermaid': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'auto-update': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        template: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        format: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        config: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        verbose: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-cache': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'dry-run': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    private docEngine;
    private docAnalyzer;
    private fileManager;
    run(): Promise<void>;
    private buildDocumentationContext;
    private buildRepoContext;
    private getDocumentationTypes;
    private generateDocumentation;
    private writeDocumentationFiles;
    private displayGenerationSummary;
    private setupAutoUpdate;
}
//# sourceMappingURL=index.d.ts.map