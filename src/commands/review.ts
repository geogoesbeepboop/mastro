import {Flags} from '@oclif/core';
import {BaseCommand} from '../base/command.js';
import {SessionTracker} from '../core/session-tracker.js';
import {ReviewEngine} from '../core/review-engine.js';
import {StreamingAIClient} from '../core/streaming-client.js';
import {StreamingRenderer} from '../ui/streaming-renderer.js';
import {LoadingStateManager} from '../ui/loading-states.js';
import {InteractiveUI} from '../ui/interactive.js';
import {WorkflowContextManager} from '../core/workflow-context-manager.js';
import type {
  ReviewPersona,
  DevelopmentSession,
  SessionReview,
  StreamingOptions
} from '../types/index.js';

export default class Review extends BaseCommand {
  static override description = 'Perform AI-powered code review of current development session';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --persona=security',
    '<%= config.bin %> <%= command.id %> --strict',
    '<%= config.bin %> <%= command.id %> --format=json',
    '<%= config.bin %> <%= command.id %> --interactive',
    '<%= config.bin %> <%= command.id %> --stream'
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    persona: Flags.string({
      char: 'p',
      description: 'review persona focus area',
      options: ['security', 'performance', 'maintainability', 'testing', 'senior', 'principal'],
      default: undefined
    }),
    strictness: Flags.string({
      char: 's',
      description: 'review strictness level',
      options: ['lenient', 'moderate', 'strict'],
      default: undefined
    }),
    format: Flags.string({
      char: 'f',
      description: 'output format',
      options: ['terminal', 'json', 'markdown'],
      default: 'terminal'
    }),
    scope: Flags.string({
      description: 'review scope',
      options: ['working', 'staged', 'session'],
      default: 'session'
    }),
    interactive: Flags.boolean({
      char: 'i',
      description: 'enable interactive mode with follow-up actions',
      default: false
    }),
    stream: Flags.boolean({
      description: 'enable streaming responses for real-time feedback',
      default: true
    }),
    'actionable-only': Flags.boolean({
      description: 'show only actionable items',
      default: false
    }),
    priority: Flags.string({
      description: 'minimum priority level to show',
      options: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    }),
    'boundary-context': Flags.boolean({
      description: 'focus review on current workflow boundary context',
      default: false
    })
  };

  private sessionTracker!: SessionTracker;
  private reviewEngine!: ReviewEngine;
  private streamingClient!: StreamingAIClient;
  private streamingRenderer!: StreamingRenderer;
  private loadingManager!: LoadingStateManager;
  private interactiveUI!: InteractiveUI;
  private workflowManager!: WorkflowContextManager;

  private suppressNextActions: boolean = false;

  public async run(): Promise<void> {
    const {flags} = await this.parse(Review);
    this.suppressNextActions = !!flags['boundary-context'];

    try {
      // Initialize components
      this.sessionTracker = new SessionTracker(this.mastroConfig);
      this.reviewEngine = new ReviewEngine(this.mastroConfig);
      this.streamingClient = new StreamingAIClient({
        provider: this.mastroConfig.ai.provider,
        apiKey: this.mastroConfig.ai.apiKey,
        model: this.mastroConfig.ai.model,
        maxTokens: this.mastroConfig.ai.maxTokens,
        temperature: this.mastroConfig.ai.temperature
      });
      this.streamingRenderer = new StreamingRenderer(this.mastroConfig);
      this.loadingManager = new LoadingStateManager(this.mastroConfig);
      this.interactiveUI = new InteractiveUI(this.mastroConfig);
      this.workflowManager = new WorkflowContextManager();

      // Ensure we're in a git repository
      await this.ensureGitRepository();

      // Handle boundary context mode
      if (flags['boundary-context']) {
        await this.handleBoundaryContextReview(flags);
        return;
      }

      // Get or create development session
      const session = await this.getOrCreateSession();

      // Check if there are changes to review
      if (!await this.sessionTracker.hasSessionChanges()) {
        this.log('✨ No changes detected in current development session');
        this.log('Make some changes and try again!');
        return;
      }

      // Display session overview
      this.displaySessionOverview(session);

      // Create review persona
      const persona = this.createReviewPersona(flags);

      // Perform the review
      let review: SessionReview;

      if (flags.stream && flags.format === 'terminal') {
        review = await this.performStreamingReview(session, persona);
        // Streaming review handles its own output, don't render again
      } else {
        review = await this.performStandardReview(session, persona);
        // Output results based on format for non-streaming reviews
        await this.outputResults(review, flags);
      }

      // Interactive mode
      if (flags.interactive) {
        await this.enterInteractiveMode(review, session);
      }

    } catch (error) {
      this.error(`Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {exit: 1});
    } finally {
      this.streamingRenderer?.cleanup();
      this.loadingManager?.cleanup();
      this.interactiveUI?.cleanup();
    }
  }

  private async getOrCreateSession(): Promise<DevelopmentSession> {
    this.startSpinner('Initializing development session...');
    
    try {
      const session = await this.sessionTracker.getCurrentSession();
      this.stopSpinner(true, `Session initialized (${session.id.substring(0, 8)})`);
      return session;
    } catch (error) {
      this.stopSpinner(false, 'Failed to initialize session');
      throw error;
    }
  }

  private displaySessionOverview(session: DevelopmentSession): void {
    const stats = session.cumulativeStats;
    const risk = session.riskAssessment;
    
    this.log('\n📊 Session Overview');
    this.log('─'.repeat(30));
    this.log(`Files changed: ${stats.totalFiles}`);
    this.log(`Lines modified: +${stats.totalInsertions}/-${stats.totalDeletions}`);
    this.log(`Complexity: ${stats.complexity.toUpperCase()}`);
    this.log(`Risk level: ${risk.level.toUpperCase()}`);
    this.log(`Duration: ${stats.duration} minutes`);
    
    if (session.patterns.length > 0) {
      this.log(`Patterns: ${session.patterns.map(p => p.type).join(', ')}`);
    }
    
    this.log('');
  }

  private createReviewPersona(flags: any): ReviewPersona {
    const basePersona = this.mastroConfig.team.reviewPersona;
    
    // Override with flags
    const persona: ReviewPersona = {
      ...basePersona,
      strictness: flags.strictness || basePersona.strictness
    };

    // Handle persona flag
    if (flags.persona) {
      switch (flags.persona) {
        case 'security':
          persona.name = 'Security Engineer';
          persona.focus = ['security', 'maintainability'];
          break;
        case 'performance':
          persona.name = 'Performance Engineer';
          persona.focus = ['performance', 'maintainability'];
          break;
        case 'testing':
          persona.name = 'QA Engineer';
          persona.focus = ['testing', 'maintainability'];
          break;
        case 'senior':
          persona.name = 'Senior Engineer';
          persona.focus = ['maintainability', 'performance'];
          persona.strictness = 'moderate';
          break;
        case 'principal':
          persona.name = 'Principal Engineer';
          persona.focus = ['security', 'performance', 'maintainability'];
          persona.strictness = 'strict';
          break;
      }
    }

    return persona;
  }

  private async performStreamingReview(session: DevelopmentSession, persona: ReviewPersona): Promise<SessionReview> {
    const streamingOptions: StreamingOptions = {
      enabled: true,
      chunkHandler: (chunk) => {
        // Handle progressive updates
      },
      progressHandler: (progress) => {
        // Handle progress updates
      },
      errorHandler: (error) => {
        this.error(`Streaming error: ${error}`);
      }
    };

    const streamGenerator = this.streamingClient.streamSessionReview(session, persona, streamingOptions);
    const result = await this.streamingRenderer.renderStreamingReview(streamGenerator);
    
    if (!result) {
      throw new Error('Failed to complete streaming review');
    }

    // Enhance with local analysis
    const enhancedReview = await this.reviewEngine.reviewSession(session, persona);
    
    // Merge streaming AI review with local analysis
    // Prefer validated blockers and suggestions from enhanced review to eliminate generic/phantom entries
    const merged: SessionReview = {
      ...(result as SessionReview),
      actionableItems: enhancedReview.actionableItems,
      learningPoints: enhancedReview.learningPoints,
      workflowSuggestions: enhancedReview.workflowSuggestions,
      blockers: enhancedReview.blockers,
      suggestions: enhancedReview.suggestions
    };

    // Note: We don't re-render here because the streaming renderer already displayed the results
    // The merged review contains the enhanced data for the workflow to use

    return merged;
  }

  private async performStandardReview(session: DevelopmentSession, persona: ReviewPersona): Promise<SessionReview> {
    this.startSpinner(`Performing ${persona.name.toLowerCase()} review...`);
    
    try {
      const review = await this.reviewEngine.reviewSession(session, persona);
      this.stopSpinner(true, 'Review completed!');
      return review;
    } catch (error) {
      this.stopSpinner(false, 'Review failed');
      throw error;
    }
  }

  private async outputResults(review: SessionReview, flags: any): Promise<void> {
    switch (flags.format) {
      case 'json':
        this.outputJSON(review, flags);
        break;
      case 'markdown':
        this.outputMarkdown(review, flags);
        break;
      case 'terminal':
      default:
        this.outputTerminal(review, flags);
        break;
    }
  }

  private outputJSON(review: SessionReview, flags: any): void {
    let output = review;
    
    if (flags['actionable-only']) {
      output = {
        ...review,
        suggestions: [],
        compliments: []
      };
    }

    if (flags.priority && flags.priority !== 'low') {
      const minPriority = this.getPriorityWeight(flags.priority);
      output = {
        ...output,
        actionableItems: output.actionableItems.filter(item => 
          this.getPriorityWeight(item.priority) <= minPriority
        )
      };
    }

    console.log(JSON.stringify(output, null, 2));
  }

  private outputMarkdown(review: SessionReview, flags: any): void {
    const output: string[] = [];
    
    output.push('# Code Review Results\n');
    output.push(`**Session:** ${review.sessionId.substring(0, 8)}`);
    output.push(`**Scope:** ${review.scope}`);
    output.push(`**Rating:** ${review.overall.rating} (${Math.round(review.overall.confidence * 100)}% confidence)\n`);
    
    output.push(review.overall.summary + '\n');

    if (review.actionableItems.length > 0) {
      output.push('## 🎯 Actionable Items\n');
      for (const item of review.actionableItems) {
        output.push(`### ${item.title}`);
        output.push(`**Priority:** ${item.priority} | **Effort:** ${item.estimatedEffort}`);
        if (item.file) output.push(`**File:** ${item.file}${item.line ? `:${item.line}` : ''}`);
        output.push(item.description);
        if (item.suggestion) output.push(`💡 **Suggestion:** ${item.suggestion}`);
        output.push('');
      }
    }

    console.log(output.join('\n'));
  }

  private outputTerminal(review: SessionReview, flags: any): void {
    if (flags['actionable-only']) {
      this.outputActionableItemsOnly(review, flags);
    } else if (!flags.stream) {
      // Only render if not already rendered by streaming
      this.streamingRenderer.renderSessionReview(review);
    }
  }

  private outputActionableItemsOnly(review: SessionReview, flags: any): void {
    let items = review.actionableItems;
    
    if (flags.priority && flags.priority !== 'low') {
      const minPriority = this.getPriorityWeight(flags.priority);
      items = items.filter(item => this.getPriorityWeight(item.priority) <= minPriority);
    }

    if (items.length === 0) {
      this.log('✨ No actionable items found at this priority level');
      return;
    }

    this.log('\n🎯 Actionable Items');
    this.log('─'.repeat(30));
    
    for (const item of items) {
      this.log(`${this.getPriorityIcon(item.priority)} ${item.title}`);
      if (item.file) {
        this.log(`   📁 ${item.file}${item.line ? `:${item.line}` : ''}`);
      }
      this.log(`   ${item.description}`);
      if (item.suggestion) {
        this.log(`   💡 ${item.suggestion}`);
      }
      this.log('');
    }
  }

  private async enterInteractiveMode(review: SessionReview, session: DevelopmentSession): Promise<void> {
    let continueInteractive = true;
    
    while (continueInteractive) {
      this.log('\n🔄 Interactive Mode');
      
      const actions = [
        'Show detailed suggestions',
        'Export actionable items to TODO',
        'Run focused review',
        'Show learning resources',
        'Exit'
      ];

      const choice = await this.interactiveUI.selectIndex(
        'Choose an action:',
        actions
      );

      switch (choice) {
        case 0:
          await this.showDetailedSuggestions(review);
          break;
        case 1:
          await this.exportActionableItems(review);
          break;
        case 2:
          await this.runFocusedReview(session);
          break;
        case 3:
          await this.showLearningResources(review);
          break;
        case 4:
          continueInteractive = false;
          this.log('👋 Exiting interactive mode', 'info');
          break;
      }
    }
  }

  private async showDetailedSuggestions(review: SessionReview): Promise<void> {
    this.log('\n📋 Detailed Suggestions', 'info');
    this.log('─'.repeat(50));
    
    if (review.suggestions.length === 0) {
      this.log('✨ No suggestions - great work!', 'info');
      return;
    }

    for (const suggestion of review.suggestions) {
      console.log(`\n🔍 ${suggestion.file}:${suggestion.line}`);
      console.log(`   Type: ${suggestion.type} | Severity: ${suggestion.severity}`);
      console.log(`   ${suggestion.message}`);
      if (suggestion.suggestion) {
        console.log(`   💡 Suggestion: ${suggestion.suggestion}`);
      }
      console.log(`   Confidence: ${Math.round(suggestion.confidence * 100)}%`);
    }

    await this.interactiveUI.confirmAction('\nPress Enter to continue...', true);
  }

  private async exportActionableItems(review: SessionReview): Promise<void> {
    this.log('\n📤 Export Actionable Items', 'info');
    
    if (review.actionableItems.length === 0) {
      this.log('No actionable items to export', 'warn');
      return;
    }

    const exportOptions = [
      'Save to TODO.md file',
      'Save to GitHub Issues format',
      'Copy to clipboard',
      'Display only'
    ];

    const choice = await this.interactiveUI.selectIndex(
      'Choose export format:',
      exportOptions
    );

    let exportContent = '';
    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (choice) {
      case 0: // TODO.md
        exportContent = this.formatAsMarkdownTodo(review.actionableItems, timestamp);
        await this.saveToFile('TODO.md', exportContent);
        this.success('Exported to TODO.md');
        break;
      case 1: // GitHub Issues
        exportContent = this.formatAsGitHubIssues(review.actionableItems, timestamp);
        await this.saveToFile('github-issues.md', exportContent);
        this.success('Exported to github-issues.md');
        break;
      case 2: // Clipboard (simulated)
        exportContent = this.formatAsMarkdownTodo(review.actionableItems, timestamp);
        this.log('📋 Content formatted for clipboard:', 'info');
        console.log('\n' + exportContent);
        this.log('\n(Copy the above content to your clipboard)', 'info');
        break;
      case 3: // Display only
        exportContent = this.formatAsMarkdownTodo(review.actionableItems, timestamp);
        console.log('\n' + exportContent);
        break;
    }
  }

  private async runFocusedReview(session: DevelopmentSession): Promise<void> {
    this.log('\n🎯 Focused Review', 'info');
    
    const focusOptions = [
      'Security-focused review',
      'Performance-focused review',
      'Testing-focused review',
      'Code quality review',
      'Architecture review'
    ];

    const choice = await this.interactiveUI.selectIndex(
      'Select review focus:',
      focusOptions
    );

    const focusTypes = ['security', 'performance', 'testing', 'maintainability', 'maintainability'];
    const selectedFocus = focusTypes[choice] as ('security' | 'performance' | 'maintainability' | 'testing');
    
    this.startSpinner(`Running ${focusOptions[choice].toLowerCase()}...`);
    
    try {
      // Create focused persona
      const focusedPersona = {
        name: `${focusOptions[choice]} Specialist`,
        focus: [selectedFocus],
        strictness: 'strict' as const,
        customRules: this.getFocusSpecificRules(selectedFocus)
      };

      const focusedReview = await this.reviewEngine.reviewSession(session, focusedPersona);
      this.stopSpinner(true, 'Focused review completed');
      
      // Display focused results
      this.log(`\n📊 ${focusOptions[choice]} Results:`);
      this.log(`Rating: ${focusedReview.overall.rating}`);
      this.log(`Actionable items: ${focusedReview.actionableItems.length}`);
      
      if (focusedReview.actionableItems.length > 0) {
        this.log('\nTop concerns:');
        focusedReview.actionableItems.slice(0, 3).forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.title} (${item.priority})`);
        });
      }

    } catch (error) {
      this.stopSpinner(false, 'Focused review failed');
      this.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }

  private async showLearningResources(review: SessionReview): Promise<void> {
    this.log('\n📚 Learning Resources', 'info');
    this.log('─'.repeat(40));
    
    const resources = this.generateLearningResources(review);
    
    if (resources.length === 0) {
      this.log('✨ No specific learning recommendations - keep up the good work!', 'info');
      return;
    }

    resources.forEach((resource, index) => {
      console.log(`\n${index + 1}. ${resource.title}`);
      console.log(`   Category: ${resource.category}`);
      console.log(`   📖 ${resource.description}`);
      if (resource.links.length > 0) {
        console.log(`   Links: ${resource.links.join(', ')}`);
      }
    });

    const saveResources = await this.interactiveUI.confirmAction('\nWould you like to save these resources?', false);
    
    if (saveResources) {
      try {
        const resourceContent = this.formatLearningResources(resources);
        await this.saveToFile('learning-resources.md', resourceContent);
        this.success('Learning resources saved to learning-resources.md');
      } catch (error) {
        this.log('Failed to save resources', 'error');
      }
    } else {
      this.log('Resources not saved', 'info');
    }
  }

  // Helper methods for interactive features

  private formatAsMarkdownTodo(items: any[], timestamp: string): string {
    const lines = [`# TODO - Code Review Action Items (${timestamp})\n`];
    
    items.forEach((item, index) => {
      lines.push(`## ${index + 1}. ${item.title}`);
      lines.push(`**Priority:** ${item.priority}`);
      lines.push(`**Effort:** ${item.estimatedEffort}`);
      if (item.file) lines.push(`**File:** ${item.file}${item.line ? `:${item.line}` : ''}`);
      lines.push(`**Description:** ${item.description}`);
      if (item.suggestion) lines.push(`**Solution:** ${item.suggestion}`);
      lines.push('');
    });
    
    return lines.join('\n');
  }

  private formatAsGitHubIssues(items: any[], timestamp: string): string {
    const lines = [`# GitHub Issues Export (${timestamp})\n`];
    
    items.forEach((item, index) => {
      const labels = [`priority:${item.priority}`, `type:code-review`];
      lines.push(`## Issue ${index + 1}: ${item.title}`);
      lines.push(`**Labels:** ${labels.join(', ')}`);
      lines.push(`**Description:** ${item.description}`);
      if (item.file) lines.push(`**File:** \`${item.file}${item.line ? `:${item.line}` : ''}\``);
      if (item.suggestion) lines.push(`**Acceptance Criteria:** ${item.suggestion}`);
      lines.push('---');
    });
    
    return lines.join('\n');
  }

  private async saveToFile(filename: string, content: string): Promise<void> {
    const fs = await import('fs').then(fs => fs.promises);
    await fs.writeFile(filename, content, 'utf-8');
  }

  private getFocusSpecificRules(focus: string): string[] {
    const rules: Record<string, string[]> = {
      security: ['Check for SQL injection vulnerabilities', 'Validate input sanitization', 'Review authentication logic'],
      performance: ['Look for N+1 queries', 'Check for unnecessary computations', 'Review caching strategies'],
      testing: ['Ensure adequate test coverage', 'Check for edge case testing', 'Review test quality'],
      maintainability: ['Check code complexity', 'Review documentation', 'Ensure consistent patterns']
    };
    
    return rules[focus] || [];
  }

  private generateLearningResources(review: SessionReview): Array<{title: string; category: string; description: string; links: string[]}> {
    const resources: Array<{title: string; category: string; description: string; links: string[]}> = [];
    
    // Analyze review to suggest relevant resources
    const hasSecurityIssues = review.actionableItems.some(item => item.title.toLowerCase().includes('security'));
    const hasPerformanceIssues = review.actionableItems.some(item => item.title.toLowerCase().includes('performance'));
    const hasTestingIssues = review.actionableItems.some(item => item.title.toLowerCase().includes('test'));
    
    if (hasSecurityIssues) {
      resources.push({
        title: 'Secure Coding Practices',
        category: 'Security',
        description: 'Learn about common security vulnerabilities and how to prevent them',
        links: ['https://owasp.org/www-project-top-ten/', 'https://cheatsheetseries.owasp.org/']
      });
    }
    
    if (hasPerformanceIssues) {
      resources.push({
        title: 'Performance Optimization Techniques',
        category: 'Performance',
        description: 'Strategies for improving application performance and scalability',
        links: ['https://web.dev/performance/', 'https://developers.google.com/web/fundamentals/performance']
      });
    }
    
    if (hasTestingIssues) {
      resources.push({
        title: 'Testing Best Practices',
        category: 'Testing',
        description: 'Comprehensive guide to writing effective tests',
        links: ['https://testing.googleblog.com/', 'https://martinfowler.com/testing/']
      });
    }
    
    return resources;
  }

  private formatLearningResources(resources: Array<{title: string; category: string; description: string; links: string[]}>): string {
    const lines = ['# Learning Resources\n'];
    
    resources.forEach(resource => {
      lines.push(`## ${resource.title}`);
      lines.push(`**Category:** ${resource.category}`);
      lines.push(`**Description:** ${resource.description}`);
      if (resource.links.length > 0) {
        lines.push('**Resources:**');
        resource.links.forEach(link => lines.push(`- ${link}`));
      }
      lines.push('');
    });
    
    return lines.join('\n');
  }

  private getPriorityWeight(priority: string): number {
    const weights = { critical: 0, high: 1, medium: 2, low: 3 };
    return weights[priority as keyof typeof weights] ?? 3;
  }

  private getPriorityIcon(priority: string): string {
    const icons = { critical: '🚨', high: '⚠️', medium: '📋', low: '💡' };
    return icons[priority as keyof typeof icons] ?? '📋';
  }

  private async handleBoundaryContextReview(flags: any): Promise<void> {
    this.startSpinner('Loading workflow boundary context...');

    try {
      // Load workflow context
      const workflowContext = await this.workflowManager.loadContext();
      
      if (!workflowContext) {
        this.stopSpinner(false, 'No workflow context found');
        this.log('❌ No active workflow context found.', 'error');
        this.log('Run `mastro split --flow` to start a workflow chain.', 'info');
        return;
      }

      // Get current boundary
      const currentBoundary = await this.workflowManager.getCurrentBoundary();
      
      if (!currentBoundary) {
        this.stopSpinner(false, 'Workflow complete');
        this.log('✅ All boundaries have been processed in this workflow.', 'info');
        this.log('Run `mastro flow --continue` to finish the workflow.', 'info');
        return;
      }

      this.stopSpinner(true, `Loaded boundary ${workflowContext.currentBoundaryIndex + 1}/${workflowContext.boundaries.length}`);

      // Display boundary overview
      this.displayBoundaryOverview(currentBoundary, workflowContext);

      // Create boundary-focused session
      const boundarySession = await this.createBoundarySession(currentBoundary);

      // Create review persona
      const persona = this.createReviewPersona(flags);

      // Perform focused boundary review
      let review: SessionReview;

      if (flags.stream && flags.format === 'terminal') {
        review = await this.performStreamingReview(boundarySession, persona);
        // Streaming review handles its own output, don't render again
      } else {
        review = await this.performStandardReview(boundarySession, persona);
        // Output results based on format for non-streaming reviews
        await this.outputResults(review, flags);
      }

      // Add workflow-specific context to review
      review.workflowSuggestions = [
        ...review.workflowSuggestions,
        {
          type: 'commit-split',
          description: `This is boundary ${workflowContext.currentBoundaryIndex + 1} of ${workflowContext.boundaries.length} in the current workflow`,
          benefit: 'Ensures each commit represents a logical, atomic change',
          effort: 'low'
        }
      ];

      // Display workflow-specific next steps
      await this.displayWorkflowNextSteps(workflowContext, review);

      // Interactive mode
      if (flags.interactive) {
        await this.enterInteractiveMode(review, boundarySession);
      }

    } catch (error) {
      this.stopSpinner(false, 'Failed to load boundary context');
      throw error;
    }
  }

  private displayBoundaryOverview(boundary: any, context: any): void {
    this.log('\n🎯 Boundary Context Review');
    this.log('─'.repeat(30));
    this.log(`Workflow: ${context.sessionId.substring(0, 8)}`);
    this.log(`Boundary: ${context.currentBoundaryIndex + 1}/${context.boundaries.length}`);
    this.log(`Theme: ${boundary.theme}`);
    this.log(`Files: ${boundary.files.length}`);
    this.log(`Priority: ${boundary.priority}`);
    
    if (boundary.dependencies.length > 0) {
      this.log(`Dependencies: ${boundary.dependencies.join(', ')}`);
    }
    
    this.log('');
    
    // List staged files for this boundary
    this.log('📋 Files in this boundary:');
    boundary.files.forEach((file: any) => {
      console.log(`  ✓ ${file.file} (+${file.insertions} -${file.deletions})`);
    });
    
    this.log('');
  }

  private async createBoundarySession(boundary: any): Promise<DevelopmentSession> {
    this.startSpinner('Creating boundary-focused session...');
    
    try {
      // Get staged changes that match this boundary
      const stagedChanges = await this.gitAnalyzer.getStagedChanges();
      
      // Filter to only include files from this boundary
      const boundaryFiles = new Set(boundary.files.map((f: any) => f.file));
      const boundaryChanges = stagedChanges.filter(change => boundaryFiles.has(change.file));
      
      if (boundaryChanges.length === 0) {
        throw new Error('No staged changes found for current boundary. Run `mastro split --flow` to stage boundary files.');
      }

      // Validation: Ensure boundary file count matches what we expect
      if (boundaryChanges.length !== boundary.files.length) {
        console.warn(`Warning: Boundary contains ${boundary.files.length} files but only ${boundaryChanges.length} are staged.`);
        console.warn(`Expected files: ${boundary.files.map((f: any) => f.file).join(', ')}`);
        console.warn(`Staged files: ${boundaryChanges.map(c => c.file).join(', ')}`);
      }

      // Create a focused session for this boundary
      const session: DevelopmentSession = {
        id: `boundary-${boundary.id}`,
        startTime: new Date(),
        baseCommit: await this.gitAnalyzer.getCurrentCommit(),
        baseBranch: await this.gitAnalyzer.getCurrentBranch(),
        workingChanges: [],
        stagedChanges: boundaryChanges,
        cumulativeStats: {
          totalFiles: boundaryChanges.length,
          totalInsertions: boundaryChanges.reduce((sum, change) => sum + change.insertions, 0),
          totalDeletions: boundaryChanges.reduce((sum, change) => sum + change.deletions, 0),
          changedLines: boundaryChanges.reduce((sum, change) => sum + change.insertions + change.deletions, 0),
          complexity: boundary.estimatedComplexity || 'medium',
          duration: 0
        },
        riskAssessment: {
          level: 'low',
          factors: [],
          recommendations: [`Focus on ${boundary.theme}`, 'Ensure atomic commit scope']
        },
        patterns: [{
          type: 'feature-branch',
          confidence: 0.8,
          evidence: [`Working on: ${boundary.theme}`]
        }]
      };

      // Debug logging for consistency checking
      console.log(`Boundary session created: ${boundaryChanges.length} files, +${session.cumulativeStats.totalInsertions}/-${session.cumulativeStats.totalDeletions}`);

      this.stopSpinner(true, 'Boundary session created');
      return session;
      
    } catch (error) {
      this.stopSpinner(false, 'Failed to create boundary session');
      throw error;
    }
  }

  private async displayWorkflowNextSteps(context: any, review: SessionReview): Promise<void> {
    const hasBlockers = review.actionableItems.some(item => item.priority === 'critical' || item.priority === 'high');
    
    console.log('\n🚀 Workflow Next Steps');
    console.log('─'.repeat(25));
    console.log(`Progress: ${context.currentBoundaryIndex + 1}/${context.boundaries.length} boundaries processed`);
    
    if (context.currentBoundaryIndex < context.boundaries.length - 1) {
      const nextBoundary = context.boundaries[context.currentBoundaryIndex + 1];
      console.log(`Next boundary: ${nextBoundary.theme} (${nextBoundary.files.length} files)`);
    }
    console.log('');
    
    // Always show blockers/action steps even in boundary-context mode
    if (hasBlockers) {
      console.log('⚠️ High-priority issues found:');
      review.actionableItems
        .filter(item => item.priority === 'critical' || item.priority === 'high')
        .slice(0, 3)
        .forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.title} (${item.file})`);
        });
      console.log('');
      
      // Only show interactive workflow continuation if not in suppress mode
      if (!this.suppressNextActions) {
        await this.handleBlockerWorkflow(review, context);
      }
    } else {
      console.log('✅ Boundary looks good!');
      
      // Only show interactive workflow continuation if not in suppress mode  
      if (!this.suppressNextActions) {
        await this.handleSuccessWorkflow(context);
      }
    }
  }

  private async handleBlockerWorkflow(review: SessionReview, context: any): Promise<void> {
    const options = [
      'Fix issues and retry review',
      'View detailed issue analysis',
      'Proceed anyway (not recommended)',
      'Exit workflow'
    ];

    try {
      const choice = await this.interactiveUI.selectIndex('Choose next action:', options);
      
      switch (choice) {
        case 0: // Fix issues and retry
          console.log('📝 After fixing the issues, this review will automatically retry.');
          const shouldRetry = await this.interactiveUI.confirmAction('Have you fixed the issues? Ready to retry review?', true);
          if (shouldRetry) {
            // Re-run the boundary context review
            await this.handleBoundaryContextReview({ 'boundary-context': true, stream: true, format: 'terminal' });
          }
          break;
          
        case 1: // View detailed analysis
          console.log('\n🔍 Detailed Issue Analysis:');
          const criticalIssues = review.actionableItems.filter(item => item.priority === 'critical' || item.priority === 'high');
          criticalIssues.forEach((item, index) => {
            console.log(`\n${index + 1}. ${item.title}`);
            console.log(`   File: ${item.file}${item.line ? `:${item.line}` : ''}`);
            console.log(`   Priority: ${item.priority} | Effort: ${item.estimatedEffort}`);
            console.log(`   ${item.description}`);
            if (item.suggestion) {
              console.log(`   💡 Suggestion: ${item.suggestion}`);
            }
          });
          
          // After showing details, ask if they want to fix issues
          const shouldFixAfterDetails = await this.interactiveUI.confirmAction('\nWould you like to fix these issues now?', true);
          if (shouldFixAfterDetails) {
            await this.handleBlockerWorkflow(review, context);
          }
          break;
          
        case 2: // Proceed anyway
          const confirmProceed = await this.interactiveUI.confirmAction('⚠️ This is not recommended. Are you sure you want to proceed with high-priority issues?', false);
          if (confirmProceed) {
            // Return control to flow; do not show further prompts here
            return;
          } else {
            await this.handleBlockerWorkflow(review, context);
          }
          break;
          
        case 3: // Exit
        default:
          console.log('👋 Exiting workflow. Fix the issues and run the review again when ready.');
          break;
      }
    } catch (error) {
      console.error('Error in blocker workflow:', error);
      console.log('👋 Exiting due to error.');
    }
  }

  private async handleSuccessWorkflow(context: any): Promise<void> {
    if (this.suppressNextActions) {
      // In boundary-context mode, avoid extra prompts and return to flow
      return;
    }
    const options = [
      'Commit this boundary',
      'Continue to next boundary',
      'Review boundary again',
      'Exit workflow'
    ];

    try {
      const choice = await this.interactiveUI.selectIndex('Choose next action:', options);
      
      switch (choice) {
        case 0: // Commit boundary
          console.log('🔄 Proceeding to commit this boundary...');
          // This would trigger the commit command
          console.log('Run: mastro commit');
          break;
          
        case 1: // Continue to next boundary
          if (context.currentBoundaryIndex < context.boundaries.length - 1) {
            console.log('🔄 Continuing to next boundary...');
            // This would trigger the flow continue command
            console.log('Run: mastro flow --continue');
          } else {
            console.log('✅ This is the last boundary. Ready to commit!');
            await this.handleSuccessWorkflow(context);
          }
          break;
          
        case 2: // Review again
          const shouldReview = await this.interactiveUI.confirmAction('Re-run boundary review?', true);
          if (shouldReview) {
            await this.handleBoundaryContextReview({ 'boundary-context': true, stream: true, format: 'terminal' });
          }
          break;
          
        case 3: // Exit
        default:
          console.log(`👋 Workflow paused. Progress: ${context.currentBoundaryIndex + 1}/${context.boundaries.length} boundaries completed.`);
          console.log('Resume anytime with: mastro flow --continue');
          break;
      }
    } catch (error) {
      console.error('Error in success workflow:', error);
      console.log('👋 Exiting due to error.');
    }
  }
}