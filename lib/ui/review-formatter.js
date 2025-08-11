import chalk from 'chalk';
export class ReviewFormatter {
    config;
    constructor(config) {
        this.config = config;
    }
    formatSessionReview(review, format = 'terminal') {
        switch (format) {
            case 'json':
                return this.formatJSON(review);
            case 'markdown':
                return this.formatMarkdown(review);
            case 'html':
                return this.formatHTML(review);
            case 'terminal':
            default:
                return this.formatTerminal(review);
        }
    }
    formatActionableItems(items, format = 'terminal') {
        switch (format) {
            case 'json':
                return JSON.stringify(items, null, 2);
            case 'markdown':
                return this.formatActionableItemsMarkdown(items);
            case 'terminal':
            default:
                return this.formatActionableItemsTerminal(items);
        }
    }
    formatWorkflowSuggestions(suggestions, format = 'terminal') {
        switch (format) {
            case 'json':
                return JSON.stringify(suggestions, null, 2);
            case 'markdown':
                return this.formatWorkflowSuggestionsMarkdown(suggestions);
            case 'terminal':
            default:
                return this.formatWorkflowSuggestionsTerminal(suggestions);
        }
    }
    // Terminal formatting
    formatTerminal(review) {
        const output = [];
        // Header
        output.push(chalk.cyan.bold('\n🔍 Session Code Review'));
        output.push(chalk.gray('─'.repeat(50)));
        output.push('');
        // Overall assessment
        output.push(chalk.cyan.bold('📊 Overall Assessment'));
        output.push(this.formatOverallRating(review.overall.rating, review.overall.confidence));
        output.push(chalk.white(review.overall.summary));
        output.push('');
        // Actionable items (prioritized)
        if (review.actionableItems.length > 0) {
            output.push(chalk.yellow.bold('🎯 Actionable Items'));
            output.push(chalk.gray('─'.repeat(30)));
            output.push(this.formatActionableItemsTerminal(review.actionableItems));
        }
        // Blockers (critical)
        const renderedBlockers = review.blockers.map(b => this.formatBlockerTerminal(b)).filter(Boolean);
        if (renderedBlockers.length > 0) {
            output.push(chalk.red.bold('🚫 Blockers (Must Fix)'));
            output.push(chalk.gray('─'.repeat(30)));
            output.push(...renderedBlockers);
            output.push('');
        }
        // Code suggestions
        if (review.suggestions.length > 0) {
            output.push(chalk.blue.bold('💡 Code Suggestions'));
            output.push(chalk.gray('─'.repeat(30)));
            for (const suggestion of review.suggestions.slice(0, 5)) {
                output.push(this.formatSuggestionTerminal(suggestion));
            }
            output.push('');
        }
        // Workflow suggestions
        if (review.workflowSuggestions.length > 0) {
            output.push(chalk.magenta.bold('🔄 Workflow Suggestions'));
            output.push(chalk.gray('─'.repeat(30)));
            output.push(this.formatWorkflowSuggestionsTerminal(review.workflowSuggestions));
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
        // Footer
        output.push(chalk.gray(`Session: ${review.sessionId.substring(0, 8)} | Scope: ${review.scope}`));
        return output.join('\n');
    }
    formatActionableItemsTerminal(items) {
        const output = [];
        for (const item of items.slice(0, 10)) { // Show top 10
            const priorityColors = { critical: 'red', high: 'yellow', medium: 'blue', low: 'gray' };
            const typeIcons = { todo: '📝', fix: '🔧', improvement: '✨', warning: '⚠️' };
            const effortBadges = {
                quick: chalk.green('Quick'),
                medium: chalk.yellow('Medium'),
                substantial: chalk.red('Substantial')
            };
            const priorityColor = priorityColors[item.priority];
            const icon = typeIcons[item.type];
            const effort = effortBadges[item.estimatedEffort];
            output.push(`${icon} ${chalk[priorityColor].bold(item.title)} ${effort}`);
            if (item.file) {
                const fileDisplay = item.line ? `${item.file}:${item.line}` : item.file;
                output.push(`   ${chalk.gray(fileDisplay)}`);
            }
            output.push(`   ${chalk.white(item.description)}`);
            if (item.suggestion) {
                output.push(`   ${chalk.cyan(`💡 ${item.suggestion}`)}`);
            }
            output.push('');
        }
        return output.join('\n');
    }
    formatWorkflowSuggestionsTerminal(suggestions) {
        const output = [];
        const effortColors = { low: 'green', medium: 'yellow', high: 'red' };
        const typeIcons = {
            'commit-split': '📦',
            'refactoring': '🔄',
            'testing': '🧪',
            'documentation': '📚'
        };
        for (const suggestion of suggestions) {
            const icon = typeIcons[suggestion.type] || '💡';
            const effortColor = effortColors[suggestion.effort];
            output.push(`${icon} ${chalk.white.bold(suggestion.description)} ${chalk[effortColor](`[${suggestion.effort} effort]`)}`);
            output.push(`   ${chalk.gray(`Benefit: ${suggestion.benefit}`)}`);
            output.push('');
        }
        return output.join('\n');
    }
    formatOverallRating(rating, confidence) {
        const ratingColors = { excellent: 'green', good: 'cyan', 'needs-work': 'yellow', 'major-issues': 'red' };
        const ratingIcons = { excellent: '🌟', good: '👍', 'needs-work': '⚠️', 'major-issues': '❌' };
        // Normalize rating with type checking
        const normalizedRating = this.normalizeRating(rating);
        const color = ratingColors[normalizedRating] || 'gray';
        const icon = ratingIcons[normalizedRating] || '❓';
        // Handle invalid confidence values
        const validConfidence = (typeof confidence === 'number' && !isNaN(confidence) && confidence >= 0 && confidence <= 1);
        const displayRating = normalizedRating.toUpperCase();
        if (validConfidence) {
            const confidenceBar = '█'.repeat(Math.round(confidence * 10));
            return `${icon} ${chalk[color].bold(displayRating)} (${Math.round(confidence * 100)}% confidence: ${chalk.gray(confidenceBar)})`;
        }
        else {
            return `${icon} ${chalk[color].bold(displayRating)}`;
        }
    }
    normalizeRating(rating) {
        // Type guard: ensure rating is a string
        if (typeof rating !== 'string' || !rating) {
            // AI-powered fallback: infer rating from common patterns
            if (typeof rating === 'number') {
                if (rating >= 4.5)
                    return 'excellent';
                if (rating >= 3.5)
                    return 'good';
                if (rating >= 2.0)
                    return 'needs-work';
                return 'major-issues';
            }
            // Default fallback for unknown types
            return 'needs-work';
        }
        // Normalize known rating strings
        const lowerRating = rating.toLowerCase().trim();
        // Map common variations to standard ratings
        const ratingMap = {
            'excellent': 'excellent',
            'great': 'excellent',
            'outstanding': 'excellent',
            'good': 'good',
            'okay': 'good',
            'fair': 'good',
            'needs work': 'needs-work',
            'needs-work': 'needs-work',
            'poor': 'needs-work',
            'major issues': 'major-issues',
            'major-issues': 'major-issues',
            'bad': 'major-issues',
            'critical': 'major-issues'
        };
        return ratingMap[lowerRating] || 'needs-work';
    }
    formatSuggestionTerminal(suggestion) {
        const severityColors = { error: 'red', warning: 'yellow', info: 'blue' };
        const typeIcons = { bug: '🐛', performance: '⚡', security: '🔒', maintainability: '🔧', style: '🎨' };
        const color = severityColors[suggestion.severity] || 'gray';
        const icon = typeIcons[suggestion.type] || '💡';
        const message = suggestion.message || 'Suggestion detected';
        let output = `${icon} ${chalk[color](message)}`;
        if (suggestion.file) {
            const fileDisplay = suggestion.line ? `${suggestion.file}:${suggestion.line}` : suggestion.file;
            output += `\n   ${chalk.gray(fileDisplay)}`;
        }
        if (suggestion.suggestion) {
            output += `\n   ${chalk.cyan(`💡 ${suggestion.suggestion}`)}`;
        }
        return output + '\n';
    }
    formatBlockerTerminal(blocker) {
        // Suppress generic or low-signal blocker messages from rendering
        if (!blocker.message || blocker.message === 'Issue detected' || (typeof blocker.message === 'string' && blocker.message.trim().length < 15)) {
            return '';
        }
        const message = blocker.message;
        return [
            `${chalk.red.bold('🚫')} ${chalk.red.bold(message)}`,
            blocker.file ? `   ${chalk.gray(`${blocker.file}${blocker.line ? `:${blocker.line}` : ''}`)}` : '',
            blocker.suggestion ? `   ${chalk.cyan(`Fix: ${blocker.suggestion}`)}` : '',
            ''
        ].filter(Boolean).join('\n');
    }
    // Markdown formatting
    formatMarkdown(review) {
        const output = [];
        output.push('# 🔍 Code Review Results\n');
        output.push(`**Session:** ${review.sessionId.substring(0, 8)}`);
        output.push(`**Scope:** ${review.scope}`);
        // Handle confidence display
        const validConfidence = (typeof review.overall.confidence === 'number' && !isNaN(review.overall.confidence) && review.overall.confidence >= 0 && review.overall.confidence <= 1);
        if (validConfidence) {
            output.push(`**Rating:** ${review.overall.rating} (${Math.round(review.overall.confidence * 100)}% confidence)\n`);
        }
        else {
            output.push(`**Rating:** ${review.overall.rating}\n`);
        }
        output.push(review.overall.summary + '\n');
        if (review.actionableItems.length > 0) {
            output.push('## 🎯 Actionable Items\n');
            output.push(this.formatActionableItemsMarkdown(review.actionableItems));
        }
        if (review.blockers.length > 0) {
            output.push('## 🚫 Blockers\n');
            for (const blocker of review.blockers) {
                const message = blocker.message || 'Issue detected';
                output.push(`### ❌ ${message}`);
                if (blocker.file)
                    output.push(`**File:** ${blocker.file}${blocker.line ? `:${blocker.line}` : ''}`);
                if (blocker.suggestion)
                    output.push(`**Fix:** ${blocker.suggestion}`);
                output.push('');
            }
        }
        if (review.suggestions.length > 0) {
            output.push('## 💡 Code Suggestions\n');
            for (const suggestion of review.suggestions) {
                const message = suggestion.message || 'Suggestion detected';
                output.push(`### ${this.getSuggestionIcon(suggestion.type)} ${message}`);
                output.push(`**Severity:** ${suggestion.severity}`);
                if (suggestion.file)
                    output.push(`**File:** ${suggestion.file}${suggestion.line ? `:${suggestion.line}` : ''}`);
                if (suggestion.suggestion)
                    output.push(`**Suggestion:** ${suggestion.suggestion}`);
                output.push('');
            }
        }
        if (review.workflowSuggestions.length > 0) {
            output.push('## 🔄 Workflow Suggestions\n');
            output.push(this.formatWorkflowSuggestionsMarkdown(review.workflowSuggestions));
        }
        if (review.learningPoints.length > 0) {
            output.push('## 📚 Learning Points\n');
            for (const point of review.learningPoints) {
                output.push(`- ${point}`);
            }
            output.push('');
        }
        if (review.compliments.length > 0) {
            output.push('## 👏 Great Work\n');
            for (const compliment of review.compliments) {
                output.push(`- ✅ ${compliment}`);
            }
            output.push('');
        }
        return output.join('\n');
    }
    formatActionableItemsMarkdown(items) {
        const output = [];
        for (const item of items) {
            output.push(`### ${this.getActionableIcon(item.type)} ${item.title}`);
            output.push(`**Priority:** ${item.priority} | **Effort:** ${item.estimatedEffort}`);
            if (item.file)
                output.push(`**File:** ${item.file}${item.line ? `:${item.line}` : ''}`);
            output.push(item.description);
            if (item.suggestion)
                output.push(`💡 **Suggestion:** ${item.suggestion}`);
            output.push('');
        }
        return output.join('\n');
    }
    formatWorkflowSuggestionsMarkdown(suggestions) {
        const output = [];
        for (const suggestion of suggestions) {
            const icon = this.getWorkflowIcon(suggestion.type);
            output.push(`### ${icon} ${suggestion.description}`);
            output.push(`**Effort:** ${suggestion.effort}`);
            output.push(`**Benefit:** ${suggestion.benefit}`);
            output.push('');
        }
        return output.join('\n');
    }
    // JSON formatting
    formatJSON(review) {
        return JSON.stringify(review, null, 2);
    }
    // HTML formatting
    formatHTML(review) {
        const output = [];
        output.push('<!DOCTYPE html>');
        output.push('<html><head><title>Code Review Results</title>');
        output.push('<style>');
        output.push('body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 40px; }');
        output.push('.header { color: #0366d6; border-bottom: 2px solid #e1e4e8; padding-bottom: 10px; }');
        output.push('.section { margin: 20px 0; }');
        output.push('.actionable { background: #fff5b4; padding: 10px; border-left: 4px solid #ffdf5d; }');
        output.push('.blocker { background: #ffeaea; padding: 10px; border-left: 4px solid #d73a49; }');
        output.push('.suggestion { background: #f1f8ff; padding: 10px; border-left: 4px solid #0366d6; }');
        output.push('.meta { color: #586069; font-size: 0.9em; }');
        output.push('</style></head><body>');
        output.push(`<h1 class="header">🔍 Code Review Results</h1>`);
        output.push(`<div class="meta">Session: ${review.sessionId} | Scope: ${review.scope}</div>`);
        output.push(`<div class="section">`);
        output.push(`<h2>📊 Overall Assessment</h2>`);
        output.push(`<p><strong>Rating:</strong> ${review.overall.rating} (${Math.round(review.overall.confidence * 100)}% confidence)</p>`);
        output.push(`<p>${review.overall.summary}</p>`);
        output.push(`</div>`);
        if (review.actionableItems.length > 0) {
            output.push(`<div class="section">`);
            output.push(`<h2>🎯 Actionable Items</h2>`);
            for (const item of review.actionableItems) {
                output.push(`<div class="actionable">`);
                output.push(`<h4>${this.getActionableIcon(item.type)} ${item.title}</h4>`);
                output.push(`<p><strong>Priority:</strong> ${item.priority} | <strong>Effort:</strong> ${item.estimatedEffort}</p>`);
                if (item.file)
                    output.push(`<p><strong>File:</strong> ${item.file}${item.line ? `:${item.line}` : ''}</p>`);
                output.push(`<p>${item.description}</p>`);
                if (item.suggestion)
                    output.push(`<p>💡 <strong>Suggestion:</strong> ${item.suggestion}</p>`);
                output.push(`</div>`);
            }
            output.push(`</div>`);
        }
        output.push('</body></html>');
        return output.join('\n');
    }
    // Helper methods for icons
    getActionableIcon(type) {
        const icons = { todo: '📝', fix: '🔧', improvement: '✨', warning: '⚠️' };
        return icons[type];
    }
    getSuggestionIcon(type) {
        const icons = { bug: '🐛', performance: '⚡', security: '🔒', maintainability: '🔧', style: '🎨' };
        return icons[type] || '💡';
    }
    getWorkflowIcon(type) {
        const icons = {
            'commit-split': '📦',
            'refactoring': '🔄',
            'testing': '🧪',
            'documentation': '📚'
        };
        return icons[type] || '💡';
    }
}
//# sourceMappingURL=review-formatter.js.map