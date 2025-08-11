export class DocumentationEngine {
    aiClient;
    config;
    constructor(config, aiClient) {
        this.config = config;
        this.aiClient = aiClient;
    }
    async generateDocumentation(type, context, config) {
        switch (type) {
            case 'api':
                return this.generateApiDocumentation(context, config);
            case 'architecture':
                return this.generateArchitectureDocumentation(context, config);
            case 'user-guide':
                return this.generateUserGuideDocumentation(context, config);
            case 'readme':
                return this.generateReadmeDocumentation(context, config);
            case 'component':
                return this.generateComponentDocumentation(context, config);
            case 'deployment':
                return this.generateDeploymentDocumentation(context, config);
            default:
                throw new Error(`Unsupported documentation type: ${type}`);
        }
    }
    async generateApiDocumentation(context, config) {
        // Use the proper AI client method for documentation generation
        const apiDocContent = await this.aiClient.generateDocumentation('api', context, config);
        const sections = this.parseDocumentationSections(apiDocContent);
        return {
            type: 'api',
            title: 'API Documentation',
            content: apiDocContent,
            filePath: 'api.md',
            sections,
            references: this.extractApiReferences(context)
        };
    }
    async generateArchitectureDocumentation(context, config) {
        // Use the proper AI client method for documentation generation
        const archContent = await this.aiClient.generateDocumentation('architecture', context, config);
        const sections = this.parseDocumentationSections(archContent);
        let diagrams = [];
        if (config.generateMermaid) {
            diagrams = await this.generateMermaidDiagrams(context);
        }
        // Inject diagrams into content
        const contentWithDiagrams = this.injectDiagrams(archContent, diagrams);
        return {
            type: 'architecture',
            title: 'Architecture Documentation',
            content: contentWithDiagrams,
            filePath: 'architecture.md',
            sections,
            diagrams,
            references: this.extractArchitectureReferences(context)
        };
    }
    async generateUserGuideDocumentation(context, config) {
        // Use the proper AI client method for documentation generation
        const guideContent = await this.aiClient.generateDocumentation('user-guide', context, config);
        const sections = this.parseDocumentationSections(guideContent);
        return {
            type: 'user-guide',
            title: 'User Guide',
            content: guideContent,
            filePath: 'user-guide.md',
            sections,
            references: this.extractUserGuideReferences(context)
        };
    }
    async generateReadmeDocumentation(context, config) {
        // Use the proper AI client method for documentation generation
        const readmeContent = await this.aiClient.generateDocumentation('readme', context, config);
        const sections = this.parseDocumentationSections(readmeContent);
        return {
            type: 'readme',
            title: 'README',
            content: readmeContent,
            filePath: 'README.md',
            sections,
            references: []
        };
    }
    async generateComponentDocumentation(context, config) {
        // Use the proper AI client method for documentation generation
        const componentContent = await this.aiClient.generateDocumentation('component', context, config);
        const sections = this.parseDocumentationSections(componentContent);
        return {
            type: 'component',
            title: 'Component Documentation',
            content: componentContent,
            filePath: 'components.md',
            sections,
            references: this.extractComponentReferences(context)
        };
    }
    async generateDeploymentDocumentation(context, config) {
        // Use the proper AI client method for documentation generation
        const deployContent = await this.aiClient.generateDocumentation('deployment', context, config);
        const sections = this.parseDocumentationSections(deployContent);
        return {
            type: 'deployment',
            title: 'Deployment Guide',
            content: deployContent,
            filePath: 'deployment.md',
            sections,
            references: []
        };
    }
    // All documentation generation now uses proper AI integration
    // Helper methods
    parseDocumentationSections(content) {
        const sections = [];
        const lines = content.split('\\n');
        let currentSection = null;
        for (const line of lines) {
            const headerMatch = line.match(/^(#{1,6})\\s+(.+)$/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                const title = headerMatch[2];
                if (currentSection) {
                    sections.push(currentSection);
                }
                currentSection = {
                    title,
                    content: '',
                    level
                };
            }
            else if (currentSection) {
                currentSection.content += line + '\\n';
            }
        }
        if (currentSection) {
            sections.push(currentSection);
        }
        return sections;
    }
    async generateMermaidDiagrams(context) {
        const diagrams = [];
        // Generate system architecture diagram
        diagrams.push({
            type: 'flowchart',
            title: 'System Architecture',
            description: 'High-level system architecture overview',
            content: this.generateSystemArchitectureDiagram(context)
        });
        if (context.codeAnalysis.userFlows.length > 0) {
            // Generate user flow diagrams
            for (const flow of context.codeAnalysis.userFlows.slice(0, 3)) { // Limit to 3
                diagrams.push({
                    type: 'flowchart',
                    title: `${flow.name} Flow`,
                    description: `User flow diagram for ${flow.name}`,
                    content: this.generateUserFlowDiagram(flow)
                });
            }
        }
        return diagrams;
    }
    generateSystemArchitectureDiagram(context) {
        const lines = [];
        lines.push('flowchart TD');
        lines.push('    A[Client Application] --> B[API Gateway]');
        lines.push('    B --> C[Business Logic Layer]');
        lines.push('    C --> D[Data Access Layer]');
        lines.push('    D --> E[Database]');
        if (context.repository.framework) {
            lines.push(`    F[${context.repository.framework}] --> C`);
        }
        return lines.join('\\n    ');
    }
    generateUserFlowDiagram(flow) {
        const lines = [];
        lines.push('flowchart TD');
        for (let i = 0; i < flow.steps.length; i++) {
            const step = flow.steps[i];
            const nodeId = String.fromCharCode(65 + i); // A, B, C, etc.
            lines.push(`    ${nodeId}[${step.action}]`);
            if (i > 0) {
                const prevNodeId = String.fromCharCode(65 + i - 1);
                lines.push(`    ${prevNodeId} --> ${nodeId}`);
            }
        }
        return lines.join('\\n    ');
    }
    injectDiagrams(content, diagrams) {
        let result = content;
        for (const diagram of diagrams) {
            const placeholder = `## ${diagram.title}`;
            const diagramMarkdown = `## ${diagram.title}\\n\\n${diagram.description}\\n\\n\`\`\`mermaid\\n${diagram.content}\\n\`\`\`\\n\\n`;
            if (result.includes(placeholder)) {
                result = result.replace(placeholder, diagramMarkdown);
            }
            else {
                // Append at the end if no placeholder found
                result += `\\n\\n${diagramMarkdown}`;
            }
        }
        return result;
    }
    extractApiReferences(context) {
        return context.projectStructure.files
            .filter(f => f.apis && f.apis.length > 0)
            .map(f => f.path);
    }
    extractArchitectureReferences(context) {
        return context.projectStructure.configFiles.concat(context.projectStructure.files
            .filter(f => f.type === 'source')
            .map(f => f.path)
            .slice(0, 10));
    }
    extractUserGuideReferences(context) {
        return context.projectStructure.entryPoints.concat(context.projectStructure.configFiles);
    }
    extractComponentReferences(context) {
        return context.projectStructure.files
            .filter(f => f.classes && f.classes.length > 0)
            .map(f => f.path);
    }
}
//# sourceMappingURL=doc-engine.js.map