import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base/command.js';
import { UIRenderer } from '../ui/renderer.js';
export default class Explain extends BaseCommand {
    static args = {
        revision: Args.string({
            description: 'git revision to explain (e.g. HEAD, HEAD~3..HEAD, branch-name)',
            default: 'HEAD'
        })
    };
    static description = 'Explain code changes and their impact';
    static examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> HEAD~3..HEAD',
        '<%= config.bin %> <%= command.id %> feature-branch',
        '<%= config.bin %> <%= command.id %> --impact',
        '<%= config.bin %> <%= command.id %> --audience=junior',
        '<%= config.bin %> <%= command.id %> --format=markdown'
    ];
    static flags = {
        ...BaseCommand.baseFlags,
        impact: Flags.boolean({
            description: 'focus on business and technical impact',
            default: false
        }),
        audience: Flags.string({
            char: 'a',
            description: 'target audience level',
            options: ['junior', 'senior', 'business', 'technical'],
            default: 'senior'
        }),
        format: Flags.string({
            char: 'f',
            description: 'output format',
            options: ['terminal', 'markdown', 'json'],
            default: 'terminal'
        }),
        'max-commits': Flags.integer({
            description: 'maximum number of commits to analyze for ranges',
            default: 10
        })
    };
    renderer;
    async run() {
        const { args, flags } = await this.parse(Explain);
        try {
            // Initialize UI components
            this.renderer = new UIRenderer(this.mastroConfig);
            // Ensure we're in a git repository
            await this.ensureGitRepository();
            this.startSpinner('Analyzing changes...');
            // Parse the revision argument to determine what to analyze
            const revisionType = this.parseRevision(args.revision);
            let context;
            switch (revisionType.type) {
                case 'single':
                    context = await this.analyzeSingleCommit(revisionType.commit);
                    break;
                case 'range':
                    context = await this.analyzeCommitRange(revisionType.from, revisionType.to, flags['max-commits']);
                    break;
                case 'branch':
                    context = await this.analyzeBranch(revisionType.branch);
                    break;
                default:
                    throw new Error(`Unsupported revision format: ${args.revision}`);
            }
            this.updateSpinner(`Analyzing ${context.changes.length} file(s) with ${context.metadata.totalInsertions} insertions and ${context.metadata.totalDeletions} deletions...`);
            // Check cache first
            let explanation = null;
            if (!flags['no-cache']) {
                explanation = await this.cacheManager.getCachedExplanation(context);
                if (explanation) {
                    this.updateSpinner('Found cached explanation');
                }
            }
            // Generate explanation if not cached
            if (!explanation) {
                this.updateSpinner('Generating explanation with AI...');
                try {
                    explanation = await this.aiClient.explainChanges(context);
                    // Enhance explanation based on flags
                    explanation = await this.enhanceExplanation(explanation, flags);
                    // Cache the result
                    if (!flags['no-cache']) {
                        await this.cacheManager.setCachedExplanation(context, explanation);
                    }
                }
                catch (error) {
                    this.stopSpinner(false, 'Failed to generate explanation');
                    if (error instanceof Error && error.message.includes('API key')) {
                        this.log('API key not configured. Set OPENAI_API_KEY environment variable or configure it in mastro.config.json', 'error');
                        this.log('You can create a config file with: mastro config init', 'info');
                    }
                    else {
                        await this.handleError(error, 'generate explanation');
                    }
                    return;
                }
            }
            this.stopSpinner(true, 'Explanation generated successfully');
            // Output in requested format
            const output = await this.formatOutput(explanation, flags.format, context);
            console.log('\n' + output);
        }
        catch (error) {
            await this.handleError(error, 'explain changes');
        }
    }
    parseRevision(revision) {
        // Check for range format (e.g., HEAD~3..HEAD, main..feature-branch)
        if (revision.includes('..')) {
            const [from, to] = revision.split('..');
            return { type: 'range', from: from || 'HEAD~10', to: to || 'HEAD' };
        }
        // Check if it looks like a commit hash, HEAD reference, or branch
        if (revision.match(/^[a-f0-9]{7,40}$/) || revision.startsWith('HEAD')) {
            return { type: 'single', commit: revision };
        }
        // Assume it's a branch name
        return { type: 'branch', branch: revision };
    }
    async analyzeSingleCommit(commit) {
        // For single commits, we want to show the diff of that specific commit
        let changes;
        try {
            changes = await this.gitAnalyzer.getBranchChanges(commit, `${commit}~1`);
        }
        catch (error) {
            // If we can't get the parent commit (e.g., first commit), try staged changes
            this.log('Unable to analyze single commit (possibly first commit). Analyzing staged changes instead.', 'warn');
            changes = await this.gitAnalyzer.getStagedChanges();
            if (changes.length === 0) {
                // If no staged changes, try working directory changes
                changes = await this.gitAnalyzer.getWorkingChanges();
            }
            if (changes.length === 0) {
                throw new Error('No changes found to explain. Try staging some changes or specifying a different revision.');
            }
        }
        const branch = await this.gitAnalyzer.getCurrentBranch();
        const repository = await this.buildRepoContext();
        const repoRoot = await this.gitAnalyzer.getRepoRoot();
        const totalInsertions = changes.reduce((sum, change) => sum + change.insertions, 0);
        const totalDeletions = changes.reduce((sum, change) => sum + change.deletions, 0);
        const fileCount = changes.length;
        let changeComplexity = 'low';
        if (fileCount > 10 || totalInsertions + totalDeletions > 500) {
            changeComplexity = 'high';
        }
        else if (fileCount > 3 || totalInsertions + totalDeletions > 100) {
            changeComplexity = 'medium';
        }
        return {
            changes,
            branch,
            repository,
            staged: false,
            workingDir: repoRoot,
            metadata: {
                totalInsertions,
                totalDeletions,
                fileCount,
                changeComplexity
            }
        };
    }
    async analyzeCommitRange(from, to, maxCommits) {
        // For ranges, we analyze the cumulative diff
        const changes = await this.gitAnalyzer.getBranchChanges(to, from);
        const branch = await this.gitAnalyzer.getCurrentBranch();
        const repository = await this.buildRepoContext();
        const repoRoot = await this.gitAnalyzer.getRepoRoot();
        // Limit the number of commits if it's too many
        if (changes.length > maxCommits * 5) { // Rough heuristic
            this.log(`Large change set detected. Consider using a smaller range for better analysis.`, 'warn');
        }
        const totalInsertions = changes.reduce((sum, change) => sum + change.insertions, 0);
        const totalDeletions = changes.reduce((sum, change) => sum + change.deletions, 0);
        const fileCount = changes.length;
        let changeComplexity = 'low';
        if (fileCount > 20 || totalInsertions + totalDeletions > 1000) {
            changeComplexity = 'high';
        }
        else if (fileCount > 5 || totalInsertions + totalDeletions > 200) {
            changeComplexity = 'medium';
        }
        return {
            changes,
            branch,
            repository,
            staged: false,
            workingDir: repoRoot,
            metadata: {
                totalInsertions,
                totalDeletions,
                fileCount,
                changeComplexity
            }
        };
    }
    async analyzeBranch(branchName) {
        // For branches, compare against the default branch
        const repository = await this.buildRepoContext();
        const defaultBranch = this.mastroConfig.git.defaultBranch;
        const changes = await this.gitAnalyzer.getBranchChanges(branchName, defaultBranch);
        const repoRoot = await this.gitAnalyzer.getRepoRoot();
        const totalInsertions = changes.reduce((sum, change) => sum + change.insertions, 0);
        const totalDeletions = changes.reduce((sum, change) => sum + change.deletions, 0);
        const fileCount = changes.length;
        let changeComplexity = 'low';
        if (fileCount > 15 || totalInsertions + totalDeletions > 800) {
            changeComplexity = 'high';
        }
        else if (fileCount > 4 || totalInsertions + totalDeletions > 150) {
            changeComplexity = 'medium';
        }
        return {
            changes,
            branch: branchName,
            repository,
            staged: false,
            workingDir: repoRoot,
            metadata: {
                totalInsertions,
                totalDeletions,
                fileCount,
                changeComplexity
            }
        };
    }
    async buildRepoContext() {
        // Use the same logic as GitAnalyzer.buildRepoContext, but make it accessible
        const repoRoot = await this.gitAnalyzer.getRepoRoot();
        const repoName = repoRoot.split('/').pop() || 'unknown';
        // Get basic repo info - simplified version for explain command
        return {
            name: repoName,
            root: repoRoot,
            language: 'typescript', // We can enhance this later
            framework: 'nodejs',
            patterns: {
                commitStyle: 'conventional',
                prefixes: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
                maxLength: 72,
                commonPhrases: ['update', 'add', 'remove', 'fix', 'improve'],
                reviewPersona: {
                    name: 'Senior Engineer',
                    focus: ['maintainability', 'performance'],
                    strictness: 'moderate',
                    customRules: []
                }
            },
            recentCommits: await this.gitAnalyzer.getRecentCommits(10)
        };
    }
    async enhanceExplanation(explanation, flags) {
        const enhanced = { ...explanation };
        // Adjust explanation based on audience
        if (flags.audience === 'business') {
            enhanced.businessContext = enhanced.businessContext || 'Business impact analysis';
            // Simplify technical details for business audience
            enhanced.technicalDetails = enhanced.technicalDetails.slice(0, 3);
        }
        else if (flags.audience === 'junior') {
            // Add more explanatory context for junior developers
            enhanced.technicalDetails = [
                'Code explanation for learning:',
                ...enhanced.technicalDetails,
                'This change helps improve the codebase by making it more maintainable.'
            ];
        }
        else if (flags.audience === 'technical') {
            // Add more technical depth
            enhanced.technicalDetails = [
                ...enhanced.technicalDetails,
                'Technical implementation details and architectural considerations included above.'
            ];
        }
        // Focus on impact if requested
        if (flags.impact) {
            enhanced.businessContext = enhanced.businessContext || 'Impact analysis not available';
            if (enhanced.migrationNotes && enhanced.migrationNotes.length === 0) {
                enhanced.migrationNotes = ['No migration steps required for this change'];
            }
        }
        return enhanced;
    }
    async formatOutput(explanation, format, context) {
        switch (format) {
            case 'markdown':
                return this.formatMarkdown(explanation, context);
            case 'json':
                return JSON.stringify({ explanation, context: this.sanitizeContext(context) }, null, 2);
            case 'terminal':
            default:
                return this.renderer.renderDiffExplanation(explanation);
        }
    }
    formatMarkdown(explanation, context) {
        const output = [];
        output.push('# Code Change Explanation\n');
        // Metadata
        output.push('## Change Summary');
        output.push(`- **Files changed**: ${context.metadata.fileCount}`);
        output.push(`- **Lines added**: ${context.metadata.totalInsertions}`);
        output.push(`- **Lines removed**: ${context.metadata.totalDeletions}`);
        output.push(`- **Complexity**: ${context.metadata.changeComplexity}\n`);
        // Summary
        output.push('## Summary');
        output.push(explanation.summary + '\n');
        // Impact
        output.push('## Impact Analysis');
        output.push(`- **Risk Level**: ${explanation.impact.risk}`);
        output.push(`- **Scope**: ${explanation.impact.scope}`);
        if (explanation.impact.affectedComponents.length > 0) {
            output.push(`- **Affected Components**: ${explanation.impact.affectedComponents.join(', ')}`);
        }
        output.push('');
        // Technical details
        if (explanation.technicalDetails.length > 0) {
            output.push('## Technical Details');
            explanation.technicalDetails.forEach(detail => {
                output.push(`- ${detail}`);
            });
            output.push('');
        }
        // Business context
        if (explanation.businessContext) {
            output.push('## Business Context');
            output.push(explanation.businessContext + '\n');
        }
        // Issues and recommendations
        if (explanation.impact.potentialIssues.length > 0) {
            output.push('## Potential Issues');
            explanation.impact.potentialIssues.forEach(issue => {
                output.push(`- ⚠️ ${issue}`);
            });
            output.push('');
        }
        if (explanation.impact.testingRecommendations.length > 0) {
            output.push('## Testing Recommendations');
            explanation.impact.testingRecommendations.forEach(rec => {
                output.push(`- ✅ ${rec}`);
            });
            output.push('');
        }
        // Migration notes
        if (explanation.migrationNotes && explanation.migrationNotes.length > 0) {
            output.push('## Migration Notes');
            explanation.migrationNotes.forEach(note => {
                output.push(`- 📋 ${note}`);
            });
        }
        return output.join('\n');
    }
    sanitizeContext(context) {
        return {
            branch: context.branch,
            repository: {
                name: context.repository.name,
                language: context.repository.language,
                framework: context.repository.framework
            },
            metadata: context.metadata,
            filesSummary: context.changes.map(c => ({
                file: c.file,
                type: c.type,
                insertions: c.insertions,
                deletions: c.deletions
            }))
        };
    }
}
//# sourceMappingURL=explain.js.map