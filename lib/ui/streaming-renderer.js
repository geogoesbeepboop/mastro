import chalk from 'chalk';
import { UIRenderer } from './renderer.js';
import { LoadingStateManager, createStreamingLoadingHandler } from './loading-states.js';
export class StreamingRenderer extends UIRenderer {
    loadingManager;
    constructor(config) {
        super(config);
        this.loadingManager = new LoadingStateManager(config);
    }
    async renderStreamingCommitMessage(streamGenerator, options = {}) {
        const handler = createStreamingLoadingHandler(this.loadingManager, 'Generating commit message');
        let result = null;
        let partialResult = {};
        try {
            for await (const chunk of streamGenerator) {
                if (chunk.type === 'chunk') {
                    if (chunk.progress !== undefined) {
                        handler.updateProgress(chunk.progress);
                    }
                    if (chunk.data) {
                        partialResult = { ...partialResult, ...chunk.data };
                        // Show progressive updates for commit message
                        if (this.isCommitMessage(partialResult)) {
                            this.renderPartialCommitMessage(partialResult);
                        }
                    }
                }
                else if (chunk.type === 'complete') {
                    result = chunk.data;
                    handler.complete('Commit message generated successfully!');
                    if (result && this.isCommitMessage(result)) {
                        this.renderFinalCommitMessage(result);
                    }
                }
                else if (chunk.type === 'error') {
                    handler.error(chunk.error || 'Unknown error');
                    throw new Error(chunk.error);
                }
            }
        }
        catch (error) {
            handler.error(error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
        return result;
    }
    async renderStreamingExplanation(streamGenerator, options = {}) {
        const handler = createStreamingLoadingHandler(this.loadingManager, 'Analyzing changes');
        let result = null;
        let partialResult = {};
        try {
            for await (const chunk of streamGenerator) {
                if (chunk.type === 'chunk') {
                    if (chunk.progress !== undefined) {
                        handler.updateProgress(chunk.progress);
                    }
                    if (chunk.data) {
                        partialResult = { ...partialResult, ...chunk.data };
                        // Show progressive updates for explanation
                        if (this.isDiffExplanation(partialResult)) {
                            this.renderPartialExplanation(partialResult);
                        }
                    }
                }
                else if (chunk.type === 'complete') {
                    result = chunk.data;
                    handler.complete('Analysis completed!');
                    if (result && this.isDiffExplanation(result)) {
                        this.renderFinalExplanation(result);
                    }
                }
                else if (chunk.type === 'error') {
                    handler.error(chunk.error || 'Unknown error');
                    throw new Error(chunk.error);
                }
            }
        }
        catch (error) {
            handler.error(error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
        return result;
    }
    async renderStreamingReview(streamGenerator, options = {}) {
        const handler = createStreamingLoadingHandler(this.loadingManager, 'Performing code review');
        let result = null;
        let partialResult = {};
        try {
            console.log(chalk.cyan.bold('\n🔍 Session Code Review'));
            console.log(chalk.gray('─'.repeat(50)));
            for await (const chunk of streamGenerator) {
                if (chunk.type === 'chunk') {
                    if (chunk.progress !== undefined) {
                        handler.updateProgress(chunk.progress);
                    }
                    if (chunk.data) {
                        partialResult = { ...partialResult, ...chunk.data };
                        // Show progressive updates for review
                        if (this.isSessionReview(partialResult)) {
                            this.renderPartialReview(partialResult);
                        }
                    }
                }
                else if (chunk.type === 'complete') {
                    result = chunk.data;
                    handler.complete('Code review completed!');
                    if (result && this.isSessionReview(result)) {
                        this.renderFinalReview(result);
                    }
                }
                else if (chunk.type === 'error') {
                    handler.error(chunk.error || 'Unknown error');
                    throw new Error(chunk.error);
                }
            }
        }
        catch (error) {
            handler.error(error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
        return result;
    }
    renderPartialCommitMessage(partial) {
        if (partial.title) {
            process.stdout.write('\r' + ' '.repeat(100) + '\r'); // Clear line
            process.stdout.write(chalk.dim(`Preview: ${partial.title}`));
        }
    }
    renderFinalCommitMessage(message) {
        process.stdout.write('\r' + ' '.repeat(100) + '\r'); // Clear preview line
        console.log(this.renderCommitMessage(message));
    }
    renderPartialExplanation(partial) {
        if (partial.summary) {
            process.stdout.write('\r' + ' '.repeat(100) + '\r');
            process.stdout.write(chalk.dim(`Preview: ${partial.summary.substring(0, 80)}...`));
        }
    }
    renderFinalExplanation(explanation) {
        process.stdout.write('\r' + ' '.repeat(100) + '\r');
        console.log(this.renderDiffExplanation(explanation));
    }
    renderPartialReview(partial) {
        // Show progressive review information
        if (partial.overall?.summary) {
            process.stdout.write('\r' + ' '.repeat(100) + '\r');
            process.stdout.write(chalk.dim(`Preview: ${partial.overall.summary.substring(0, 60)}...`));
        }
        else if (partial.suggestions && partial.suggestions.length > 0) {
            process.stdout.write('\r' + ' '.repeat(100) + '\r');
            process.stdout.write(chalk.dim(`Found ${partial.suggestions.length} suggestions...`));
        }
    }
    renderFinalReview(review) {
        process.stdout.write('\r' + ' '.repeat(100) + '\r');
        this.renderSessionReview(review);
    }
    renderSessionReview(review) {
        const output = [];
        // Overall assessment
        output.push(chalk.cyan.bold('\n📊 Overall Assessment'));
        output.push(this.renderOverallRating(review.overall.rating, review.overall.confidence));
        output.push(chalk.white(review.overall.summary));
        output.push('');
        // Actionable items (the main star!)
        if (review.actionableItems.length > 0) {
            output.push(chalk.yellow.bold('🎯 Actionable Items'));
            output.push(chalk.gray('─'.repeat(30)));
            for (const item of review.actionableItems.slice(0, 10)) { // Show top 10
                output.push(this.renderActionableItem(item));
            }
            output.push('');
        }
        // Suggestions
        if (review.suggestions.length > 0) {
            output.push(chalk.blue.bold('💡 Code Suggestions'));
            output.push(chalk.gray('─'.repeat(30)));
            for (const suggestion of review.suggestions.slice(0, 5)) { // Show top 5
                output.push(this.renderReviewSuggestion(suggestion));
            }
            output.push('');
        }
        // Blockers (critical)
        if (review.blockers.length > 0) {
            output.push(chalk.red.bold('🚫 Blockers (Must Fix)'));
            output.push(chalk.gray('─'.repeat(30)));
            for (const blocker of review.blockers) {
                output.push(this.renderBlocker(blocker));
            }
            output.push('');
        }
        // Workflow suggestions
        if (review.workflowSuggestions.length > 0) {
            output.push(chalk.magenta.bold('🔄 Workflow Suggestions'));
            output.push(chalk.gray('─'.repeat(30)));
            for (const suggestion of review.workflowSuggestions) {
                output.push(this.renderWorkflowSuggestion(suggestion));
            }
            output.push('');
        }
        // Learning points
        if (review.learningPoints.length > 0) {
            output.push(chalk.green.bold('📚 Learning Points'));
            output.push(chalk.gray('─'.repeat(30)));
            for (const point of review.learningPoints) {
                output.push(chalk.gray(`• ${point}`));
            }
            output.push('');
        }
        // Compliments
        if (review.compliments.length > 0) {
            output.push(chalk.green.bold('👏 Great Work'));
            output.push(chalk.gray('─'.repeat(20)));
            for (const compliment of review.compliments) {
                output.push(chalk.green(`✓ ${compliment}`));
            }
            output.push('');
        }
        // Session info
        output.push(chalk.gray(`Session: ${review.sessionId.substring(0, 8)} | Scope: ${review.scope}`));
        console.log(output.join('\n'));
    }
    renderActionableItem(item) {
        const priorityColors = {
            critical: 'red',
            high: 'yellow',
            medium: 'blue',
            low: 'gray'
        };
        const typeIcons = {
            todo: '📝',
            fix: '🔧',
            improvement: '✨',
            warning: '⚠️'
        };
        const effortBadges = {
            quick: chalk.green('Quick'),
            medium: chalk.yellow('Medium'),
            substantial: chalk.red('Substantial')
        };
        const priorityColor = priorityColors[item.priority];
        const icon = typeIcons[item.type];
        const effort = effortBadges[item.estimatedEffort];
        let output = `${icon} ${chalk[priorityColor].bold(item.title)} ${effort}`;
        if (item.file) {
            const fileDisplay = item.line ? `${item.file}:${item.line}` : item.file;
            output += `\n   ${chalk.gray(fileDisplay)}`;
        }
        output += `\n   ${chalk.white(item.description)}`;
        if (item.suggestion) {
            output += `\n   ${chalk.cyan(`💡 ${item.suggestion}`)}`;
        }
        return output + '\n';
    }
    renderWorkflowSuggestion(suggestion) {
        const effortColors = {
            low: 'green',
            medium: 'yellow',
            high: 'red'
        };
        const typeIcons = {
            'commit-split': '📦',
            'refactoring': '🔄',
            'testing': '🧪',
            'documentation': '📚'
        };
        const icon = typeIcons[suggestion.type] || '💡';
        const effortColor = effortColors[suggestion.effort];
        return [
            `${icon} ${chalk.white.bold(suggestion.description)} ${chalk[effortColor](`[${suggestion.effort} effort]`)}`,
            `   ${chalk.gray(`Benefit: ${suggestion.benefit}`)}`,
            ''
        ].join('\n');
    }
    renderBlocker(blocker) {
        return [
            `${chalk.red.bold('🚫')} ${chalk.red.bold(blocker.message)}`,
            blocker.file ? `   ${chalk.gray(`${blocker.file}${blocker.line ? `:${blocker.line}` : ''}`)}` : '',
            blocker.suggestion ? `   ${chalk.cyan(`Fix: ${blocker.suggestion}`)}` : '',
            ''
        ].filter(Boolean).join('\n');
    }
    renderReviewSuggestion(suggestion) {
        const severityColors = {
            error: 'red',
            warning: 'yellow',
            info: 'blue'
        };
        const typeIcons = {
            bug: '🐛',
            performance: '⚡',
            security: '🔒',
            maintainability: '🔧',
            style: '🎨'
        };
        const color = severityColors[suggestion.severity] || 'gray';
        const icon = typeIcons[suggestion.type] || '💡';
        let output = `${icon} ${chalk[color](suggestion.message)}`;
        if (suggestion.file) {
            const fileDisplay = suggestion.line ? `${suggestion.file}:${suggestion.line}` : suggestion.file;
            output += `\n   ${chalk.gray(fileDisplay)}`;
        }
        if (suggestion.suggestion) {
            output += `\n   ${chalk.cyan(`💡 ${suggestion.suggestion}`)}`;
        }
        return output + '\n';
    }
    renderOverallRating(rating, confidence) {
        const ratingColors = {
            excellent: 'green',
            good: 'cyan',
            'needs-work': 'yellow',
            'major-issues': 'red'
        };
        const ratingIcons = {
            excellent: '🌟',
            good: '👍',
            'needs-work': '⚠️',
            'major-issues': '❌'
        };
        const color = ratingColors[rating] || 'gray';
        const icon = ratingIcons[rating] || '❓';
        const confidenceBar = '█'.repeat(Math.round(confidence * 10));
        return `${icon} ${chalk[color].bold(rating.toUpperCase())} (${Math.round(confidence * 100)}% confidence: ${chalk.gray(confidenceBar)})`;
    }
    // Type guards
    isCommitMessage(obj) {
        return obj && typeof obj.title === 'string';
    }
    isDiffExplanation(obj) {
        return obj && typeof obj.summary === 'string';
    }
    isSessionReview(obj) {
        return obj && typeof obj.sessionId === 'string' && obj.overall;
    }
    cleanup() {
        this.loadingManager.cleanup();
    }
}
//# sourceMappingURL=streaming-renderer.js.map