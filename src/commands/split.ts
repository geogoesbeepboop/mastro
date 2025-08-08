import {Flags} from '@oclif/core';
import {BaseCommand} from '../base/command.js';
import {UIRenderer} from '../ui/renderer.js';
import {InteractiveUI} from '../ui/interactive.js';
import {CommitBoundaryAnalyzer} from '../core/commit-boundary-analyzer.js';
import {SemanticAnalyzer} from '../analyzers/semantic-analyzer.js';
import {ImpactAnalyzer} from '../analyzers/impact-analyzer.js';
import type {CommitBoundary, StagingStrategy} from '../core/commit-boundary-analyzer.js';
import type {GitChange} from '../types/index.js';

export default class Split extends BaseCommand {
  static override description = 'Analyze working changes and suggest optimal commit boundaries';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --auto-stage',
    '<%= config.bin %> <%= command.id %> --dry-run',
    '<%= config.bin %> <%= command.id %> --format=json'
  ];

  static override flags = {
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

  private renderer!: UIRenderer;
  private interactiveUI!: InteractiveUI;
  private boundaryAnalyzer!: CommitBoundaryAnalyzer;

  public async run(): Promise<void> {
    const {flags} = await this.parse(Split);

    try {
      // Initialize components
      this.renderer = new UIRenderer(this.mastroConfig);
      this.interactiveUI = new InteractiveUI(this.mastroConfig);
      
      const semanticAnalyzer = new SemanticAnalyzer();
      const impactAnalyzer = new ImpactAnalyzer();
      this.boundaryAnalyzer = new CommitBoundaryAnalyzer(
        this.mastroConfig,
        semanticAnalyzer,
        impactAnalyzer
      );

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
      } else if (flags.format === 'markdown') {
        this.outputMarkdown(strategy, workingChanges);
      } else {
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

    } catch (error) {
      await this.handleError(error, 'analyze commit boundaries');
    } finally {
      this.interactiveUI.cleanup();
    }
  }

  private outputTerminal(strategy: StagingStrategy, allChanges: GitChange[]): void {
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

  private outputJSON(strategy: StagingStrategy, allChanges: GitChange[]): void {
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

  private outputMarkdown(strategy: StagingStrategy, allChanges: GitChange[]): void {
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

  private async handleInteractiveMode(strategy: StagingStrategy, allChanges: GitChange[]): Promise<void> {
    console.log('\n' + this.renderer.renderTitle('🛠️ Interactive Boundary Customization'));
    
    const actions = [
      'Accept all boundaries as-is',
      'Merge specific boundaries',
      'Split a boundary',
      'Reorder commits',
      'Modify commit messages',
      'Cancel and exit'
    ];

    const choice = await this.interactiveUI.selectIndex(
      'What would you like to do?',
      actions
    );

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

  private async handleAutoStaging(strategy: StagingStrategy): Promise<void> {
    this.log('\n' + this.renderer.renderTitle('🎯 Auto-staging files according to boundaries...'));
    
    // First, unstage everything to start fresh
    this.startSpinner('Clearing staged changes...');
    try {
      await (this.gitAnalyzer as any).git.reset(['HEAD']);
      this.stopSpinner(true, 'Staged changes cleared');
    } catch (error) {
      this.stopSpinner(false, 'Failed to clear staged changes');
      throw error;
    }

    // Stage files for the first boundary only (to start with one logical commit)
    if (strategy.commits.length > 0) {
      const firstCommit = strategy.commits[0];
      const filesToStage = firstCommit.boundary.files.map(f => f.file);
      
      this.startSpinner(`Staging ${filesToStage.length} files for first commit...`);
      
      try {
        await (this.gitAnalyzer as any).git.add(filesToStage);
        this.stopSpinner(true, `Staged files for: ${firstCommit.suggestedMessage.title}`);
        
        this.success(`Files staged for first commit:`);
        filesToStage.forEach(file => {
          console.log(`  ✓ ${file}`);
        });
        
        this.log('\nYou can now run `mastro commit` to create this commit', 'info');
        this.log(`After committing, run \`mastro split --auto-stage\` again for the next boundary`, 'info');
        
      } catch (error) {
        this.stopSpinner(false, 'Failed to stage files');
        throw error;
      }
    }
  }

  private displayNextSteps(strategy: StagingStrategy): void {
    console.log('\n' + this.renderer.renderTitle('🚀 Next Steps'));
    
    if (strategy.commits.length === 1) {
      console.log('Single logical commit detected. You can:');
      console.log('  1. Stage all changes: `git add .`');
      console.log('  2. Create commit: `mastro commit`');
    } else {
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

  private async handleMergeBoundaries(strategy: StagingStrategy): Promise<void> {
    const boundaryOptions = strategy.commits.map((commit, index) => 
      `${index + 1}. ${commit.suggestedMessage.title} (${commit.boundary.files.length} files)`
    );

    const first = await this.interactiveUI.selectIndex(
      'Select first boundary to merge:',
      boundaryOptions
    );

    const second = await this.interactiveUI.selectIndex(
      'Select second boundary to merge:',
      boundaryOptions.filter((_, index) => index !== first)
    );

    // Adjust for filtered array
    const secondIndex = second >= first ? second + 1 : second;

    this.log(`Merging boundary ${first + 1} with boundary ${secondIndex + 1}`, 'info');
    
    // Merge logic would go here
    // For now, just show what would happen
    this.success('Merge completed (simulation)');
  }

  private async handleSplitBoundary(strategy: StagingStrategy): Promise<void> {
    const boundaryOptions = strategy.commits.map((commit, index) => 
      `${index + 1}. ${commit.suggestedMessage.title} (${commit.boundary.files.length} files)`
    );

    const choice = await this.interactiveUI.selectIndex(
      'Select boundary to split:',
      boundaryOptions
    );

    this.log(`Splitting boundary ${choice + 1}`, 'info');
    
    // Split logic would go here
    this.success('Split completed (simulation)');
  }

  private async handleReorderCommits(strategy: StagingStrategy): Promise<void> {
    this.log('Commit reordering interface would go here', 'info');
    // Reorder logic would go here
  }

  private async handleModifyMessages(strategy: StagingStrategy): Promise<void> {
    this.log('Message modification interface would go here', 'info');
    // Message modification logic would go here
  }

  // Utility methods

  private getChangeTypeIcon(file: GitChange): string {
    if (file.insertions > 0 && file.deletions === 0) return '➕';
    if (file.insertions === 0 && file.deletions > 0) return '➖';
    if (file.insertions > 0 && file.deletions > 0) return '📝';
    return '📄';
  }

  private determineChangeType(file: GitChange): string {
    if (file.insertions > 0 && file.deletions === 0) return 'added';
    if (file.insertions === 0 && file.deletions > 0) return 'deleted';
    if (file.insertions > 0 && file.deletions > 0) return 'modified';
    return 'unknown';
  }
}