import { Flags } from '@oclif/core';
import { BaseCommand } from '../base/command.js';
import { SessionTracker } from '../core/session-tracker.js';
import { ReviewEngine } from '../core/review-engine.js';
import { StreamingAIClient } from '../core/streaming-client.js';
import { StreamingRenderer } from '../ui/streaming-renderer.js';
import { LoadingStateManager } from '../ui/loading-states.js';
export default class Review extends BaseCommand {
    static description = 'Perform AI-powered code review of current development session';
    static examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> --persona=security',
        '<%= config.bin %> <%= command.id %> --strict',
        '<%= config.bin %> <%= command.id %> --format=json',
        '<%= config.bin %> <%= command.id %> --interactive',
        '<%= config.bin %> <%= command.id %> --stream'
    ];
    static flags = {
        ...BaseCommand.baseFlags,
        persona: Flags.string({
            char: 'p',
            description: 'review persona focus area',
            options: ['security', 'performance', 'maintainability', 'testing', 'senior', 'principal'],
            default: undefined
        }),
        strictness: Flags.string({
            char: 's',
            description: 'review strictness level',
            options: ['lenient', 'moderate', 'strict'],
            default: undefined
        }),
        format: Flags.string({
            char: 'f',
            description: 'output format',
            options: ['terminal', 'json', 'markdown'],
            default: 'terminal'
        }),
        scope: Flags.string({
            description: 'review scope',
            options: ['working', 'staged', 'session'],
            default: 'session'
        }),
        interactive: Flags.boolean({
            char: 'i',
            description: 'enable interactive mode with follow-up actions',
            default: false
        }),
        stream: Flags.boolean({
            description: 'enable streaming responses for real-time feedback',
            default: true
        }),
        'actionable-only': Flags.boolean({
            description: 'show only actionable items',
            default: false
        }),
        priority: Flags.string({
            description: 'minimum priority level to show',
            options: ['low', 'medium', 'high', 'critical'],
            default: 'low'
        })
    };
    sessionTracker;
    reviewEngine;
    streamingClient;
    streamingRenderer;
    loadingManager;
    async run() {
        const { flags } = await this.parse(Review);
        try {
            // Initialize components
            this.sessionTracker = new SessionTracker(this.mastroConfig);
            this.reviewEngine = new ReviewEngine(this.mastroConfig);
            this.streamingClient = new StreamingAIClient({
                provider: this.mastroConfig.ai.provider,
                apiKey: this.mastroConfig.ai.apiKey,
                model: this.mastroConfig.ai.model,
                maxTokens: this.mastroConfig.ai.maxTokens,
                temperature: this.mastroConfig.ai.temperature
            });
            this.streamingRenderer = new StreamingRenderer(this.mastroConfig);
            this.loadingManager = new LoadingStateManager(this.mastroConfig);
            // Ensure we're in a git repository
            await this.ensureGitRepository();
            // Get or create development session
            const session = await this.getOrCreateSession();
            // Check if there are changes to review
            if (!await this.sessionTracker.hasSessionChanges()) {
                this.log('✨ No changes detected in current development session');
                this.log('Make some changes and try again!');
                return;
            }
            // Display session overview
            this.displaySessionOverview(session);
            // Create review persona
            const persona = this.createReviewPersona(flags);
            // Perform the review
            let review;
            if (flags.stream && flags.format === 'terminal') {
                review = await this.performStreamingReview(session, persona);
            }
            else {
                review = await this.performStandardReview(session, persona);
            }
            // Output results based on format
            await this.outputResults(review, flags);
            // Interactive mode
            if (flags.interactive) {
                await this.enterInteractiveMode(review, session);
            }
        }
        catch (error) {
            this.error(`Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { exit: 1 });
        }
        finally {
            this.streamingRenderer?.cleanup();
            this.loadingManager?.cleanup();
        }
    }
    async getOrCreateSession() {
        this.startSpinner('Initializing development session...');
        try {
            const session = await this.sessionTracker.getCurrentSession();
            this.stopSpinner(true, `Session initialized (${session.id.substring(0, 8)})`);
            return session;
        }
        catch (error) {
            this.stopSpinner(false, 'Failed to initialize session');
            throw error;
        }
    }
    displaySessionOverview(session) {
        const stats = session.cumulativeStats;
        const risk = session.riskAssessment;
        this.log('\n📊 Session Overview');
        this.log('─'.repeat(30));
        this.log(`Files changed: ${stats.totalFiles}`);
        this.log(`Lines modified: +${stats.totalInsertions}/-${stats.totalDeletions}`);
        this.log(`Complexity: ${stats.complexity.toUpperCase()}`);
        this.log(`Risk level: ${risk.level.toUpperCase()}`);
        this.log(`Duration: ${stats.duration} minutes`);
        if (session.patterns.length > 0) {
            this.log(`Patterns: ${session.patterns.map(p => p.type).join(', ')}`);
        }
        this.log('');
    }
    createReviewPersona(flags) {
        const basePersona = this.mastroConfig.team.reviewPersona;
        // Override with flags
        const persona = {
            ...basePersona,
            strictness: flags.strictness || basePersona.strictness
        };
        // Handle persona flag
        if (flags.persona) {
            switch (flags.persona) {
                case 'security':
                    persona.name = 'Security Engineer';
                    persona.focus = ['security', 'maintainability'];
                    break;
                case 'performance':
                    persona.name = 'Performance Engineer';
                    persona.focus = ['performance', 'maintainability'];
                    break;
                case 'testing':
                    persona.name = 'QA Engineer';
                    persona.focus = ['testing', 'maintainability'];
                    break;
                case 'senior':
                    persona.name = 'Senior Engineer';
                    persona.focus = ['maintainability', 'performance'];
                    persona.strictness = 'moderate';
                    break;
                case 'principal':
                    persona.name = 'Principal Engineer';
                    persona.focus = ['security', 'performance', 'maintainability'];
                    persona.strictness = 'strict';
                    break;
            }
        }
        return persona;
    }
    async performStreamingReview(session, persona) {
        const streamingOptions = {
            enabled: true,
            chunkHandler: (chunk) => {
                // Handle progressive updates
            },
            progressHandler: (progress) => {
                // Handle progress updates
            },
            errorHandler: (error) => {
                this.error(`Streaming error: ${error}`);
            }
        };
        const streamGenerator = this.streamingClient.streamSessionReview(session, persona, streamingOptions);
        const result = await this.streamingRenderer.renderStreamingReview(streamGenerator);
        if (!result) {
            throw new Error('Failed to complete streaming review');
        }
        // Enhance with local analysis
        const enhancedReview = await this.reviewEngine.reviewSession(session, persona);
        // Merge streaming AI review with local analysis
        return {
            ...result,
            actionableItems: enhancedReview.actionableItems,
            learningPoints: enhancedReview.learningPoints,
            workflowSuggestions: enhancedReview.workflowSuggestions
        };
    }
    async performStandardReview(session, persona) {
        this.startSpinner(`Performing ${persona.name.toLowerCase()} review...`);
        try {
            const review = await this.reviewEngine.reviewSession(session, persona);
            this.stopSpinner(true, 'Review completed!');
            return review;
        }
        catch (error) {
            this.stopSpinner(false, 'Review failed');
            throw error;
        }
    }
    async outputResults(review, flags) {
        switch (flags.format) {
            case 'json':
                this.outputJSON(review, flags);
                break;
            case 'markdown':
                this.outputMarkdown(review, flags);
                break;
            case 'terminal':
            default:
                this.outputTerminal(review, flags);
                break;
        }
    }
    outputJSON(review, flags) {
        let output = review;
        if (flags['actionable-only']) {
            output = {
                ...review,
                suggestions: [],
                compliments: []
            };
        }
        if (flags.priority && flags.priority !== 'low') {
            const minPriority = this.getPriorityWeight(flags.priority);
            output = {
                ...output,
                actionableItems: output.actionableItems.filter(item => this.getPriorityWeight(item.priority) <= minPriority)
            };
        }
        console.log(JSON.stringify(output, null, 2));
    }
    outputMarkdown(review, flags) {
        const output = [];
        output.push('# Code Review Results\n');
        output.push(`**Session:** ${review.sessionId.substring(0, 8)}`);
        output.push(`**Scope:** ${review.scope}`);
        output.push(`**Rating:** ${review.overall.rating} (${Math.round(review.overall.confidence * 100)}% confidence)\n`);
        output.push(review.overall.summary + '\n');
        if (review.actionableItems.length > 0) {
            output.push('## 🎯 Actionable Items\n');
            for (const item of review.actionableItems) {
                output.push(`### ${item.title}`);
                output.push(`**Priority:** ${item.priority} | **Effort:** ${item.estimatedEffort}`);
                if (item.file)
                    output.push(`**File:** ${item.file}${item.line ? `:${item.line}` : ''}`);
                output.push(item.description);
                if (item.suggestion)
                    output.push(`💡 **Suggestion:** ${item.suggestion}`);
                output.push('');
            }
        }
        console.log(output.join('\n'));
    }
    outputTerminal(review, flags) {
        if (flags['actionable-only']) {
            this.outputActionableItemsOnly(review, flags);
        }
        else if (!flags.stream) {
            // Only render if not already rendered by streaming
            this.streamingRenderer.renderSessionReview(review);
        }
    }
    outputActionableItemsOnly(review, flags) {
        let items = review.actionableItems;
        if (flags.priority && flags.priority !== 'low') {
            const minPriority = this.getPriorityWeight(flags.priority);
            items = items.filter(item => this.getPriorityWeight(item.priority) <= minPriority);
        }
        if (items.length === 0) {
            this.log('✨ No actionable items found at this priority level');
            return;
        }
        this.log('\n🎯 Actionable Items');
        this.log('─'.repeat(30));
        for (const item of items) {
            this.log(`${this.getPriorityIcon(item.priority)} ${item.title}`);
            if (item.file) {
                this.log(`   📁 ${item.file}${item.line ? `:${item.line}` : ''}`);
            }
            this.log(`   ${item.description}`);
            if (item.suggestion) {
                this.log(`   💡 ${item.suggestion}`);
            }
            this.log('');
        }
    }
    async enterInteractiveMode(review, session) {
        this.log('\n🔄 Interactive Mode');
        this.log('Choose an action:');
        this.log('1. Show detailed suggestions');
        this.log('2. Export actionable items to TODO');
        this.log('3. Run focused review');
        this.log('4. Show learning resources');
        this.log('5. Exit');
        // Interactive menu implementation would go here
        // For now, just show the concept
        this.log('\n💡 Interactive mode features coming soon!');
    }
    getPriorityWeight(priority) {
        const weights = { critical: 0, high: 1, medium: 2, low: 3 };
        return weights[priority] ?? 3;
    }
    getPriorityIcon(priority) {
        const icons = { critical: '🚨', high: '⚠️', medium: '📋', low: '💡' };
        return icons[priority] ?? '📋';
    }
}
//# sourceMappingURL=review.js.map