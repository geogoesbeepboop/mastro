import { AIClient } from './ai-client.js';
import type { MastroConfig, DocumentationType, DocumentationContext, DocumentationConfig, DocumentationOutput } from '../types/index.js';
export declare class DocumentationEngine {
    private aiClient;
    private config;
    constructor(config: MastroConfig, aiClient: AIClient);
    generateDocumentation(type: DocumentationType, context: DocumentationContext, config: DocumentationConfig): Promise<DocumentationOutput>;
    private generateApiDocumentation;
    private generateArchitectureDocumentation;
    private generateUserGuideDocumentation;
    private generateReadmeDocumentation;
    private generateComponentDocumentation;
    private generateDeploymentDocumentation;
    private parseDocumentationSections;
    private generateMermaidDiagrams;
    private generateSystemArchitectureDiagram;
    private generateUserFlowDiagram;
    private injectDiagrams;
    private extractApiReferences;
    private extractArchitectureReferences;
    private extractUserGuideReferences;
    private extractComponentReferences;
}
//# sourceMappingURL=doc-engine.d.ts.map