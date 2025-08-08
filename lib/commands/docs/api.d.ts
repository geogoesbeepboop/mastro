import { BaseCommand } from '../../base/command.js';
export default class DocsApi extends BaseCommand {
    static description: string;
    static examples: string[];
    static flags: {
        'output-dir': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'include-private': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'include-internal': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'group-by': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'include-examples': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        format: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'base-url': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
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
    private displayApiAnalysis;
    private enhanceApiDocumentation;
    private generateApiSpecification;
    private displayApiDocumentationSummary;
    private getMethodCounts;
    private hasAuthenticationPatterns;
    private hasRateLimitingPatterns;
    private generateErrorHandlingSection;
    private buildJsonApiSpec;
    private buildOpenApiSpec;
}
//# sourceMappingURL=api.d.ts.map