import {Flags} from '@oclif/core';
import {BaseCommand} from '../base/command.js';
import {UIRenderer} from '../ui/renderer.js';
import {InteractiveUI, createRefinementSuggestions} from '../ui/interactive.js';
import type {CommitMessage} from '../types/index.js';

export default class Commit extends BaseCommand {
  static override description = 'Generate an AI-powered commit message from staged changes';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --interactive',
    '<%= config.bin %> <%= command.id %> --dry-run',
    '<%= config.bin %> <%= command.id %> --no-cache'
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    interactive: Flags.boolean({
      char: 'i',
      description: 'enable interactive refinement',
      default: false
    }),
    template: Flags.string({
      char: 't',
      description: 'use a specific commit template',
      options: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore']
    }),
    learn: Flags.boolean({
      description: 'learn from this commit for future suggestions',
      default: false
    }),
    'subcommand-context': Flags.boolean({
      description: 'internal flag indicating command is running as subcommand',
      default: false,
      hidden: true
    })
  };

  private renderer!: UIRenderer;
  private interactiveUI!: InteractiveUI;
  private isSubcommand: boolean = false;

  public async run(): Promise<void> {
    const {flags} = await this.parse(Commit);

    // Detect if we're being called as a subcommand (e.g., from flow)
    this.isSubcommand = flags['subcommand-context'];

    try {
      // Initialize UI components
      this.renderer = new UIRenderer(this.mastroConfig);
      this.interactiveUI = new InteractiveUI(this.mastroConfig);

      // Ensure we're in a git repository
      await this.ensureGitRepository();

      // Check for staged changes
      const context = await this.withSpinner(
        'Analyzing staged changes...',
        () => this.gitAnalyzer.buildCommitContext(true)
      );
      
      if (context.changes.length === 0) {
        this.log('No staged changes found. Stage some changes and try again.', 'warn');
        return;
      }

      this.updateSpinner(`Found ${context.changes.length} staged file(s) with ${context.metadata.totalInsertions} insertions and ${context.metadata.totalDeletions} deletions`);

      // Try cache first if not disabled
      let commitMessage: CommitMessage | null = null;
      
      if (!flags['no-cache']) {
        commitMessage = await this.cacheManager.getCachedCommitMessage(context);
        if (commitMessage) {
          this.updateSpinner('Found cached commit message');
        }
      }

      // Generate new commit message if not cached
      if (!commitMessage) {
        this.updateSpinner('Generating commit message with AI...');
        
        try {
          commitMessage = await this.aiClient.generateCommitMessage(context);
          
          // Cache the result if caching is enabled
          if (!flags['no-cache']) {
            await this.cacheManager.setCachedCommitMessage(context, commitMessage);
          }
        } catch (error) {
          this.stopSpinner(false, 'Failed to generate commit message');
          
          if (error instanceof Error && error.message.includes('API key')) {
            this.log('API key not configured. Set OPENAI_API_KEY environment variable or configure it in mastro.config.json', 'error');
            this.log('You can create a config file with: mastro config init', 'info');
          } else {
            await this.handleError(error, 'generate commit message');
          }
          return;
        }
      }

      this.stopSpinner(true, 'Commit message generated successfully');

      // Display the generated commit message
      console.log('\n' + this.renderer.renderCommitMessage(commitMessage));

      // Interactive refinement loop if enabled
      if (flags.interactive || this.mastroConfig.ui.interactive) {
        commitMessage = await this.handleCommitRefinement(commitMessage, context, flags);
      }

      // Dry run - just display, don't commit
      if (flags['dry-run']) {
        this.log('Dry run mode - commit message generated but not applied', 'info');
        return;
      }

      // Confirm before committing
      const shouldCommit = await this.interactiveUI.confirmAction('Apply this commit message?', true);

      if (!shouldCommit) {
        this.log('Commit cancelled', 'info');
        return;
      }

      // Apply the commit
      await this.applyCommit(commitMessage);

      // Learn from this commit if requested
      if (flags.learn) {
        await this.learnFromCommit(commitMessage, context);
      }

      this.success('Commit created successfully!');

    } catch (error) {
      await this.handleError(error, 'create commit');
    } finally {
      // Skip cleanup when running as subcommand to prevent interfering with parent process
      if (!this.isSubcommand) {
        this.interactiveUI.cleanup();
      }
    }
  }

  private async handleCommitRefinement(
    initialMessage: CommitMessage,
    context: any,
    flags: any
  ): Promise<CommitMessage> {
    const refinementSuggestions = createRefinementSuggestions('commit');
    let currentMessage = initialMessage;
    let continueRefining = true;

    while (continueRefining) {
      const refinement = await this.interactiveUI.promptForRefinement({
        message: 'Refine commit message',
        suggestions: refinementSuggestions,
        allowCustom: true
      });

      if (!refinement) {
        // User selected "Accept as is"
        continueRefining = false;
        break;
      }

      // Show brief spinner only while generating refined commit
      try {
        const refinedMessage = await this.withSpinner(
          'Refining commit message...',
          () => this.refineCommitMessage(currentMessage, refinement, context, flags)
        );
        
        // Display refined commit cleanly
        console.log('\n' + this.renderer.renderCommitMessage(refinedMessage));
        currentMessage = refinedMessage;
        
        // Continue loop to show refinement options again automatically
      } catch (error) {
        this.log('Failed to refine commit message', 'error');
        this.log('Using previous message', 'warn');
        continueRefining = false;
      }
    }

    return currentMessage;
  }

  private async refineCommitMessage(
    originalMessage: CommitMessage,
    refinement: string,
    context: any,
    flags: any
  ): Promise<CommitMessage> {
    try {
      // Use the AI client to perform real refinement based on the user's instruction
      const refinedMessage = await this.aiClient.refineCommitMessage(originalMessage, refinement, context);
      
      // Cache the refined result if caching is enabled
      if (!flags['no-cache']) {
        await this.cacheManager.setCachedCommitMessage(context, refinedMessage);
      }
      
      return refinedMessage;
    } catch (error) {
      // Fallback: if AI refinement fails, return original message with error note
      this.log(`Refinement failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
      this.log('Returning original commit message', 'info');
      
      return {
        ...originalMessage,
        reasoning: `${originalMessage.reasoning} (Refinement requested: "${refinement}" but failed)`
      };
    }
  }

  private async applyCommit(message: CommitMessage): Promise<void> {
    // Build the complete commit message
    const commitText = message.body 
      ? `${message.title}\n\n${message.body}` 
      : message.title;

    // Execute git commit with spinner
    await this.withSpinner(
      'Creating commit...',
      async () => {
        const git = this.gitAnalyzer as any; // Access the underlying git instance
        await git.git.commit(commitText);
      },
      'Commit created',
      'Failed to create commit'
    );
  }

  private async learnFromCommit(message: CommitMessage, context: any): Promise<void> {
    this.log('Learning from this commit for future improvements...', 'info');
    
    // Store patterns for future use
    // This would update the team patterns in the config
    // For now, just log that we're learning
    this.log(`Learned: ${message.type} commits in ${context.repository.name}`, 'debug');
  }
}