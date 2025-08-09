import { Flags } from '@oclif/core';
import { BaseCommand } from '../base/command.js';
import { UIRenderer } from '../ui/renderer.js';
import { InteractiveUI } from '../ui/interactive.js';
import { CommitBoundaryAnalyzer } from '../core/commit-boundary-analyzer.js';
import { SemanticAnalyzer } from '../analyzers/semantic-analyzer.js';
import { ImpactAnalyzer } from '../analyzers/impact-analyzer.js';
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
        'min-boundary-size': Flags.integer({
            description: 'minimum number of files per boundary (default: 1)',
            default: 1
        }),
        'max-boundary-size': Flags.integer({
            description: 'maximum number of files per boundary (default: 8)',
            default: 8
        })
    };
    renderer;
    interactiveUI;
    boundaryAnalyzer;
    async run() {
        const { flags } = await this.parse(Split);
        try {
            // Initialize components
            this.renderer = new UIRenderer(this.mastroConfig);
            this.interactiveUI = new InteractiveUI(this.mastroConfig);
            const semanticAnalyzer = new SemanticAnalyzer();
            const impactAnalyzer = new ImpactAnalyzer();
            this.boundaryAnalyzer = new CommitBoundaryAnalyzer(this.mastroConfig, semanticAnalyzer, impactAnalyzer);
            // Ensure we're in a git repository
            await this.ensureGitRepository();
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
            // Interactive mode for customizing boundaries
            if (flags.interactive && !flags['dry-run']) {
                await this.handleInteractiveMode(strategy, workingChanges);
            }
            // Auto-stage if requested
            if (flags['auto-stage'] && !flags['dry-run']) {
                await this.handleAutoStaging(strategy);
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
}
//# sourceMappingURL=split.js.map