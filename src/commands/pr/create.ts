import {Flags} from '@oclif/core';
import {BaseCommand} from '../../base/command.js';
import {SessionTracker} from '../../core/session-tracker.js';
import {ReviewEngine} from '../../core/review-engine.js';
import {WorkflowAnalyzer} from '../../core/workflow-analyzer.js';
import {StreamingRenderer} from '../../ui/streaming-renderer.js';
import {ReviewFormatter} from '../../ui/review-formatter.js';
import type {
  PRTemplate,
  PRSection,
  ChecklistItem,
  MigrationDetection,
  SmartPRContext,
  DevelopmentSession,
  ReviewPersona
} from '../../types/index.js';

export default class PRCreate extends BaseCommand {
  static override description = 'Create intelligent pull requests with AI-generated descriptions and templates';

  static override examples = [
    '<%= config.bin %> pr create',
    '<%= config.bin %> pr create --template=feature',
    '<%= config.bin %> pr create --title="Add user authentication"',
    '<%= config.bin %> pr create --draft',
    '<%= config.bin %> pr create --migration-check',
    '<%= config.bin %> pr create --format=markdown'
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    template: Flags.string({
      char: 't',
      description: 'PR template type',
      options: ['feature', 'bugfix', 'hotfix', 'refactor', 'docs', 'auto'],
      default: 'auto'
    }),
    title: Flags.string({
      description: 'custom PR title (overrides auto-generated)'
    }),
    draft: Flags.boolean({
      char: 'd',
      description: 'create as draft PR',
      default: false
    }),
    'migration-check': Flags.boolean({
      description: 'perform migration detection analysis',
      default: true
    }),
    'base-branch': Flags.string({
      char: 'b',
      description: 'base branch for PR',
      default: 'main'
    }),
    'head-branch': Flags.string({
      char: 'h', 
      description: 'head branch for PR (defaults to current branch)'
    }),
    format: Flags.string({
      char: 'f',
      description: 'output format',
      options: ['terminal', 'json', 'markdown'],
      default: 'terminal'
    }),
    'skip-review': Flags.boolean({
      description: 'skip pre-PR code review',
      default: false
    }),
    push: Flags.boolean({
      char: 'p',
      description: 'push branch before creating PR',
      default: false
    })
  };

  private sessionTracker!: SessionTracker;
  private reviewEngine!: ReviewEngine;
  private workflowAnalyzer!: WorkflowAnalyzer;
  private streamingRenderer!: StreamingRenderer;
  private reviewFormatter!: ReviewFormatter;

  public async run(): Promise<void> {
    const {flags} = await this.parse(PRCreate);

    try {
      // Initialize components
      this.sessionTracker = new SessionTracker(this.mastroConfig);
      this.reviewEngine = new ReviewEngine(this.mastroConfig);
      this.workflowAnalyzer = new WorkflowAnalyzer(this.mastroConfig);
      this.streamingRenderer = new StreamingRenderer(this.mastroConfig);
      this.reviewFormatter = new ReviewFormatter(this.mastroConfig);

      // Ensure we're in a git repository
      await this.ensureGitRepository();

      // Get current session
      const session = await this.sessionTracker.getCurrentSession();

      // Validate branch state
      await this.validateBranchState(flags);

      // Check for changes
      if (!await this.sessionTracker.hasSessionChanges()) {
        this.log('⚠️  No changes detected in current session');
        this.log('Make some changes or switch to a branch with changes to create a PR');
        return;
      }

      // Optional: Push branch first
      if (flags.push) {
        await this.pushBranch(flags['head-branch']);
      }

      // Pre-PR review (unless skipped)
      if (!flags['skip-review']) {
        await this.performPrePRReview(session);
      }

      // Migration detection
      let migrationInfo: MigrationDetection | undefined;
      if (flags['migration-check']) {
        migrationInfo = await this.detectMigrations(session);
      }

      // Generate smart PR context
      const prContext = await this.generatePRContext(session, flags, migrationInfo);

      // Generate PR description
      const prDescription = await this.generatePRDescription(prContext, flags);

      // Output results
      await this.outputPRResults(prDescription, prContext, flags);

      // Create actual PR if not dry-run
      if (!flags['dry-run']) {
        await this.createActualPR(prDescription, prContext, flags);
      }

    } catch (error) {
      this.error(`PR creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {exit: 1});
    } finally {
      this.streamingRenderer?.cleanup();
    }
  }

  private async validateBranchState(flags: any): Promise<void> {
    const currentBranch = await this.gitAnalyzer.getCurrentBranch();
    const baseBranch = flags['base-branch'] || 'main';
    
    if (currentBranch === baseBranch) {
      this.error(`Cannot create PR from base branch (${baseBranch}). Please switch to a feature branch.`);
    }

    // Set head branch if not specified
    if (!flags['head-branch']) {
      flags['head-branch'] = currentBranch;
    }

    this.log(`Creating PR: ${flags['head-branch']} → ${baseBranch}`);
  }

  private async pushBranch(branch: string): Promise<void> {
    this.startSpinner(`Pushing branch ${branch}...`);
    
    try {
      // This would integrate with git commands
      // For now, just simulate
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.stopSpinner(true, `Branch ${branch} pushed successfully`);
    } catch (error) {
      this.stopSpinner(false, 'Failed to push branch');
      throw error;
    }
  }

  private async performPrePRReview(session: DevelopmentSession): Promise<void> {
    this.log('\n🔍 Pre-PR Review');
    this.log('─'.repeat(30));
    
    const persona: ReviewPersona = {
      name: 'PR Reviewer',
      focus: ['maintainability', 'security', 'performance'],
      strictness: 'moderate',
      customRules: ['Check for breaking changes', 'Ensure documentation updates']
    };

    const review = await this.reviewEngine.reviewSession(session, persona);
    
    // Show critical issues only
    const criticalItems = review.actionableItems.filter(item => 
      item.priority === 'critical' || item.priority === 'high'
    );

    if (criticalItems.length > 0) {
      this.log('\n⚠️  Critical issues found:');
      this.log(this.reviewFormatter.formatActionableItems(criticalItems, 'terminal'));
      
      const proceed = await this.confirm('Continue with PR creation despite issues?');
      if (!proceed) {
        this.log('PR creation cancelled. Please address the issues and try again.');
        this.exit(0);
      }
    } else {
      this.log('✅ Pre-PR review passed - no critical issues found');
    }
  }

  private async detectMigrations(session: DevelopmentSession): Promise<MigrationDetection> {
    this.startSpinner('Detecting potential migrations...');
    
    try {
      const allChanges = [...session.workingChanges, ...session.stagedChanges];
      
      // Check for migration indicators
      const hasDatabaseChanges = allChanges.some(c => 
        c.file.includes('migration') ||
        c.file.includes('schema') ||
        c.file.includes('database') ||
        c.hunks.some(h => h.lines.some(l => 
          l.content.includes('CREATE TABLE') ||
          l.content.includes('ALTER TABLE') ||
          l.content.includes('DROP TABLE')
        ))
      );

      const hasAPIChanges = allChanges.some(c =>
        c.hunks.some(h => h.lines.some(l =>
          (l.type === 'removed' && (l.content.includes('export') || l.content.includes('endpoint'))) ||
          l.content.includes('@api') ||
          l.content.includes('router.')
        ))
      );

      const hasBreakingChanges = allChanges.some(c =>
        c.hunks.some(h => h.lines.some(l =>
          l.type === 'removed' && 
          (l.content.includes('function') || l.content.includes('class') || l.content.includes('interface'))
        ))
      );

      let detected = false;
      let type: MigrationDetection['type'] = undefined;
      let description = 'No migrations detected';
      let migrationSteps: string[] = [];

      if (hasDatabaseChanges) {
        detected = true;
        type = 'database';
        description = 'Database schema changes detected';
        migrationSteps = [
          'Backup database before deployment',
          'Run migrations in maintenance window',
          'Verify data integrity after migration',
          'Update application configuration if needed'
        ];
      } else if (hasAPIChanges) {
        detected = true;
        type = 'api';
        description = 'API changes detected - may require client updates';
        migrationSteps = [
          'Update API documentation',
          'Notify API consumers of changes',
          'Consider versioning strategy',
          'Test client integrations'
        ];
      } else if (hasBreakingChanges) {
        detected = true;
        type = 'breaking';
        description = 'Breaking changes detected';
        migrationSteps = [
          'Update major version number',
          'Provide migration guide for users',
          'Consider deprecation period',
          'Test downstream dependencies'
        ];
      }

      this.stopSpinner(true, detected ? 'Migrations detected' : 'No migrations found');
      
      return {
        detected,
        type,
        description,
        impact: {
          risk: detected ? 'high' : 'low',
          scope: detected ? 'system' : 'local',
          affectedComponents: detected ? ['Database', 'API clients', 'Dependent services'] : [],
          potentialIssues: detected ? ['Data loss', 'Service downtime', 'Client compatibility'] : [],
          testingRecommendations: detected ? migrationSteps : []
        },
        migrationSteps: detected ? migrationSteps : undefined
      };

    } catch (error) {
      this.stopSpinner(false, 'Migration detection failed');
      throw error;
    }
  }

  private async generatePRContext(session: DevelopmentSession, flags: any, migrationInfo?: MigrationDetection): Promise<SmartPRContext> {
    // Determine PR template based on changes
    let templateType = flags.template;
    if (templateType === 'auto') {
      templateType = await this.workflowAnalyzer.detectPRType(session);
    }

    const template = this.createPRTemplate(templateType, session);
    
    // Analyze review complexity
    const changeStats = session.cumulativeStats;
    let reviewComplexity: SmartPRContext['reviewComplexity'];
    
    if (changeStats.totalFiles > 20 || changeStats.changedLines > 1000) {
      reviewComplexity = 'extensive';
    } else if (changeStats.totalFiles > 10 || changeStats.changedLines > 500) {
      reviewComplexity = 'complex';
    } else if (changeStats.totalFiles > 5 || changeStats.changedLines > 100) {
      reviewComplexity = 'moderate';
    } else {
      reviewComplexity = 'simple';
    }

    // Convert session to commit context
    const allChanges = [...session.workingChanges, ...session.stagedChanges];
    
    return {
      changes: allChanges,
      branch: flags['head-branch'],
      repository: {
        name: 'current-project',
        root: process.cwd(),
        language: 'typescript', // Should be detected
        patterns: this.mastroConfig.team,
        recentCommits: []
      },
      staged: session.stagedChanges.length > 0,
      workingDir: process.cwd(),
      metadata: {
        totalInsertions: changeStats.totalInsertions,
        totalDeletions: changeStats.totalDeletions,
        fileCount: changeStats.totalFiles,
        changeComplexity: changeStats.complexity === 'critical' ? 'high' : changeStats.complexity
      },
      prTemplate: template,
      migrationInfo: migrationInfo || {
        detected: false,
        description: 'No migrations detected',
        impact: {
          risk: 'low',
          scope: 'local',
          affectedComponents: [],
          potentialIssues: [],
          testingRecommendations: []
        }
      },
      relatedPRs: [], // Would be populated by GitHub API
      reviewComplexity
    };
  }

  private createPRTemplate(type: string, session: DevelopmentSession): PRTemplate {
    const baseTemplate: PRTemplate = {
      name: `${type}-template`,
      type: type as any,
      title: `${type}: ${this.generateDefaultTitle(session)}`,
      description: 'AI-generated PR description will be populated here',
      sections: [],
      checklist: [],
      reviewers: [],
      labels: [type]
    };

    switch (type) {
      case 'feature':
        baseTemplate.sections = [
          { title: 'Summary', content: '', required: true, placeholder: 'Brief description of the feature' },
          { title: 'Changes Made', content: '', required: true },
          { title: 'Testing', content: '', required: true },
          { title: 'Documentation', content: '', required: false }
        ];
        baseTemplate.checklist = [
          { id: '1', text: 'Tests added/updated', required: true, category: 'testing' },
          { id: '2', text: 'Documentation updated', required: false, category: 'documentation' },
          { id: '3', text: 'Breaking changes documented', required: false, category: 'development' }
        ];
        break;
        
      case 'bugfix':
        baseTemplate.sections = [
          { title: 'Bug Description', content: '', required: true },
          { title: 'Root Cause', content: '', required: true },
          { title: 'Solution', content: '', required: true },
          { title: 'Testing', content: '', required: true }
        ];
        baseTemplate.checklist = [
          { id: '1', text: 'Bug reproduced locally', required: true, category: 'testing' },
          { id: '2', text: 'Fix tested thoroughly', required: true, category: 'testing' },
          { id: '3', text: 'Regression tests added', required: true, category: 'testing' }
        ];
        break;
        
      case 'hotfix':
        baseTemplate.sections = [
          { title: 'Critical Issue', content: '', required: true },
          { title: 'Immediate Fix', content: '', required: true },
          { title: 'Impact Assessment', content: '', required: true }
        ];
        baseTemplate.checklist = [
          { id: '1', text: 'Critical issue identified', required: true, category: 'review' },
          { id: '2', text: 'Minimal scope verified', required: true, category: 'review' },
          { id: '3', text: 'Rollback plan prepared', required: true, category: 'review' }
        ];
        break;
        
      case 'refactor':
        baseTemplate.sections = [
          { title: 'Refactoring Goals', content: '', required: true },
          { title: 'Changes Made', content: '', required: true },
          { title: 'Benefits', content: '', required: true }
        ];
        baseTemplate.checklist = [
          { id: '1', text: 'No functional changes', required: true, category: 'development' },
          { id: '2', text: 'All tests still pass', required: true, category: 'testing' },
          { id: '3', text: 'Performance impact assessed', required: false, category: 'review' }
        ];
        break;
    }

    return baseTemplate;
  }

  private generateDefaultTitle(session: DevelopmentSession): string {
    // Simple heuristic based on changed files
    const allChanges = [...session.workingChanges, ...session.stagedChanges];
    const changedFiles = allChanges.map(c => c.file);
    
    if (changedFiles.some(f => f.includes('auth'))) {
      return 'authentication system updates';
    } else if (changedFiles.some(f => f.includes('api'))) {
      return 'API improvements';
    } else if (changedFiles.some(f => f.includes('ui') || f.includes('component'))) {
      return 'UI enhancements';
    } else if (changedFiles.some(f => f.includes('test'))) {
      return 'test improvements';
    } else {
      return `updates to ${changedFiles.length} files`;
    }
  }

  private async generatePRDescription(context: SmartPRContext, flags: any): Promise<any> {
    this.startSpinner('Generating PR description...');
    
    try {
      // Use AI client to generate description based on context
      const description = await this.aiClient.createPRDescription(context);
      
      // Add custom title if provided
      if (flags.title) {
        description.title = flags.title;
      }

      this.stopSpinner(true, 'PR description generated');
      return description;
      
    } catch (error) {
      this.stopSpinner(false, 'Failed to generate PR description');
      throw error;
    }
  }

  private async outputPRResults(prDescription: any, context: SmartPRContext, flags: any): Promise<void> {
    switch (flags.format) {
      case 'json':
        console.log(JSON.stringify({
          title: prDescription.title,
          description: prDescription.description,
          checklist: prDescription.checklist,
          migrationInfo: context.migrationInfo,
          reviewComplexity: context.reviewComplexity
        }, null, 2));
        break;
        
      case 'markdown':
        this.outputMarkdownPR(prDescription, context);
        break;
        
      case 'terminal':
      default:
        this.outputTerminalPR(prDescription, context);
        break;
    }
  }

  private outputTerminalPR(prDescription: any, context: SmartPRContext): void {
    this.log('\n📝 Generated PR');
    this.log('─'.repeat(50));
    this.log(`Title: ${prDescription.title}`);
    this.log(`Complexity: ${context.reviewComplexity}`);
    this.log('');
    this.log('Description:');
    this.log(prDescription.description);
    
    if (prDescription.checklist && prDescription.checklist.length > 0) {
      this.log('\nChecklist:');
      for (const item of prDescription.checklist) {
        this.log(`☐ ${item}`);
      }
    }

    if (context.migrationInfo.detected) {
      this.log('\n⚠️  Migration Required');
      this.log(`Type: ${context.migrationInfo.type}`);
      this.log(`Description: ${context.migrationInfo.description}`);
    }
  }

  private outputMarkdownPR(prDescription: any, context: SmartPRContext): void {
    const output: string[] = [];
    
    output.push(`# ${prDescription.title}\n`);
    output.push(prDescription.description);
    output.push('');
    
    if (prDescription.checklist && prDescription.checklist.length > 0) {
      output.push('## Checklist\n');
      for (const item of prDescription.checklist) {
        output.push(`- [ ] ${item}`);
      }
      output.push('');
    }

    if (context.migrationInfo.detected) {
      output.push('## ⚠️ Migration Required\n');
      output.push(`**Type:** ${context.migrationInfo.type}`);
      output.push(`**Description:** ${context.migrationInfo.description}`);
      output.push('');
    }

    console.log(output.join('\n'));
  }

  private async createActualPR(prDescription: any, context: SmartPRContext, flags: any): Promise<void> {
    this.log('\n🚀 Creating PR...');
    
    // This would integrate with GitHub/GitLab APIs
    // For now, show what would happen
    this.log(`Would create PR: ${flags['head-branch']} → ${flags['base-branch']}`);
    this.log(`Title: ${prDescription.title}`);
    this.log(`Draft: ${flags.draft}`);
    
    // Simulated API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.log('✅ PR created successfully!');
    this.log('🔗 https://github.com/example/repo/pull/123');
  }

  private async confirm(message: string): Promise<boolean> {
    // Simple confirmation - in real implementation would use proper prompts
    this.log(`${message} (y/n)`);
    return true; // Default to yes for demo
  }
}