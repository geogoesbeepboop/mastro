import {Args, Flags} from '@oclif/core';
import {BaseCommand} from '../../base/command.js';
import {DocumentationEngine} from '../../core/doc-engine.js';
import {DocumentationAnalyzer} from '../../analyzers/doc-analyzer.js';
import {FileSystemManager} from '../../core/file-manager.js';
import type {DocumentationType, DocumentationConfig, DocumentationOutput} from '../../types/index.js';

export default class DocsIndex extends BaseCommand {
  static override args = {
    type: Args.string({
      description: 'documentation type to generate',
      options: ['all', 'api', 'architecture', 'user-guide', 'readme'],
      default: 'all'
    })
  };

  static override description = 'Generate comprehensive project documentation';

  static override examples = [
    '<%= config.bin %> <%= command.id %> all',
    '<%= config.bin %> <%= command.id %> api',
    '<%= config.bin %> <%= command.id %> architecture',
    '<%= config.bin %> <%= command.id %> user-guide',
    '<%= config.bin %> <%= command.id %> --output-dir ./documentation',
    '<%= config.bin %> <%= command.id %> --include-private --generate-mermaid'
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
    'generate-mermaid': Flags.boolean({
      description: 'generate mermaid diagrams for architecture documentation',
      default: true
    }),
    'auto-update': Flags.boolean({
      description: 'enable automatic documentation updates on code changes',
      default: false
    }),
    template: Flags.string({
      char: 't',
      description: 'custom template directory to use',
      default: undefined
    }),
    format: Flags.string({
      char: 'f',
      description: 'output format',
      options: ['markdown', 'json', 'html'],
      default: 'markdown'
    })
  };

  private docEngine!: DocumentationEngine;
  private docAnalyzer!: DocumentationAnalyzer;
  private fileManager!: FileSystemManager;

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(DocsIndex);

    try {
      // Initialize components
      this.docEngine = new DocumentationEngine(this.mastroConfig, this.aiClient);
      this.docAnalyzer = new DocumentationAnalyzer();
      this.fileManager = new FileSystemManager(flags['output-dir']);

      // Ensure we're in a git repository
      await this.ensureGitRepository();

      this.startSpinner('Analyzing project structure...');

      // Build documentation context
      const context = await this.buildDocumentationContext();
      
      this.updateSpinner(`Analyzing ${context.projectStructure.files.length} files...`);

      // Create documentation configuration
      const config: DocumentationConfig = {
        outputDirectory: flags['output-dir'],
        types: this.getDocumentationTypes(args.type),
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
        generateMermaid: flags['generate-mermaid'],
        autoUpdate: flags['auto-update']
      };

      // Generate documentation
      const outputs = await this.generateDocumentation(context, config);

      this.updateSpinner('Writing documentation files...');

      // Write documentation files
      await this.writeDocumentationFiles(outputs);

      this.stopSpinner(true, `Documentation generated successfully in ${flags['output-dir']}`);

      // Display summary
      this.displayGenerationSummary(outputs);

      // Set up auto-update if requested
      if (flags['auto-update']) {
        await this.setupAutoUpdate(context, config);
      }

    } catch (error) {
      await this.handleError(error, 'generate documentation');
    }
  }

  private async buildDocumentationContext() {
    const repository = await this.buildRepoContext();
    const workingDir = await this.gitAnalyzer.getRepoRoot();
    
    // Analyze project structure
    const projectStructure = await this.docAnalyzer.analyzeProjectStructure(workingDir);
    
    // Perform code analysis
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
      language: 'typescript', // Enhanced later by analyzer
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

  private getDocumentationTypes(type: string): DocumentationType[] {
    switch (type) {
      case 'all':
        return ['api', 'architecture', 'user-guide', 'readme'];
      case 'api':
        return ['api'];
      case 'architecture':
        return ['architecture'];
      case 'user-guide':
        return ['user-guide'];
      case 'readme':
        return ['readme'];
      default:
        return ['readme'];
    }
  }

  private async generateDocumentation(context: any, config: DocumentationConfig): Promise<DocumentationOutput[]> {
    const outputs: DocumentationOutput[] = [];
    
    this.updateSpinner('Generating documentation with AI...');

    for (const docType of config.types) {
      this.updateSpinner(`Generating ${docType} documentation...`);
      
      try {
        const output = await this.docEngine.generateDocumentation(docType, context, config);
        outputs.push(output);
      } catch (error) {
        this.log(`Failed to generate ${docType} documentation: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
      }
    }

    return outputs;
  }

  private async writeDocumentationFiles(outputs: DocumentationOutput[]): Promise<void> {
    for (const output of outputs) {
      await this.fileManager.writeDocumentation(output);
    }
  }

  private displayGenerationSummary(outputs: DocumentationOutput[]): void {
    this.log('\n📚 Documentation Generation Summary', 'info');
    this.log('─'.repeat(40));
    
    for (const output of outputs) {
      this.log(`✅ ${output.type}: ${output.filePath}`);
      if (output.diagrams && output.diagrams.length > 0) {
        this.log(`   📊 ${output.diagrams.length} diagram(s) included`);
      }
      if (output.sections) {
        this.log(`   📄 ${output.sections.length} section(s) generated`);
      }
    }
    
    this.log(`\n🎉 Generated ${outputs.length} documentation file(s) successfully!`);
    this.log('\nTo view the documentation, open the generated files in your preferred markdown viewer.');
  }

  private async setupAutoUpdate(context: any, config: DocumentationConfig): Promise<void> {
    this.log('Setting up auto-update hooks...', 'info');
    
    // This would set up git hooks to automatically update documentation
    // when significant code changes are detected
    this.log('Auto-update feature will be implemented in a future release', 'warn');
  }
}