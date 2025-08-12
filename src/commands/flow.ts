import {Flags} from '@oclif/core';
import {BaseCommand} from '../base/command.js';
import {UIRenderer} from '../ui/renderer.js';
import {InteractiveUI} from '../ui/interactive.js';
import {WorkflowContextManager} from '../core/workflow-context-manager.js';
import {CommitBoundaryAnalyzer} from '../core/commit-boundary-analyzer.js';
import {SemanticAnalyzer} from '../analyzers/semantic-analyzer.js';
import {ImpactAnalyzer} from '../analyzers/impact-analyzer.js';
import Review from './review.js';
import Commit from './commit.js';
import Analytics from './analytics.js';
import DocsIndex from './docs/index.js';
import PRCreate from './pr/create.js';
import type {WorkflowContext, BoundaryMetrics, WorkflowCheckpoint} from '../types/index.js';
import type {StagingStrategy} from '../core/commit-boundary-analyzer.js';

export default class Flow extends BaseCommand {
  static override description = 'Orchestrate complete development workflow: Split → Review → Docs → Commit → PR → Analytics (PR creation requires GitHub CLI setup: see mastro pr --help)';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --auto',
    '<%= config.bin %> <%= command.id %> --continue',
    '<%= config.bin %> <%= command.id %> --skip-review',
    '<%= config.bin %> <%= command.id %> --skip-docs'
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    auto: Flags.boolean({
      char: 'a',
      description: 'fully automated workflow with minimal user interaction',
      default: false
    }),
    continue: Flags.boolean({
      char: 'c',
      description: 'continue existing workflow from current checkpoint',
      default: false
    }),
    'skip-review': Flags.boolean({
      description: 'skip review step and proceed directly to commit',
      default: false
    }),
    'skip-docs': Flags.boolean({
      description: 'skip documentation generation step',
      default: false
    }),
    'skip-pr': Flags.boolean({
      description: 'skip pull request creation',
      default: false
    }),
    'skip-analytics': Flags.boolean({
      description: 'skip analytics tracking',
      default: false
    }),
    'dry-run': Flags.boolean({
      description: 'show workflow plan without executing',
      default: false
    }),
    'max-boundaries': Flags.integer({
      description: 'maximum number of boundaries to process in one run',
      default: 10
    }),
    'validate': Flags.boolean({
      description: 'validate workflow context and checkpoints before proceeding',
      default: false
    }),
    'recover': Flags.boolean({
      description: 'attempt recovery from failed workflow state',
      default: false
    }),
    'force': Flags.boolean({
      description: 'force workflow execution despite validation warnings',
      default: false
    })
  };

  private renderer!: UIRenderer;
  private interactiveUI!: InteractiveUI;
  private workflowManager!: WorkflowContextManager;
  private boundaryAnalyzer!: CommitBoundaryAnalyzer;

  public async run(): Promise<void> {
    const {flags} = await this.parse(Flow);

    try {
      // Initialize components
      this.renderer = new UIRenderer(this.mastroConfig);
      this.interactiveUI = new InteractiveUI(this.mastroConfig);
      this.workflowManager = new WorkflowContextManager();
      
      const semanticAnalyzer = new SemanticAnalyzer();
      const impactAnalyzer = new ImpactAnalyzer();
      this.boundaryAnalyzer = new CommitBoundaryAnalyzer(
        this.mastroConfig,
        semanticAnalyzer,
        impactAnalyzer
      );

      // Ensure we're in a git repository
      await this.ensureGitRepository();

      // Validate branch state for workflow operations
      await this.validateBranchState(flags);

      console.log('\n' + this.renderer.renderTitle('🔄 Mastro Workflow Orchestrator'));

      // Handle validation mode
      if (flags.validate) {
        await this.validateWorkflowState(flags);
        return;
      }

      // Handle recovery mode
      if (flags.recover) {
        await this.recoverWorkflow(flags);
        return;
      }

      // Handle different workflow modes
      if (flags.continue) {
        await this.continueWorkflow(flags);
      } else if (flags['dry-run']) {
        await this.planWorkflow(flags);
      } else {
        await this.startNewWorkflow(flags);
      }

    } catch (error) {
      await this.handleError(error, 'execute workflow');
    } finally {
      this.interactiveUI?.cleanup();
    }
  }

  private async startNewWorkflow(flags: any): Promise<void> {
    // Check for existing workflow
    const existingContext = await this.workflowManager.loadContext();
    if (existingContext) {
      const shouldContinue = await this.interactiveUI.confirmAction(
        'An existing workflow was found. Continue from where you left off?',
        true
      );
      
      if (shouldContinue) {
        await this.continueWorkflow(flags);
        return;
      } else {
        await this.workflowManager.clearContext();
        this.success('Previous workflow cleared. Starting fresh.');
      }
    }

    // Analyze working directory for boundaries
    this.startSpinner('Analyzing working directory for commit boundaries...');
    
    const stagedChanges = await this.gitAnalyzer.getStagedChanges();
    if (stagedChanges.length === 0) {
      this.stopSpinner(false);
      this.log('No staged changes found. Run \'git add\' to stage files first.', 'warn');
      return;
    }

    const boundaries = await this.boundaryAnalyzer.analyzeCommitBoundaries(stagedChanges);
    const strategy = await this.boundaryAnalyzer.suggestStagingStrategy(boundaries);
    
    this.stopSpinner(true, `Found ${boundaries.length} logical commit boundaries`);

    // Display workflow overview
    this.displayWorkflowOverview(strategy, flags);

    // Create workflow context
    const workflowSettings = {
      skipReview: flags['skip-review'],
      skipDocs: flags['skip-docs'],
      skipPR: flags['skip-pr'],
      skipAnalytics: flags['skip-analytics'],
      autoMode: flags.auto
    };

    const context = await this.workflowManager.createContext(
      strategy.commits.map(c => c.boundary),
      workflowSettings
    );
    this.success(`Workflow initialized: ${context.sessionId}`);

    // Start workflow execution
    await this.executeWorkflow(context, flags);
  }

  private async continueWorkflow(flags: any): Promise<void> {
    const context = await this.workflowManager.loadContext();
    
    if (!context) {
      this.error('No existing workflow found to continue. Start a new workflow without --continue flag.', {exit: 1});
    }

    this.log(`📋 Continuing workflow: ${context.sessionId}`);
    this.displayWorkflowProgress(context);

    if (await this.workflowManager.isWorkflowComplete()) {
      this.log('✅ Workflow is already complete!', 'info');
      await this.displayWorkflowSummary(context);
      return;
    }

    await this.executeWorkflow(context, flags);
  }

  private async planWorkflow(flags: any): Promise<void> {
    this.log('📋 Workflow Plan (Dry Run)', 'info');
    this.log('─'.repeat(30));

    // Analyze boundaries
    const stagedChanges = await this.gitAnalyzer.getStagedChanges();
    if (stagedChanges.length === 0) {
      this.log('No staged changes found. Run \'git add\' to stage files first.', 'warn');
      return;
    }

    const boundaries = await this.boundaryAnalyzer.analyzeCommitBoundaries(stagedChanges);
    const strategy = await this.boundaryAnalyzer.suggestStagingStrategy(boundaries);

    this.displayWorkflowPlan(strategy, flags);
  }

  private async executeWorkflow(context: WorkflowContext, flags: any): Promise<void> {
    let processedBoundaries = 0;
    const maxBoundaries = flags['max-boundaries'];

    while (!await this.workflowManager.isWorkflowComplete() && processedBoundaries < maxBoundaries) {
      const currentBoundary = await this.workflowManager.getCurrentBoundary();
      
      if (!currentBoundary) {
        break;
      }

      const boundaryIndex = context.currentBoundaryIndex;
      console.log(`\n📦 Processing Boundary ${boundaryIndex + 1}/${context.boundaries.length}`);
      console.log(`Theme: ${currentBoundary.theme} (${currentBoundary.files.length} files)`);

      const startTime = Date.now();
      let success = false;

      try {
        // Step 1: Stage files for current boundary
        await this.executeWorkflowStep(
          'split',
          `Staging boundary ${boundaryIndex + 1}`,
          () => this.stageBoundaryFiles(currentBoundary),
          { boundaryId: currentBoundary.id, staged: true },
          flags
        );

        // Step 2: Review (optional)
        if (!context.settings.skipReview && !flags.auto) {
          await this.executeWorkflowStep(
            'review',
            `Reviewing boundary ${boundaryIndex + 1}`,
            () => this.reviewBoundary(currentBoundary, flags),
            { boundaryId: currentBoundary.id },
            flags
          );
        }

        // Step 3: Documentation (optional) - Generate BEFORE commit so it's included
        let generatedDocFiles: string[] = [];
        if (!context.settings.skipDocs) {
          generatedDocFiles = await this.executeWorkflowStep(
            'docs',
            `Generating docs for boundary ${boundaryIndex + 1}`,
            () => this.generateDocumentation(currentBoundary),
            { boundaryId: currentBoundary.id },
            flags
          ) || [];
          
          // Log generated documentation files
          if (generatedDocFiles.length > 0) {
            this.log(`Generated documentation: ${generatedDocFiles.join(', ')}`, 'info');
          }
        }

        // Step 4: Commit boundary (including any generated docs)
        const commitHash = await this.executeWorkflowStep(
          'commit',
          `Committing boundary ${boundaryIndex + 1}`,
          () => this.commitBoundary(currentBoundary, generatedDocFiles, flags),
          { boundaryId: currentBoundary.id },
          flags
        );
        context.commitHashes.push(commitHash);
        await this.workflowManager.saveCheckpoint('commit', { boundaryId: currentBoundary.id, commitHash });

        success = true;
        this.success(`✅ Boundary ${boundaryIndex + 1} completed successfully`);

      } catch (error) {
        const workflowError = await this.handleWorkflowStepError(
          error,
          currentBoundary,
          boundaryIndex + 1,
          flags
        );

        if (workflowError.shouldAbort) {
          this.log('Workflow aborted due to critical error.', 'error');
          return;
        }

        if (workflowError.shouldPause) {
          this.log('Workflow paused. Run `mastro flow --continue` to resume later.', 'info');
          return;
        }

        // Continue to next boundary if error was handled
      }

      // Record metrics
      const processingTime = Date.now() - startTime;
      const metrics: BoundaryMetrics = {
        boundaryId: currentBoundary.id,
        processingTime,
        linesChanged: currentBoundary.files.reduce((sum: number, file: any) => sum + file.insertions + file.deletions, 0),
        filesModified: currentBoundary.files.length,
        complexity: currentBoundary.estimatedComplexity || 'medium',
        commitHash: success ? context.commitHashes[context.commitHashes.length - 1] : undefined
      };

      await this.workflowManager.addBoundaryMetrics(metrics);

      // Advance to next boundary
      const hasMore = await this.workflowManager.advanceBoundary();
      processedBoundaries++;

      if (!hasMore) {
        break;
      }

      // Brief pause between boundaries unless in auto mode
      if (!flags.auto && processedBoundaries < maxBoundaries - 1) {
        await this.sleep(1000);
      }
    }

    // Check if workflow is complete
    if (await this.workflowManager.isWorkflowComplete()) {
      await this.completeWorkflow(context, flags);
    } else {
      this.log(`\n⏸️  Processed ${processedBoundaries} boundaries. Run \`mastro flow --continue\` to process remaining boundaries.`, 'info');
    }
  }

  private async completeWorkflow(context: WorkflowContext, flags: any): Promise<void> {
    // Step 5: Create PR (optional)
    if (!context.settings.skipPR) {
      try {
        await this.createPullRequest();
        await this.workflowManager.saveCheckpoint('pr', { created: true });
      } catch (error) {
        this.log(`✖ PR creation failed`, 'error');
        this.log(`⚠ Warning: PR creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
      }
    }

    // Step 6: Analytics (optional)
    if (!context.settings.skipAnalytics) {
      await this.trackWorkflowAnalytics(context);
      await this.workflowManager.saveCheckpoint('analytics', { recorded: true });
    }

    // Display final summary
    await this.displayWorkflowSummary(context);

    // Clean up workflow context
    await this.workflowManager.clearContext();
    this.success('Workflow context cleaned up');

    // Final celebration message at the very end
    console.log('\n' + this.renderer.renderTitle('🎉 mastro flow complete!'));
  }

  private async stageBoundaryFiles(boundary: any): Promise<void> {
    this.startSpinner(`Staging ${boundary.files.length} files for boundary...`);
    
    try {
      // Clear staging area
      await (this.gitAnalyzer as any).git.reset(['HEAD']);
      
      // Stage files for this boundary
      const filesToStage = boundary.files.map((f: any) => f.file);
      await (this.gitAnalyzer as any).git.add(filesToStage);
      
      this.stopSpinner(true, `Files staged: ${filesToStage.length} for "${boundary.theme}"`);
      
    } catch (error) {
      this.stopSpinner(false, 'Failed to stage files');
      throw new Error(`Staging failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async reviewBoundary(boundary: any, flags: any): Promise<void> {
    this.log('\n🔍 Reviewing boundary...', 'info');
    
    // Call review command with boundary context
    try {
      await this.executeReviewCommand(['--boundary-context']);
      // In boundary-context mode, streamline: auto-proceed unless explicitly declined
      if (!flags.auto) {
        const proceed = await this.interactiveUI.confirmAction('Review complete. Proceed to commit?', true);
        if (!proceed) {
          await this.handleReviewDeclined(boundary);
        }
      }
      
    } catch (error) {
      // Don't wrap review cancellation as a failure
      if (error instanceof Error && error.message.includes('Review step cancelled')) {
        throw error; // Re-throw to be handled by workflow
      }
      throw new Error(`Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async handleReviewDeclined(boundary: any): Promise<void> {
    this.log('\n🔄 Review concerns need to be addressed before proceeding', 'info');
    
    const options = [
      'Address issues and re-run review',
      'Skip this boundary for now', 
      'Continue anyway (not recommended)',
      'Abort workflow'
    ];
    
    const choice = await this.interactiveUI.selectIndex(
      'How would you like to proceed?',
      options
    );
    
    switch (choice) {
      case 0: // Address issues and re-run
        this.log('\n📝 To address the review feedback:', 'info');
        this.log('  1. Make the necessary code changes');
        this.log('  2. Run: mastro review --boundary-context');
        this.log('  3. When ready: mastro flow --continue');
        this.log('\nWorkflow paused. Resume with `mastro flow --continue` when ready.', 'info');
        throw new Error('WORKFLOW_PAUSED'); // Special error to pause workflow gracefully
        
      case 1: // Skip boundary
        this.log('⏭️ Skipping current boundary', 'warn');
        return; // Continue to next boundary
        
      case 2: // Continue anyway
        this.log('⚠️ Proceeding despite review concerns (not recommended)', 'warn');
        return; // Continue with commit
        
      case 3: // Abort
        throw new Error('Workflow aborted by user');
    }
  }

  private async commitBoundary(boundary: any, generatedDocFiles: string[], flags: any): Promise<string> {
    try {
      // Collect all files to stage: boundary files + generated docs
      const boundaryFiles = boundary.files.map((f: any) => f.file);
      const allFilesToStage = [...boundaryFiles, ...generatedDocFiles];
      
      // Stage all files together in one operation to ensure they're all included in commit context
      if (allFilesToStage.length > 0) {
        await (this.gitAnalyzer as any).git.add(allFilesToStage);
        this.log(`Staging ${boundaryFiles.length} boundary files + ${generatedDocFiles.length} doc files`, 'debug');
      }

      // Delegate to commit command; interactive unless auto
      const args = flags.auto ? [] : ['--interactive'];
      await this.executeCommitCommand(args);

      // Get the latest commit hash
      const commitHash = await this.gitAnalyzer.getCurrentCommit();
      this.success(`Commit created: ${commitHash.substring(0, 8)}`);
      return commitHash;
    } catch (error) {
      throw new Error(`Commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateDocumentation(boundary: any): Promise<string[]> {
    try {
      this.log('📚 Generating comprehensive documentation...', 'info');
      
      // Get current workflow context for documentation
      const workflowContext = await this.workflowManager.loadContext();
      const currentBranch = await this.gitAnalyzer.getCurrentBranch();
      const recentCommits = await this.gitAnalyzer.getRecentCommits(5);
      
      // Enhanced documentation generation with multiple types
      const documentationTypes = ['all']; // Generate all documentation types
      
      const docsArgs = [
        ...documentationTypes,
        '--output-dir', './docs',
        '--include-private', // Include private functions for internal docs
        '--generate-mermaid', // Generate diagrams for architecture changes
        '--include-todos', // Include TODO comments in documentation
        '--auto-update', // Enable automatic documentation updates
        '--format', 'markdown' // Ensure markdown format
      ];
      
      this.log(`📝 Generating docs for boundary: ${boundary.theme}`, 'debug');
      this.log(`📋 Workflow context: ${workflowContext?.sessionId || 'none'}`, 'debug');
      this.log(`🌿 Current branch: ${currentBranch}`, 'debug');
      
      const docsCommand = new DocsIndex(docsArgs, this.config);
      await docsCommand.init();
      await docsCommand.run();
      
      // Generate additional workflow-specific documentation
      await this.generateWorkflowDocumentation(boundary, workflowContext);
      
      // Get list of generated documentation files
      const generatedFiles = await this.getGeneratedDocFiles('./docs');
      
      if (generatedFiles.length > 0) {
        this.log(`✅ Generated ${generatedFiles.length} documentation files:`, 'info');
        generatedFiles.forEach(file => {
          this.log(`   📄 ${file}`, 'debug');
        });
        return generatedFiles;
      } else {
        this.log('⚠️ No documentation files were generated', 'warn');
        return [];
      }
      
    } catch (error) {
      // Don't throw - docs are optional, but log the error
      this.log(`Documentation warning: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
      return [];
    }
  }

  private async generateWorkflowDocumentation(boundary: any, workflowContext: any): Promise<void> {
    try {
      // Generate mastro flow specific documentation
      const flowDocsArgs = [
        'user-guide',
        '--output-dir', './docs',
        '--focus', 'workflows',
        '--include-examples',
        '--generate-mermaid'
      ];
      
      this.log('📚 Generating workflow-specific documentation...', 'debug');
      
      const flowDocsCommand = new DocsIndex(flowDocsArgs, this.config);
      await flowDocsCommand.init();
      await flowDocsCommand.run();
      
    } catch (error) {
      this.log(`Workflow docs warning: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
    }
  }

  private async getGeneratedDocFiles(docsDir: string): Promise<string[]> {
    try {
      const fs = await import('fs').then(fs => fs.promises);
      const path = await import('path');
      
      // Check if docs directory exists
      try {
        await fs.access(docsDir);
      } catch {
        return []; // Directory doesn't exist, no files generated
      }
      
      // Get all files in docs directory (recursively)
      const files: string[] = [];
      
      const readDirRecursive = async (dir: string) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await readDirRecursive(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.json'))) {
            files.push(fullPath);
          }
        }
      };
      
      await readDirRecursive(docsDir);
      return files;
      
    } catch (error) {
      this.log(`Error reading docs directory: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
      return [];
    }
  }

  private async createPullRequest(): Promise<void> {
    try {
      // Use the actual PR create command
      // PR create will handle: 
      // 1. Detecting changes (staged, working, or unpushed commits)
      // 2. Auto-committing staged changes if needed  
      // 3. Pushing commits to remote
      // 4. Creating the PR
      const prCommand = new PRCreate(['--skip-review'], this.config);
      await prCommand.init();
      await prCommand.run();
      
    } catch (error) {
      throw new Error(`PR creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async trackWorkflowAnalytics(context: WorkflowContext): Promise<void> {
    this.startSpinner('Recording workflow analytics...');
    
    try {
      // Run analytics update in quiet mode and suppress suggestions/output
      await this.executeAnalyticsCommand(['--update-current', '--quiet', '--suppress-suggestions']);
      // Silent success; no extra terminal noise at the end of flow
      this.stopSpinner(true);
      
    } catch (error) {
      this.stopSpinner(false, 'Analytics tracking failed');
      // Don't throw - analytics are optional
      this.log(`Analytics warning: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
    }
  }

  private async executeReviewCommand(args: string[] = []): Promise<void> {
    // Construct the command with argv so flags (e.g., --boundary-context) are respected
    const reviewCommand = new Review(args, this.config);
    await reviewCommand.init();
    await reviewCommand.run();
  }

  private async executeCommitCommand(args: string[] = []): Promise<void> {
    // Add subcommand context flag to prevent premature cleanup
    const commitArgs = [...args, '--subcommand-context'];
    const commitCommand = new Commit(commitArgs, this.config);
    await commitCommand.init();
    await commitCommand.run();
  }

  private async executeAnalyticsCommand(args: string[] = []): Promise<void> {
    const analyticsCommand = new Analytics(args, this.config);
    await analyticsCommand.init();
    await analyticsCommand.run();
  }

  // Display methods

  private displayWorkflowOverview(strategy: StagingStrategy, flags: any): void {
    console.log(this.renderer.renderSection('📋 Workflow Overview', [
      `Total boundaries: ${strategy.commits.length}`,
      `Overall strategy: ${strategy.strategy}`,
      `Risk level: ${strategy.overallRisk}`,
      `Auto mode: ${flags.auto ? 'Yes' : 'No'}`
    ]));

    const steps = this.getWorkflowSteps(flags);
    console.log(this.renderer.renderSection('🔄 Workflow Steps', steps));

    if (strategy.warnings.length > 0) {
      console.log(this.renderer.renderSection('⚠️ Warnings', strategy.warnings));
    }
  }

  private displayWorkflowProgress(context: WorkflowContext): void {
    const progress = (context.currentBoundaryIndex / context.boundaries.length) * 100;
    
    console.log(this.renderer.renderSection('📊 Progress', [
      `Boundaries processed: ${context.currentBoundaryIndex}/${context.boundaries.length}`,
      `Progress: ${Math.round(progress)}%`,
      `Commits created: ${context.commitHashes.length}`,
      `Started: ${new Date(context.startTime).toLocaleString()}`
    ]));
  }

  private displayWorkflowPlan(strategy: StagingStrategy, flags: any): void {
    console.log(`\n📦 Workflow will process ${strategy.commits.length} boundaries:`);
    
    strategy.commits.forEach((commit, index) => {
      console.log(`\n${index + 1}. ${commit.suggestedMessage.title}`);
      console.log(`   Files: ${commit.boundary.files.length} | Risk: ${commit.risk} | Est. time: ${commit.estimatedTime}`);
    });

    const steps = this.getWorkflowSteps(flags);
    console.log('\n🔄 Steps per boundary:');
    steps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step}`);
    });

    console.log('\nRun without --dry-run to execute this workflow.');
  }

  private async displayWorkflowSummary(context: WorkflowContext): Promise<void> {
    const summary = await this.workflowManager.getWorkflowSummary();
    
    if (summary) {
      console.log(this.renderer.renderSection('📊 Workflow Summary', [
        `Total boundaries: ${summary.totalBoundaries}`,
        `Processed: ${summary.processedBoundaries}`,
        `Total time: ${this.formatDuration(Math.floor(summary.totalTime / (1000 * 60)))}`,
        `Average time per boundary: ${this.formatDuration(Math.floor(summary.avgTimePerBoundary / (1000 * 60)))}`,
        `Commits created: ${context.commitHashes.length}`
      ]));
    }

    console.log('\n🎉 Great work! Your development workflow is complete.');
    
    // Only show relevant next steps based on what was actually done
    const nextSteps = [];
    
    // If PR was not skipped, commits were already pushed, so don't suggest git push
    if (context.settings.skipPR) {
      nextSteps.push('Push commits: git push');
    }
    
    nextSteps.push('Start next workflow: mastro flow');
    
    if (nextSteps.length > 0) {
      console.log('Next steps:');
      nextSteps.forEach(step => console.log(`  • ${step}`));
    }
  }

  private getWorkflowSteps(flags: any): string[] {
    const steps = ['📁 Stage boundary files'];
    
    if (!flags['skip-review']) steps.push('🔍 Review code');
    if (!flags['skip-docs']) steps.push('📚 Generate docs');
    steps.push('💾 Create commit');
    if (!flags['skip-pr']) steps.push('🔀 Create PR');
    if (!flags['skip-analytics']) steps.push('📊 Record analytics');
    
    return steps;
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Error Recovery and Checkpoint System

  private async validateWorkflowState(flags: any): Promise<void> {
    console.log('\n' + this.renderer.renderTitle('🔍 Workflow State Validation'));

    const context = await this.workflowManager.loadContext();
    
    if (!context) {
      this.log('✅ No active workflow found - state is clean', 'info');
      return;
    }

    console.log(this.renderer.renderSection('🔍 Validation Results', [
      `Workflow ID: ${context.sessionId}`,
      `Started: ${new Date(context.startTime).toLocaleString()}`,
      `Progress: ${context.currentBoundaryIndex}/${context.boundaries.length} boundaries`
    ]));

    const validationResults = await this.performWorkflowValidation(context);
    
    this.displayValidationResults(validationResults);

    if (validationResults.hasErrors && !flags.force) {
      console.log('\n⚠️ Validation errors found. Use --force to proceed anyway or --recover to attempt repair.');
      return;
    }

    if (validationResults.hasWarnings) {
      const proceed = await this.interactiveUI.confirmAction(
        'Validation warnings found. Continue anyway?',
        false
      );
      
      if (!proceed) {
        this.log('Validation aborted by user', 'info');
        return;
      }
    }

    this.success('✅ Workflow state validation completed successfully');
  }

  private async recoverWorkflow(flags: any): Promise<void> {
    console.log('\n' + this.renderer.renderTitle('🔧 Workflow Recovery'));

    const context = await this.workflowManager.loadContext();
    
    if (!context) {
      this.log('No workflow context found to recover', 'warn');
      return;
    }

    console.log(`🔍 Analyzing workflow state: ${context.sessionId}`);

    const recoveryAnalysis = await this.analyzeWorkflowForRecovery(context);
    this.displayRecoveryAnalysis(recoveryAnalysis);

    if (recoveryAnalysis.isHealthy) {
      this.success('✅ Workflow is healthy - no recovery needed');
      return;
    }

    const recoveryOptions = this.generateRecoveryOptions(recoveryAnalysis);
    
    const recoveryChoice = await this.interactiveUI.selectIndex(
      'Select recovery strategy:',
      recoveryOptions.map(opt => opt.description)
    );

    const selectedRecovery = recoveryOptions[recoveryChoice];
    await this.executeRecoveryStrategy(selectedRecovery, context);
  }

  private async executeWorkflowStep<T>(
    step: WorkflowCheckpoint['step'],
    description: string,
    operation: () => Promise<T>,
    checkpointData: any,
    flags: any
  ): Promise<T> {
    const maxRetries = 3;
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        const result = await operation();
        await this.workflowManager.saveCheckpoint(step, checkpointData);
        return result;
      } catch (error) {
        // Handle special workflow pause case
        if (error instanceof Error && error.message === 'WORKFLOW_PAUSED') {
          await this.workflowManager.saveCheckpoint(step, { ...checkpointData, paused: true });
          throw error; // Re-throw to pause the workflow
        }
        
        console.log(`\n❌ Step '${step}' failed (attempt ${attempt}/${maxRetries}): ${error instanceof Error ? error.message : 'Unknown error'}`);

        if (attempt === maxRetries) {
          throw error;
        }

        if (!flags.auto) {
          const retryChoice = await this.interactiveUI.selectIndex(
            `Step failed. What would you like to do?`,
            [
              `Retry step (${maxRetries - attempt} attempts remaining)`,
              'Skip this step and continue',
              'Abort workflow',
              'Show error details'
            ]
          );

          switch (retryChoice) {
            case 0:
              attempt++;
              continue;
            case 1:
              console.log(`⏭️ Skipping step '${step}'`);
              await this.workflowManager.saveCheckpoint(step, { ...checkpointData, skipped: true });
              return null as T;
            case 2:
              throw new Error('Workflow aborted by user');
            case 3:
              this.displayErrorDetails(error, step);
              attempt++;
              continue;
          }
        } else {
          attempt++;
          await this.sleep(1000); // Brief delay before retry in auto mode
        }
      }
    }

    throw new Error(`Step '${step}' failed after ${maxRetries} attempts`);
  }

  private async handleWorkflowStepError(
    error: unknown,
    boundary: any,
    boundaryIndex: number,
    flags: any
  ): Promise<{ shouldAbort: boolean; shouldPause: boolean; shouldRetry: boolean }> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle special workflow pause case
    if (errorMessage === 'WORKFLOW_PAUSED') {
      return { shouldAbort: false, shouldPause: true, shouldRetry: false };
    }
    
    console.log(`\n❌ Boundary ${boundaryIndex} failed: ${errorMessage}`);

    // Auto mode: simple retry logic
    if (flags.auto) {
      return { shouldAbort: false, shouldPause: false, shouldRetry: false };
    }

    // Interactive error handling
    const errorActions = [
      'Skip this boundary and continue',
      'Retry boundary processing',
      'Pause workflow (can resume later)',
      'Abort entire workflow',
      'Show detailed error analysis',
      'Attempt automated recovery'
    ];

    const choice = await this.interactiveUI.selectIndex(
      `How would you like to handle this error?`,
      errorActions
    );

    switch (choice) {
      case 0:
        console.log(`⏭️ Skipping boundary ${boundaryIndex}`);
        return { shouldAbort: false, shouldPause: false, shouldRetry: false };
      
      case 1:
        console.log(`🔄 Retrying boundary ${boundaryIndex}`);
        return { shouldAbort: false, shouldPause: false, shouldRetry: true };
      
      case 2:
        return { shouldAbort: false, shouldPause: true, shouldRetry: false };
      
      case 3:
        return { shouldAbort: true, shouldPause: false, shouldRetry: false };
      
      case 4:
        await this.showDetailedErrorAnalysis(error, boundary, boundaryIndex);
        return await this.handleWorkflowStepError(error, boundary, boundaryIndex, flags);
      
      case 5:
        const recovered = await this.attemptAutomatedRecovery(error, boundary, boundaryIndex);
        if (recovered) {
          return { shouldAbort: false, shouldPause: false, shouldRetry: true };
        }
        return await this.handleWorkflowStepError(error, boundary, boundaryIndex, flags);
      
      default:
        return { shouldAbort: false, shouldPause: false, shouldRetry: false };
    }
  }

  private async performWorkflowValidation(context: WorkflowContext): Promise<{
    hasErrors: boolean;
    hasWarnings: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    const validation = {
      hasErrors: false,
      hasWarnings: false,
      errors: [] as string[],
      warnings: [] as string[],
      recommendations: [] as string[]
    };

    // Validate boundaries exist and are accessible
    for (let i = 0; i < context.boundaries.length; i++) {
      const boundary = context.boundaries[i];
      
      if (!boundary || !boundary.files) {
        validation.hasErrors = true;
        validation.errors.push(`Boundary ${i + 1} is corrupted or missing files`);
        continue;
      }

      // Check if files still exist
      for (const file of boundary.files) {
        try {
          const fs = await import('fs').then(fs => fs.promises);
          await fs.access(file.file);
        } catch {
          validation.hasWarnings = true;
          validation.warnings.push(`File ${file.file} in boundary ${i + 1} no longer exists`);
        }
      }
    }

    // Validate current boundary index
    if (context.currentBoundaryIndex < 0 || context.currentBoundaryIndex > context.boundaries.length) {
      validation.hasErrors = true;
      validation.errors.push(`Invalid boundary index: ${context.currentBoundaryIndex}`);
    }

    // Check for stale workflow (older than 24 hours)
    const workflowAge = Date.now() - context.startTime;
    if (workflowAge > 24 * 60 * 60 * 1000) {
      validation.hasWarnings = true;
      validation.warnings.push('Workflow is older than 24 hours - may be stale');
      validation.recommendations.push('Consider starting a fresh workflow analysis');
    }

    // Validate git repository state
    try {
      const currentBranch = await this.gitAnalyzer.getCurrentBranch();
      const workingChanges = await this.gitAnalyzer.getWorkingChanges();
      
      if (workingChanges.length > 0) {
        validation.hasWarnings = true;
        validation.warnings.push('Working directory has uncommitted changes');
        validation.recommendations.push('Commit or stash changes before continuing workflow');
      }
    } catch (error) {
      validation.hasErrors = true;
      validation.errors.push('Unable to access git repository');
    }

    return validation;
  }

  private displayValidationResults(results: any): void {
    if (results.errors.length > 0) {
      console.log('\n❌ Validation Errors:');
      results.errors.forEach((error: string, index: number) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (results.warnings.length > 0) {
      console.log('\n⚠️ Validation Warnings:');
      results.warnings.forEach((warning: string, index: number) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    if (results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      results.recommendations.forEach((rec: string, index: number) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
  }

  private async analyzeWorkflowForRecovery(context: WorkflowContext): Promise<{
    isHealthy: boolean;
    issues: Array<{ type: 'error' | 'warning'; description: string; severity: 'low' | 'medium' | 'high' }>;
    recoverableIssues: string[];
    criticalIssues: string[];
  }> {
    const analysis = {
      isHealthy: true,
      issues: [] as Array<{ type: 'error' | 'warning'; description: string; severity: 'low' | 'medium' | 'high' }>,
      recoverableIssues: [] as string[],
      criticalIssues: [] as string[]
    };

    // Check for incomplete boundaries
    const currentIndex = context.currentBoundaryIndex;
    if (currentIndex < context.boundaries.length) {
      const boundary = context.boundaries[currentIndex];
      
      // Check if boundary was partially processed
      try {
        const stagedChanges = await this.gitAnalyzer.getStagedChanges();
        if (stagedChanges.length > 0) {
          analysis.isHealthy = false;
          analysis.issues.push({
            type: 'warning',
            description: 'Staged changes found from incomplete boundary processing',
            severity: 'medium'
          });
          analysis.recoverableIssues.push('staged-changes');
        }
      } catch (error) {
        analysis.isHealthy = false;
        analysis.issues.push({
          type: 'error',
          description: 'Cannot access git staging area',
          severity: 'high'
        });
        analysis.criticalIssues.push('git-access');
      }
    }

    // Check commit hash consistency
    if (context.commitHashes.length > 0) {
      try {
        const lastHash = context.commitHashes[context.commitHashes.length - 1];
        const currentHash = await this.gitAnalyzer.getCurrentCommit();
        
        if (lastHash !== currentHash) {
          analysis.isHealthy = false;
          analysis.issues.push({
            type: 'warning',
            description: 'Git history has diverged from workflow expectations',
            severity: 'medium'
          });
          analysis.recoverableIssues.push('git-divergence');
        }
      } catch (error) {
        analysis.isHealthy = false;
        analysis.issues.push({
          type: 'error',
          description: 'Cannot verify git commit history',
          severity: 'high'
        });
        analysis.criticalIssues.push('git-history');
      }
    }

    return analysis;
  }

  private displayRecoveryAnalysis(analysis: any): void {
    console.log(this.renderer.renderSection('🔍 Recovery Analysis', [
      `Status: ${analysis.isHealthy ? '✅ Healthy' : '⚠️ Issues Found'}`,
      `Total issues: ${analysis.issues.length}`,
      `Recoverable: ${analysis.recoverableIssues.length}`,
      `Critical: ${analysis.criticalIssues.length}`
    ]));

    if (analysis.issues.length > 0) {
      console.log('\n📋 Detected Issues:');
      analysis.issues.forEach((issue: any, index: number) => {
        const icon = issue.type === 'error' ? '❌' : '⚠️';
        const severity = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${index + 1}. ${icon} ${severity} ${issue.description}`);
      });
    }
  }

  private generateRecoveryOptions(analysis: any): Array<{ id: string; description: string; action: () => Promise<void> }> {
    const options = [];

    if (analysis.recoverableIssues.includes('staged-changes')) {
      options.push({
        id: 'clear-staging',
        description: 'Clear staging area and reset to clean state',
        action: async () => {
          await (this.gitAnalyzer as any).git.reset(['HEAD']);
          console.log('✅ Staging area cleared');
        }
      });
    }

    if (analysis.recoverableIssues.includes('git-divergence')) {
      options.push({
        id: 'sync-commits',
        description: 'Update workflow with current git state',
        action: async () => {
          const context = await this.workflowManager.loadContext();
          if (context) {
            const currentHash = await this.gitAnalyzer.getCurrentCommit();
            context.commitHashes = [currentHash];
            await this.workflowManager.saveContext(context);
            console.log('✅ Workflow synchronized with git state');
          }
        }
      });
    }

    options.push({
      id: 'reset-workflow',
      description: 'Reset entire workflow to beginning',
      action: async () => {
        const context = await this.workflowManager.loadContext();
        if (context) {
          context.currentBoundaryIndex = 0;
          context.commitHashes = [];
          context.metrics = [];
          await this.workflowManager.saveContext(context);
          console.log('✅ Workflow reset to beginning');
        }
      }
    });

    options.push({
      id: 'clear-all',
      description: 'Clear workflow context and start fresh',
      action: async () => {
        await this.workflowManager.clearContext();
        console.log('✅ Workflow context cleared');
      }
    });

    return options;
  }

  private async executeRecoveryStrategy(strategy: any, context: WorkflowContext): Promise<void> {
    this.startSpinner(`Executing recovery strategy: ${strategy.description}`);
    
    try {
      await strategy.action();
      this.stopSpinner(true, 'Recovery strategy completed successfully');
    } catch (error) {
      this.stopSpinner(false, 'Recovery strategy failed');
      throw error;
    }
  }

  private displayErrorDetails(error: unknown, step: string): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.log('\n🔍 Detailed Error Analysis:');
    console.log('─'.repeat(50));
    console.log(`Step: ${step}`);
    console.log(`Error: ${errorMessage}`);
    
    if (error instanceof Error && error.stack) {
      console.log(`Stack trace (first 5 lines):`);
      const stackLines = error.stack.split('\n').slice(0, 5);
      stackLines.forEach(line => console.log(`  ${line}`));
    }

    console.log('\n💡 Troubleshooting suggestions:');
    this.generateTroubleshootingSuggestions(step, errorMessage).forEach((suggestion, index) => {
      console.log(`   ${index + 1}. ${suggestion}`);
    });
  }

  private async showDetailedErrorAnalysis(error: unknown, boundary: any, boundaryIndex: number): Promise<void> {
    console.log('\n🔍 Detailed Error Analysis for Boundary ' + boundaryIndex);
    console.log('═'.repeat(60));
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.log(`Boundary Theme: ${boundary.theme}`);
    console.log(`Files: ${boundary.files.length}`);
    console.log(`Error: ${errorMessage}`);
    
    console.log('\n📁 Affected Files:');
    boundary.files.forEach((file: any, index: number) => {
      console.log(`   ${index + 1}. ${file.file}`);
    });

    console.log('\n💡 Possible Causes:');
    const causes = this.analyzePossibleCauses(errorMessage, boundary);
    causes.forEach((cause, index) => {
      console.log(`   ${index + 1}. ${cause}`);
    });

    console.log('\n🔧 Suggested Actions:');
    const actions = this.generateRecoveryActions(errorMessage, boundary);
    actions.forEach((action, index) => {
      console.log(`   ${index + 1}. ${action}`);
    });

    await this.interactiveUI.confirmAction('\nPress Enter to continue...', true);
  }

  private async attemptAutomatedRecovery(error: unknown, boundary: any, boundaryIndex: number): Promise<boolean> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    this.startSpinner(`Attempting automated recovery for boundary ${boundaryIndex}...`);

    try {
      // Try common recovery strategies
      if (errorMessage.includes('staged') || errorMessage.includes('staging')) {
        // Clear staging and retry
        await (this.gitAnalyzer as any).git.reset(['HEAD']);
        this.stopSpinner(true, 'Cleared staging area');
        return true;
      }

      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        // Check if files exist and are accessible
        const missingFiles = [];
        for (const file of boundary.files) {
          try {
            const fs = await import('fs').then(fs => fs.promises);
            await fs.access(file.file);
          } catch {
            missingFiles.push(file.file);
          }
        }
        
        if (missingFiles.length > 0) {
          this.stopSpinner(false, `Files missing: ${missingFiles.join(', ')}`);
          return false;
        }
      }

      this.stopSpinner(false, 'No automated recovery available for this error type');
      return false;

    } catch (recoveryError) {
      this.stopSpinner(false, 'Automated recovery failed');
      return false;
    }
  }

  private generateTroubleshootingSuggestions(step: string, errorMessage: string): string[] {
    const suggestions = [];
    
    if (step === 'split') {
      suggestions.push('Check if all files exist and are accessible');
      suggestions.push('Verify git working directory status with `git status`');
      suggestions.push('Ensure files are not locked or in use by another process');
    }
    
    if (step === 'commit') {
      suggestions.push('Check if staging area is properly set up');
      suggestions.push('Verify commit message format and length');
      suggestions.push('Ensure git user configuration is set up');
    }

    if (errorMessage.includes('permission')) {
      suggestions.push('Check file and directory permissions');
      suggestions.push('Run with appropriate user privileges');
    }

    if (errorMessage.includes('not found')) {
      suggestions.push('Verify file paths are correct and files exist');
      suggestions.push('Check if files were moved or deleted');
    }

    // Default suggestions
    suggestions.push('Try running the workflow step individually');
    suggestions.push('Check system logs for additional error details');
    suggestions.push('Restart the workflow with fresh analysis');

    return suggestions;
  }

  private analyzePossibleCauses(errorMessage: string, boundary: any): string[] {
    const causes = [];
    
    if (errorMessage.includes('staged') || errorMessage.includes('staging')) {
      causes.push('Git staging area is in an inconsistent state');
      causes.push('Files were modified after boundary analysis');
      causes.push('Another git operation is interfering');
    }

    if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
      causes.push('Files were moved or deleted after analysis');
      causes.push('File paths contain special characters or spaces');
      causes.push('Working directory has changed');
    }

    if (errorMessage.includes('permission')) {
      causes.push('Insufficient file system permissions');
      causes.push('Files are locked by another process');
      causes.push('Directory permissions prevent access');
    }

    causes.push('System resources (disk space, memory) may be exhausted');
    causes.push('Git repository may be corrupted or inaccessible');
    
    return causes;
  }

  private generateRecoveryActions(errorMessage: string, boundary: any): string[] {
    const actions = [];
    
    if (errorMessage.includes('staged') || errorMessage.includes('staging')) {
      actions.push('Run `git reset HEAD` to clear staging area');
      actions.push('Re-analyze working directory with `mastro split`');
      actions.push('Stage files manually and retry');
    }

    if (errorMessage.includes('not found')) {
      actions.push('Check file existence with `ls` or file explorer');
      actions.push('Update file paths if files were moved');
      actions.push('Restore missing files from backup or git history');
    }

    if (errorMessage.includes('permission')) {
      actions.push('Fix file permissions with `chmod` command');
      actions.push('Run as administrator or with elevated privileges');
      actions.push('Close applications that might be locking files');
    }

    actions.push('Split boundary into smaller parts to isolate the issue');
    actions.push('Skip this boundary and continue with others');
    actions.push('Start fresh workflow analysis');
    
    return actions;
  }

  /**
   * Validate that we're on an appropriate branch for workflow operations
   */
  private async validateBranchState(flags: any): Promise<void> {
    const currentBranch = await this.gitAnalyzer.getCurrentBranch();
    const mainBranches = ['main', 'master', 'develop', 'development'];
    
    // Skip PR creation if we're on a main branch
    if (mainBranches.includes(currentBranch.toLowerCase()) && !flags['skip-pr']) {
      this.log('⚠️  Branch Warning', 'warn');
      this.log(`You're currently on branch '${currentBranch}', which appears to be a main branch.`);
      this.log('PR creation will be skipped since PRs cannot be created from main branches.');
      this.log('');
      this.log('💡 To create PRs, work on a feature branch:');
      this.log(`   git checkout -b feature/your-feature-name`);
      this.log('   # make your changes');
      this.log('   mastro flow');
      this.log('');
      
      // Automatically skip PR creation to prevent later failures
      flags['skip-pr'] = true;
      this.log('Auto-enabled --skip-pr flag for this workflow.');
    }
  }
}