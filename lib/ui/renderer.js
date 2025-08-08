import chalk from 'chalk';
export class UIRenderer {
    config;
    constructor(config) {
        this.config = config;
    }
    renderCommitMessage(message) {
        if (!this.config.ui.colors) {
            return this.renderCommitMessagePlain(message);
        }
        const output = [];
        // Header
        output.push(chalk.cyan.bold('🚀 Generated Commit Message'));
        output.push(chalk.gray('─'.repeat(50)));
        output.push('');
        // Title with type and scope
        const typeColor = this.getTypeColor(message.type);
        const titleParts = [];
        if (message.type) {
            titleParts.push(chalk.hex(typeColor).bold(`${message.type}`));
        }
        if (message.scope) {
            titleParts.push(chalk.gray(`(${message.scope})`));
        }
        const prefix = titleParts.length > 0 ? `${titleParts.join('')}: ` : '';
        output.push(`${prefix}${chalk.white.bold(message.title.replace(/^[^:]*:\s*/, ''))}`);
        // Body if present
        if (message.body) {
            output.push('');
            output.push(chalk.gray(message.body));
        }
        // Metadata
        output.push('');
        output.push(chalk.gray('─'.repeat(30)));
        output.push(`${chalk.blue('Type:')} ${message.type}`);
        if (message.scope) {
            output.push(`${chalk.blue('Scope:')} ${message.scope}`);
        }
        output.push(`${chalk.blue('Confidence:')} ${this.renderConfidence(message.confidence)}`);
        // Reasoning
        if (message.reasoning) {
            output.push('');
            output.push(chalk.yellow('💡 Reasoning:'));
            output.push(chalk.gray(`   ${message.reasoning}`));
        }
        return output.join('\n');
    }
    renderDiffExplanation(explanation) {
        if (!this.config.ui.colors) {
            return this.renderDiffExplanationPlain(explanation);
        }
        const output = [];
        // Header
        output.push(chalk.cyan.bold('📖 Diff Explanation'));
        output.push(chalk.gray('─'.repeat(50)));
        output.push('');
        // Summary
        output.push(chalk.white.bold('Summary'));
        output.push(chalk.gray(explanation.summary));
        output.push('');
        // Impact Analysis
        output.push(chalk.white.bold('Impact Analysis'));
        output.push(`${chalk.blue('Risk:')} ${this.renderRisk(explanation.impact.risk)}`);
        output.push(`${chalk.blue('Scope:')} ${this.renderScope(explanation.impact.scope)}`);
        if (explanation.impact.affectedComponents.length > 0) {
            output.push(`${chalk.blue('Affected Components:')} ${explanation.impact.affectedComponents.join(', ')}`);
        }
        // Technical Details
        if (explanation.technicalDetails.length > 0) {
            output.push('');
            output.push(chalk.white.bold('Technical Details'));
            explanation.technicalDetails.forEach(detail => {
                output.push(`  ${chalk.gray('•')} ${detail}`);
            });
        }
        // Business Context
        if (explanation.businessContext) {
            output.push('');
            output.push(chalk.white.bold('Business Context'));
            output.push(chalk.gray(explanation.businessContext));
        }
        // Potential Issues
        if (explanation.impact.potentialIssues.length > 0) {
            output.push('');
            output.push(chalk.yellow.bold('⚠️  Potential Issues'));
            explanation.impact.potentialIssues.forEach(issue => {
                output.push(`  ${chalk.yellow('•')} ${issue}`);
            });
        }
        // Testing Recommendations
        if (explanation.impact.testingRecommendations.length > 0) {
            output.push('');
            output.push(chalk.green.bold('✅ Testing Recommendations'));
            explanation.impact.testingRecommendations.forEach(rec => {
                output.push(`  ${chalk.green('•')} ${rec}`);
            });
        }
        // Migration Notes
        if (explanation.migrationNotes && explanation.migrationNotes.length > 0) {
            output.push('');
            output.push(chalk.magenta.bold('📋 Migration Notes'));
            explanation.migrationNotes.forEach(note => {
                output.push(`  ${chalk.magenta('•')} ${note}`);
            });
        }
        return output.join('\n');
    }
    renderPRDescription(pr) {
        if (!this.config.ui.colors) {
            return this.renderPRDescriptionPlain(pr);
        }
        const output = [];
        // Header
        output.push(chalk.cyan.bold('📝 Pull Request Description'));
        output.push(chalk.gray('─'.repeat(50)));
        output.push('');
        // Title
        output.push(chalk.white.bold('Title'));
        output.push(pr.title);
        output.push('');
        // Description
        output.push(chalk.white.bold('Description'));
        output.push(pr.description);
        output.push('');
        // Checklist
        if (pr.checklist.length > 0) {
            output.push(chalk.white.bold('Checklist'));
            pr.checklist.forEach(item => {
                output.push(`  ${chalk.gray('☐')} ${item}`);
            });
            output.push('');
        }
        // Testing Instructions
        if (pr.testingInstructions.length > 0) {
            output.push(chalk.green.bold('🧪 Testing Instructions'));
            pr.testingInstructions.forEach(instruction => {
                output.push(`  ${chalk.green('1.')} ${instruction}`);
            });
            output.push('');
        }
        // Breaking Changes
        if (pr.breakingChanges && pr.breakingChanges.length > 0) {
            output.push(chalk.red.bold('💥 Breaking Changes'));
            pr.breakingChanges.forEach(change => {
                output.push(`  ${chalk.red('•')} ${change}`);
            });
            output.push('');
        }
        // Dependencies
        if (pr.dependencies && pr.dependencies.length > 0) {
            output.push(chalk.blue.bold('🔗 Dependencies'));
            pr.dependencies.forEach(dep => {
                output.push(`  ${chalk.blue('•')} ${dep}`);
            });
        }
        return output.join('\n');
    }
    renderCodeReview(review) {
        if (!this.config.ui.colors) {
            return this.renderCodeReviewPlain(review);
        }
        const output = [];
        // Header
        output.push(chalk.cyan.bold('👨‍💻 Code Review'));
        output.push(chalk.gray('─'.repeat(50)));
        output.push('');
        // Overall Assessment
        output.push(chalk.white.bold('Overall Assessment'));
        output.push(`${chalk.blue('Rating:')} ${this.renderRating(review.overall.rating)}`);
        output.push(`${chalk.blue('Confidence:')} ${this.renderConfidence(review.overall.confidence)}`);
        output.push('');
        output.push(chalk.gray(review.overall.summary));
        output.push('');
        // Blocking Issues
        if (review.blockers.length > 0) {
            output.push(chalk.red.bold('🚨 Blocking Issues'));
            review.blockers.forEach(blocker => {
                output.push(this.renderSuggestion(blocker, true));
            });
            output.push('');
        }
        // Suggestions
        if (review.suggestions.length > 0) {
            output.push(chalk.yellow.bold('💡 Suggestions'));
            review.suggestions.forEach(suggestion => {
                output.push(this.renderSuggestion(suggestion));
            });
            output.push('');
        }
        // Compliments
        if (review.compliments.length > 0) {
            output.push(chalk.green.bold('👏 Good Practices'));
            review.compliments.forEach(compliment => {
                output.push(`  ${chalk.green('•')} ${compliment}`);
            });
        }
        return output.join('\n');
    }
    renderError(message, details) {
        if (!this.config.ui.colors) {
            return `Error: ${message}${details ? `\n${details}` : ''}`;
        }
        const output = [];
        output.push(chalk.red.bold('❌ Error'));
        output.push(chalk.red(message));
        if (details) {
            output.push('');
            output.push(chalk.gray(details));
        }
        return output.join('\n');
    }
    renderWarning(message) {
        if (!this.config.ui.colors) {
            return `Warning: ${message}`;
        }
        return `${chalk.yellow('⚠️  Warning:')} ${message}`;
    }
    renderSuccess(message) {
        if (!this.config.ui.colors) {
            return message;
        }
        return `${chalk.green('✅')} ${message}`;
    }
    renderInfo(message) {
        if (!this.config.ui.colors) {
            return message;
        }
        return `${chalk.blue('ℹ️')} ${message}`;
    }
    renderCommitMessagePlain(message) {
        const output = [];
        output.push('Generated Commit Message');
        output.push('─'.repeat(50));
        output.push('');
        const prefix = message.type ? `${message.type}${message.scope ? `(${message.scope})` : ''}: ` : '';
        output.push(`${prefix}${message.title.replace(/^[^:]*:\s*/, '')}`);
        if (message.body) {
            output.push('');
            output.push(message.body);
        }
        output.push('');
        output.push(`Type: ${message.type}`);
        if (message.scope) {
            output.push(`Scope: ${message.scope}`);
        }
        output.push(`Confidence: ${Math.round(message.confidence * 100)}%`);
        return output.join('\n');
    }
    renderDiffExplanationPlain(explanation) {
        const output = [];
        output.push('Diff Explanation');
        output.push('─'.repeat(50));
        output.push('');
        output.push(explanation.summary);
        if (explanation.technicalDetails.length > 0) {
            output.push('');
            output.push('Technical Details:');
            explanation.technicalDetails.forEach(detail => {
                output.push(`  • ${detail}`);
            });
        }
        return output.join('\n');
    }
    renderPRDescriptionPlain(pr) {
        const output = [];
        output.push('Pull Request Description');
        output.push('─'.repeat(50));
        output.push('');
        output.push(`Title: ${pr.title}`);
        output.push('');
        output.push(pr.description);
        return output.join('\n');
    }
    renderCodeReviewPlain(review) {
        const output = [];
        output.push('Code Review');
        output.push('─'.repeat(50));
        output.push('');
        output.push(`Rating: ${review.overall.rating}`);
        output.push(review.overall.summary);
        return output.join('\n');
    }
    getTypeColor(type) {
        const colors = {
            feat: '#00ff00', // Green
            fix: '#ff4444', // Red  
            docs: '#4444ff', // Blue
            style: '#ff44ff', // Magenta
            refactor: '#ffff00', // Yellow
            test: '#ff8800', // Orange
            chore: '#888888' // Gray
        };
        return colors[type] || '#ffffff';
    }
    renderConfidence(confidence) {
        const percent = Math.round(confidence * 100);
        const color = confidence > 0.8 ? chalk.green : confidence > 0.6 ? chalk.yellow : chalk.red;
        return color(`${percent}%`);
    }
    renderRisk(risk) {
        const colors = {
            low: chalk.green,
            medium: chalk.yellow,
            high: chalk.red
        };
        return colors[risk]?.(risk.toUpperCase()) || risk;
    }
    renderScope(scope) {
        const colors = {
            local: chalk.blue,
            module: chalk.yellow,
            system: chalk.red
        };
        return colors[scope]?.(scope.toUpperCase()) || scope;
    }
    renderRating(rating) {
        const colors = {
            excellent: chalk.green,
            good: chalk.blue,
            'needs-work': chalk.yellow,
            'major-issues': chalk.red
        };
        return colors[rating]?.(rating.toUpperCase()) || rating;
    }
    renderSuggestion(suggestion, isBlocker = false) {
        const severityColors = {
            info: chalk.blue,
            warning: chalk.yellow,
            error: chalk.red
        };
        const severityColor = severityColors[suggestion.severity];
        const icon = isBlocker ? '🚨' : suggestion.severity === 'error' ? '❌' : suggestion.severity === 'warning' ? '⚠️' : 'ℹ️';
        const output = [];
        const location = suggestion.line ? `${suggestion.file}:${suggestion.line}` : suggestion.file;
        output.push(`  ${icon} ${severityColor(suggestion.severity.toUpperCase())} in ${chalk.cyan(location)}`);
        output.push(`     ${suggestion.message}`);
        if (suggestion.suggestion) {
            output.push(`     ${chalk.green('Suggestion:')} ${suggestion.suggestion}`);
        }
        if (suggestion.confidence < 1) {
            output.push(`     ${chalk.gray(`Confidence: ${Math.round(suggestion.confidence * 100)}%`)}`);
        }
        return output.join('\n');
    }
}
//# sourceMappingURL=renderer.js.map