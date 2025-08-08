import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base/command.js';
import { UIRenderer } from '../ui/renderer.js';
import { InteractiveUI } from '../ui/interactive.js';
import { HookGenerator } from '../core/hook-generator.js';
export default class Hooks extends BaseCommand {
    static description = 'Manage intelligent pre-commit hooks for AI-powered code validation';
    static examples = [
        '<%= config.bin %> <%= command.id %> install',
        '<%= config.bin %> <%= command.id %> install --strictness=strict',
        '<%= config.bin %> <%= command.id %> validate',
        '<%= config.bin %> <%= command.id %> uninstall',
        '<%= config.bin %> <%= command.id %> status'
    ];
    static args = {
        action: Args.string({
            description: 'action to perform',
            required: true,
            options: ['install', 'uninstall', 'validate', 'status', 'configure']
        })
    };
    static flags = {
        ...BaseCommand.baseFlags,
        strictness: Flags.string({
            char: 's',
            description: 'hook strictness level',
            options: ['lenient', 'moderate', 'strict'],
            default: 'moderate'
        }),
        'critical-threshold': Flags.integer({
            description: 'number of critical issues to block commit (0-10)',
            default: 0,
            min: 0,
            max: 10
        }),
        'high-threshold': Flags.integer({
            description: 'number of high priority issues to show warning',
            default: 3,
            min: 0,
            max: 20
        }),
        persona: Flags.string({
            char: 'p',
            description: 'review persona for validation',
            options: ['security', 'performance', 'maintainability', 'testing'],
            default: 'maintainability'
        }),
        timeout: Flags.integer({
            char: 't',
            description: 'hook timeout in seconds',
            default: 15,
            min: 5,
            max: 60
        }),
        force: Flags.boolean({
            char: 'f',
            description: 'force operation without confirmation',
            default: false
        }),
        interactive: Flags.boolean({
            char: 'i',
            description: 'interactive configuration mode',
            default: false
        })
    };
    renderer;
    interactiveUI;
    hookGenerator;
    async run() {
        const { args, flags } = await this.parse(Hooks);
        try {
            // Initialize components
            this.renderer = new UIRenderer(this.mastroConfig);
            this.interactiveUI = new InteractiveUI(this.mastroConfig);
            this.hookGenerator = new HookGenerator(this.mastroConfig);
            // Ensure we're in a git repository for most operations
            if (args.action !== 'status') {
                await this.ensureGitRepository();
            }
            // Execute the requested action
            switch (args.action) {
                case 'install':
                    await this.installHooks(flags);
                    break;
                case 'uninstall':
                    await this.uninstallHooks(flags);
                    break;
                case 'validate':
                    await this.validateHooks();
                    break;
                case 'status':
                    await this.showHookStatus();
                    break;
                case 'configure':
                    await this.configureHooks(flags);
                    break;
                default:
                    this.error(`Unknown action: ${args.action}`);
            }
        }
        catch (error) {
            await this.handleError(error, `${args.action} hooks`);
        }
        finally {
            this.interactiveUI.cleanup();
        }
    }
    async installHooks(flags) {
        console.log('\n' + this.renderer.renderTitle('🛡️ Installing Intelligent Pre-commit Hooks'));
        // Interactive configuration if requested
        let hookConfig;
        if (flags.interactive) {
            hookConfig = await this.interactiveConfiguration();
        }
        else {
            hookConfig = this.buildHookConfig(flags);
        }
        // Show configuration summary
        console.log('\n' + this.renderer.renderSection('Configuration Summary', [
            `Strictness: ${this.renderer.renderPriority(hookConfig.strictness)}`,
            `Critical threshold: ${hookConfig.criticalThreshold} issues`,
            `High priority threshold: ${hookConfig.highThreshold} issues`,
            `Review persona: ${hookConfig.persona.name}`,
            `Timeout: ${hookConfig.timeoutSeconds}s`
        ]));
        // Confirm installation unless forced
        if (!flags.force) {
            const proceed = await this.interactiveUI.confirmAction('Install hooks with this configuration?', true);
            if (!proceed) {
                this.log('Installation cancelled', 'info');
                return;
            }
        }
        // Install the hooks
        this.startSpinner('Installing intelligent pre-commit hooks...');
        try {
            await this.hookGenerator.installHookSuite(hookConfig);
            this.stopSpinner(true, 'Hooks installed successfully');
            console.log('\n' + this.renderer.renderSection('✅ Installation Complete', [
                'Pre-commit hook: Validates staged changes with AI',
                'Pre-push hook: Checks branch quality before push',
                'Commit-msg hook: Validates commit message format',
                'Configuration saved for future updates'
            ]));
            console.log('\n' + this.renderer.renderHighlight('🎉 Your commits are now protected by AI-powered validation!'));
            console.log('\nNext steps:');
            console.log('  - Make a commit to test the hooks');
            console.log('  - Run `mastro hooks validate` to verify setup');
            console.log('  - Use `git commit --no-verify` to bypass in emergencies');
        }
        catch (error) {
            this.stopSpinner(false, 'Failed to install hooks');
            throw error;
        }
    }
    async uninstallHooks(flags) {
        console.log('\n' + this.renderer.renderTitle('🗑️ Uninstalling Mastro Hooks'));
        // Confirm uninstallation unless forced
        if (!flags.force) {
            const proceed = await this.interactiveUI.confirmAction('Are you sure you want to uninstall mastro hooks? This will remove AI-powered validation.', false // Default to no
            );
            if (!proceed) {
                this.log('Uninstallation cancelled', 'info');
                return;
            }
        }
        this.startSpinner('Removing mastro hooks...');
        try {
            await this.hookGenerator.uninstallHooks();
            this.stopSpinner(true, 'Hooks uninstalled successfully');
            console.log('\n' + this.renderer.renderSection('✅ Uninstallation Complete', [
                'All mastro hooks have been removed',
                'Original hooks have been restored where possible',
                'You can reinstall anytime with `mastro hooks install`'
            ]));
        }
        catch (error) {
            this.stopSpinner(false, 'Failed to uninstall hooks');
            throw error;
        }
    }
    async validateHooks() {
        console.log('\n' + this.renderer.renderTitle('🔍 Validating Hook Setup'));
        this.startSpinner('Checking hook configuration...');
        try {
            const validation = await this.hookGenerator.validateHookSetup();
            this.stopSpinner(true, `Validation completed in ${validation.executionTime}ms`);
            // Display validation results
            const status = validation.passed ? '✅ Passed' : '❌ Failed';
            console.log(`\n${this.renderer.renderHighlight('Validation Status:')} ${status}`);
            // Show issue counts
            if (validation.criticalIssues > 0 || validation.highIssues > 0) {
                console.log('\n' + this.renderer.renderSection('Issues Found', [
                    `Critical: ${validation.criticalIssues}`,
                    `High: ${validation.highIssues}`,
                    `Medium: ${validation.mediumIssues}`,
                    `Low: ${validation.lowIssues}`
                ]));
                // Show blockers
                if (validation.blockers.length > 0) {
                    console.log('\n' + this.renderer.renderSection('🚨 Blockers', validation.blockers));
                }
            }
            // Show warnings
            if (validation.warnings.length > 0) {
                console.log('\n' + this.renderer.renderSection('⚠️ Warnings', validation.warnings));
            }
            // Show suggestions
            if (validation.suggestions.length > 0) {
                console.log('\n' + this.renderer.renderSection('💡 Suggestions', validation.suggestions));
            }
            if (validation.passed) {
                console.log('\n' + this.renderer.renderHighlight('🎉 Your hook setup is working correctly!'));
            }
            else {
                console.log('\n' + this.renderer.renderWarning('Hook setup needs attention. Follow the suggestions above.'));
            }
        }
        catch (error) {
            this.stopSpinner(false, 'Validation failed');
            throw error;
        }
    }
    async showHookStatus() {
        console.log('\n' + this.renderer.renderTitle('📊 Hook Status'));
        try {
            // Check if we're in a git repository
            try {
                await this.ensureGitRepository();
            }
            catch (error) {
                console.log(this.renderer.renderWarning('Not in a git repository'));
                console.log('\nTo use mastro hooks:');
                console.log('  1. Navigate to a git repository');
                console.log('  2. Run `mastro hooks install`');
                return;
            }
            const validation = await this.hookGenerator.validateHookSetup();
            // Display current status
            const statusColor = validation.passed ? 'success' : 'warn';
            const statusIcon = validation.passed ? '✅' : '⚠️';
            console.log(`${statusIcon} Hook Status: ${validation.passed ? 'Active' : 'Needs Attention'}`);
            // Show detailed information
            console.log('\n' + this.renderer.renderSection('Current Configuration', [
                `Installed hooks: ${3 - validation.criticalIssues}/3`, // Simplified
                `Last validation: ${new Date().toLocaleString()}`,
                `Validation time: ${validation.executionTime}ms`
            ]));
            if (validation.warnings.length > 0) {
                console.log('\n' + this.renderer.renderSection('⚠️ Warnings', validation.warnings));
            }
            if (validation.suggestions.length > 0) {
                console.log('\n' + this.renderer.renderSection('💡 Recommendations', validation.suggestions));
            }
            // Show usage examples
            console.log('\n' + this.renderer.renderSection('Available Commands', [
                '`mastro hooks install` - Install or reinstall hooks',
                '`mastro hooks validate` - Run detailed validation',
                '`mastro hooks configure` - Update configuration',
                '`mastro hooks uninstall` - Remove all hooks'
            ]));
        }
        catch (error) {
            console.log(this.renderer.renderWarning('Unable to check hook status'));
            console.log('Run `mastro hooks validate` for detailed diagnostics');
        }
    }
    async configureHooks(flags) {
        console.log('\n' + this.renderer.renderTitle('⚙️ Configure Hooks'));
        if (flags.interactive) {
            const config = await this.interactiveConfiguration();
            await this.hookGenerator.installHookSuite(config);
            console.log('\n' + this.renderer.renderHighlight('✅ Hook configuration updated!'));
        }
        else {
            console.log('Use --interactive flag for guided configuration');
            console.log('\nOr specify configuration directly:');
            console.log('  mastro hooks install --strictness=strict --persona=security');
        }
    }
    async interactiveConfiguration() {
        console.log('\n' + this.renderer.renderTitle('🛠️ Interactive Hook Configuration'));
        // Get strictness level
        const strictnessOptions = ['lenient', 'moderate', 'strict'];
        const strictness = await this.interactiveUI.selectIndex('Select hook strictness level:', [
            '📚 Lenient - Basic validation, few blocks',
            '⚖️ Moderate - Balanced validation (recommended)',
            '🛡️ Strict - Comprehensive validation, strict rules'
        ]);
        // Get persona
        const personaOptions = ['maintainability', 'security', 'performance', 'testing'];
        const personaIndex = await this.interactiveUI.selectIndex('Select review focus:', [
            '🔧 Maintainability - Focus on clean, maintainable code',
            '🛡️ Security - Emphasize security best practices',
            '⚡ Performance - Optimize for speed and efficiency',
            '🧪 Testing - Ensure proper test coverage'
        ]);
        // Get thresholds
        const criticalThreshold = 0; // Always block critical issues
        const highThreshold = strictness === 0 ? 5 : strictness === 1 ? 3 : 1;
        return {
            type: 'pre-commit',
            enabled: true,
            strictness: strictnessOptions[strictness],
            criticalThreshold,
            highThreshold,
            persona: {
                name: personaOptions[personaIndex],
                focus: [personaOptions[personaIndex]],
                strictness: strictnessOptions[strictness],
                customRules: []
            },
            customRules: [],
            skipPatterns: ['*.md', '*.txt', 'docs/**'],
            timeoutSeconds: 15
        };
    }
    buildHookConfig(flags) {
        return {
            type: 'pre-commit',
            enabled: true,
            strictness: flags.strictness,
            criticalThreshold: flags['critical-threshold'],
            highThreshold: flags['high-threshold'],
            persona: {
                name: flags.persona,
                focus: [flags.persona],
                strictness: flags.strictness,
                customRules: []
            },
            customRules: [],
            skipPatterns: ['*.md', '*.txt', 'docs/**'],
            timeoutSeconds: flags.timeout
        };
    }
}
//# sourceMappingURL=hooks.js.map