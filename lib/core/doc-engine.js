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
            case 'troubleshooting':
                return this.generateTroubleshootingDocumentation(context, config);
            case 'changelog':
                return this.generateChangelogDocumentation(context, config);
            case 'contributing':
                return this.generateContributingDocumentation(context, config);
            case 'security':
                return this.generateSecurityDocumentation(context, config);
            case 'performance':
                return this.generatePerformanceDocumentation(context, config);
            case 'testing':
                return this.generateTestingDocumentation(context, config);
            case 'workflow':
                return this.generateWorkflowDocumentation(context, config);
            case 'integration':
                return this.generateIntegrationDocumentation(context, config);
            case 'all':
                return this.generateAllDocumentation(context, config);
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
    // New documentation types
    async generateTroubleshootingDocumentation(context, config) {
        const troubleshootingContent = await this.aiClient.generateDocumentation('troubleshooting', context, config);
        const sections = this.parseDocumentationSections(troubleshootingContent);
        return {
            type: 'troubleshooting',
            title: 'Troubleshooting Guide',
            content: troubleshootingContent,
            filePath: 'TROUBLESHOOTING.md',
            sections,
            references: this.extractTroubleshootingReferences(context)
        };
    }
    async generateChangelogDocumentation(context, config) {
        const changelogContent = await this.aiClient.generateDocumentation('changelog', context, config);
        const sections = this.parseDocumentationSections(changelogContent);
        return {
            type: 'changelog',
            title: 'Changelog',
            content: changelogContent,
            filePath: 'CHANGELOG.md',
            sections,
            references: []
        };
    }
    async generateContributingDocumentation(context, config) {
        const contributingContent = await this.aiClient.generateDocumentation('contributing', context, config);
        const sections = this.parseDocumentationSections(contributingContent);
        let diagrams = [];
        if (config.generateMermaid) {
            diagrams = await this.generateContributingDiagrams(context);
        }
        const contentWithDiagrams = this.injectDiagrams(contributingContent, diagrams);
        return {
            type: 'contributing',
            title: 'Contributing Guidelines',
            content: contentWithDiagrams,
            filePath: 'CONTRIBUTING.md',
            sections,
            diagrams,
            references: this.extractContributingReferences(context)
        };
    }
    async generateSecurityDocumentation(context, config) {
        const securityContent = await this.aiClient.generateDocumentation('security', context, config);
        const sections = this.parseDocumentationSections(securityContent);
        return {
            type: 'security',
            title: 'Security Documentation',
            content: securityContent,
            filePath: 'SECURITY.md',
            sections,
            references: this.extractSecurityReferences(context)
        };
    }
    async generatePerformanceDocumentation(context, config) {
        const performanceContent = await this.aiClient.generateDocumentation('performance', context, config);
        const sections = this.parseDocumentationSections(performanceContent);
        let diagrams = [];
        if (config.generateMermaid) {
            diagrams = await this.generatePerformanceDiagrams(context);
        }
        const contentWithDiagrams = this.injectDiagrams(performanceContent, diagrams);
        return {
            type: 'performance',
            title: 'Performance Guide',
            content: contentWithDiagrams,
            filePath: 'PERFORMANCE.md',
            sections,
            diagrams,
            references: this.extractPerformanceReferences(context)
        };
    }
    async generateTestingDocumentation(context, config) {
        const testingContent = await this.aiClient.generateDocumentation('testing', context, config);
        const sections = this.parseDocumentationSections(testingContent);
        let diagrams = [];
        if (config.generateMermaid) {
            diagrams = await this.generateTestingDiagrams(context);
        }
        const contentWithDiagrams = this.injectDiagrams(testingContent, diagrams);
        return {
            type: 'testing',
            title: 'Testing Guide',
            content: contentWithDiagrams,
            filePath: 'TESTING.md',
            sections,
            diagrams,
            references: this.extractTestingReferences(context)
        };
    }
    // Enhanced mermaid diagram generation
    async generateContributingDiagrams(context) {
        const diagrams = [];
        // Git workflow diagram
        diagrams.push({
            type: 'gitgraph',
            title: 'Git Workflow',
            description: 'Standard git workflow for contributions',
            content: this.generateGitWorkflowDiagram(context),
            metadata: { theme: 'default' }
        });
        return diagrams;
    }
    async generatePerformanceDiagrams(context) {
        const diagrams = [];
        // Performance timeline
        diagrams.push({
            type: 'timeline',
            title: 'Performance Optimization Timeline',
            description: 'Timeline of performance improvements',
            content: this.generatePerformanceTimelineDiagram(context)
        });
        return diagrams;
    }
    async generateTestingDiagrams(context) {
        const diagrams = [];
        // Testing strategy mindmap
        diagrams.push({
            type: 'mindmap',
            title: 'Testing Strategy',
            description: 'Overview of testing approaches and strategies',
            content: this.generateTestingMindmapDiagram(context)
        });
        return diagrams;
    }
    // Enhanced diagram generators
    generateGitWorkflowDiagram(context) {
        const lines = [];
        lines.push('gitGraph');
        lines.push('    commit id: "Initial"');
        lines.push('    branch feature');
        lines.push('    checkout feature');
        lines.push('    commit id: "Feature work"');
        lines.push('    commit id: "Tests added"');
        lines.push('    checkout main');
        lines.push('    merge feature');
        lines.push('    commit id: "Release"');
        return lines.join('\n    ');
    }
    generatePerformanceTimelineDiagram(context) {
        const lines = [];
        lines.push('timeline');
        lines.push('    title Performance Optimization Journey');
        lines.push('    section Initial State');
        lines.push('        : Baseline metrics');
        lines.push('        : Performance issues identified');
        lines.push('    section Optimization Phase');
        lines.push('        : Code optimizations');
        lines.push('        : Database tuning');
        lines.push('        : Caching implementation');
        lines.push('    section Results');
        lines.push('        : Performance improvements');
        lines.push('        : Monitoring setup');
        return lines.join('\n        ');
    }
    generateTestingMindmapDiagram(context) {
        const lines = [];
        lines.push('mindmap');
        lines.push('  root((Testing Strategy))');
        lines.push('    Unit Tests');
        lines.push('      Jest');
        lines.push('      Vitest');
        lines.push('      Coverage');
        lines.push('    Integration Tests');
        lines.push('      API Tests');
        lines.push('      Database Tests');
        lines.push('    E2E Tests');
        lines.push('      Playwright');
        lines.push('      Cypress');
        lines.push('    Performance Tests');
        lines.push('      Load Testing');
        lines.push('      Stress Testing');
        return lines.join('\n    ');
    }
    // Helper methods for new doc types
    extractTroubleshootingReferences(context) {
        return context.projectStructure.configFiles.concat(context.projectStructure.files
            .filter(f => f.path.includes('error') || f.path.includes('exception'))
            .map(f => f.path));
    }
    extractContributingReferences(context) {
        return context.projectStructure.configFiles.filter(f => f.includes('.git') || f.includes('lint') || f.includes('prettier') || f.includes('ci'));
    }
    extractSecurityReferences(context) {
        return context.projectStructure.files
            .filter(f => f.path.includes('auth') ||
            f.path.includes('security') ||
            f.path.includes('permission'))
            .map(f => f.path);
    }
    extractPerformanceReferences(context) {
        return context.projectStructure.files
            .filter(f => f.path.includes('cache') ||
            f.path.includes('optimize') ||
            f.path.includes('performance'))
            .map(f => f.path);
    }
    extractTestingReferences(context) {
        return context.projectStructure.testFiles;
    }
    async generateWorkflowDocumentation(context, config) {
        // Enhanced workflow documentation with mastro flow context
        const workflowContext = {
            ...context,
            workflowType: 'mastro-flow',
            recentEnhancements: [
                'Fixed [object Object] display issue in review compliments',
                'Enhanced AI client validation for object-to-string conversion',
                'Improved workflow orchestration with checkpoint management'
            ]
        };
        const workflowContent = await this.aiClient.generateDocumentation('workflow', workflowContext, config);
        const sections = this.parseDocumentationSections(workflowContent);
        let diagrams = [];
        if (config.generateMermaid) {
            diagrams = await this.generateWorkflowDiagrams(context);
        }
        return {
            type: 'workflow',
            title: 'Mastro Workflow Guide',
            content: workflowContent,
            filePath: 'WORKFLOW_GUIDE.md',
            sections,
            references: this.extractWorkflowReferences(context),
            diagrams
        };
    }
    async generateIntegrationDocumentation(context, config) {
        const integrationContent = await this.aiClient.generateDocumentation('integration', context, config);
        const sections = this.parseDocumentationSections(integrationContent);
        return {
            type: 'integration',
            title: 'Integration Guide',
            content: integrationContent,
            filePath: 'INTEGRATION.md',
            sections,
            references: this.extractIntegrationReferences(context)
        };
    }
    async generateAllDocumentation(context, config) {
        // Generate comprehensive documentation suite
        const allTypes = ['api', 'architecture', 'user-guide', 'readme', 'workflow', 'troubleshooting'];
        const documentationSuite = [];
        const allSections = [];
        const allReferences = [];
        for (const docType of allTypes) {
            try {
                const doc = await this.generateDocumentation(docType, context, config);
                documentationSuite.push(`# ${doc.title}\n\n${doc.content}\n\n---\n`);
                allSections.push(...doc.sections);
                allReferences.push(...(doc.references || []));
            }
            catch (error) {
                // Continue with other documentation types if one fails
                console.warn(`Failed to generate ${docType} documentation:`, error);
            }
        }
        return {
            type: 'all',
            title: 'Complete Documentation Suite',
            content: documentationSuite.join('\n'),
            filePath: 'COMPLETE_DOCS.md',
            sections: allSections,
            references: [...new Set(allReferences)] // Remove duplicates
        };
    }
    async generateWorkflowDiagrams(context) {
        return [
            {
                type: 'flowchart',
                title: 'Mastro Flow Workflow',
                content: this.generateMastroFlowDiagram(context),
                description: 'Complete mastro flow workflow orchestration'
            },
            {
                type: 'sequence',
                title: 'Workflow Sequence',
                content: this.generateWorkflowSequenceDiagram(context),
                description: 'Step-by-step workflow execution sequence'
            }
        ];
    }
    generateMastroFlowDiagram(context) {
        const lines = [];
        lines.push('flowchart TD');
        lines.push('    A[mastro flow] --> B[Analyze Boundaries]');
        lines.push('    B --> C[Stage Files]');
        lines.push('    C --> D{Skip Review?}');
        lines.push('    D -->|No| E[Code Review]');
        lines.push('    D -->|Yes| F[Generate Docs]');
        lines.push('    E --> F[Generate Docs]');
        lines.push('    F --> G{Skip Docs?}');
        lines.push('    G -->|No| H[Create Documentation]');
        lines.push('    G -->|Yes| I[Create Commit]');
        lines.push('    H --> I[Create Commit]');
        lines.push('    I --> J{Skip PR?}');
        lines.push('    J -->|No| K[Create Pull Request]');
        lines.push('    J -->|Yes| L[Record Analytics]');
        lines.push('    K --> L[Record Analytics]');
        lines.push('    L --> M[Workflow Complete]');
        lines.push('    E --> N{Issues Found?}');
        lines.push('    N -->|Yes| O[Fix Issues]');
        lines.push('    N -->|No| F');
        lines.push('    O --> P[Re-review]');
        lines.push('    P --> F');
        return lines.join('\n    ');
    }
    generateWorkflowSequenceDiagram(context) {
        const lines = [];
        lines.push('sequenceDiagram');
        lines.push('    participant U as User');
        lines.push('    participant F as Flow Command');
        lines.push('    participant B as Boundary Analyzer');
        lines.push('    participant R as Review Engine');
        lines.push('    participant D as Doc Engine');
        lines.push('    participant C as Commit Engine');
        lines.push('    ');
        lines.push('    U->>F: mastro flow');
        lines.push('    F->>B: Analyze commit boundaries');
        lines.push('    B-->>F: Boundary strategy');
        lines.push('    F->>F: Stage boundary files');
        lines.push('    F->>R: Review code');
        lines.push('    R-->>F: Review results');
        lines.push('    F->>D: Generate documentation');
        lines.push('    D-->>F: Documentation files');
        lines.push('    F->>C: Create commit');
        lines.push('    C-->>F: Commit hash');
        lines.push('    F-->>U: Workflow complete');
        return lines.join('\n    ');
    }
    extractWorkflowReferences(context) {
        return [
            'src/commands/flow.ts',
            'src/core/workflow-context-manager.ts',
            'src/core/commit-boundary-analyzer.ts',
            'src/commands/review.ts',
            'src/commands/commit.ts'
        ];
    }
    extractIntegrationReferences(context) {
        return context.projectStructure.configFiles.concat(context.projectStructure.files
            .filter(f => f.path.includes('config') || f.path.includes('integration'))
            .map(f => f.path));
    }
}
//# sourceMappingURL=doc-engine.js.map