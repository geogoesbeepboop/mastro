import { BaseCommand } from '../../base/command.js';
export default class DocsGenerate extends BaseCommand {
    static description: string;
    static examples: string[];
    static flags: {
        'output-dir': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'include-private': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'include-todos': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'skip-mermaid': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        parallel: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        template: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
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
    private displayProjectAnalysis;
    private generateDocumentationParallel;
    private generateDocumentationSequential;
    private writeDocumentationFiles;
    private createDocumentationIndex;
    private buildIndexContent;
    private getDocumentationIcon;
    private getDocumentationDescription;
    private displayComprehensiveSummary;
}
//# sourceMappingURL=generate.d.ts.map