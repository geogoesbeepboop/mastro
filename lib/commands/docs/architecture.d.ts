import { BaseCommand } from '../../base/command.js';
export default class DocsArchitecture extends BaseCommand {
    static description: string;
    static examples: string[];
    static flags: {
        'output-dir': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'include-mermaid': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'skip-mermaid': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        depth: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        focus: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'include-decisions': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'diagram-format': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'analysis-depth': import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        config: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        verbose: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-cache': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'dry-run': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    private docEngine;
    private docAnalyzer;
    private fileManager;
    run(): Promise<void>;
    private buildArchitectureContext;
    private buildRepoContext;
    private displayArchitectureAnalysis;
    private enhanceArchitectureDocumentation;
    private generateArchitectureDiagrams;
    private createArchitectureAssets;
    private displayArchitectureSummary;
    private addExecutiveSummary;
    private generateArchitecturalDecisions;
    private generateTechnologyStack;
    private generateScalabilityAnalysis;
    private generateSecurityConsiderations;
    private generatePerformanceConsiderations;
    private generateSystemOverviewDiagram;
    private generateDataFlowDiagram;
    private generateComponentDiagram;
    private generateDeploymentDiagram;
    private generateADRTemplate;
    private generateArchitectureGlossary;
    private hasSecurityPatterns;
}
//# sourceMappingURL=architecture.d.ts.map