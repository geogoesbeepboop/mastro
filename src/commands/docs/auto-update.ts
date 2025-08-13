import {Flags} from '@oclif/core';
import {BaseCommand} from '../../base/command.js';
import {AutoDocumentationUpdater, AutoUpdateConfig} from '../../core/auto-doc-updater.js';
import type {DocumentationType} from '../../types/index.js';

export default class DocsAutoUpdate extends BaseCommand {
  static override description = 'Automatically update documentation based on code changes';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --preview',
    '<%= config.bin %> <%= command.id %> --doc-types api,architecture --threshold 0.8'
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    preview: Flags.boolean({
      char: 'p',
      description: 'preview what would be updated without making changes',
      default: false
    }),
    'doc-types': Flags.string({
      char: 't',
      description: 'comma-separated list of documentation types to update',
      default: 'api,architecture,user-guide,readme'
    }),
    threshold: Flags.string({
      description: 'minimum confidence threshold for triggering updates (0.0-1.0)',
      default: '0.7'
    }),
    'output-dir': Flags.string({
      char: 'o',
      description: 'output directory for documentation files',
      default: './docs'
    }),
    'auto-commit': Flags.boolean({
      description: 'automatically commit documentation updates',
      default: false
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'force update even if confidence is below threshold',
      default: false
    })
  };

  public async run(): Promise<void> {
    const {flags} = await this.parse(DocsAutoUpdate);

    try {
      // Ensure we're in a git repository
      await this.ensureGitRepository();

      // Parse flags
      const docTypes = this.parseDocTypes(flags['doc-types']);
      const threshold = this.parseThreshold(flags.threshold);
      
      const updateConfig: AutoUpdateConfig = {
        enabled: true,
        docTypes,
        autoCommit: flags['auto-commit'],
        dryRun: flags.preview,
        threshold: flags.force ? 0.0 : threshold
      };

      // Initialize the auto-updater
      const autoUpdater = new AutoDocumentationUpdater(
        this.mastroConfig,
        this.aiClient,
        flags['output-dir']
      );

      this.startSpinner('Analyzing changes and detecting documentation updates needed...');

      // Build commit context from current changes
      const changes = await this.gitAnalyzer.getStagedChanges(); // Get staged changes
      const context = {
        changes,
        branch: await this.gitAnalyzer.getCurrentBranch(),
        repository: await this.buildRepoContext(),
        staged: false,
        workingDir: await this.gitAnalyzer.getRepoRoot(),
        metadata: {
          totalInsertions: changes.reduce((sum: number, c: any) => sum + c.insertions, 0),
          totalDeletions: changes.reduce((sum: number, c: any) => sum + c.deletions, 0),
          fileCount: changes.length,
          changeComplexity: changes.length > 10 ? 'high' as const : changes.length > 3 ? 'medium' as const : 'low' as const
        }
      };

      if (flags.preview) {
        // Preview mode - show what would be updated
        const preview = await autoUpdater.previewUpdates(context, updateConfig);
        
        this.stopSpinner(true, `Analysis complete - ${preview.changes.length} significant changes detected`);
        
        await this.displayPreview(preview);
        return;
      }

      // Perform actual updates
      const summary = await autoUpdater.analyzeAndUpdateDocumentation(context, updateConfig);
      
      this.stopSpinner(true, 'Documentation analysis and updates complete');
      
      // Display results
      await this.displayUpdateSummary(summary);

      // Auto-commit if requested and there were updates
      if (flags['auto-commit'] && (summary.documentsUpdated.length > 0 || summary.documentsCreated.length > 0)) {
        await this.autoCommitUpdates(summary);
      }

    } catch (error) {
      await this.handleError(error, 'auto-update documentation');
    }
  }

  private parseDocTypes(docTypesStr: string): DocumentationType[] {
    const validTypes: DocumentationType[] = [
      'api', 'architecture', 'user-guide', 'readme', 'component', 
      'deployment', 'troubleshooting', 'changelog', 'contributing', 
      'security', 'performance', 'testing', 'workflow', 'integration', 'all'
    ];
    
    const requestedTypes = docTypesStr.split(',').map(t => t.trim() as DocumentationType);
    
    // Validate types
    const invalidTypes = requestedTypes.filter(type => !validTypes.includes(type));
    if (invalidTypes.length > 0) {
      throw new Error(`Invalid documentation types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}`);
    }
    
    return requestedTypes;
  }

  private parseThreshold(thresholdStr: string): number {
    const threshold = parseFloat(thresholdStr);
    
    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be a number between 0.0 and 1.0');
    }
    
    return threshold;
  }

  private async displayPreview(preview: {
    changes: any[];
    affectedDocs: DocumentationType[];
    suggestions: string[];
  }): Promise<void> {
    this.log('\n📋 Documentation Update Preview', 'info');
    this.log('═'.repeat(50));
    
    if (preview.changes.length === 0) {
      this.log('No significant changes detected that require documentation updates.', 'info');
      return;
    }
    
    // Display detected changes
    this.log('\n🔍 Detected Changes:', 'info');
    for (const change of preview.changes) {
      const confidenceStr = (change.confidence * 100).toFixed(1);
      this.log(`  • ${change.type} (${confidenceStr}% confidence)`, 'info');
      this.log(`    ${change.reasoning}`, 'dim');
    }
    
    // Display affected documentation
    if (preview.affectedDocs.length > 0) {
      this.log('\n📚 Documentation to Update:', 'info');
      for (const docType of preview.affectedDocs) {
        this.log(`  • ${docType}.md`, 'info');
      }
    }
    
    // Display suggestions
    if (preview.suggestions.length > 0) {
      this.log('\n💡 Suggestions:', 'info');
      for (const suggestion of preview.suggestions) {
        this.log(`  • ${suggestion}`, 'dim');
      }
    }
    
    this.log('\n📝 To perform these updates, run without --preview flag', 'info');
  }

  private async displayUpdateSummary(summary: any): Promise<void> {
    this.log('\n📊 Documentation Update Summary', 'info');
    this.log('═'.repeat(50));
    
    // Changes detected
    if (summary.changesDetected.length > 0) {
      this.log('\n🔍 Changes Analyzed:', 'info');
      for (const change of summary.changesDetected) {
        const confidenceStr = (change.confidence * 100).toFixed(1);
        this.log(`  • ${change.type} (${confidenceStr}% confidence)`, 'info');
        
        if (change.suggestedActions.length > 0) {
          this.log(`    Actions: ${change.suggestedActions.slice(0, 2).join(', ')}`, 'dim');
        }
      }
    }
    
    // Documents updated
    if (summary.documentsUpdated.length > 0) {
      this.log('\n✅ Documents Updated:', 'info');
      for (const doc of summary.documentsUpdated) {
        this.log(`  • ${doc}`, 'info');
      }
    }
    
    // Documents created
    if (summary.documentsCreated.length > 0) {
      this.log('\n🆕 Documents Created:', 'info');
      for (const doc of summary.documentsCreated) {
        this.log(`  • ${doc}`, 'info');
      }
    }
    
    // Errors
    if (summary.errors.length > 0) {
      this.log('\n❌ Errors:', 'error');
      for (const error of summary.errors) {
        this.log(`  • ${error}`, 'error');
      }
    }
    
    // Skipped
    if (summary.skipped.length > 0) {
      this.log('\n⏭️  Skipped:', 'warn');
      for (const skipped of summary.skipped) {
        this.log(`  • ${skipped}`, 'warn');
      }
    }
    
    // Suggestions
    if (summary.suggestions.length > 0) {
      this.log('\n💡 Suggestions:', 'info');
      for (const suggestion of summary.suggestions) {
        this.log(`  • ${suggestion}`, 'dim');
      }
    }
    
    // Summary stats
    const totalUpdates = summary.documentsUpdated.length + summary.documentsCreated.length;
    if (totalUpdates > 0) {
      this.log(`\n🎉 Successfully updated ${totalUpdates} documentation file(s)`, 'success');
    } else if (summary.changesDetected.length === 0) {
      this.log('\n✨ No changes detected - documentation is up to date', 'success');
    } else {
      this.log('\n📝 No documentation updates were necessary at this time', 'info');
    }
  }

  private async buildRepoContext() {
    const repoRoot = await this.gitAnalyzer.getRepoRoot();
    const repoName = repoRoot.split('/').pop() || 'unknown';
    
    return {
      name: repoName,
      root: repoRoot,
      language: 'typescript',
      framework: 'nodejs',
      patterns: {
        commitStyle: 'conventional' as const,
        prefixes: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
        maxLength: 72,
        commonPhrases: ['update', 'add', 'remove', 'fix', 'improve'],
        reviewPersona: {
          name: 'Senior Engineer',
          focus: ['maintainability', 'performance'] as ('security' | 'performance' | 'maintainability' | 'testing')[],
          strictness: 'moderate' as const,
          customRules: [] as string[]
        }
      },
      recentCommits: await this.gitAnalyzer.getRecentCommits(10)
    };
  }

  private async autoCommitUpdates(summary: any): Promise<void> {
    try {
      this.startSpinner('Auto-committing documentation updates...');
      
      const updatedFiles = [...summary.documentsUpdated, ...summary.documentsCreated];
      
      // Use git add command instead of non-existent stageFile method
      for (const file of updatedFiles) {
        const { execSync } = await import('child_process');
        execSync(`git add "${file}"`, { cwd: await this.gitAnalyzer.getRepoRoot() });
      }
      
      // Create commit message
      const changeTypes = [...new Set(summary.changesDetected.map((c: any) => c.type))];
      const commitMessage = `docs: auto-update documentation\n\nUpdated documentation due to: ${changeTypes.join(', ')}\n\nFiles updated:\n${updatedFiles.map(f => `- ${f}`).join('\n')}\n\n🤖 Generated with Mastro CLI auto-update`;
      
      // Use git commit command instead of non-existent createCommit method
      const { execSync } = await import('child_process');
      execSync(`git commit -m "${commitMessage}"`, { cwd: await this.gitAnalyzer.getRepoRoot() });
      
      this.stopSpinner(true, 'Documentation updates committed successfully');
      
    } catch (error) {
      this.stopSpinner(false, 'Failed to auto-commit documentation updates');
      this.log(`Auto-commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
      this.log('You can manually commit the documentation updates', 'info');
    }
  }
}