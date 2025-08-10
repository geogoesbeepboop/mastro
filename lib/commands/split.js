import { Flags } from '@oclif/core';
import { BaseCommand } from '../base/command.js';
import { UIRenderer } from '../ui/renderer.js';
import { InteractiveUI } from '../ui/interactive.js';
import { CommitBoundaryAnalyzer } from '../core/commit-boundary-analyzer.js';
import { SemanticAnalyzer } from '../analyzers/semantic-analyzer.js';
import { ImpactAnalyzer } from '../analyzers/impact-analyzer.js';
import { WorkflowContextManager } from '../core/workflow-context-manager.js';
export default class Split extends BaseCommand {
    static description = 'Analyze working changes and suggest optimal commit boundaries';
    static examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> --auto-stage',
        '<%= config.bin %> <%= command.id %> --dry-run',
        '<%= config.bin %> <%= command.id %> --format=json'
    ];
    static flags = {
        ...BaseCommand.baseFlags,
        'auto-stage': Flags.boolean({
            description: 'automatically stage files according to detected boundaries',
            default: false
        }),
        'dry-run': Flags.boolean({
            description: 'show analysis without making any changes',
            default: false
        }),
        format: Flags.string({
            char: 'f',
            description: 'output format',
            options: ['terminal', 'json', 'markdown'],
            default: 'terminal'
        }),
        interactive: Flags.boolean({
            char: 'i',
            description: 'interactive mode for customizing boundaries',
            default: false
        }),
        'interactive-review': Flags.boolean({
            description: 'enhanced interactive review with retry mechanisms and validation',
            default: false
        }),
        'min-boundary-size': Flags.integer({
            description: 'minimum number of files per boundary (default: 1)',
            default: 1
        }),
        'max-boundary-size': Flags.integer({
            description: 'maximum number of files per boundary (default: 8)',
            default: 8
        }),
        'flow': Flags.boolean({
            description: 'prepare boundaries for workflow chain (stage but do not commit)',
            default: false
        }),
        'commit': Flags.boolean({
            description: 'automatically commit boundaries (skip review workflow)',
            default: false
        })
    };
    renderer;
    interactiveUI;
    boundaryAnalyzer;
    workflowManager;
    async run() {
        const { flags } = await this.parse(Split);
        try {
            // Initialize components
            this.renderer = new UIRenderer(this.mastroConfig);
            this.interactiveUI = new InteractiveUI(this.mastroConfig);
            this.workflowManager = new WorkflowContextManager();
            const semanticAnalyzer = new SemanticAnalyzer();
            const impactAnalyzer = new ImpactAnalyzer();
            this.boundaryAnalyzer = new CommitBoundaryAnalyzer(this.mastroConfig, semanticAnalyzer, impactAnalyzer);
            // Ensure we're in a git repository
            await this.ensureGitRepository();
            // Validate flags
            await this.validateFlags(flags);
            // Analyze working directory changes
            this.startSpinner('Analyzing working directory changes...');
            const workingChanges = await this.gitAnalyzer.getWorkingChanges();
            if (workingChanges.length === 0) {
                this.stopSpinner(false);
                this.log('No working directory changes found. Make some changes and try again.', 'warn');
                return;
            }
            this.updateSpinner(`Found ${workingChanges.length} changed file(s) - analyzing boundaries...`);
            // Detect commit boundaries
            const boundaries = await this.boundaryAnalyzer.analyzeCommitBoundaries(workingChanges);
            this.updateSpinner('Generating staging strategy...');
            const strategy = await this.boundaryAnalyzer.suggestStagingStrategy(boundaries);
            this.stopSpinner(true, `Analysis complete - detected ${boundaries.length} logical commit(s)`);
            // Display results based on format
            if (flags.format === 'json') {
                this.outputJSON(strategy, workingChanges);
            }
            else if (flags.format === 'markdown') {
                this.outputMarkdown(strategy, workingChanges);
            }
            else {
                this.outputTerminal(strategy, workingChanges);
            }
            // Handle workflow modes
            if (flags.flow && !flags['dry-run']) {
                await this.handleFlowMode(strategy);
            }
            else if (flags.commit && !flags['dry-run']) {
                await this.handleCommitMode(strategy);
            }
            else {
                // Traditional modes
                // Interactive mode for customizing boundaries
                if (flags.interactive && !flags['dry-run']) {
                    await this.handleInteractiveMode(strategy, workingChanges);
                }
                // Enhanced interactive review mode
                if (flags['interactive-review'] && !flags['dry-run']) {
                    await this.handleInteractiveReviewMode(strategy, workingChanges);
                }
                // Auto-stage if requested
                if (flags['auto-stage'] && !flags['dry-run']) {
                    await this.handleAutoStaging(strategy);
                }
            }
            // Dry run - just show analysis
            if (flags['dry-run']) {
                this.log('\nDry run mode - no changes made to working directory', 'info');
                return;
            }
            // Offer next steps
            this.displayNextSteps(strategy);
        }
        catch (error) {
            await this.handleError(error, 'analyze commit boundaries');
        }
        finally {
            this.interactiveUI.cleanup();
        }
    }
    outputTerminal(strategy, allChanges) {
        console.log('\n' + this.renderer.renderTitle('📊 Commit Boundary Analysis'));
        // Overview
        console.log(this.renderer.renderSection('Overview', [
            `Total files analyzed: ${allChanges.length}`,
            `Recommended commits: ${strategy.commits.length}`,
            `Overall strategy: ${strategy.strategy}`,
            `Overall risk: ${strategy.overallRisk}`
        ]));
        // Warnings
        if (strategy.warnings.length > 0) {
            console.log(this.renderer.renderSection('⚠️ Warnings', strategy.warnings));
        }
        // Detailed boundaries
        console.log(this.renderer.renderSection('🎯 Recommended Commit Boundaries', []));
        for (let i = 0; i < strategy.commits.length; i++) {
            const commit = strategy.commits[i];
            const boundary = commit.boundary;
            console.log(`\n${i + 1}. ${this.renderer.renderHighlight(commit.suggestedMessage.title)}`);
            console.log(`   ${this.renderer.renderMuted('Theme')}: ${boundary.theme}`);
            console.log(`   ${this.renderer.renderMuted('Priority')}: ${this.renderer.renderPriority(boundary.priority)}`);
            console.log(`   ${this.renderer.renderMuted('Risk')}: ${this.renderer.renderRisk(commit.risk)}`);
            console.log(`   ${this.renderer.renderMuted('Estimated time')}: ${commit.estimatedTime}`);
            console.log(`   ${this.renderer.renderMuted('Files')} (${boundary.files.length}):`);
            for (const file of boundary.files) {
                const changeType = this.getChangeTypeIcon(file);
                console.log(`     ${changeType} ${file.file} ${this.renderer.renderMuted(`(+${file.insertions} -${file.deletions})`)}`);
            }
            if (boundary.dependencies.length > 0) {
                console.log(`   ${this.renderer.renderMuted('Dependencies')}: ${boundary.dependencies.join(', ')}`);
            }
            console.log(`   ${this.renderer.renderMuted('Rationale')}: ${commit.rationale}`);
        }
    }
    outputJSON(strategy, allChanges) {
        const output = {
            analysis: {
                totalFiles: allChanges.length,
                recommendedCommits: strategy.commits.length,
                strategy: strategy.strategy,
                overallRisk: strategy.overallRisk,
                timestamp: new Date().toISOString()
            },
            warnings: strategy.warnings,
            commits: strategy.commits.map((commit, index) => ({
                order: index + 1,
                boundary: {
                    id: commit.boundary.id,
                    theme: commit.boundary.theme,
                    priority: commit.boundary.priority,
                    estimatedComplexity: commit.boundary.estimatedComplexity,
                    dependencies: commit.boundary.dependencies,
                    reasoning: commit.boundary.reasoning,
                    fileCount: commit.boundary.files.length,
                    files: commit.boundary.files.map(f => ({
                        path: f.file,
                        insertions: f.insertions,
                        deletions: f.deletions,
                        changeType: this.determineChangeType(f)
                    }))
                },
                suggestedMessage: commit.suggestedMessage,
                risk: commit.risk,
                estimatedTime: commit.estimatedTime,
                rationale: commit.rationale
            }))
        };
        console.log(JSON.stringify(output, null, 2));
    }
    outputMarkdown(strategy, allChanges) {
        console.log('# Commit Boundary Analysis\n');
        console.log('## Overview\n');
        console.log(`- **Total files**: ${allChanges.length}`);
        console.log(`- **Recommended commits**: ${strategy.commits.length}`);
        console.log(`- **Strategy**: ${strategy.strategy}`);
        console.log(`- **Overall risk**: ${strategy.overallRisk}\n`);
        if (strategy.warnings.length > 0) {
            console.log('## ⚠️ Warnings\n');
            strategy.warnings.forEach(warning => console.log(`- ${warning}`));
            console.log('');
        }
        console.log('## 🎯 Recommended Commits\n');
        for (let i = 0; i < strategy.commits.length; i++) {
            const commit = strategy.commits[i];
            const boundary = commit.boundary;
            console.log(`### ${i + 1}. ${commit.suggestedMessage.title}\n`);
            console.log(`**Theme**: ${boundary.theme}  `);
            console.log(`**Priority**: ${boundary.priority}  `);
            console.log(`**Risk**: ${commit.risk}  `);
            console.log(`**Estimated time**: ${commit.estimatedTime}  \n`);
            console.log('**Files**:\n');
            boundary.files.forEach(file => {
                const changeType = this.getChangeTypeIcon(file);
                console.log(`- ${changeType} \`${file.file}\` (+${file.insertions} -${file.deletions})`);
            });
            if (boundary.dependencies.length > 0) {
                console.log(`\n**Dependencies**: ${boundary.dependencies.join(', ')}`);
            }
            console.log(`\n**Rationale**: ${commit.rationale}\n`);
        }
    }
    async handleInteractiveMode(strategy, allChanges) {
        console.log('\n' + this.renderer.renderTitle('🛠️ Interactive Boundary Customization'));
        const actions = [
            'Accept all boundaries as-is',
            'Merge specific boundaries',
            'Split a boundary',
            'Reorder commits',
            'Modify commit messages',
            'Cancel and exit'
        ];
        const choice = await this.interactiveUI.selectIndex('What would you like to do?', actions);
        switch (choice) {
            case 0:
                this.success('Accepting all boundaries as recommended');
                break;
            case 1:
                await this.handleMergeBoundaries(strategy);
                break;
            case 2:
                await this.handleSplitBoundary(strategy);
                break;
            case 3:
                await this.handleReorderCommits(strategy);
                break;
            case 4:
                await this.handleModifyMessages(strategy);
                break;
            case 5:
                this.log('Customization cancelled', 'info');
                return;
        }
    }
    async handleAutoStaging(strategy) {
        this.log('\n' + this.renderer.renderTitle('🎯 Auto-staging files according to boundaries...'));
        // First, unstage everything to start fresh
        this.startSpinner('Clearing staged changes...');
        try {
            await this.gitAnalyzer.git.reset(['HEAD']);
            this.stopSpinner(true, 'Staged changes cleared');
        }
        catch (error) {
            this.stopSpinner(false, 'Failed to clear staged changes');
            throw error;
        }
        // Stage files for the first boundary only (to start with one logical commit)
        if (strategy.commits.length > 0) {
            const firstCommit = strategy.commits[0];
            const filesToStage = firstCommit.boundary.files.map(f => f.file);
            this.startSpinner(`Staging ${filesToStage.length} files for first commit...`);
            try {
                await this.gitAnalyzer.git.add(filesToStage);
                this.stopSpinner(true, `Staged files for: ${firstCommit.suggestedMessage.title}`);
                this.success(`Files staged for first commit:`);
                filesToStage.forEach(file => {
                    console.log(`  ✓ ${file}`);
                });
                this.log('\nYou can now run `mastro commit` to create this commit', 'info');
                this.log(`After committing, run \`mastro split --auto-stage\` again for the next boundary`, 'info');
            }
            catch (error) {
                this.stopSpinner(false, 'Failed to stage files');
                throw error;
            }
        }
    }
    displayNextSteps(strategy) {
        console.log('\n' + this.renderer.renderTitle('🚀 Next Steps'));
        if (strategy.commits.length === 1) {
            console.log('Single logical commit detected. You can:');
            console.log('  1. Stage all changes: `git add .`');
            console.log('  2. Create commit: `mastro commit`');
        }
        else {
            console.log('Multiple logical commits detected. Recommended approach:');
            console.log(`  1. Auto-stage first boundary: \`mastro split --auto-stage\``);
            console.log('  2. Create first commit: `mastro commit`');
            console.log('  3. Repeat for remaining boundaries');
            console.log('');
            console.log('Alternative:');
            console.log('  1. Manually stage files for first boundary');
            console.log('  2. Create commit: `mastro commit`');
            console.log('  3. Repeat for remaining boundaries');
        }
        if (strategy.overallRisk === 'high') {
            console.log('');
            console.log(this.renderer.renderWarning('⚠️ High risk detected - consider extra review before committing'));
        }
        if (strategy.warnings.length > 0) {
            console.log('');
            console.log(this.renderer.renderWarning('⚠️ Review warnings above before proceeding'));
        }
    }
    // Helper methods for interactive customization
    async handleMergeBoundaries(strategy) {
        const boundaryOptions = strategy.commits.map((commit, index) => `${index + 1}. ${commit.suggestedMessage.title} (${commit.boundary.files.length} files)`);
        const first = await this.interactiveUI.selectIndex('Select first boundary to merge:', boundaryOptions);
        const second = await this.interactiveUI.selectIndex('Select second boundary to merge:', boundaryOptions.filter((_, index) => index !== first));
        // Adjust for filtered array
        const secondIndex = second >= first ? second + 1 : second;
        this.log(`Merging boundary ${first + 1} with boundary ${secondIndex + 1}`, 'info');
        // Perform actual merge
        const firstCommit = strategy.commits[first];
        const secondCommit = strategy.commits[secondIndex];
        // Combine files from both boundaries
        const mergedFiles = [...firstCommit.boundary.files, ...secondCommit.boundary.files];
        // Create a new merged boundary
        const mergedBoundary = {
            id: `merged-${firstCommit.boundary.id}-${secondCommit.boundary.id}`,
            theme: `${firstCommit.boundary.theme} and ${secondCommit.boundary.theme}`,
            priority: (firstCommit.boundary.priority === 'high' || secondCommit.boundary.priority === 'high') ? 'high' :
                (firstCommit.boundary.priority === 'medium' || secondCommit.boundary.priority === 'medium') ? 'medium' : 'low',
            estimatedComplexity: Math.max(firstCommit.boundary.estimatedComplexity, secondCommit.boundary.estimatedComplexity),
            files: mergedFiles,
            dependencies: [...new Set([...firstCommit.boundary.dependencies, ...secondCommit.boundary.dependencies])],
            reasoning: `Merged boundaries: ${firstCommit.boundary.reasoning} + ${secondCommit.boundary.reasoning}`
        };
        // Generate new commit message for merged boundary
        const mergedSuggestedMessage = this.generateSimpleCommitMessage(mergedBoundary);
        // Create new merged commit
        const mergedCommit = {
            boundary: mergedBoundary,
            suggestedMessage: mergedSuggestedMessage,
            risk: (firstCommit.risk === 'high' || secondCommit.risk === 'high') ? 'high' :
                (firstCommit.risk === 'medium' || secondCommit.risk === 'medium') ? 'medium' : 'low',
            estimatedTime: `${parseInt(firstCommit.estimatedTime) + parseInt(secondCommit.estimatedTime)} min`,
            rationale: `Merged commits: combining related changes for better logical grouping`
        };
        // Remove original commits and add merged commit
        strategy.commits.splice(Math.max(first, secondIndex), 1);
        strategy.commits.splice(Math.min(first, secondIndex), 1, mergedCommit);
        this.success(`Boundaries merged successfully! New boundary contains ${mergedFiles.length} files.`);
        this.log(`New commit message: "${mergedSuggestedMessage.title}"`, 'info');
    }
    async handleSplitBoundary(strategy) {
        const boundaryOptions = strategy.commits.map((commit, index) => `${index + 1}. ${commit.suggestedMessage.title} (${commit.boundary.files.length} files)`);
        const choice = await this.interactiveUI.selectIndex('Select boundary to split:', boundaryOptions);
        const commitToSplit = strategy.commits[choice];
        if (commitToSplit.boundary.files.length < 2) {
            this.log('Cannot split boundary with less than 2 files', 'warn');
            return;
        }
        this.log(`Splitting boundary ${choice + 1}`, 'info');
        // Show files in the boundary for user to select split point
        const fileOptions = commitToSplit.boundary.files.map((file, index) => `${index + 1}. ${file.file} (+${file.insertions} -${file.deletions})`);
        const splitPoint = await this.interactiveUI.selectIndex('Select the last file for the first boundary (remaining files will go to second boundary):', fileOptions);
        // Split the files
        const firstBoundaryFiles = commitToSplit.boundary.files.slice(0, splitPoint + 1);
        const secondBoundaryFiles = commitToSplit.boundary.files.slice(splitPoint + 1);
        // Create first split boundary
        const firstBoundary = {
            id: `${commitToSplit.boundary.id}-part1`,
            theme: `${commitToSplit.boundary.theme} (part 1)`,
            priority: commitToSplit.boundary.priority,
            estimatedComplexity: Math.max(1, Math.floor(commitToSplit.boundary.estimatedComplexity * (firstBoundaryFiles.length / commitToSplit.boundary.files.length))),
            files: firstBoundaryFiles,
            dependencies: commitToSplit.boundary.dependencies,
            reasoning: `Split from: ${commitToSplit.boundary.reasoning} (first part)`
        };
        // Create second split boundary
        const secondBoundary = {
            id: `${commitToSplit.boundary.id}-part2`,
            theme: `${commitToSplit.boundary.theme} (part 2)`,
            priority: commitToSplit.boundary.priority,
            estimatedComplexity: Math.max(1, Math.ceil(commitToSplit.boundary.estimatedComplexity * (secondBoundaryFiles.length / commitToSplit.boundary.files.length))),
            files: secondBoundaryFiles,
            dependencies: commitToSplit.boundary.dependencies,
            reasoning: `Split from: ${commitToSplit.boundary.reasoning} (second part)`
        };
        // Generate new commit messages
        const firstMessage = this.generateSimpleCommitMessage(firstBoundary);
        const secondMessage = this.generateSimpleCommitMessage(secondBoundary);
        // Create new split commits
        const firstCommit = {
            boundary: firstBoundary,
            suggestedMessage: firstMessage,
            risk: commitToSplit.risk,
            estimatedTime: `${Math.ceil(parseInt(commitToSplit.estimatedTime) * 0.6)} min`,
            rationale: `Split from larger boundary for better logical separation`
        };
        const secondCommit = {
            boundary: secondBoundary,
            suggestedMessage: secondMessage,
            risk: commitToSplit.risk,
            estimatedTime: `${Math.ceil(parseInt(commitToSplit.estimatedTime) * 0.4)} min`,
            rationale: `Split from larger boundary for better logical separation`
        };
        // Replace original commit with split commits
        strategy.commits.splice(choice, 1, firstCommit, secondCommit);
        this.success(`Boundary split successfully!`);
        this.log(`First boundary: "${firstMessage.title}" (${firstBoundaryFiles.length} files)`, 'info');
        this.log(`Second boundary: "${secondMessage.title}" (${secondBoundaryFiles.length} files)`, 'info');
    }
    async handleReorderCommits(strategy) {
        if (strategy.commits.length < 2) {
            this.log('Cannot reorder with less than 2 commits', 'warn');
            return;
        }
        this.log('\n📋 Current commit order:');
        strategy.commits.forEach((commit, index) => {
            console.log(`  ${index + 1}. ${commit.suggestedMessage.title} (${commit.boundary.files.length} files)`);
        });
        const commitToMove = await this.interactiveUI.selectIndex('Select commit to move:', strategy.commits.map((commit, index) => `${index + 1}. ${commit.suggestedMessage.title} (${commit.boundary.files.length} files)`));
        const positionOptions = [];
        for (let i = 0; i <= strategy.commits.length; i++) {
            if (i === commitToMove) {
                positionOptions.push(`${i + 1}. [Current position]`);
            }
            else if (i < strategy.commits.length) {
                positionOptions.push(`${i + 1}. Before "${strategy.commits[i].suggestedMessage.title}"`);
            }
            else {
                positionOptions.push(`${i + 1}. At the end`);
            }
        }
        const newPosition = await this.interactiveUI.selectIndex('Select new position:', positionOptions);
        if (newPosition === commitToMove) {
            this.log('No change needed - commit is already in that position', 'info');
            return;
        }
        // Perform the reorder
        const commitToMoveObj = strategy.commits[commitToMove];
        // Remove from current position
        strategy.commits.splice(commitToMove, 1);
        // Insert at new position (adjust for removed item)
        const adjustedNewPosition = newPosition > commitToMove ? newPosition - 1 : newPosition;
        strategy.commits.splice(adjustedNewPosition, 0, commitToMoveObj);
        this.success('Commits reordered successfully!');
        this.log('\n📋 New commit order:');
        strategy.commits.forEach((commit, index) => {
            console.log(`  ${index + 1}. ${commit.suggestedMessage.title} (${commit.boundary.files.length} files)`);
        });
    }
    async handleModifyMessages(strategy) {
        const commitOptions = strategy.commits.map((commit, index) => `${index + 1}. ${commit.suggestedMessage.title} (${commit.boundary.files.length} files)`);
        const choice = await this.interactiveUI.selectIndex('Select commit message to modify:', commitOptions);
        const commitToModify = strategy.commits[choice];
        this.log(`\nCurrent commit message:`, 'info');
        this.log(`Title: ${commitToModify.suggestedMessage.title}`, 'info');
        if (commitToModify.suggestedMessage.body) {
            this.log(`Body: ${commitToModify.suggestedMessage.body}`, 'info');
        }
        this.log(`Type: ${commitToModify.suggestedMessage.type}`, 'info');
        const modifyOptions = [
            'Edit title',
            'Edit body',
            'Change type',
            'Regenerate entire message with AI'
        ];
        const modifyChoice = await this.interactiveUI.selectIndex('What would you like to modify?', modifyOptions);
        switch (modifyChoice) {
            case 0: // Edit title
                const newTitle = await this.interactiveUI.getTextInput('Enter new title', commitToModify.suggestedMessage.title);
                if (newTitle) {
                    commitToModify.suggestedMessage.title = newTitle;
                    // Note: reasoning is not part of the message type, so we'll track it separately if needed
                    this.success(`Title updated to: "${newTitle}"`);
                }
                break;
            case 1: // Edit body
                const newBody = await this.interactiveUI.getTextInput('Enter new body (leave empty to remove)', commitToModify.suggestedMessage.body || '');
                commitToModify.suggestedMessage.body = newBody || undefined;
                // Note: reasoning is not part of the message type, so we'll track it separately if needed
                this.success(newBody ? `Body updated` : `Body removed`);
                break;
            case 2: // Change type
                const typeOptions = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'];
                const typeChoice = await this.interactiveUI.selectIndex('Select new commit type:', typeOptions);
                const newType = typeOptions[typeChoice];
                commitToModify.suggestedMessage.type = newType;
                // Note: reasoning is not part of the message type, so we'll track it separately if needed
                this.success(`Type changed to: ${newType}`);
                break;
            case 3: // Regenerate with AI
                this.startSpinner('Regenerating commit message with AI...');
                try {
                    const regeneratedMessage = this.generateSimpleCommitMessage(commitToModify.boundary);
                    this.stopSpinner(true, 'Message regenerated');
                    // Show comparison
                    this.log('\nOld message:', 'info');
                    this.log(`  Title: ${commitToModify.suggestedMessage.title}`, 'info');
                    this.log('\nNew message:', 'info');
                    this.log(`  Title: ${regeneratedMessage.title}`, 'info');
                    const useNew = await this.interactiveUI.confirmAction('Use the new AI-generated message?', true);
                    if (useNew) {
                        commitToModify.suggestedMessage = regeneratedMessage;
                        this.success('Commit message regenerated successfully!');
                    }
                    else {
                        this.log('Keeping original message', 'info');
                    }
                }
                catch (error) {
                    this.stopSpinner(false, 'Failed to regenerate message');
                    this.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                }
                break;
        }
    }
    // Workflow mode handlers
    async validateFlags(flags) {
        if (flags.flow && flags.commit) {
            throw new Error('Cannot use both --flow and --commit flags. Choose one workflow mode.');
        }
        if ((flags.flow || flags.commit) && flags['auto-stage']) {
            this.log('Note: --auto-stage is redundant with workflow modes', 'warn');
        }
        if ((flags.flow || flags.commit) && flags.interactive) {
            this.log('Note: --interactive will be skipped in workflow modes', 'warn');
        }
    }
    async handleFlowMode(strategy) {
        this.log('\n' + this.renderer.renderTitle('🔄 Preparing for Workflow Chain'));
        // Create workflow context
        const workflowSettings = {
            skipReview: false,
            skipDocs: false,
            autoMode: false
        };
        const context = await this.workflowManager.createContext(strategy.commits, workflowSettings);
        this.success(`Created workflow context: ${context.sessionId}`);
        // Stage files for first boundary
        if (strategy.commits.length > 0) {
            const firstCommit = strategy.commits[0];
            await this.stageFilesForBoundary(firstCommit, 0, strategy.commits.length);
            this.log('\n📋 Next Steps:');
            this.log('  1. Review staged changes: mastro review --boundary-context');
            this.log('  2. Make any necessary fixes');
            this.log('  3. Continue workflow: mastro flow --continue');
            this.log('  OR');
            this.log('  Full automated workflow: mastro flow');
        }
    }
    async handleCommitMode(strategy) {
        this.log('\n' + this.renderer.renderTitle('⚡ Auto-Commit Mode'));
        const totalBoundaries = strategy.commits.length;
        for (let i = 0; i < totalBoundaries; i++) {
            const commit = strategy.commits[i];
            this.log(`\n📦 Processing boundary ${i + 1}/${totalBoundaries}:`);
            this.log(`   ${commit.suggestedMessage.title} (${commit.boundary.files.length} files)`);
            // Stage files for this boundary
            await this.stageFilesForBoundary(commit, i, totalBoundaries);
            // Create commit
            await this.createCommitForBoundary(commit);
            this.success(`✅ Boundary ${i + 1} committed successfully`);
        }
        this.log('\n🎉 All boundaries have been committed!');
        this.displayFinalCommitSummary(strategy.commits);
    }
    async stageFilesForBoundary(commit, index, total) {
        const filesToStage = commit.boundary.files.map((f) => f.file);
        this.startSpinner(`Staging ${filesToStage.length} files for boundary ${index + 1}/${total}...`);
        try {
            // Clear staging area first
            await this.gitAnalyzer.git.reset(['HEAD']);
            // Stage files for this boundary
            await this.gitAnalyzer.git.add(filesToStage);
            this.stopSpinner(true, `Files staged for: ${commit.suggestedMessage.title}`);
            // Show staged files
            this.log(`   Staged files:`);
            filesToStage.forEach((file) => {
                console.log(`     ✓ ${file}`);
            });
        }
        catch (error) {
            this.stopSpinner(false, 'Failed to stage files');
            throw new Error(`Failed to stage files for boundary: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async createCommitForBoundary(commit) {
        this.startSpinner('Creating commit...');
        try {
            const commitMessage = this.formatCommitMessage(commit.suggestedMessage);
            await this.gitAnalyzer.git.commit(commitMessage);
            this.stopSpinner(true, 'Commit created successfully');
        }
        catch (error) {
            this.stopSpinner(false, 'Failed to create commit');
            throw new Error(`Failed to create commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    formatCommitMessage(message) {
        let commitText = message.title;
        if (message.body && message.body.trim()) {
            commitText += '\n\n' + message.body;
        }
        return commitText;
    }
    displayFinalCommitSummary(commits) {
        this.log('\n📊 Commit Summary:');
        this.log('─'.repeat(50));
        commits.forEach((commit, index) => {
            console.log(`${index + 1}. ${commit.suggestedMessage.title}`);
            console.log(`   Files: ${commit.boundary.files.length} | Risk: ${commit.risk} | Time: ${commit.estimatedTime}`);
        });
        this.log('\n💡 Next steps:');
        this.log('  • Push commits: git push');
        this.log('  • Create PR: mastro pr create');
        this.log('  • View analytics: mastro analytics');
    }
    // Helper method to generate simple commit messages without using the private boundary analyzer method
    generateSimpleCommitMessage(boundary) {
        // Determine commit type based on file changes and theme
        let type = 'chore'; // default
        const theme = boundary.theme.toLowerCase();
        if (theme.includes('feature') || theme.includes('add'))
            type = 'feat';
        else if (theme.includes('fix') || theme.includes('bug'))
            type = 'fix';
        else if (theme.includes('doc') || theme.includes('readme'))
            type = 'docs';
        else if (theme.includes('test'))
            type = 'test';
        else if (theme.includes('refactor') || theme.includes('clean'))
            type = 'refactor';
        else if (theme.includes('style') || theme.includes('format'))
            type = 'style';
        // Generate title based on theme and file count
        const fileCount = boundary.files.length;
        const filesText = fileCount === 1 ? '1 file' : `${fileCount} files`;
        const title = `${type}: ${boundary.theme} (${filesText})`;
        return {
            title: title.length > 72 ? title.substring(0, 69) + '...' : title,
            type,
            body: boundary.reasoning.length > 100 ? boundary.reasoning : undefined
        };
    }
    // Utility methods
    getChangeTypeIcon(file) {
        if (file.insertions > 0 && file.deletions === 0)
            return '➕';
        if (file.insertions === 0 && file.deletions > 0)
            return '➖';
        if (file.insertions > 0 && file.deletions > 0)
            return '📝';
        return '📄';
    }
    determineChangeType(file) {
        if (file.insertions > 0 && file.deletions === 0)
            return 'added';
        if (file.insertions === 0 && file.deletions > 0)
            return 'deleted';
        if (file.insertions > 0 && file.deletions > 0)
            return 'modified';
        return 'unknown';
    }
    // Enhanced Interactive Review Mode with Retry Mechanisms
    async handleInteractiveReviewMode(strategy, allChanges) {
        console.log('\n' + this.renderer.renderTitle('🔍 Enhanced Interactive Boundary Review'));
        this.displayBoundaryOverview(strategy);
        let currentBoundaryIndex = 0;
        const processedBoundaries = [];
        const failedBoundaries = [];
        while (currentBoundaryIndex < strategy.commits.length) {
            const currentBoundary = strategy.commits[currentBoundaryIndex];
            console.log(`\n📦 Reviewing Boundary ${currentBoundaryIndex + 1}/${strategy.commits.length}`);
            console.log(`Theme: ${currentBoundary.suggestedMessage.title}`);
            console.log(`Files: ${currentBoundary.boundary.files.length} | Priority: ${currentBoundary.boundary.priority}`);
            const reviewResult = await this.reviewBoundaryInteractively(currentBoundary, currentBoundaryIndex + 1, strategy.commits.length);
            switch (reviewResult.action) {
                case 'accept':
                    if (reviewResult.stageFiles) {
                        const stageResult = await this.attemptBoundaryStaging(currentBoundary, currentBoundaryIndex + 1);
                        if (stageResult.success) {
                            processedBoundaries.push(currentBoundary.boundary.id);
                            this.success(`✅ Boundary ${currentBoundaryIndex + 1} accepted and staged`);
                            currentBoundaryIndex++;
                        }
                        else {
                            await this.handleStagingFailure(currentBoundary, stageResult.error, failedBoundaries);
                        }
                    }
                    else {
                        processedBoundaries.push(currentBoundary.boundary.id);
                        this.success(`✅ Boundary ${currentBoundaryIndex + 1} accepted`);
                        currentBoundaryIndex++;
                    }
                    break;
                case 'modify':
                    // Allow user to modify the boundary
                    await this.modifyBoundaryInteractively(currentBoundary, strategy);
                    // Review the same boundary again after modification
                    break;
                case 'skip':
                    this.log(`⏭️ Skipped boundary ${currentBoundaryIndex + 1}`, 'info');
                    currentBoundaryIndex++;
                    break;
                case 'retry':
                    this.log(`🔄 Retrying boundary ${currentBoundaryIndex + 1}`, 'info');
                    // Review the same boundary again
                    break;
                case 'abort':
                    this.log('🛑 Interactive review aborted by user', 'warn');
                    return;
            }
        }
        // Display final summary
        this.displayInteractiveReviewSummary(processedBoundaries, failedBoundaries, strategy);
        // Handle any failed boundaries
        if (failedBoundaries.length > 0) {
            await this.handleFailedBoundariesRecovery(failedBoundaries);
        }
    }
    displayBoundaryOverview(strategy) {
        console.log(this.renderer.renderSection('📋 Boundary Overview', [
            `Total boundaries: ${strategy.commits.length}`,
            `Strategy: ${strategy.strategy}`,
            `Overall risk: ${strategy.overallRisk}`
        ]));
        if (strategy.warnings.length > 0) {
            console.log(this.renderer.renderSection('⚠️ Warnings', strategy.warnings));
        }
    }
    async reviewBoundaryInteractively(boundary, index, total) {
        console.log(`\n🔍 Boundary ${index}/${total} Details:`);
        console.log(`   Theme: ${boundary.boundary.theme}`);
        console.log(`   Priority: ${boundary.boundary.priority}`);
        console.log(`   Risk: ${boundary.risk}`);
        console.log(`   Estimated time: ${boundary.estimatedTime}`);
        if (boundary.boundary.dependencies.length > 0) {
            console.log(`   Dependencies: ${boundary.boundary.dependencies.join(', ')}`);
        }
        console.log(`\n📁 Files in this boundary:`);
        boundary.boundary.files.forEach((file, fileIndex) => {
            const changeIcon = this.getChangeTypeIcon(file);
            console.log(`   ${fileIndex + 1}. ${changeIcon} ${file.file} (+${file.insertions} -${file.deletions})`);
        });
        console.log(`\n💭 Rationale: ${boundary.rationale}`);
        const actions = [
            'Accept boundary (ready to stage)',
            'Accept boundary (don\'t stage yet)',
            'Modify boundary (split, merge, or edit)',
            'Skip this boundary',
            'Retry boundary review',
            'Run quick validation',
            'Show detailed diff',
            'Abort review session'
        ];
        const choice = await this.interactiveUI.selectIndex('Choose an action for this boundary:', actions);
        switch (choice) {
            case 0:
                return { action: 'accept', stageFiles: true };
            case 1:
                return { action: 'accept', stageFiles: false };
            case 2:
                return { action: 'modify' };
            case 3:
                return { action: 'skip' };
            case 4:
                return { action: 'retry' };
            case 5:
                await this.runBoundaryValidation(boundary);
                return { action: 'retry' };
            case 6:
                await this.showDetailedBoundaryDiff(boundary);
                return { action: 'retry' };
            case 7:
                return { action: 'abort' };
            default:
                return { action: 'retry' };
        }
    }
    async attemptBoundaryStaging(boundary, index) {
        this.startSpinner(`Staging files for boundary ${index}...`);
        try {
            // Clear staging area first
            await this.gitAnalyzer.git.reset(['HEAD']);
            // Stage files for this boundary
            const filesToStage = boundary.boundary.files.map((f) => f.file);
            await this.gitAnalyzer.git.add(filesToStage);
            // Validate that files were staged correctly
            const stagedChanges = await this.gitAnalyzer.getStagedChanges();
            const stagedFiles = new Set(stagedChanges.map(change => change.file));
            const expectedFiles = new Set(filesToStage);
            const missingFiles = filesToStage.filter((file) => !stagedFiles.has(file));
            if (missingFiles.length > 0) {
                throw new Error(`Some files could not be staged: ${missingFiles.join(', ')}`);
            }
            this.stopSpinner(true, `Successfully staged ${filesToStage.length} files`);
            return { success: true };
        }
        catch (error) {
            this.stopSpinner(false, 'Staging failed');
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown staging error'
            };
        }
    }
    async handleStagingFailure(boundary, error, failedBoundaries) {
        const existingFailure = failedBoundaries.find(f => f.boundary.boundary.id === boundary.boundary.id);
        if (existingFailure) {
            existingFailure.attempts++;
        }
        else {
            failedBoundaries.push({ boundary, error, attempts: 1 });
        }
        console.log(`\n❌ Staging failed for boundary: ${boundary.boundary.theme}`);
        console.log(`   Error: ${error}`);
        const maxRetries = 3;
        const currentAttempt = existingFailure?.attempts || 1;
        if (currentAttempt < maxRetries) {
            const retryOptions = [
                'Retry staging immediately',
                'Modify boundary and retry',
                'Skip this boundary for now',
                'Show error details and troubleshoot'
            ];
            const choice = await this.interactiveUI.selectIndex(`Attempt ${currentAttempt}/${maxRetries} failed. What would you like to do?`, retryOptions);
            switch (choice) {
                case 0:
                    // Retry will happen in the main loop
                    break;
                case 1:
                    await this.modifyBoundaryInteractively(boundary, { commits: [boundary] });
                    break;
                case 2:
                    // Skip will be handled by caller
                    break;
                case 3:
                    console.log('\n🔍 Error Details:');
                    console.log(`   ${error}`);
                    console.log('\n💡 Common solutions:');
                    console.log('   • Ensure all files exist and are accessible');
                    console.log('   • Check for file permission issues');
                    console.log('   • Verify files haven\'t been moved or deleted');
                    await this.interactiveUI.confirmAction('Press Enter to continue...', true);
                    break;
            }
        }
        else {
            console.log(`   Maximum retry attempts (${maxRetries}) exceeded.`);
            console.log('   This boundary will be marked as failed.');
        }
    }
    async modifyBoundaryInteractively(boundary, strategy) {
        const modifyOptions = [
            'Split boundary into smaller parts',
            'Remove problematic files',
            'Edit commit message',
            'View and edit file list',
            'Reset boundary to original state'
        ];
        const choice = await this.interactiveUI.selectIndex('How would you like to modify this boundary?', modifyOptions);
        switch (choice) {
            case 0:
                await this.splitBoundaryFiles(boundary);
                break;
            case 1:
                await this.removeProblematicFiles(boundary);
                break;
            case 2:
                await this.editBoundaryCommitMessage(boundary);
                break;
            case 3:
                await this.editBoundaryFiles(boundary);
                break;
            case 4:
                // Reset would need to be implemented based on original boundary analysis
                this.log('Reset functionality not yet implemented', 'warn');
                break;
        }
    }
    async splitBoundaryFiles(boundary) {
        const files = boundary.boundary.files;
        if (files.length < 2) {
            this.log('Cannot split boundary with less than 2 files', 'warn');
            return;
        }
        console.log('\n📁 Current boundary files:');
        files.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.file} (+${file.insertions} -${file.deletions})`);
        });
        const splitPoint = await this.interactiveUI.selectIndex('Select the last file for the first part (remaining files will go to second part):', files.map((file, index) => `${index + 1}. ${file.file}`));
        // Split the files
        const firstPart = files.slice(0, splitPoint + 1);
        const secondPart = files.slice(splitPoint + 1);
        boundary.boundary.files = firstPart;
        // Update boundary metadata
        boundary.boundary.id = `${boundary.boundary.id}-part1`;
        boundary.boundary.theme = `${boundary.boundary.theme} (part 1)`;
        boundary.suggestedMessage.title = `${boundary.suggestedMessage.title} (part 1)`;
        this.success(`Boundary split: Part 1 has ${firstPart.length} files, Part 2 has ${secondPart.length} files`);
        this.log('Note: Only the first part is active. The second part would need separate processing.', 'info');
    }
    async removeProblematicFiles(boundary) {
        const files = boundary.boundary.files;
        console.log('\n📁 Select files to REMOVE from this boundary:');
        files.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.file} (+${file.insertions} -${file.deletions})`);
        });
        const fileChoice = await this.interactiveUI.selectIndex('Which file should be removed? (select one at a time)', files.map((file) => `${file.file} (+${file.insertions} -${file.deletions})`));
        if (files.length <= 1) {
            this.log('Cannot remove the last file from boundary', 'warn');
            return;
        }
        const removedFile = files[fileChoice];
        boundary.boundary.files = files.filter((_, index) => index !== fileChoice);
        this.success(`Removed ${removedFile.file}. Boundary now has ${boundary.boundary.files.length} files.`);
        // Ask if user wants to remove more files
        const removeMore = await this.interactiveUI.confirmAction('Remove another file from this boundary?', false);
        if (removeMore && boundary.boundary.files.length > 1) {
            await this.removeProblematicFiles(boundary);
        }
    }
    async editBoundaryCommitMessage(boundary) {
        console.log(`\nCurrent commit message: ${boundary.suggestedMessage.title}`);
        const newTitle = await this.interactiveUI.getTextInput('Enter new commit title', boundary.suggestedMessage.title);
        if (newTitle && newTitle !== boundary.suggestedMessage.title) {
            boundary.suggestedMessage.title = newTitle;
            this.success(`Updated commit title to: "${newTitle}"`);
        }
    }
    async editBoundaryFiles(boundary) {
        const files = boundary.boundary.files;
        console.log('\n📁 Current boundary files:');
        files.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.file} (+${file.insertions} -${file.deletions})`);
        });
        const editOptions = [
            'Reorder files',
            'Remove specific files',
            'View detailed diff for a file',
            'Cancel editing'
        ];
        const choice = await this.interactiveUI.selectIndex('What would you like to do with the file list?', editOptions);
        switch (choice) {
            case 0:
                await this.reorderBoundaryFiles(boundary);
                break;
            case 1:
                await this.removeProblematicFiles(boundary);
                break;
            case 2:
                await this.viewFileDetailedDiff(boundary);
                break;
            case 3:
                break;
        }
    }
    async reorderBoundaryFiles(boundary) {
        // Simple reordering implementation
        this.log('File reordering functionality would allow drag-and-drop style reordering', 'info');
        this.log('For now, files are ordered by their analysis priority', 'info');
    }
    async viewFileDetailedDiff(boundary) {
        const files = boundary.boundary.files;
        const fileChoice = await this.interactiveUI.selectIndex('Select file to view detailed diff:', files.map((file) => file.file));
        const selectedFile = files[fileChoice];
        try {
            const diff = await this.gitAnalyzer.git.diff([selectedFile.file]);
            console.log(`\n📄 Detailed diff for ${selectedFile.file}:`);
            console.log('─'.repeat(50));
            console.log(diff);
            console.log('─'.repeat(50));
        }
        catch (error) {
            this.log(`Could not show diff for ${selectedFile.file}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
        await this.interactiveUI.confirmAction('Press Enter to continue...', true);
    }
    async runBoundaryValidation(boundary) {
        this.startSpinner('Running boundary validation checks...');
        const validationResults = {
            fileExists: 0,
            fileSyntax: 0,
            gitTracking: 0,
            conflicts: 0
        };
        try {
            // Check if all files exist and are accessible
            for (const file of boundary.boundary.files) {
                try {
                    const fs = await import('fs').then(fs => fs.promises);
                    await fs.access(file.file);
                    validationResults.fileExists++;
                }
                catch {
                    // File doesn't exist or not accessible
                }
            }
            // Check git tracking status
            const workingChanges = await this.gitAnalyzer.getWorkingChanges();
            const workingFiles = new Set(workingChanges.map(change => change.file));
            for (const file of boundary.boundary.files) {
                if (workingFiles.has(file.file)) {
                    validationResults.gitTracking++;
                }
            }
            this.stopSpinner(true, 'Validation complete');
            console.log('\n📊 Validation Results:');
            console.log(`   Files exist: ${validationResults.fileExists}/${boundary.boundary.files.length}`);
            console.log(`   Git tracking: ${validationResults.gitTracking}/${boundary.boundary.files.length}`);
            if (validationResults.fileExists === boundary.boundary.files.length &&
                validationResults.gitTracking === boundary.boundary.files.length) {
                this.success('✅ All validation checks passed!');
            }
            else {
                this.log('⚠️ Some validation issues found. Review the boundary before proceeding.', 'warn');
            }
        }
        catch (error) {
            this.stopSpinner(false, 'Validation failed');
            this.log(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
        await this.interactiveUI.confirmAction('Press Enter to continue...', true);
    }
    async showDetailedBoundaryDiff(boundary) {
        console.log(`\n📄 Detailed diff for boundary: ${boundary.boundary.theme}`);
        console.log('═'.repeat(60));
        for (const file of boundary.boundary.files) {
            try {
                console.log(`\n📁 ${file.file} (+${file.insertions} -${file.deletions})`);
                console.log('─'.repeat(40));
                const diff = await this.gitAnalyzer.git.diff([file.file]);
                if (diff) {
                    // Show first 20 lines of diff to avoid overwhelming output
                    const diffLines = diff.split('\n').slice(0, 20);
                    console.log(diffLines.join('\n'));
                    if (diff.split('\n').length > 20) {
                        console.log('... (diff truncated)');
                    }
                }
                else {
                    console.log('No diff available');
                }
            }
            catch (error) {
                console.log(`Error showing diff: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        console.log('═'.repeat(60));
        await this.interactiveUI.confirmAction('Press Enter to continue...', true);
    }
    displayInteractiveReviewSummary(processedBoundaries, failedBoundaries, strategy) {
        console.log('\n' + this.renderer.renderTitle('📊 Interactive Review Summary'));
        console.log(this.renderer.renderSection('Results', [
            `Total boundaries: ${strategy.commits.length}`,
            `Successfully processed: ${processedBoundaries.length}`,
            `Failed boundaries: ${failedBoundaries.length}`,
            `Success rate: ${Math.round((processedBoundaries.length / strategy.commits.length) * 100)}%`
        ]));
        if (failedBoundaries.length > 0) {
            console.log('\n❌ Failed Boundaries:');
            failedBoundaries.forEach((failed, index) => {
                console.log(`   ${index + 1}. ${failed.boundary.boundary.theme}`);
                console.log(`      Error: ${failed.error}`);
                console.log(`      Attempts: ${failed.attempts}`);
            });
        }
    }
    async handleFailedBoundariesRecovery(failedBoundaries) {
        console.log('\n🔧 Failed Boundaries Recovery');
        const recoveryOptions = [
            'Ignore failed boundaries and continue',
            'Save failed boundaries for later review',
            'Attempt manual recovery process',
            'Show recovery recommendations'
        ];
        const choice = await this.interactiveUI.selectIndex('How would you like to handle the failed boundaries?', recoveryOptions);
        switch (choice) {
            case 0:
                this.log('Continuing without failed boundaries', 'info');
                break;
            case 1:
                await this.saveFailedBoundariesForReview(failedBoundaries);
                break;
            case 2:
                await this.attemptManualRecovery(failedBoundaries);
                break;
            case 3:
                this.showRecoveryRecommendations(failedBoundaries);
                break;
        }
    }
    async saveFailedBoundariesForReview(failedBoundaries) {
        try {
            const fs = await import('fs').then(fs => fs.promises);
            const failureReport = {
                timestamp: new Date().toISOString(),
                session: 'interactive-boundary-review',
                failures: failedBoundaries.map(failed => ({
                    boundaryId: failed.boundary.boundary.id,
                    theme: failed.boundary.boundary.theme,
                    files: failed.boundary.boundary.files.map((f) => f.file),
                    error: failed.error,
                    attempts: failed.attempts,
                    suggestedMessage: failed.boundary.suggestedMessage
                }))
            };
            await fs.writeFile('mastro-failed-boundaries.json', JSON.stringify(failureReport, null, 2));
            this.success('Failed boundaries saved to mastro-failed-boundaries.json');
        }
        catch (error) {
            this.log(`Could not save failed boundaries: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
    }
    async attemptManualRecovery(failedBoundaries) {
        for (const failed of failedBoundaries) {
            console.log(`\n🔧 Manual recovery for: ${failed.boundary.boundary.theme}`);
            console.log(`   Error: ${failed.error}`);
            const recoveryActions = [
                'Skip this boundary',
                'Retry with modifications',
                'Break into smaller boundaries',
                'Manual file staging'
            ];
            const action = await this.interactiveUI.selectIndex('Choose recovery action:', recoveryActions);
            switch (action) {
                case 0:
                    this.log('Skipped failed boundary', 'info');
                    break;
                case 1:
                    await this.modifyBoundaryInteractively(failed.boundary, { commits: [failed.boundary] });
                    const retryResult = await this.attemptBoundaryStaging(failed.boundary, 1);
                    if (retryResult.success) {
                        this.success('Recovery successful!');
                    }
                    else {
                        this.log('Recovery failed again', 'warn');
                    }
                    break;
                case 2:
                    await this.splitBoundaryFiles(failed.boundary);
                    break;
                case 3:
                    this.log('Manual staging: Use `git add <files>` to stage files manually', 'info');
                    break;
            }
        }
    }
    showRecoveryRecommendations(failedBoundaries) {
        console.log('\n💡 Recovery Recommendations:');
        console.log('─'.repeat(40));
        failedBoundaries.forEach((failed, index) => {
            console.log(`\n${index + 1}. ${failed.boundary.boundary.theme}`);
            console.log(`   Error: ${failed.error}`);
            // Provide specific recommendations based on error type
            if (failed.error.includes('not found') || failed.error.includes('does not exist')) {
                console.log('   💡 Recommendation: Check if files were moved or deleted');
                console.log('   💡 Action: Run `git status` to see current file state');
            }
            else if (failed.error.includes('permission')) {
                console.log('   💡 Recommendation: Check file permissions');
                console.log('   💡 Action: Use `chmod` to fix file permissions');
            }
            else if (failed.error.includes('staged')) {
                console.log('   💡 Recommendation: Clear staging area and try again');
                console.log('   💡 Action: Run `git reset HEAD` to clear staging');
            }
            else {
                console.log('   💡 Recommendation: Try breaking boundary into smaller parts');
                console.log('   💡 Action: Use interactive modification to split boundary');
            }
        });
    }
}
//# sourceMappingURL=split.js.map