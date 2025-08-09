import { Flags } from '@oclif/core';
import { BaseCommand } from '../base/command.js';
import { SessionTracker } from '../core/session-tracker.js';
import { ReviewEngine } from '../core/review-engine.js';
import { StreamingAIClient } from '../core/streaming-client.js';
import { StreamingRenderer } from '../ui/streaming-renderer.js';
import { LoadingStateManager } from '../ui/loading-states.js';
import { InteractiveUI } from '../ui/interactive.js';
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
    interactiveUI;
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
            this.interactiveUI = new InteractiveUI(this.mastroConfig);
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
            this.interactiveUI?.cleanup();
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
        let continueInteractive = true;
        while (continueInteractive) {
            this.log('\n🔄 Interactive Mode');
            const actions = [
                'Show detailed suggestions',
                'Export actionable items to TODO',
                'Run focused review',
                'Show learning resources',
                'Exit'
            ];
            const choice = await this.interactiveUI.selectIndex('Choose an action:', actions);
            switch (choice) {
                case 0:
                    await this.showDetailedSuggestions(review);
                    break;
                case 1:
                    await this.exportActionableItems(review);
                    break;
                case 2:
                    await this.runFocusedReview(session);
                    break;
                case 3:
                    await this.showLearningResources(review);
                    break;
                case 4:
                    continueInteractive = false;
                    this.log('👋 Exiting interactive mode', 'info');
                    break;
            }
        }
    }
    async showDetailedSuggestions(review) {
        this.log('\n📋 Detailed Suggestions', 'info');
        this.log('─'.repeat(50));
        if (review.suggestions.length === 0) {
            this.log('✨ No suggestions - great work!', 'info');
            return;
        }
        for (const suggestion of review.suggestions) {
            console.log(`\n🔍 ${suggestion.file}:${suggestion.line}`);
            console.log(`   Type: ${suggestion.type} | Severity: ${suggestion.severity}`);
            console.log(`   ${suggestion.message}`);
            if (suggestion.suggestion) {
                console.log(`   💡 Suggestion: ${suggestion.suggestion}`);
            }
            console.log(`   Confidence: ${Math.round(suggestion.confidence * 100)}%`);
        }
        await this.interactiveUI.confirmAction('\nPress Enter to continue...', true);
    }
    async exportActionableItems(review) {
        this.log('\n📤 Export Actionable Items', 'info');
        if (review.actionableItems.length === 0) {
            this.log('No actionable items to export', 'warn');
            return;
        }
        const exportOptions = [
            'Save to TODO.md file',
            'Save to GitHub Issues format',
            'Copy to clipboard',
            'Display only'
        ];
        const choice = await this.interactiveUI.selectIndex('Choose export format:', exportOptions);
        let exportContent = '';
        const timestamp = new Date().toISOString().split('T')[0];
        switch (choice) {
            case 0: // TODO.md
                exportContent = this.formatAsMarkdownTodo(review.actionableItems, timestamp);
                await this.saveToFile('TODO.md', exportContent);
                this.success('Exported to TODO.md');
                break;
            case 1: // GitHub Issues
                exportContent = this.formatAsGitHubIssues(review.actionableItems, timestamp);
                await this.saveToFile('github-issues.md', exportContent);
                this.success('Exported to github-issues.md');
                break;
            case 2: // Clipboard (simulated)
                exportContent = this.formatAsMarkdownTodo(review.actionableItems, timestamp);
                this.log('📋 Content formatted for clipboard:', 'info');
                console.log('\n' + exportContent);
                this.log('\n(Copy the above content to your clipboard)', 'info');
                break;
            case 3: // Display only
                exportContent = this.formatAsMarkdownTodo(review.actionableItems, timestamp);
                console.log('\n' + exportContent);
                break;
        }
    }
    async runFocusedReview(session) {
        this.log('\n🎯 Focused Review', 'info');
        const focusOptions = [
            'Security-focused review',
            'Performance-focused review',
            'Testing-focused review',
            'Code quality review',
            'Architecture review'
        ];
        const choice = await this.interactiveUI.selectIndex('Select review focus:', focusOptions);
        const focusTypes = ['security', 'performance', 'testing', 'maintainability', 'maintainability'];
        const selectedFocus = focusTypes[choice];
        this.startSpinner(`Running ${focusOptions[choice].toLowerCase()}...`);
        try {
            // Create focused persona
            const focusedPersona = {
                name: `${focusOptions[choice]} Specialist`,
                focus: [selectedFocus],
                strictness: 'strict',
                customRules: this.getFocusSpecificRules(selectedFocus)
            };
            const focusedReview = await this.reviewEngine.reviewSession(session, focusedPersona);
            this.stopSpinner(true, 'Focused review completed');
            // Display focused results
            this.log(`\n📊 ${focusOptions[choice]} Results:`);
            this.log(`Rating: ${focusedReview.overall.rating}`);
            this.log(`Actionable items: ${focusedReview.actionableItems.length}`);
            if (focusedReview.actionableItems.length > 0) {
                this.log('\nTop concerns:');
                focusedReview.actionableItems.slice(0, 3).forEach((item, index) => {
                    console.log(`  ${index + 1}. ${item.title} (${item.priority})`);
                });
            }
        }
        catch (error) {
            this.stopSpinner(false, 'Focused review failed');
            this.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }
    async showLearningResources(review) {
        this.log('\n📚 Learning Resources', 'info');
        this.log('─'.repeat(40));
        const resources = this.generateLearningResources(review);
        if (resources.length === 0) {
            this.log('✨ No specific learning recommendations - keep up the good work!', 'info');
            return;
        }
        resources.forEach((resource, index) => {
            console.log(`\n${index + 1}. ${resource.title}`);
            console.log(`   Category: ${resource.category}`);
            console.log(`   📖 ${resource.description}`);
            if (resource.links.length > 0) {
                console.log(`   Links: ${resource.links.join(', ')}`);
            }
        });
        const saveResources = await this.interactiveUI.confirmAction('\nWould you like to save these resources?', false);
        if (saveResources) {
            try {
                const resourceContent = this.formatLearningResources(resources);
                await this.saveToFile('learning-resources.md', resourceContent);
                this.success('Learning resources saved to learning-resources.md');
            }
            catch (error) {
                this.log('Failed to save resources', 'error');
            }
        }
        else {
            this.log('Resources not saved', 'info');
        }
    }
    // Helper methods for interactive features
    formatAsMarkdownTodo(items, timestamp) {
        const lines = [`# TODO - Code Review Action Items (${timestamp})\n`];
        items.forEach((item, index) => {
            lines.push(`## ${index + 1}. ${item.title}`);
            lines.push(`**Priority:** ${item.priority}`);
            lines.push(`**Effort:** ${item.estimatedEffort}`);
            if (item.file)
                lines.push(`**File:** ${item.file}${item.line ? `:${item.line}` : ''}`);
            lines.push(`**Description:** ${item.description}`);
            if (item.suggestion)
                lines.push(`**Solution:** ${item.suggestion}`);
            lines.push('');
        });
        return lines.join('\n');
    }
    formatAsGitHubIssues(items, timestamp) {
        const lines = [`# GitHub Issues Export (${timestamp})\n`];
        items.forEach((item, index) => {
            const labels = [`priority:${item.priority}`, `type:code-review`];
            lines.push(`## Issue ${index + 1}: ${item.title}`);
            lines.push(`**Labels:** ${labels.join(', ')}`);
            lines.push(`**Description:** ${item.description}`);
            if (item.file)
                lines.push(`**File:** \`${item.file}${item.line ? `:${item.line}` : ''}\``);
            if (item.suggestion)
                lines.push(`**Acceptance Criteria:** ${item.suggestion}`);
            lines.push('---');
        });
        return lines.join('\n');
    }
    async saveToFile(filename, content) {
        const fs = await import('fs').then(fs => fs.promises);
        await fs.writeFile(filename, content, 'utf-8');
    }
    getFocusSpecificRules(focus) {
        const rules = {
            security: ['Check for SQL injection vulnerabilities', 'Validate input sanitization', 'Review authentication logic'],
            performance: ['Look for N+1 queries', 'Check for unnecessary computations', 'Review caching strategies'],
            testing: ['Ensure adequate test coverage', 'Check for edge case testing', 'Review test quality'],
            maintainability: ['Check code complexity', 'Review documentation', 'Ensure consistent patterns']
        };
        return rules[focus] || [];
    }
    generateLearningResources(review) {
        const resources = [];
        // Analyze review to suggest relevant resources
        const hasSecurityIssues = review.actionableItems.some(item => item.title.toLowerCase().includes('security'));
        const hasPerformanceIssues = review.actionableItems.some(item => item.title.toLowerCase().includes('performance'));
        const hasTestingIssues = review.actionableItems.some(item => item.title.toLowerCase().includes('test'));
        if (hasSecurityIssues) {
            resources.push({
                title: 'Secure Coding Practices',
                category: 'Security',
                description: 'Learn about common security vulnerabilities and how to prevent them',
                links: ['https://owasp.org/www-project-top-ten/', 'https://cheatsheetseries.owasp.org/']
            });
        }
        if (hasPerformanceIssues) {
            resources.push({
                title: 'Performance Optimization Techniques',
                category: 'Performance',
                description: 'Strategies for improving application performance and scalability',
                links: ['https://web.dev/performance/', 'https://developers.google.com/web/fundamentals/performance']
            });
        }
        if (hasTestingIssues) {
            resources.push({
                title: 'Testing Best Practices',
                category: 'Testing',
                description: 'Comprehensive guide to writing effective tests',
                links: ['https://testing.googleblog.com/', 'https://martinfowler.com/testing/']
            });
        }
        return resources;
    }
    formatLearningResources(resources) {
        const lines = ['# Learning Resources\n'];
        resources.forEach(resource => {
            lines.push(`## ${resource.title}`);
            lines.push(`**Category:** ${resource.category}`);
            lines.push(`**Description:** ${resource.description}`);
            if (resource.links.length > 0) {
                lines.push('**Resources:**');
                resource.links.forEach(link => lines.push(`- ${link}`));
            }
            lines.push('');
        });
        return lines.join('\n');
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