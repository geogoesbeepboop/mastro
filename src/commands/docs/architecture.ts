import {Flags} from '@oclif/core';
import {BaseCommand} from '../../base/command.js';
import {DocumentationEngine} from '../../core/doc-engine.js';
import {DocumentationAnalyzer} from '../../analyzers/doc-analyzer.js';
import {FileSystemManager} from '../../core/file-manager.js';
import type {DocumentationConfig} from '../../types/index.js';

export default class DocsArchitecture extends BaseCommand {
  static override description = 'Generate comprehensive architecture documentation with diagrams';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --include-mermaid',
    '<%= config.bin %> <%= command.id %> --depth=detailed',
    '<%= config.bin %> <%= command.id %> --focus=patterns'
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    'output-dir': Flags.string({
      char: 'o',
      description: 'output directory for architecture documentation',
      default: './docs'
    }),
    'include-mermaid': Flags.boolean({
      description: 'generate mermaid diagrams for architecture visualization',
      default: true
    }),
    'skip-mermaid': Flags.boolean({
      description: 'skip mermaid diagram generation',
      default: false
    }),
    depth: Flags.string({
      description: 'level of detail in architecture documentation',
      options: ['overview', 'detailed', 'comprehensive'],
      default: 'detailed'
    }),
    focus: Flags.string({
      description: 'focus area for architecture documentation',
      options: ['all', 'patterns', 'dependencies', 'structure', 'flows'],
      default: 'all'
    }),
    'include-decisions': Flags.boolean({
      description: 'include architectural decision records (ADRs)',
      default: true
    }),
    'diagram-format': Flags.string({
      description: 'format for generated diagrams',
      options: ['mermaid', 'plantuml', 'both'],
      default: 'mermaid'
    }),
    'analysis-depth': Flags.string({
      description: 'depth of code analysis for architecture insights',
      options: ['surface', 'moderate', 'deep'],
      default: 'moderate'
    })
  };

  private docEngine!: DocumentationEngine;
  private docAnalyzer!: DocumentationAnalyzer;
  private fileManager!: FileSystemManager;

  public async run(): Promise<void> {
    const {flags} = await this.parse(DocsArchitecture);

    try {
      // Initialize components
      this.docEngine = new DocumentationEngine(this.mastroConfig, this.aiClient);
      this.docAnalyzer = new DocumentationAnalyzer();
      this.fileManager = new FileSystemManager(flags['output-dir']);

      // Ensure we're in a git repository
      await this.ensureGitRepository();

      this.startSpinner('Analyzing project architecture...');

      // Build comprehensive documentation context
      const context = await this.buildArchitectureContext();
      
      this.updateSpinner(`Analyzing ${context.projectStructure.directories.length} directories and ${context.codeAnalysis.patterns.length} architectural patterns`);

      // Display architecture analysis
      this.displayArchitectureAnalysis(context, flags);

      // Create architecture-specific configuration
      const config: DocumentationConfig = {
        outputDirectory: flags['output-dir'],
        types: ['architecture'],
        templates: {
          'api': 'default-api-template',
          'architecture': 'default-arch-template',
          'user-guide': 'default-guide-template',
          'readme': 'default-readme-template',
          'component': 'default-component-template',
          'deployment': 'default-deployment-template',
          'troubleshooting': 'default-troubleshooting-template',
          'changelog': 'default-changelog-template',
          'contributing': 'default-contributing-template',
          'security': 'default-security-template',
          'performance': 'default-performance-template',
          'testing': 'default-testing-template',
          'workflow': 'default-workflow-template',
          'integration': 'default-integration-template',
          'all': 'default-all-template'
        },
        includePrivate: false,
        includeTodos: false,
        generateMermaid: flags['include-mermaid'] && !flags['skip-mermaid'],
        autoUpdate: false
      };

      this.updateSpinner('Generating architecture documentation and diagrams...');

      // Generate architecture documentation
      const archDoc = await this.docEngine.generateDocumentation('architecture', context, config);

      // Enhance with additional architecture insights
      const enhancedDoc = await this.enhanceArchitectureDocumentation(archDoc, context, flags);

      this.updateSpinner('Creating architecture diagrams...');

      // Generate additional diagrams if requested
      if (config.generateMermaid) {
        await this.generateArchitectureDiagrams(context, flags);
      }

      this.updateSpinner('Writing architecture documentation files...');

      // Write the documentation
      await this.fileManager.writeDocumentation(enhancedDoc);

      // Create additional architecture assets
      await this.createArchitectureAssets(context, flags);

      this.stopSpinner(true, 'Architecture documentation generated successfully');

      // Display comprehensive summary
      this.displayArchitectureSummary(enhancedDoc, context, flags);

    } catch (error) {
      await this.handleError(error, 'generate architecture documentation');
    }
  }

  private async buildArchitectureContext() {
    const repository = await this.buildRepoContext();
    const workingDir = await this.gitAnalyzer.getRepoRoot();
    
    // Deep analysis for architecture documentation
    const projectStructure = await this.docAnalyzer.analyzeProjectStructure(workingDir);
    const codeAnalysis = await this.docAnalyzer.analyzeCodebase(projectStructure);

    return {
      repository,
      projectStructure,
      codeAnalysis,
      workingDir
    };
  }

  private async buildRepoContext() {
    const repoRoot = await this.gitAnalyzer.getRepoRoot();
    const repoName = repoRoot.split('/').pop() || 'unknown';
    
    return {
      name: repoName,
      root: repoRoot,
      language: 'typescript',
      framework: 'nodejs',
      patterns: {
        commitStyle: 'conventional' as const,
        prefixes: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
        maxLength: 72,
        commonPhrases: ['update', 'add', 'remove', 'fix', 'improve'],
        reviewPersona: {
          name: 'Senior Engineer',
          focus: ['maintainability', 'performance'] as ('security' | 'performance' | 'maintainability' | 'testing')[],
          strictness: 'moderate' as const,
          customRules: [] as string[]
        }
      },
      recentCommits: await this.gitAnalyzer.getRecentCommits(10)
    };
  }

  private displayArchitectureAnalysis(context: any, flags: any): void {
    this.log('\n🏗️ Architecture Analysis Results', 'info');
    this.log('─'.repeat(35));
    
    this.log(`Project: ${context.repository.name}`);
    this.log(`Language: ${context.repository.language}`);
    this.log(`Framework: ${context.repository.framework || 'None detected'}`);
    this.log(`Complexity: ${context.codeAnalysis.complexity.overall.toUpperCase()}`);
    this.log(`Directories: ${context.projectStructure.directories.length}`);
    this.log(`Source Files: ${context.projectStructure.files.filter((f: any) => f.type === 'source').length}`);
    this.log('');
    
    // Display architectural patterns
    if (context.codeAnalysis.patterns.length > 0) {
      this.log('🎯 Detected Patterns:');
      for (const pattern of context.codeAnalysis.patterns) {
        const confidence = Math.round(pattern.confidence * 100);
        this.log(`   ${pattern.name} (${confidence}% confidence)`);
      }
      this.log('');
    }
    
    // Display key metrics
    this.log('📊 Key Metrics:');
    this.log(`   Total Lines: ${context.codeAnalysis.complexity.metrics.totalLines.toLocaleString()}`);
    this.log(`   Cyclomatic Complexity: ${context.codeAnalysis.complexity.metrics.cyclomaticComplexity}`);
    if (context.codeAnalysis.complexity.metrics.apiEndpoints > 0) {
      this.log(`   API Endpoints: ${context.codeAnalysis.complexity.metrics.apiEndpoints}`);
    }
    this.log(`   Dependencies: ${context.codeAnalysis.dependencies.length}`);
    this.log('');
    
    // Display configuration
    this.log('⚙️ Documentation Config:');
    this.log(`   Depth: ${flags.depth}`);
    this.log(`   Focus: ${flags.focus}`);
    this.log(`   Diagrams: ${flags['include-mermaid'] && !flags['skip-mermaid'] ? 'Yes' : 'No'}`);
    this.log(`   Decisions: ${flags['include-decisions'] ? 'Yes' : 'No'}`);
    this.log('');
  }

  private async enhanceArchitectureDocumentation(archDoc: any, context: any, flags: any) {
    let enhanced = { ...archDoc };
    
    // Add executive summary
    enhanced.content = this.addExecutiveSummary(enhanced.content, context);
    
    // Add decision records if requested
    if (flags['include-decisions']) {
      enhanced.content += this.generateArchitecturalDecisions(context);
    }
    
    // Add technology stack section
    enhanced.content += this.generateTechnologyStack(context);
    
    // Add scalability analysis
    enhanced.content += this.generateScalabilityAnalysis(context);
    
    // Add security considerations
    enhanced.content += this.generateSecurityConsiderations(context);
    
    // Add performance considerations
    enhanced.content += this.generatePerformanceConsiderations(context);
    
    return enhanced;
  }

  private async generateArchitectureDiagrams(context: any, flags: any): Promise<void> {
    const diagrams = [
      this.generateSystemOverviewDiagram(context),
      this.generateDataFlowDiagram(context),
      this.generateComponentDiagram(context),
      this.generateDeploymentDiagram(context)
    ];
    
    for (const diagram of diagrams) {
      const diagramOutput = {
        type: 'architecture' as const,
        title: diagram.title,
        content: `# ${diagram.title}\\n\\n${diagram.description}\\n\\n\`\`\`mermaid\\n${diagram.content}\\n\`\`\`\\n`,
        filePath: `diagrams/${diagram.title.toLowerCase().replace(/\\s+/g, '-')}.md`,
        sections: [] as any[],
        references: [] as string[]
      };
      
      await this.fileManager.writeDocumentation(diagramOutput);
    }
  }

  private async createArchitectureAssets(context: any, flags: any): Promise<void> {
    // Create ADR template if decisions are included
    if (flags['include-decisions']) {
      const adrTemplate = {
        type: 'architecture' as const,
        title: 'ADR Template',
        content: this.generateADRTemplate(),
        filePath: 'templates/adr-template.md',
        sections: [] as any[],
        references: [] as string[]
      };
      
      await this.fileManager.writeDocumentation(adrTemplate);
    }
    
    // Create architecture glossary
    const glossary = {
      type: 'architecture' as const,
      title: 'Architecture Glossary',
      content: this.generateArchitectureGlossary(context),
      filePath: 'architecture-glossary.md',
      sections: [] as any[],
      references: [] as string[]
    };
    
    await this.fileManager.writeDocumentation(glossary);
  }

  private displayArchitectureSummary(archDoc: any, context: any, flags: any): void {
    this.log('\n🏗️ Architecture Documentation Complete', 'info');
    this.log('═'.repeat(45));
    
    const contentSize = (archDoc.content.length / 1024).toFixed(1);
    const diagramCount = archDoc.diagrams?.length || 0;
    
    this.log(`📄 Main Document: ${archDoc.filePath} (${contentSize}KB)`);
    if (diagramCount > 0) {
      this.log(`📊 Generated ${diagramCount} architecture diagrams`);
    }
    this.log(`🎯 Analyzed ${context.codeAnalysis.patterns.length} architectural patterns`);
    this.log(`🔧 Documented ${context.codeAnalysis.dependencies.length} dependencies`);
    
    if (archDoc.sections) {
      this.log(`📑 Created ${archDoc.sections.length} documentation sections`);
    }
    
    this.log(`📁 Output directory: ${flags['output-dir']}/`);
    this.log('');
    
    // Show generated files
    this.log('📂 Generated Files:');
    this.log(`   📄 ${archDoc.filePath}`);
    this.log('   📊 diagrams/system-overview.md');
    this.log('   📊 diagrams/data-flow.md');
    this.log('   📊 diagrams/component-diagram.md');
    this.log('   📊 diagrams/deployment-diagram.md');
    if (flags['include-decisions']) {
      this.log('   📋 templates/adr-template.md');
    }
    this.log('   📖 architecture-glossary.md');
    this.log('');
    
    // Show next steps
    this.log('💡 Next Steps:');
    this.log('   • Review the generated architecture documentation');
    this.log('   • Validate architectural patterns and decisions');
    this.log('   • Update diagrams with specific implementation details');
    if (flags['include-decisions']) {
      this.log('   • Create ADRs using the provided template');
    }
    this.log('   • Share with your team for feedback and validation');
  }

  // Helper methods for content generation
  private addExecutiveSummary(content: string, context: any): string {
    const summary = `
## Executive Summary

${context.repository.name} is a ${context.codeAnalysis.complexity.overall} ${context.repository.language} application built with ${context.repository.framework || 'standard libraries'}. The system demonstrates ${context.codeAnalysis.patterns.length > 0 ? 'well-defined architectural patterns' : 'a straightforward design approach'} and spans ${context.codeAnalysis.complexity.metrics.totalFiles} source files with approximately ${context.codeAnalysis.complexity.metrics.totalLines.toLocaleString()} lines of code.

### Key Characteristics
- **Complexity Level**: ${context.codeAnalysis.complexity.overall.charAt(0).toUpperCase() + context.codeAnalysis.complexity.overall.slice(1)}
- **Primary Language**: ${context.repository.language}
- **Framework**: ${context.repository.framework || 'None'}
- **Architectural Patterns**: ${context.codeAnalysis.patterns.map((p: any) => p.name).join(', ') || 'Standard patterns'}
- **API Endpoints**: ${context.codeAnalysis.complexity.metrics.apiEndpoints || 0}

`;
    
    return content.replace('# Architecture Documentation', `# Architecture Documentation${summary}`);
  }

  private generateArchitecturalDecisions(context: any): string {
    return `

## Architectural Decision Records (ADRs)

This section outlines key architectural decisions made during the development of ${context.repository.name}.

### ADR-001: Technology Stack Selection

**Status**: Accepted

**Context**: The project required a robust, scalable technology stack.

**Decision**: Selected ${context.repository.language} with ${context.repository.framework || 'standard libraries'}.

**Consequences**: 
- ✅ Strong ecosystem support
- ✅ Good developer experience
- ✅ Scalable architecture
- ⚠️ Learning curve for team members

### ADR-002: Architectural Pattern

**Status**: Accepted

**Context**: Need for maintainable and scalable code organization.

**Decision**: Implemented ${context.codeAnalysis.patterns.length > 0 ? context.codeAnalysis.patterns[0].name : 'layered architecture'} pattern.

**Consequences**:
- ✅ Clear separation of concerns
- ✅ Improved testability
- ✅ Better maintainability

*Additional ADRs should be documented as new decisions are made.*

`;
  }

  private generateTechnologyStack(context: any): string {
    return `

## Technology Stack

### Core Technologies
- **Language**: ${context.repository.language}
- **Framework**: ${context.repository.framework || 'Standard libraries'}
- **Runtime**: Node.js (inferred)

### Dependencies
${context.codeAnalysis.dependencies.slice(0, 10).map((dep: any) => 
  `- **${dep.name}** (${dep.version}): ${dep.purpose}`
).join('\\n')}

${context.codeAnalysis.dependencies.length > 10 ? `\\n*... and ${context.codeAnalysis.dependencies.length - 10} more dependencies*` : ''}

### Development Tools
- Package Manager: npm/yarn (inferred)
- Testing: ${context.projectStructure.testFiles.length > 0 ? 'Jest/Testing framework' : 'To be configured'}
- Build Tools: TypeScript Compiler

`;
  }

  private generateScalabilityAnalysis(context: any): string {
    const complexity = context.codeAnalysis.complexity.overall;
    let analysis = '';
    
    switch (complexity) {
      case 'simple':
        analysis = 'The current architecture supports small to medium scale applications. Consider microservices architecture for significant scaling.';
        break;
      case 'moderate':
        analysis = 'The architecture shows good scalability foundations. Monitor performance metrics and consider horizontal scaling strategies.';
        break;
      case 'complex':
        analysis = 'The system has complex interconnections. Focus on performance optimization and consider service decomposition.';
        break;
      case 'enterprise':
        analysis = 'Enterprise-level complexity detected. Implement comprehensive monitoring, caching strategies, and consider distributed architecture patterns.';
        break;
    }

    return `

## Scalability Considerations

${analysis}

### Current Scale Indicators
- **Complexity Level**: ${complexity}
- **Files**: ${context.codeAnalysis.complexity.metrics.totalFiles}
- **Lines of Code**: ${context.codeAnalysis.complexity.metrics.totalLines.toLocaleString()}
- **Cyclomatic Complexity**: ${context.codeAnalysis.complexity.metrics.cyclomaticComplexity}

### Scaling Recommendations
${context.codeAnalysis.complexity.recommendations.map((rec: string) => `- ${rec}`).join('\\n')}

`;
  }

  private generateSecurityConsiderations(context: any): string {
    return `

## Security Considerations

### Current Security Posture
- **Authentication**: ${this.hasSecurityPatterns(context, ['auth', 'jwt', 'passport']) ? 'Implemented' : 'To be reviewed'}
- **Input Validation**: ${this.hasSecurityPatterns(context, ['validation', 'sanitize']) ? 'Implemented' : 'To be reviewed'}
- **HTTPS**: Configure HTTPS in production
- **Environment Variables**: Ensure secrets are properly managed

### Security Recommendations
- Implement proper authentication and authorization
- Validate all user inputs
- Use HTTPS for all communications
- Regular security audits and dependency updates
- Implement rate limiting and request throttling

`;
  }

  private generatePerformanceConsiderations(context: any): string {
    return `

## Performance Considerations

### Current Performance Profile
- **Cyclomatic Complexity**: ${context.codeAnalysis.complexity.metrics.cyclomaticComplexity} (${context.codeAnalysis.complexity.metrics.cyclomaticComplexity < 50 ? 'Good' : 'Needs attention'})
- **File Count**: ${context.codeAnalysis.complexity.metrics.totalFiles} source files
- **Estimated Load Capacity**: Based on ${context.codeAnalysis.complexity.overall} complexity

### Performance Recommendations
- Implement caching strategies for frequently accessed data
- Optimize database queries and implement connection pooling
- Use CDN for static assets
- Implement proper logging and monitoring
- Consider implementing pagination for large data sets
- Regular performance testing and profiling

`;
  }

  private generateSystemOverviewDiagram(context: any): any {
    return {
      title: 'System Overview',
      description: 'High-level system architecture overview',
      content: `flowchart TB
    A[Client Application] --> B[Load Balancer]
    B --> C[${context.repository.name} API]
    C --> D[Business Logic Layer]
    D --> E[Data Access Layer]
    E --> F[Database]
    
    C --> G[External Services]
    D --> H[Caching Layer]
    
    style A fill:#e1f5fe
    style C fill:#f3e5f5
    style F fill:#e8f5e8`
    };
  }

  private generateDataFlowDiagram(context: any): any {
    return {
      title: 'Data Flow',
      description: 'Data flow through the system components',
      content: `flowchart LR
    A[User Input] --> B[Validation Layer]
    B --> C[Business Logic]
    C --> D[Data Transform]
    D --> E[Persistence Layer]
    E --> F[Database]
    
    F --> G[Data Retrieval]
    G --> H[Response Transform]
    H --> I[API Response]
    I --> J[Client Display]`
    };
  }

  private generateComponentDiagram(context: any): any {
    const components = context.projectStructure.directories
      .filter((d: any) => d.type === 'source')
      .slice(0, 6)
      .map((d: any) => d.path.split('/').pop());

    return {
      title: 'Component Diagram',
      description: 'Major system components and their relationships',
      content: `graph TD
    ${components.map((comp: string, i: number) => 
      `${String.fromCharCode(65 + i)}[${comp}]`
    ).join('\\n    ')}
    
    A --> B
    B --> C
    C --> D`
    };
  }

  private generateDeploymentDiagram(context: any): any {
    return {
      title: 'Deployment Diagram',
      description: 'Deployment architecture and infrastructure components',
      content: `graph TB
    subgraph "Production Environment"
        A[Load Balancer] --> B[App Server 1]
        A --> C[App Server 2]
        B --> D[Database Primary]
        C --> D
        D --> E[Database Replica]
    end
    
    subgraph "Development Environment"
        F[Dev Server] --> G[Dev Database]
    end
    
    H[CI/CD Pipeline] --> A
    H --> F`
    };
  }

  private generateADRTemplate(): string {
    return `# ADR-XXX: [Short noun phrase describing the decision]

**Status**: [Proposed | Accepted | Deprecated | Superseded]

**Date**: [YYYY-MM-DD]

**Decision Makers**: [List of people involved in the decision]

## Context

Describe the context and problem statement that led to this decision.

## Decision

Describe the decision that was made.

## Rationale

Explain why this decision was made, including:
- What alternatives were considered
- What factors influenced the decision
- What constraints or requirements drove the decision

## Consequences

### Positive Consequences
- [List positive outcomes]

### Negative Consequences
- [List negative outcomes or trade-offs]

### Risks
- [List any risks associated with this decision]

## Implementation

Describe how this decision will be implemented:
- [Implementation steps]
- [Timeline]
- [Responsible parties]

## Validation

How will we know if this decision was successful?
- [Success criteria]
- [Metrics to track]

## Related ADRs

- [Links to related ADRs]
`;
  }

  private generateArchitectureGlossary(context: any): string {
    return `# Architecture Glossary

This glossary defines key architectural terms and concepts used in ${context.repository.name}.

## Terms

**API (Application Programming Interface)**
: Interface that allows different software applications to communicate with each other.

**Component**
: A modular, reusable piece of software that encapsulates specific functionality.

**Dependency**
: External library or service that the application relies on to function properly.

**Framework**
: A pre-written code structure that provides a foundation for developing applications.

**Microservice**
: An architectural approach where a large application is built as a collection of small, independent services.

**Module**
: A self-contained unit of functionality that can be combined with other modules to create a complete application.

**Pattern**
: A reusable solution to a commonly occurring problem in software architecture.

**Repository**
: A storage location for software packages or source code.

**Service**
: A discrete unit of functionality that can be accessed remotely and acted upon independently.

**Stack**
: The combination of programming languages, frameworks, libraries, and tools used to develop an application.

## Project-Specific Terms

${context.codeAnalysis.patterns.map((pattern: any) => 
  `**${pattern.name}**\\n: ${pattern.type.charAt(0).toUpperCase() + pattern.type.slice(1)} architectural pattern implemented in this project.`
).join('\\n\\n')}

---

*This glossary is maintained as part of the project documentation and should be updated as new architectural concepts are introduced.*
`;
  }

  private hasSecurityPatterns(context: any, patterns: string[]): boolean {
    return context.projectStructure.files.some((file: any) => 
      patterns.some(pattern => 
        file.path.toLowerCase().includes(pattern) ||
        file.imports.some((imp: any) => imp.module.toLowerCase().includes(pattern))
      )
    );
  }
}