import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base/command.js';
import { SessionTracker } from '../../core/session-tracker.js';
import { ReviewEngine } from '../../core/review-engine.js';
import { WorkflowAnalyzer } from '../../core/workflow-analyzer.js';
import { StreamingRenderer } from '../../ui/streaming-renderer.js';
import { ReviewFormatter } from '../../ui/review-formatter.js';
export default class PRCreate extends BaseCommand {
    static description = 'Create intelligent pull requests with AI-generated descriptions and templates. Prerequisites: GitHub CLI (`brew install gh && gh auth login`) or GitLab CLI (`glab auth login`). Must be on a feature branch, not main/master.';
    static examples = [
        '<%= config.bin %> pr create',
        '<%= config.bin %> pr create --template=feature',
        '<%= config.bin %> pr create --title="Add user authentication"',
        '<%= config.bin %> pr create --draft',
        '<%= config.bin %> pr create --migration-check',
        '<%= config.bin %> pr create --format=markdown'
    ];
    static flags = {
        ...BaseCommand.baseFlags,
        template: Flags.string({
            char: 't',
            description: 'PR template type',
            options: ['feature', 'bugfix', 'hotfix', 'refactor', 'docs', 'auto'],
            default: 'auto'
        }),
        title: Flags.string({
            description: 'custom PR title (overrides auto-generated)'
        }),
        draft: Flags.boolean({
            char: 'd',
            description: 'create as draft PR',
            default: false
        }),
        'migration-check': Flags.boolean({
            description: 'perform migration detection analysis',
            default: true
        }),
        'base-branch': Flags.string({
            char: 'b',
            description: 'base branch for PR',
            default: 'main'
        }),
        'head-branch': Flags.string({
            char: 'h',
            description: 'head branch for PR (defaults to current branch)'
        }),
        format: Flags.string({
            char: 'f',
            description: 'output format',
            options: ['terminal', 'json', 'markdown'],
            default: 'terminal'
        }),
        'skip-review': Flags.boolean({
            description: 'skip pre-PR code review',
            default: false
        }),
        push: Flags.boolean({
            char: 'p',
            description: 'legacy flag - push is now always performed before PR creation',
            default: true,
            hidden: true
        })
    };
    sessionTracker;
    reviewEngine;
    workflowAnalyzer;
    streamingRenderer;
    reviewFormatter;
    async run() {
        const { flags } = await this.parse(PRCreate);
        try {
            // Initialize components
            this.sessionTracker = new SessionTracker(this.mastroConfig);
            this.reviewEngine = new ReviewEngine(this.mastroConfig);
            this.workflowAnalyzer = new WorkflowAnalyzer(this.mastroConfig);
            this.streamingRenderer = new StreamingRenderer(this.mastroConfig);
            this.reviewFormatter = new ReviewFormatter(this.mastroConfig);
            // Ensure we're in a git repository
            await this.ensureGitRepository();
            // Get current session
            const session = await this.sessionTracker.getCurrentSession();
            // Validate branch state
            await this.validateBranchState(flags);
            // Check for changes
            if (!await this.sessionTracker.hasSessionChanges()) {
                this.log('⚠️  No changes detected in current session');
                this.log('Make some changes or switch to a branch with changes to create a PR');
                return;
            }
            // Auto-commit any staged changes before creating PR
            await this.handleStagedChanges(session);
            // Always push branch before creating PR (required for production PR creation)
            await this.pushBranch(flags['head-branch']);
            // Pre-PR review (unless skipped)
            if (!flags['skip-review']) {
                await this.performPrePRReview(session);
            }
            // Migration detection
            let migrationInfo;
            if (flags['migration-check']) {
                migrationInfo = await this.detectMigrations(session);
            }
            // Generate smart PR context
            const prContext = await this.generatePRContext(session, flags, migrationInfo);
            // Generate PR description
            const prDescription = await this.generatePRDescription(prContext, flags);
            // Output results
            await this.outputPRResults(prDescription, prContext, flags);
            // Create actual PR if not dry-run
            if (!flags['dry-run']) {
                await this.createActualPR(prDescription, prContext, flags);
            }
        }
        catch (error) {
            this.error(`PR creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { exit: 1 });
        }
        finally {
            this.streamingRenderer?.cleanup();
        }
    }
    async validateBranchState(flags) {
        const currentBranch = await this.gitAnalyzer.getCurrentBranch();
        const baseBranch = flags['base-branch'] || 'main';
        if (currentBranch === baseBranch) {
            this.error(`Cannot create PR from base branch (${baseBranch}). Please switch to a feature branch.`);
        }
        // Set head branch if not specified
        if (!flags['head-branch']) {
            flags['head-branch'] = currentBranch;
        }
        this.log(`Creating PR: ${flags['head-branch']} → ${baseBranch}`);
    }
    async pushBranch(branch) {
        this.startSpinner(`Pushing branch ${branch}...`);
        try {
            // Check if remote exists and get remote info
            const git = this.gitAnalyzer.git;
            const remotes = await git.getRemotes(true);
            if (remotes.length === 0) {
                this.stopSpinner(false, 'No git remotes configured');
                throw new Error('No git remotes found. Please add a remote repository first.');
            }
            const origin = remotes.find((remote) => remote.name === 'origin') || remotes[0];
            this.updateSpinner(`Pushing to ${origin.name}/${branch}...`);
            // Push the branch to remote
            await git.push(origin.name, branch, ['--set-upstream']);
            this.stopSpinner(true, `Branch ${branch} pushed successfully`);
        }
        catch (error) {
            this.stopSpinner(false, 'Failed to push branch');
            if (error instanceof Error) {
                if (error.message.includes('authentication')) {
                    this.log('Authentication failed. Please check your git credentials.', 'error');
                }
                else if (error.message.includes('rejected')) {
                    this.log('Push rejected. Try pulling latest changes first.', 'error');
                }
                else {
                    this.log(`Push failed: ${error.message}`, 'error');
                }
            }
            throw error;
        }
    }
    async performPrePRReview(session) {
        this.log('\n🔍 Pre-PR Review');
        this.log('─'.repeat(30));
        const persona = {
            name: 'PR Reviewer',
            focus: ['maintainability', 'security', 'performance'],
            strictness: 'moderate',
            customRules: ['Check for breaking changes', 'Ensure documentation updates']
        };
        const review = await this.reviewEngine.reviewSession(session, persona);
        // Show critical issues only
        const criticalItems = review.actionableItems.filter(item => item.priority === 'critical' || item.priority === 'high');
        if (criticalItems.length > 0) {
            this.log('\n⚠️  Critical issues found:');
            this.log(this.reviewFormatter.formatActionableItems(criticalItems, 'terminal'));
            const proceed = await this.confirm('Continue with PR creation despite issues?');
            if (!proceed) {
                this.log('PR creation cancelled. Please address the issues and try again.');
                this.exit(0);
            }
        }
        else {
            this.log('✅ Pre-PR review passed - no critical issues found');
        }
    }
    async detectMigrations(session) {
        this.startSpinner('Detecting potential migrations...');
        try {
            const allChanges = [...session.workingChanges, ...session.stagedChanges];
            // Check for migration indicators
            const hasDatabaseChanges = allChanges.some(c => c.file.includes('migration') ||
                c.file.includes('schema') ||
                c.file.includes('database') ||
                c.hunks.some(h => h.lines.some(l => l.content.includes('CREATE TABLE') ||
                    l.content.includes('ALTER TABLE') ||
                    l.content.includes('DROP TABLE'))));
            const hasAPIChanges = allChanges.some(c => c.hunks.some(h => h.lines.some(l => (l.type === 'removed' && (l.content.includes('export') || l.content.includes('endpoint'))) ||
                l.content.includes('@api') ||
                l.content.includes('router.'))));
            const hasBreakingChanges = allChanges.some(c => c.hunks.some(h => h.lines.some(l => l.type === 'removed' &&
                (l.content.includes('function') || l.content.includes('class') || l.content.includes('interface')))));
            let detected = false;
            let type = undefined;
            let description = 'No migrations detected';
            let migrationSteps = [];
            if (hasDatabaseChanges) {
                detected = true;
                type = 'database';
                description = 'Database schema changes detected';
                migrationSteps = [
                    'Backup database before deployment',
                    'Run migrations in maintenance window',
                    'Verify data integrity after migration',
                    'Update application configuration if needed'
                ];
            }
            else if (hasAPIChanges) {
                detected = true;
                type = 'api';
                description = 'API changes detected - may require client updates';
                migrationSteps = [
                    'Update API documentation',
                    'Notify API consumers of changes',
                    'Consider versioning strategy',
                    'Test client integrations'
                ];
            }
            else if (hasBreakingChanges) {
                detected = true;
                type = 'breaking';
                description = 'Breaking changes detected';
                migrationSteps = [
                    'Update major version number',
                    'Provide migration guide for users',
                    'Consider deprecation period',
                    'Test downstream dependencies'
                ];
            }
            this.stopSpinner(true, detected ? 'Migrations detected' : 'No migrations found');
            return {
                detected,
                type,
                description,
                impact: {
                    risk: detected ? 'high' : 'low',
                    scope: detected ? 'system' : 'local',
                    affectedComponents: detected ? ['Database', 'API clients', 'Dependent services'] : [],
                    potentialIssues: detected ? ['Data loss', 'Service downtime', 'Client compatibility'] : [],
                    testingRecommendations: detected ? migrationSteps : []
                },
                migrationSteps: detected ? migrationSteps : undefined
            };
        }
        catch (error) {
            this.stopSpinner(false, 'Migration detection failed');
            throw error;
        }
    }
    async generatePRContext(session, flags, migrationInfo) {
        // Get all relevant changes and calculate comprehensive stats
        const allChanges = await this.getAllRelevantChanges(session);
        const effectiveStats = await this.calculateComprehensiveStats(session, allChanges);
        // Determine PR template based on actual changes analysis
        let templateType = flags.template;
        if (templateType === 'auto') {
            templateType = await this.workflowAnalyzer.detectPRType(session, allChanges);
        }
        const template = this.createPRTemplate(templateType, session);
        // Analyze review complexity using effective stats
        let reviewComplexity;
        if (effectiveStats.totalFiles > 20 || effectiveStats.changedLines > 1000) {
            reviewComplexity = 'extensive';
        }
        else if (effectiveStats.totalFiles > 10 || effectiveStats.changedLines > 500) {
            reviewComplexity = 'complex';
        }
        else if (effectiveStats.totalFiles > 5 || effectiveStats.changedLines > 100) {
            reviewComplexity = 'moderate';
        }
        else {
            reviewComplexity = 'simple';
        }
        return {
            changes: allChanges,
            branch: flags['head-branch'],
            repository: {
                name: 'current-project',
                root: process.cwd(),
                language: 'typescript', // Should be detected
                patterns: this.mastroConfig.team,
                recentCommits: []
            },
            staged: session.stagedChanges.length > 0,
            workingDir: process.cwd(),
            metadata: {
                totalInsertions: effectiveStats.totalInsertions,
                totalDeletions: effectiveStats.totalDeletions,
                fileCount: effectiveStats.totalFiles,
                changeComplexity: effectiveStats.complexity === 'critical' ? 'high' : effectiveStats.complexity
            },
            prTemplate: template,
            migrationInfo: migrationInfo || {
                detected: false,
                description: 'No migrations detected',
                impact: {
                    risk: 'low',
                    scope: 'local',
                    affectedComponents: [],
                    potentialIssues: [],
                    testingRecommendations: []
                }
            },
            relatedPRs: [], // Would be populated by GitHub API
            reviewComplexity
        };
    }
    createPRTemplate(type, session) {
        const baseTemplate = {
            name: `${type}-template`,
            type: type,
            title: `${type}: ${this.generateDefaultTitle(session)}`,
            description: 'AI-generated PR description will be populated here',
            sections: [],
            checklist: [],
            reviewers: [],
            labels: [type]
        };
        switch (type) {
            case 'feature':
                baseTemplate.sections = [
                    { title: 'Summary', content: '', required: true, placeholder: 'Brief description of the feature' },
                    { title: 'Changes Made', content: '', required: true },
                    { title: 'Testing', content: '', required: true },
                    { title: 'Documentation', content: '', required: false }
                ];
                baseTemplate.checklist = [
                    { id: '1', text: 'Tests added/updated', required: true, category: 'testing' },
                    { id: '2', text: 'Documentation updated', required: false, category: 'documentation' },
                    { id: '3', text: 'Breaking changes documented', required: false, category: 'development' }
                ];
                break;
            case 'bugfix':
                baseTemplate.sections = [
                    { title: 'Bug Description', content: '', required: true },
                    { title: 'Root Cause', content: '', required: true },
                    { title: 'Solution', content: '', required: true },
                    { title: 'Testing', content: '', required: true }
                ];
                baseTemplate.checklist = [
                    { id: '1', text: 'Bug reproduced locally', required: true, category: 'testing' },
                    { id: '2', text: 'Fix tested thoroughly', required: true, category: 'testing' },
                    { id: '3', text: 'Regression tests added', required: true, category: 'testing' }
                ];
                break;
            case 'hotfix':
                baseTemplate.sections = [
                    { title: 'Critical Issue', content: '', required: true },
                    { title: 'Immediate Fix', content: '', required: true },
                    { title: 'Impact Assessment', content: '', required: true }
                ];
                baseTemplate.checklist = [
                    { id: '1', text: 'Critical issue identified', required: true, category: 'review' },
                    { id: '2', text: 'Minimal scope verified', required: true, category: 'review' },
                    { id: '3', text: 'Rollback plan prepared', required: true, category: 'review' }
                ];
                break;
            case 'refactor':
                baseTemplate.sections = [
                    { title: 'Refactoring Goals', content: '', required: true },
                    { title: 'Changes Made', content: '', required: true },
                    { title: 'Benefits', content: '', required: true }
                ];
                baseTemplate.checklist = [
                    { id: '1', text: 'No functional changes', required: true, category: 'development' },
                    { id: '2', text: 'All tests still pass', required: true, category: 'testing' },
                    { id: '3', text: 'Performance impact assessed', required: false, category: 'review' }
                ];
                break;
        }
        return baseTemplate;
    }
    generateDefaultTitle(session) {
        // Simple heuristic based on changed files
        const allChanges = [...session.workingChanges, ...session.stagedChanges];
        const changedFiles = allChanges.map(c => c.file);
        if (changedFiles.some(f => f.includes('auth'))) {
            return 'authentication system updates';
        }
        else if (changedFiles.some(f => f.includes('api'))) {
            return 'API improvements';
        }
        else if (changedFiles.some(f => f.includes('ui') || f.includes('component'))) {
            return 'UI enhancements';
        }
        else if (changedFiles.some(f => f.includes('test'))) {
            return 'test improvements';
        }
        else {
            return `updates to ${changedFiles.length} files`;
        }
    }
    async generatePRDescription(context, flags) {
        this.startSpinner('Generating PR description...');
        try {
            // Use AI client to generate description based on context
            const description = await this.aiClient.createPRDescription(context);
            // Add custom title if provided
            if (flags.title) {
                description.title = flags.title;
            }
            this.stopSpinner(true, 'PR description generated');
            return description;
        }
        catch (error) {
            this.stopSpinner(false, 'Failed to generate PR description');
            throw error;
        }
    }
    async outputPRResults(prDescription, context, flags) {
        switch (flags.format) {
            case 'json':
                console.log(JSON.stringify({
                    title: prDescription.title,
                    description: prDescription.description,
                    checklist: prDescription.checklist,
                    migrationInfo: context.migrationInfo,
                    reviewComplexity: context.reviewComplexity
                }, null, 2));
                break;
            case 'markdown':
                this.outputMarkdownPR(prDescription, context);
                break;
            case 'terminal':
            default:
                this.outputTerminalPR(prDescription, context);
                break;
        }
    }
    outputTerminalPR(prDescription, context) {
        this.log('\n📝 Generated PR');
        this.log('─'.repeat(50));
        this.log(`Title: ${prDescription.title}`);
        this.log(`Complexity: ${context.reviewComplexity}`);
        this.log('');
        this.log('Description:');
        this.log(prDescription.description);
        if (prDescription.checklist && prDescription.checklist.length > 0) {
            this.log('\nChecklist:');
            for (const item of prDescription.checklist) {
                this.log(`☐ ${item}`);
            }
        }
        if (context.migrationInfo.detected) {
            this.log('\n⚠️  Migration Required');
            this.log(`Type: ${context.migrationInfo.type}`);
            this.log(`Description: ${context.migrationInfo.description}`);
        }
    }
    outputMarkdownPR(prDescription, context) {
        const output = [];
        output.push(`# ${prDescription.title}\n`);
        output.push(prDescription.description);
        output.push('');
        if (prDescription.checklist && prDescription.checklist.length > 0) {
            output.push('## Checklist\n');
            for (const item of prDescription.checklist) {
                output.push(`- [ ] ${item}`);
            }
            output.push('');
        }
        if (context.migrationInfo.detected) {
            output.push('## ⚠️ Migration Required\n');
            output.push(`**Type:** ${context.migrationInfo.type}`);
            output.push(`**Description:** ${context.migrationInfo.description}`);
            output.push('');
        }
        console.log(output.join('\n'));
    }
    async createActualPR(prDescription, context, flags) {
        this.log('\n🚀 Creating PR...');
        try {
            // Detect repository type and create PR accordingly
            const remoteInfo = await this.getRemoteRepositoryInfo();
            if (remoteInfo.provider === 'github') {
                // Check GitHub CLI availability first
                await this.checkGitHubCLI();
                await this.createGitHubPR(prDescription, context, flags, remoteInfo);
            }
            else if (remoteInfo.provider === 'gitlab') {
                // Check GitLab CLI availability first  
                await this.checkGitLabCLI();
                await this.createGitLabPR(prDescription, context, flags, remoteInfo);
            }
            else {
                throw new Error(`Unsupported repository provider: ${remoteInfo.provider}. Only GitHub and GitLab are currently supported.`);
            }
        }
        catch (error) {
            this.log('✗ Failed to create PR', 'error');
            if (error instanceof Error) {
                if (error.message.includes('GitHub CLI not found') || error.message.includes('GitLab CLI not found')) {
                    // CLI not available - show installation instructions and offer fallbacks
                    this.log(error.message, 'error');
                    await this.offerPRFallbackOptions(prDescription, context, flags);
                }
                else if (error.message.includes('authentication')) {
                    this.log('Authentication failed. Please run `gh auth login` or `glab auth login` first.', 'error');
                    await this.offerPRFallbackOptions(prDescription, context, flags);
                }
                else {
                    this.log(`PR creation failed: ${error.message}`, 'error');
                    await this.offerPRFallbackOptions(prDescription, context, flags);
                }
            }
            throw error;
        }
    }
    async checkGitHubCLI() {
        try {
            const { spawn } = await import('child_process');
            await new Promise((resolve, reject) => {
                const ghProcess = spawn('gh', ['--version'], { stdio: 'ignore' });
                ghProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    }
                    else {
                        reject(new Error('GitHub CLI check failed'));
                    }
                });
                ghProcess.on('error', (error) => {
                    reject(error);
                });
            });
        }
        catch (error) {
            throw new Error(`GitHub CLI not found. Please install it to create PRs:

🔧 Installation options:
  • macOS:    brew install gh
  • Windows:  winget install GitHub.CLI
  • Linux:    sudo apt install gh  (or see https://github.com/cli/cli/blob/trunk/docs/install_linux.md)

📝 After installing, authenticate with:
  gh auth login

💡 Alternative: Create PR manually at ${this.getCurrentBranchCompareURL()}`);
        }
    }
    async checkGitLabCLI() {
        try {
            const { spawn } = await import('child_process');
            await new Promise((resolve, reject) => {
                const glabProcess = spawn('glab', ['--version'], { stdio: 'ignore' });
                glabProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    }
                    else {
                        reject(new Error('GitLab CLI check failed'));
                    }
                });
                glabProcess.on('error', (error) => {
                    reject(error);
                });
            });
        }
        catch (error) {
            throw new Error(`GitLab CLI not found. Please install it to create MRs:

🔧 Installation: See https://glab.readthedocs.io/en/latest/intro.html

📝 After installing, authenticate with:
  glab auth login

💡 Alternative: Create MR manually at your GitLab repository`);
        }
    }
    getCurrentBranchCompareURL() {
        // This could be enhanced to generate actual GitHub compare URLs
        return 'https://github.com/your-repo/compare';
    }
    async offerPRFallbackOptions(prDescription, context, flags) {
        this.log('\n💡 PR Creation Alternatives:', 'info');
        this.log('─'.repeat(40));
        try {
            // Get repository info for URLs
            const remoteInfo = await this.getRemoteRepositoryInfo();
            if (remoteInfo.provider === 'github') {
                const compareURL = `https://github.com/${remoteInfo.owner}/${remoteInfo.repo}/compare/${flags['base-branch']}...${flags['head-branch']}`;
                this.log(`\n🌐 1. Create PR manually in browser:`);
                this.log(`   ${compareURL}`);
                this.log(`\n📋 2. Use this pre-written PR description:`);
                const prBody = this.formatPRBodyForGitHub(prDescription, context);
                this.log('   ─── Copy the text below ───');
                this.log(`   Title: ${prDescription.title}`);
                this.log(`\n${prBody}`);
                this.log('   ─── End of PR description ───');
            }
            else if (remoteInfo.provider === 'gitlab') {
                const compareURL = `https://gitlab.com/${remoteInfo.owner}/${remoteInfo.repo}/-/merge_requests/new?merge_request[source_branch]=${flags['head-branch']}&merge_request[target_branch]=${flags['base-branch']}`;
                this.log(`\n🌐 1. Create MR manually in browser:`);
                this.log(`   ${compareURL}`);
                this.log(`\n📋 2. Use this pre-written MR description:`);
                const mrBody = this.formatPRBodyForGitLab(prDescription, context);
                this.log('   ─── Copy the text below ───');
                this.log(`   Title: ${prDescription.title}`);
                this.log(`\n${mrBody}`);
                this.log('   ─── End of MR description ───');
            }
            // Save PR description to file for easy access
            const fs = await import('fs').then(fs => fs.promises);
            const path = await import('path');
            const prFile = path.join(process.cwd(), 'pr-description.md');
            const fileContent = `# ${prDescription.title}\n\n${remoteInfo.provider === 'github'
                ? this.formatPRBodyForGitHub(prDescription, context)
                : this.formatPRBodyForGitLab(prDescription, context)}`;
            await fs.writeFile(prFile, fileContent);
            this.log(`\n💾 3. PR description saved to file: ${prFile}`);
        }
        catch (error) {
            this.log(`\n📝 Create PR manually using the description shown above`, 'info');
        }
    }
    async getRemoteRepositoryInfo() {
        const git = this.gitAnalyzer.git;
        const remotes = await git.getRemotes(true);
        if (remotes.length === 0) {
            throw new Error('No git remotes configured');
        }
        const origin = remotes.find((remote) => remote.name === 'origin') || remotes[0];
        const url = origin.refs.push || origin.refs.fetch;
        // Parse GitHub URLs
        if (url.includes('github.com')) {
            const match = url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
            if (match) {
                return {
                    provider: 'github',
                    owner: match[1],
                    repo: match[2],
                    url: url
                };
            }
        }
        // Parse GitLab URLs
        if (url.includes('gitlab.com')) {
            const match = url.match(/gitlab\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
            if (match) {
                return {
                    provider: 'gitlab',
                    owner: match[1],
                    repo: match[2],
                    url: url
                };
            }
        }
        throw new Error(`Cannot determine repository provider from URL: ${url}`);
    }
    async createGitHubPR(prDescription, context, flags, remoteInfo) {
        this.startSpinner('Creating GitHub PR...');
        try {
            // Prepare PR body
            const prBody = this.formatPRBodyForGitHub(prDescription, context);
            // Execute the command using spawn to avoid shell interpretation issues
            const { spawn } = await import('child_process');
            const result = await new Promise((resolve, reject) => {
                const args = [
                    'pr', 'create',
                    '--title', prDescription.title,
                    '--body', prBody,
                    '--head', flags['head-branch'],
                    '--base', flags['base-branch']
                ];
                if (flags.draft) {
                    args.push('--draft');
                }
                const ghProcess = spawn('gh', args);
                let stdout = '';
                let stderr = '';
                ghProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
                ghProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                ghProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve({ stdout, stderr });
                    }
                    else {
                        reject(new Error(`GitHub CLI failed with exit code ${code}: ${stderr || stdout}`));
                    }
                });
                ghProcess.on('error', (error) => {
                    reject(new Error(`Failed to execute GitHub CLI: ${error.message}`));
                });
            });
            // Extract PR URL from output
            const prUrlMatch = result.stdout.match(/https:\/\/github\.com\/[^\s]+/);
            const prUrl = prUrlMatch ? prUrlMatch[0] : `https://github.com/${remoteInfo.owner}/${remoteInfo.repo}/pulls`;
            this.stopSpinner(true, 'GitHub PR created successfully!');
            this.log(`🔗 ${prUrl}`, 'info');
        }
        catch (error) {
            this.stopSpinner(false, 'Failed to create GitHub PR');
            throw error;
        }
    }
    async createGitLabPR(prDescription, context, flags, remoteInfo) {
        this.startSpinner('Creating GitLab MR...');
        try {
            // Prepare MR description
            const mrDescription = this.formatPRBodyForGitLab(prDescription, context);
            // Execute the command using spawn to avoid shell interpretation issues
            const { spawn } = await import('child_process');
            const result = await new Promise((resolve, reject) => {
                const args = [
                    'mr', 'create',
                    '--title', prDescription.title,
                    '--description', mrDescription,
                    '--source-branch', flags['head-branch'],
                    '--target-branch', flags['base-branch']
                ];
                if (flags.draft) {
                    args.push('--draft');
                }
                const glabProcess = spawn('glab', args);
                let stdout = '';
                let stderr = '';
                glabProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
                glabProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                glabProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve({ stdout, stderr });
                    }
                    else {
                        reject(new Error(`GitLab CLI failed with exit code ${code}: ${stderr || stdout}`));
                    }
                });
                glabProcess.on('error', (error) => {
                    reject(new Error(`Failed to execute GitLab CLI: ${error.message}`));
                });
            });
            // Extract MR URL from output
            const mrUrlMatch = result.stdout.match(/https:\/\/gitlab\.com\/[^\s]+/);
            const mrUrl = mrUrlMatch ? mrUrlMatch[0] : `https://gitlab.com/${remoteInfo.owner}/${remoteInfo.repo}/-/merge_requests`;
            this.stopSpinner(true, 'GitLab MR created successfully!');
            this.log(`🔗 ${mrUrl}`, 'info');
        }
        catch (error) {
            this.stopSpinner(false, 'Failed to create GitLab MR');
            throw error;
        }
    }
    formatPRBodyForGitHub(prDescription, context) {
        const parts = [];
        parts.push('## Description');
        parts.push(prDescription.description || 'No description provided.');
        parts.push('');
        if (prDescription.checklist && prDescription.checklist.length > 0) {
            parts.push('## Checklist');
            prDescription.checklist.forEach((item) => {
                parts.push(`- [ ] ${item}`);
            });
            parts.push('');
        }
        if (context.migrationInfo.detected) {
            parts.push('## ⚠️ Migration Required');
            parts.push(`**Type:** ${context.migrationInfo.type}`);
            parts.push(`**Description:** ${context.migrationInfo.description}`);
            parts.push('');
            if (context.migrationInfo.migrationSteps) {
                parts.push('### Migration Steps');
                context.migrationInfo.migrationSteps.forEach((step) => {
                    parts.push(`- ${step}`);
                });
                parts.push('');
            }
        }
        parts.push(`**Files changed:** ${context.metadata.fileCount}`);
        parts.push(`**Lines:** +${context.metadata.totalInsertions} -${context.metadata.totalDeletions}`);
        parts.push(`**Complexity:** ${context.reviewComplexity}`);
        return parts.join('\n');
    }
    formatPRBodyForGitLab(prDescription, context) {
        // GitLab uses the same markdown format as GitHub
        return this.formatPRBodyForGitHub(prDescription, context);
    }
    /**
     * Get all relevant changes from working directory, staging area, and unpushed commits
     */
    async getAllRelevantChanges(session) {
        const allChanges = [];
        // Add working directory changes
        allChanges.push(...session.workingChanges);
        // Add staged changes (if not already included)
        for (const stagedChange of session.stagedChanges) {
            const existingIndex = allChanges.findIndex(c => c.file === stagedChange.file);
            if (existingIndex >= 0) {
                // Merge stats for files that appear in both working and staged
                allChanges[existingIndex].insertions += stagedChange.insertions;
                allChanges[existingIndex].deletions += stagedChange.deletions;
                allChanges[existingIndex].hunks.push(...stagedChange.hunks);
            }
            else {
                allChanges.push(stagedChange);
            }
        }
        // If no working/staged changes, get changes from unpushed commits
        if (allChanges.length === 0 && await this.sessionTracker.hasUnpushedCommits()) {
            try {
                const unpushedChanges = await this.getChangesFromUnpushedCommits();
                allChanges.push(...unpushedChanges);
            }
            catch (error) {
                // If we can't get unpushed commit changes, continue with empty array
                console.warn('Could not retrieve unpushed commit changes:', error);
            }
        }
        return allChanges;
    }
    /**
     * Calculate comprehensive statistics from all sources of changes
     */
    async calculateComprehensiveStats(session, allChanges) {
        // If we have local changes, use them
        if (allChanges.length > 0) {
            const uniqueFiles = new Set(allChanges.map(c => c.file));
            const totalInsertions = allChanges.reduce((sum, c) => sum + c.insertions, 0);
            const totalDeletions = allChanges.reduce((sum, c) => sum + c.deletions, 0);
            const changedLines = totalInsertions + totalDeletions;
            return {
                totalFiles: uniqueFiles.size,
                totalInsertions,
                totalDeletions,
                changedLines,
                complexity: this.determineComplexity(uniqueFiles.size, changedLines, allChanges),
                duration: session.cumulativeStats.duration
            };
        }
        // Fall back to unpushed commits stats if no local changes
        return await this.calculateStatsFromUnpushedCommits();
    }
    async getChangesFromUnpushedCommits() {
        try {
            const git = this.gitAnalyzer.git;
            // Get the diff for all unpushed commits
            const diffOutput = await git.diff(['origin/HEAD...HEAD']);
            if (!diffOutput) {
                return [];
            }
            // Parse the diff output into GitChange objects
            return this.gitAnalyzer.parseDiffOutput(diffOutput);
        }
        catch (error) {
            throw new Error(`Failed to get changes from unpushed commits: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    determineComplexity(fileCount, lineCount, changes) {
        const criticalFiles = changes.filter(c => c.file.includes('package.json') ||
            c.file.includes('Dockerfile') ||
            c.file.includes('.env') ||
            c.file.includes('migrations/')).length;
        const hasBreakingChanges = changes.some(c => c.hunks.some((h) => h.lines.some((l) => l.type === 'removed' &&
            (l.content.includes('export') || l.content.includes('function') || l.content.includes('class')))));
        if (criticalFiles > 0 || hasBreakingChanges || lineCount > 1000 || fileCount > 20) {
            return 'critical';
        }
        else if (lineCount > 500 || fileCount > 10) {
            return 'high';
        }
        else if (lineCount > 100 || fileCount > 5) {
            return 'medium';
        }
        else {
            return 'low';
        }
    }
    async calculateStatsFromUnpushedCommits() {
        try {
            // Get commits ahead of remote
            const git = this.gitAnalyzer.git;
            const unpushedCommits = await git.log(['HEAD', '--not', '--remotes', '--oneline']);
            if (unpushedCommits.total === 0) {
                return {
                    totalFiles: 0,
                    totalInsertions: 0,
                    totalDeletions: 0,
                    changedLines: 0,
                    complexity: 'low',
                    duration: 0
                };
            }
            // Get diff stats for all unpushed commits combined
            const diffStats = await git.diffSummary(['origin/HEAD...HEAD']);
            // Calculate complexity based on changes
            const totalLines = diffStats.insertions + diffStats.deletions;
            const complexity = this.determineComplexity(diffStats.files.length, totalLines, []);
            return {
                totalFiles: diffStats.files.length,
                totalInsertions: diffStats.insertions,
                totalDeletions: diffStats.deletions,
                changedLines: totalLines,
                complexity,
                duration: 0
            };
        }
        catch (error) {
            // If we can't calculate stats, return safe defaults
            return {
                totalFiles: 1,
                totalInsertions: 1,
                totalDeletions: 0,
                changedLines: 1,
                complexity: 'low',
                duration: 0
            };
        }
    }
    async handleStagedChanges(session) {
        // Check if there are staged changes that need to be committed
        if (session.stagedChanges.length === 0) {
            return; // Nothing to commit
        }
        this.log('\n📝 Staged changes detected - committing before PR creation');
        try {
            // Import and use the commit command to handle the staged changes
            const Commit = (await import('../commit.js')).default;
            const commitCommand = new Commit(['--interactive'], this.config);
            await commitCommand.init();
            await commitCommand.run();
            this.success(`Staged changes committed successfully`);
        }
        catch (error) {
            throw new Error(`Failed to commit staged changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async confirm(message) {
        // Simple confirmation - in real implementation would use proper prompts
        this.log(`${message} (y/n)`);
        return true; // Default to yes for demo
    }
}
//# sourceMappingURL=create.js.map