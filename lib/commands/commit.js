import { Flags } from '@oclif/core';
import { BaseCommand } from '../base/command.js';
import { UIRenderer } from '../ui/renderer.js';
import { InteractiveUI, createRefinementSuggestions } from '../ui/interactive.js';
export default class Commit extends BaseCommand {
    static description = 'Generate an AI-powered commit message from staged changes';
    static examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> --interactive',
        '<%= config.bin %> <%= command.id %> --dry-run',
        '<%= config.bin %> <%= command.id %> --no-cache'
    ];
    static flags = {
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
        })
    };
    renderer;
    interactiveUI;
    async run() {
        const { flags } = await this.parse(Commit);
        try {
            // Initialize UI components
            this.renderer = new UIRenderer(this.mastroConfig);
            this.interactiveUI = new InteractiveUI(this.mastroConfig);
            // Ensure we're in a git repository
            await this.ensureGitRepository();
            // Check for staged changes
            this.startSpinner('Analyzing staged changes...');
            const context = await this.gitAnalyzer.buildCommitContext(true);
            if (context.changes.length === 0) {
                this.stopSpinner(false);
                this.log('No staged changes found. Stage some changes and try again.', 'warn');
                return;
            }
            this.updateSpinner(`Found ${context.changes.length} staged file(s) with ${context.metadata.totalInsertions} insertions and ${context.metadata.totalDeletions} deletions`);
            // Try cache first if not disabled
            let commitMessage = null;
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
                }
                catch (error) {
                    this.stopSpinner(false, 'Failed to generate commit message');
                    if (error instanceof Error && error.message.includes('API key')) {
                        this.log('API key not configured. Set OPENAI_API_KEY environment variable or configure it in mastro.config.json', 'error');
                        this.log('You can create a config file with: mastro config init', 'info');
                    }
                    else {
                        await this.handleError(error, 'generate commit message');
                    }
                    return;
                }
            }
            this.stopSpinner(true, 'Commit message generated successfully');
            // Display the generated commit message
            console.log('\n' + this.renderer.renderCommitMessage(commitMessage));
            // Interactive refinement if enabled
            if (flags.interactive || this.mastroConfig.ui.interactive) {
                const refinementSuggestions = createRefinementSuggestions('commit');
                const refinement = await this.interactiveUI.promptForRefinement({
                    message: 'Would you like to refine this commit message?',
                    suggestions: refinementSuggestions,
                    allowCustom: true
                });
                if (refinement) {
                    this.startSpinner('Refining commit message...');
                    try {
                        // Create a refined context with the refinement instruction
                        const refinedMessage = await this.refineCommitMessage(commitMessage, refinement, context);
                        this.stopSpinner(true, 'Commit message refined');
                        console.log('\n' + this.renderer.renderCommitMessage(refinedMessage));
                        commitMessage = refinedMessage;
                    }
                    catch (error) {
                        this.stopSpinner(false, 'Failed to refine commit message');
                        this.log('Using original message', 'warn');
                    }
                }
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
        }
        catch (error) {
            await this.handleError(error, 'create commit');
        }
        finally {
            this.interactiveUI.cleanup();
        }
    }
    async refineCommitMessage(originalMessage, refinement, context) {
        // This is a simplified refinement - in a real implementation,
        // you would send the refinement instruction to the AI
        const refinedMessage = { ...originalMessage };
        // Simple refinement examples
        if (refinement.includes('more technical')) {
            refinedMessage.title = refinedMessage.title.replace(/update/gi, 'implement');
            refinedMessage.title = refinedMessage.title.replace(/change/gi, 'refactor');
        }
        else if (refinement.includes('more concise')) {
            refinedMessage.title = refinedMessage.title.split(' ').slice(0, 6).join(' ');
            refinedMessage.body = undefined;
        }
        else if (refinement.includes('team style')) {
            // Apply team patterns from config
            const patterns = context.repository.patterns;
            if (patterns.commitStyle === 'conventional' && !refinedMessage.title.match(/^(feat|fix|docs|style|refactor|test|chore)/)) {
                refinedMessage.title = `${refinedMessage.type}: ${refinedMessage.title.replace(/^[^:]*:\s*/, '')}`;
            }
        }
        refinedMessage.reasoning = `Refined: ${refinement}. ${originalMessage.reasoning}`;
        return refinedMessage;
    }
    async applyCommit(message) {
        this.startSpinner('Creating commit...');
        try {
            // Build the complete commit message
            const commitText = message.body
                ? `${message.title}\n\n${message.body}`
                : message.title;
            // Execute git commit
            const git = this.gitAnalyzer; // Access the underlying git instance
            await git.git.commit(commitText);
            this.stopSpinner(true, 'Commit created');
        }
        catch (error) {
            this.stopSpinner(false, 'Failed to create commit');
            throw error;
        }
    }
    async learnFromCommit(message, context) {
        this.log('Learning from this commit for future improvements...', 'info');
        // Store patterns for future use
        // This would update the team patterns in the config
        // For now, just log that we're learning
        this.log(`Learned: ${message.type} commits in ${context.repository.name}`, 'debug');
    }
}
//# sourceMappingURL=commit.js.map