import { createInterface } from 'readline';
import chalk from 'chalk';
export class InteractiveUI {
    config;
    readline;
    constructor(config) {
        this.config = config;
    }
    async promptForRefinement(options) {
        if (!this.config.ui.interactive) {
            return null;
        }
        return new Promise((resolve) => {
            this.readline = createInterface({
                input: process.stdin,
                output: process.stdout
            });
            console.log(chalk.cyan('\n🎯 Refinement Options:'));
            options.suggestions.forEach((suggestion, index) => {
                console.log(`  ${index + 1}. ${suggestion}`);
            });
            if (options.allowCustom) {
                console.log(`  ${options.suggestions.length + 1}. Custom refinement`);
            }
            console.log('  0. Accept as is');
            this.readline.question('\nSelect an option (0-' + (options.suggestions.length + (options.allowCustom ? 1 : 0)) + '): ', (answer) => {
                const choice = parseInt(answer.trim(), 10);
                if (choice === 0) {
                    this.readline.close();
                    resolve(null);
                }
                else if (choice > 0 && choice <= options.suggestions.length) {
                    this.readline.close();
                    resolve(options.suggestions[choice - 1]);
                }
                else if (options.allowCustom && choice === options.suggestions.length + 1) {
                    this.readline.question('Enter custom refinement: ', (custom) => {
                        this.readline.close();
                        resolve(custom.trim() || null);
                    });
                }
                else {
                    console.log(chalk.red('Invalid choice. Accepting as is.'));
                    this.readline.close();
                    resolve(null);
                }
            });
        });
    }
    async confirmAction(message, defaultYes = true) {
        if (!this.config.ui.interactive) {
            return defaultYes;
        }
        return new Promise((resolve) => {
            this.readline = createInterface({
                input: process.stdin,
                output: process.stdout
            });
            const prompt = defaultYes ? `${message} (Y/n): ` : `${message} (y/N): `;
            this.readline.question(prompt, (answer) => {
                this.readline.close();
                const response = answer.trim().toLowerCase();
                if (response === '') {
                    resolve(defaultYes);
                }
                else if (response === 'y' || response === 'yes') {
                    resolve(true);
                }
                else if (response === 'n' || response === 'no') {
                    resolve(false);
                }
                else {
                    resolve(defaultYes);
                }
            });
        });
    }
    async selectFromList(items, displayFn, message = 'Select an option') {
        if (!this.config.ui.interactive || items.length === 0) {
            return items[0] || null;
        }
        return new Promise((resolve) => {
            this.readline = createInterface({
                input: process.stdin,
                output: process.stdout
            });
            console.log(chalk.cyan(`\n${message}:`));
            items.forEach((item, index) => {
                console.log(`  ${index + 1}. ${displayFn(item)}`);
            });
            console.log('  0. Cancel');
            this.readline.question(`\nSelect (0-${items.length}): `, (answer) => {
                this.readline.close();
                const choice = parseInt(answer.trim(), 10);
                if (choice === 0) {
                    resolve(null);
                }
                else if (choice > 0 && choice <= items.length) {
                    resolve(items[choice - 1]);
                }
                else {
                    console.log(chalk.red('Invalid choice. Cancelled.'));
                    resolve(null);
                }
            });
        });
    }
    async getTextInput(prompt, defaultValue) {
        if (!this.config.ui.interactive) {
            return defaultValue || null;
        }
        return new Promise((resolve) => {
            this.readline = createInterface({
                input: process.stdin,
                output: process.stdout
            });
            const fullPrompt = defaultValue ? `${prompt} (${defaultValue}): ` : `${prompt}: `;
            this.readline.question(fullPrompt, (answer) => {
                this.readline.close();
                const response = answer.trim();
                if (response === '' && defaultValue) {
                    resolve(defaultValue);
                }
                else if (response === '') {
                    resolve(null);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    async showProgressiveEnhancement(initialMessage, enhancedMessage, onSelect) {
        if (!this.config.ui.interactive) {
            onSelect(enhancedMessage);
            return;
        }
        console.log(chalk.cyan('\n📈 Progressive Enhancement Available'));
        console.log(chalk.gray('─'.repeat(40)));
        console.log(chalk.yellow('\n⚡ Quick Version:'));
        console.log(`${initialMessage.type}${initialMessage.scope ? `(${initialMessage.scope})` : ''}: ${initialMessage.title}`);
        console.log(chalk.green('\n🎯 Enhanced Version:'));
        console.log(`${enhancedMessage.type}${enhancedMessage.scope ? `(${enhancedMessage.scope})` : ''}: ${enhancedMessage.title}`);
        if (enhancedMessage.body) {
            console.log(`\n${enhancedMessage.body}`);
        }
        const choice = await this.selectFromList([
            { label: 'Use Quick Version', message: initialMessage },
            { label: 'Use Enhanced Version', message: enhancedMessage }
        ], item => item.label, 'Which version would you like to use');
        if (choice) {
            onSelect(choice.message);
        }
        else {
            onSelect(initialMessage); // Default to quick version
        }
    }
    cleanup() {
        if (this.readline) {
            this.readline.close();
        }
    }
}
// Utility function to create common refinement suggestions
export function createRefinementSuggestions(type) {
    const suggestions = {
        commit: [
            'Make it more technical',
            'Make it more concise',
            'Add more context',
            'Match team style better',
            'Include performance implications',
            'Add security considerations'
        ],
        explanation: [
            'Make it more detailed',
            'Focus on business impact',
            'Simplify for non-technical audience',
            'Add more technical depth',
            'Include migration steps',
            'Add testing guidance'
        ],
        pr: [
            'Add more testing instructions',
            'Include performance impact',
            'Add breaking changes section',
            'Make description more detailed',
            'Add deployment notes',
            'Include rollback plan'
        ],
        review: [
            'Be more strict',
            'Be more lenient',
            'Focus on security',
            'Focus on performance',
            'Focus on maintainability',
            'Add more positive feedback'
        ]
    };
    return suggestions[type] || [];
}
//# sourceMappingURL=interactive.js.map