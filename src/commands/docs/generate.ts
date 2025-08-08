import {Flags} from '@oclif/core';
import {BaseCommand} from '../../base/command.js';
import {DocumentationEngine} from '../../core/doc-engine.js';
import {DocumentationAnalyzer} from '../../analyzers/doc-analyzer.js';
import {FileSystemManager} from '../../core/file-manager.js';
import type {DocumentationConfig, DocumentationOutput} from '../../types/index.js';

export default class DocsGenerate extends BaseCommand {
  static override description = 'Generate all documentation types for the project';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --output-dir ./documentation',
    '<%= config.bin %> <%= command.id %> --skip-mermaid --include-private'
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    'output-dir': Flags.string({
      char: 'o',
      description: 'output directory for documentation files',
      default: './docs'
    }),
    'include-private': Flags.boolean({
      description: 'include private functions and classes in documentation',
      default: false
    }),
    'include-todos': Flags.boolean({
      description: 'include TODO comments in documentation',
      default: false
    }),
    'skip-mermaid': Flags.boolean({
      description: 'skip generating mermaid diagrams',
      default: false
    }),
    'parallel': Flags.boolean({
      description: 'generate documentation types in parallel for faster processing',
      default: true
    }),
    template: Flags.string({
      char: 't',
      description: 'custom template directory to use',
      default: undefined
    })
  };

  private docEngine!: DocumentationEngine;
  private docAnalyzer!: DocumentationAnalyzer;
  private fileManager!: FileSystemManager;

  public async run(): Promise<void> {
    const {flags} = await this.parse(DocsGenerate);

    try {
      // Initialize components
      this.docEngine = new DocumentationEngine(this.mastroConfig, this.aiClient);
      this.docAnalyzer = new DocumentationAnalyzer();
      this.fileManager = new FileSystemManager(flags['output-dir']);

      // Ensure we're in a git repository
      await this.ensureGitRepository();

      this.startSpinner('Analyzing project for comprehensive documentation...');

      // Build documentation context
      const context = await this.buildDocumentationContext();
      
      this.updateSpinner(`Found ${context.projectStructure.files.length} files across ${context.projectStructure.directories.length} directories`);

      // Create comprehensive documentation configuration
      const config: DocumentationConfig = {
        outputDirectory: flags['output-dir'],
        types: ['api', 'architecture', 'user-guide', 'readme'], // Generate all types
        templates: {
          'api': 'default-api-template',
          'architecture': 'default-arch-template',
          'user-guide': 'default-guide-template',
          'readme': 'default-readme-template',
          'component': 'default-component-template',
          'deployment': 'default-deployment-template'
        },
        includePrivate: flags['include-private'],
        includeTodos: flags['include-todos'],
        generateMermaid: !flags['skip-mermaid'],
        autoUpdate: false
      };

      // Display project analysis summary
      this.displayProjectAnalysis(context);

      // Generate documentation
      let outputs: DocumentationOutput[];
      
      if (flags.parallel) {
        outputs = await this.generateDocumentationParallel(context, config);
      } else {
        outputs = await this.generateDocumentationSequential(context, config);
      }

      this.updateSpinner('Writing documentation files...');

      // Write all documentation files
      await this.writeDocumentationFiles(outputs);

      // Create index file
      await this.createDocumentationIndex(outputs);

      this.stopSpinner(true, `Complete documentation suite generated in ${flags['output-dir']}`);

      // Display comprehensive summary
      this.displayComprehensiveSummary(outputs, context);

    } catch (error) {
      await this.handleError(error, 'generate comprehensive documentation');
    }
  }

  private async buildDocumentationContext() {
    const repository = await this.buildRepoContext();
    const workingDir = await this.gitAnalyzer.getRepoRoot();
    
    // Comprehensive project structure analysis
    const projectStructure = await this.docAnalyzer.analyzeProjectStructure(workingDir);
    
    // Deep code analysis including patterns and flows
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

  private displayProjectAnalysis(context: any): void {
    this.log('\n📊 Project Analysis Results', 'info');
    this.log('─'.repeat(30));
    this.log(`Repository: ${context.repository.name}`);
    this.log(`Language: ${context.repository.language}`);
    this.log(`Framework: ${context.repository.framework || 'None detected'}`);
    this.log(`Files: ${context.projectStructure.files.length}`);
    this.log(`Directories: ${context.projectStructure.directories.length}`);
    this.log(`Complexity: ${context.codeAnalysis.complexity.overall}`);
    this.log(`API Endpoints: ${context.codeAnalysis.complexity.metrics.apiEndpoints}`);
    this.log('');
  }

  private async generateDocumentationParallel(context: any, config: DocumentationConfig): Promise<DocumentationOutput[]> {
    this.updateSpinner('Generating all documentation types in parallel...');
    
    const promises = config.types.map(async (docType) => {
      try {
        return await this.docEngine.generateDocumentation(docType, context, config);
      } catch (error) {
        this.log(`Failed to generate ${docType} documentation: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
        throw error;
      }
    });

    const results = await Promise.allSettled(promises);
    const outputs: DocumentationOutput[] = [];
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const docType = config.types[i];
      
      if (result.status === 'fulfilled') {
        outputs.push(result.value);
        this.log(`✅ ${docType} documentation generated`, 'info');
      } else {
        this.log(`❌ ${docType} documentation failed: ${result.reason}`, 'error');
      }
    }

    return outputs;
  }

  private async generateDocumentationSequential(context: any, config: DocumentationConfig): Promise<DocumentationOutput[]> {
    const outputs: DocumentationOutput[] = [];
    
    for (const docType of config.types) {
      this.updateSpinner(`Generating ${docType} documentation...`);
      
      try {
        const output = await this.docEngine.generateDocumentation(docType, context, config);
        outputs.push(output);
        this.log(`✅ ${docType} documentation generated`, 'info');
      } catch (error) {
        this.log(`❌ Failed to generate ${docType} documentation: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
      }
    }

    return outputs;
  }

  private async writeDocumentationFiles(outputs: DocumentationOutput[]): Promise<void> {
    for (const output of outputs) {
      await this.fileManager.writeDocumentation(output);
    }
  }

  private async createDocumentationIndex(outputs: DocumentationOutput[]): Promise<void> {
    const indexContent = this.buildIndexContent(outputs);
    
    const indexOutput = {
      type: 'readme' as const,
      title: 'Documentation Index',
      content: indexContent,
      filePath: 'README.md',
      sections: [] as any[],
      references: outputs.map(o => o.filePath)
    };

    await this.fileManager.writeDocumentation(indexOutput);
  }

  private buildIndexContent(outputs: DocumentationOutput[]): string {
    const lines: string[] = [];
    
    lines.push('# Project Documentation');
    lines.push('');
    lines.push('This documentation was automatically generated by Mastro CLI.');
    lines.push('');
    lines.push('## Available Documentation');
    lines.push('');
    
    for (const output of outputs) {
      const icon = this.getDocumentationIcon(output.type);
      lines.push(`${icon} **[${output.title}](${output.filePath})** - ${this.getDocumentationDescription(output.type)}`);
    }
    
    lines.push('');
    lines.push('## Quick Navigation');
    lines.push('');
    lines.push('- 🚀 **Getting Started**: See [User Guide](user-guide.md)');
    lines.push('- 🏗️ **Architecture**: See [Architecture Documentation](architecture.md)');
    lines.push('- 📡 **API Reference**: See [API Documentation](api.md)');
    lines.push('');
    lines.push(`*Last updated: ${new Date().toISOString().split('T')[0]}*`);
    
    return lines.join('\n');
  }

  private getDocumentationIcon(type: string): string {
    const icons = {
      'api': '📡',
      'architecture': '🏗️',
      'user-guide': '📖',
      'readme': '📋',
      'component': '🧩',
      'deployment': '🚀'
    };
    return icons[type as keyof typeof icons] || '📄';
  }

  private getDocumentationDescription(type: string): string {
    const descriptions = {
      'api': 'Complete API reference with endpoints and examples',
      'architecture': 'System architecture overview with diagrams',
      'user-guide': 'User guide and tutorials for getting started',
      'readme': 'Project overview and quick start guide',
      'component': 'Component documentation and usage examples',
      'deployment': 'Deployment guides and configuration'
    };
    return descriptions[type as keyof typeof descriptions] || 'Documentation';
  }

  private displayComprehensiveSummary(outputs: DocumentationOutput[], context: any): void {
    this.log('\n📚 Comprehensive Documentation Generated', 'info');
    this.log('═'.repeat(50));
    
    const totalSections = outputs.reduce((sum, output) => sum + (output.sections?.length || 0), 0);
    const totalDiagrams = outputs.reduce((sum, output) => sum + (output.diagrams?.length || 0), 0);
    
    this.log(`📄 Generated ${outputs.length} documentation files`);
    this.log(`📑 Created ${totalSections} sections across all documents`);
    this.log(`📊 Generated ${totalDiagrams} mermaid diagrams`);
    this.log(`🎯 Analyzed ${context.projectStructure.files.length} source files`);
    this.log('');
    
    this.log('📂 Generated Files:');
    for (const output of outputs) {
      const size = output.content.length;
      const sizeKb = (size / 1024).toFixed(1);
      this.log(`   ${this.getDocumentationIcon(output.type)} ${output.filePath} (${sizeKb}KB)`);
    }
    
    this.log('');
    this.log('🎉 Your project documentation is now complete and ready to use!');
    this.log('💡 Tip: Add these files to your git repository to keep documentation in sync with code changes.');
  }
}