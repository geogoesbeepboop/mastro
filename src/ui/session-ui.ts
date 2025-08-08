import chalk from 'chalk';
import {LoadingStateManager, StreamingIndicator} from './loading-states.js';
import type {
  DevelopmentSession,
  SessionStats,
  SessionRisk,
  SessionPattern,
  ActionableItem,
  WorkflowSuggestion,
  MastroConfig
} from '../types/index.js';

export class SessionUI {
  private loadingManager: LoadingStateManager;
  private config: MastroConfig;

  constructor(config: MastroConfig) {
    this.config = config;
    this.loadingManager = new LoadingStateManager(config);
  }

  displaySessionOverview(session: DevelopmentSession): void {
    const output: string[] = [];
    
    // Header
    output.push(chalk.cyan.bold('\n📊 Development Session Overview'));
    output.push(chalk.gray('─'.repeat(50)));
    
    // Session metadata
    output.push(`${chalk.gray('Session ID:')} ${chalk.white(session.id.substring(0, 8))}`);
    output.push(`${chalk.gray('Started:')} ${chalk.white(session.startTime.toLocaleTimeString())}`);
    output.push(`${chalk.gray('Base Branch:')} ${chalk.white(session.baseBranch)}`);
    output.push(`${chalk.gray('Base Commit:')} ${chalk.white(session.baseCommit.substring(0, 8))}`);
    output.push('');
    
    // Statistics
    this.displaySessionStats(session.cumulativeStats, output);
    output.push('');
    
    // Risk assessment
    this.displayRiskAssessment(session.riskAssessment, output);
    output.push('');
    
    // Patterns
    if (session.patterns.length > 0) {
      this.displaySessionPatterns(session.patterns, output);
      output.push('');
    }
    
    console.log(output.join('\n'));
  }

  displaySessionStats(stats: SessionStats, output?: string[]): void {
    const lines = output || [];
    
    lines.push(chalk.blue.bold('📈 Session Statistics'));
    lines.push(chalk.gray('─'.repeat(25)));
    
    // File stats with icons
    lines.push(`${this.getStatsIcon('files')} Files changed: ${chalk.white.bold(stats.totalFiles.toString())}`);
    lines.push(`${this.getStatsIcon('lines')} Lines modified: ${chalk.green(`+${stats.totalInsertions}`)} ${chalk.red(`-${stats.totalDeletions}`)}`);
    lines.push(`${this.getStatsIcon('complexity')} Complexity: ${this.formatComplexity(stats.complexity)}`);
    lines.push(`${this.getStatsIcon('duration')} Duration: ${chalk.white(this.formatDuration(stats.duration))}`);
    
    if (!output) {
      console.log(lines.join('\n'));
    }
  }

  displayRiskAssessment(risk: SessionRisk, output?: string[]): void {
    const lines = output || [];
    
    lines.push(chalk.yellow.bold('⚠️  Risk Assessment'));
    lines.push(chalk.gray('─'.repeat(25)));
    
    // Risk level with color coding
    const riskColor = this.getRiskColor(risk.level);
    lines.push(`${this.getRiskIcon(risk.level)} Risk Level: ${chalk[riskColor].bold(risk.level.toUpperCase())}`);
    
    // Risk factors
    if (risk.factors.length > 0) {
      lines.push(`${chalk.gray('Factors:')}`);
      risk.factors.forEach(factor => {
        const impactColor = factor.impact === 'high' ? 'red' : factor.impact === 'medium' ? 'yellow' : 'gray';
        lines.push(`  • ${chalk[impactColor](factor.description)}`);
      });
    }
    
    // Recommendations
    if (risk.recommendations.length > 0) {
      lines.push(`${chalk.gray('Recommendations:')}`);
      risk.recommendations.slice(0, 3).forEach(rec => {
        lines.push(`  💡 ${chalk.cyan(rec)}`);
      });
    }
    
    if (!output) {
      console.log(lines.join('\n'));
    }
  }

  displaySessionPatterns(patterns: SessionPattern[], output?: string[]): void {
    const lines = output || [];
    
    lines.push(chalk.magenta.bold('🔍 Detected Patterns'));
    lines.push(chalk.gray('─'.repeat(25)));
    
    patterns.forEach(pattern => {
      const icon = this.getPatternIcon(pattern.type);
      const confidenceBar = '█'.repeat(Math.round(pattern.confidence * 10));
      
      lines.push(`${icon} ${chalk.white.bold(this.formatPatternName(pattern.type))}`);
      lines.push(`   Confidence: ${chalk.gray(confidenceBar)} ${Math.round(pattern.confidence * 100)}%`);
      
      if (pattern.evidence.length > 0) {
        lines.push(`   Evidence: ${chalk.gray(pattern.evidence[0])}`);
      }
      lines.push('');
    });
    
    if (!output) {
      console.log(lines.join('\n'));
    }
  }

  displaySessionProgress(
    currentStep: string, 
    totalSteps: number, 
    completedSteps: number,
    details?: string
  ): void {
    const progress = Math.round((completedSteps / totalSteps) * 100);
    const progressBar = this.createProgressBar(progress);
    
    console.log(`\n${chalk.cyan.bold('Session Progress')}`);
    console.log(`${progressBar} ${progress}%`);
    console.log(`${chalk.gray('Current:')} ${currentStep}`);
    
    if (details) {
      console.log(`${chalk.gray('Details:')} ${details}`);
    }
  }

  displayActionableItemsSummary(items: ActionableItem[]): void {
    if (items.length === 0) {
      console.log(chalk.green('\n✨ No actionable items - great work!'));
      return;
    }

    const output: string[] = [];
    output.push(chalk.yellow.bold('\n🎯 Actionable Items Summary'));
    output.push(chalk.gray('─'.repeat(35)));
    
    // Group by priority
    const grouped = this.groupActionablesByPriority(items);
    
    Object.entries(grouped).forEach(([priority, priorityItems]) => {
      if (priorityItems.length > 0) {
        const color = this.getPriorityColor(priority);
        const icon = this.getPriorityIcon(priority);
        output.push(`${icon} ${chalk[color].bold(priority.toUpperCase())}: ${priorityItems.length} items`);
        
        // Show top items for each priority
        priorityItems.slice(0, 2).forEach(item => {
          output.push(`   • ${item.title}`);
        });
        
        if (priorityItems.length > 2) {
          output.push(`   ... and ${priorityItems.length - 2} more`);
        }
        output.push('');
      }
    });
    
    console.log(output.join('\n'));
  }

  displayWorkflowSuggestions(suggestions: WorkflowSuggestion[]): void {
    if (suggestions.length === 0) {
      return;
    }

    const output: string[] = [];
    output.push(chalk.blue.bold('\n💡 Workflow Suggestions'));
    output.push(chalk.gray('─'.repeat(30)));
    
    suggestions.slice(0, 3).forEach(suggestion => {
      const icon = this.getWorkflowIcon(suggestion.type);
      const effortColor = this.getEffortColor(suggestion.effort);
      
      output.push(`${icon} ${chalk.white.bold(suggestion.description)}`);
      output.push(`   ${chalk.gray('Benefit:')} ${suggestion.benefit}`);
      output.push(`   ${chalk.gray('Effort:')} ${chalk[effortColor](suggestion.effort)}`);
      output.push('');
    });
    
    console.log(output.join('\n'));
  }

  createSessionComparisonView(current: DevelopmentSession, previous?: DevelopmentSession): void {
    const output: string[] = [];
    
    output.push(chalk.cyan.bold('\n📊 Session Comparison'));
    output.push(chalk.gray('─'.repeat(35)));
    
    if (!previous) {
      output.push(chalk.gray('No previous session to compare against'));
      console.log(output.join('\n'));
      return;
    }
    
    output.push(`${chalk.white('Current Session')} vs ${chalk.gray('Previous Session')}`);
    output.push('');
    
    // Compare stats
    const currentStats = current.cumulativeStats;
    const prevStats = previous.cumulativeStats;
    
    output.push(this.formatComparison('Files', currentStats.totalFiles, prevStats.totalFiles));
    output.push(this.formatComparison('Lines', currentStats.changedLines, prevStats.changedLines));
    output.push(this.formatComparison('Duration (min)', currentStats.duration, prevStats.duration));
    
    // Compare complexity
    const complexityComparison = this.compareComplexity(currentStats.complexity, prevStats.complexity);
    output.push(`Complexity: ${complexityComparison}`);
    
    console.log(output.join('\n'));
  }

  showInteractiveSessionMenu(): void {
    const output: string[] = [];
    
    output.push(chalk.cyan.bold('\n🎛️  Session Actions'));
    output.push(chalk.gray('─'.repeat(25)));
    output.push('1. 📊 View detailed statistics');
    output.push('2. 🔍 Run code review');
    output.push('3. 📝 Create PR');
    output.push('4. 🎯 Show actionable items');
    output.push('5. 💡 Get workflow suggestions');
    output.push('6. 🔄 Reset session');
    output.push('7. ❌ Exit');
    output.push('');
    output.push(chalk.gray('Select an option (1-7):'));
    
    console.log(output.join('\n'));
  }

  displaySessionHistory(sessions: DevelopmentSession[], limit = 5): void {
    const output: string[] = [];
    
    output.push(chalk.cyan.bold('\n📚 Recent Sessions'));
    output.push(chalk.gray('─'.repeat(30)));
    
    const recentSessions = sessions.slice(0, limit);
    
    recentSessions.forEach((session, index) => {
      const stats = session.cumulativeStats;
      const age = this.formatTimeAgo(session.startTime);
      const complexityColor = this.getComplexityColor(stats.complexity);
      
      output.push(`${index + 1}. ${chalk.gray(session.id.substring(0, 8))} ${chalk.gray(age)}`);
      output.push(`   ${stats.totalFiles} files, ${stats.changedLines} lines, ${chalk[complexityColor](stats.complexity)}`);
      
      if (session.patterns.length > 0) {
        const mainPattern = session.patterns[0];
        output.push(`   Pattern: ${chalk.magenta(this.formatPatternName(mainPattern.type))}`);
      }
      
      output.push('');
    });
    
    if (sessions.length > limit) {
      output.push(chalk.gray(`... and ${sessions.length - limit} more sessions`));
    }
    
    console.log(output.join('\n'));
  }

  createLiveSessionMonitor(): SessionMonitor {
    return new SessionMonitor(this.config, this.loadingManager);
  }

  // Helper methods
  private createProgressBar(percentage: number, width = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    const filledBar = chalk.green('█'.repeat(filled));
    const emptyBar = chalk.gray('░'.repeat(empty));
    
    return `[${filledBar}${emptyBar}]`;
  }

  private groupActionablesByPriority(items: ActionableItem[]): Record<string, ActionableItem[]> {
    return items.reduce((groups, item) => {
      const priority = item.priority;
      groups[priority] = groups[priority] || [];
      groups[priority].push(item);
      return groups;
    }, {} as Record<string, ActionableItem[]>);
  }

  private formatComparison(label: string, current: number, previous: number): string {
    const diff = current - previous;
    const diffPercent = previous === 0 ? 100 : Math.round((diff / previous) * 100);
    
    let indicator = '';
    let color = 'white';
    
    if (diff > 0) {
      indicator = '↑';
      color = 'red';
    } else if (diff < 0) {
      indicator = '↓';
      color = 'green';
    } else {
      indicator = '→';
      color = 'gray';
    }
    
    return `${label}: ${current} ${(chalk as any)[color](`${indicator} ${Math.abs(diffPercent)}%`)}`;
  }

  private compareComplexity(current: string, previous: string): string {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(current);
    const prevIndex = levels.indexOf(previous);
    
    if (currentIndex > prevIndex) {
      return `${this.formatComplexity(current)} ${chalk.red('↑ increased')}`;
    } else if (currentIndex < prevIndex) {
      return `${this.formatComplexity(current)} ${chalk.green('↓ decreased')}`;
    } else {
      return `${this.formatComplexity(current)} ${chalk.gray('→ unchanged')}`;
    }
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  }

  // Icon and color helper methods
  private getStatsIcon(type: string): string {
    const icons = {
      files: '📁',
      lines: '📝',
      complexity: '🧩',
      duration: '⏱️'
    };
    return icons[type as keyof typeof icons] || '📊';
  }

  private getRiskIcon(level: string): string {
    const icons = {
      low: '✅',
      medium: '⚠️',
      high: '🔶',
      critical: '🚨'
    };
    return icons[level as keyof typeof icons] || '❓';
  }

  private getRiskColor(level: string): 'green' | 'yellow' | 'red' | 'gray' {
    const colors = {
      low: 'green' as const,
      medium: 'yellow' as const,
      high: 'red' as const,
      critical: 'red' as const
    };
    return colors[level as keyof typeof colors] || 'gray';
  }

  private getPatternIcon(type: string): string {
    const icons = {
      'rapid-iteration': '🔄',
      'feature-branch': '🌿',
      'refactoring': '🔨',
      'bug-fixing': '🐛'
    };
    return icons[type as keyof typeof icons] || '🔍';
  }

  private formatPatternName(type: string): string {
    return type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private formatComplexity(complexity: string): string {
    const colors = {
      low: 'green',
      medium: 'yellow', 
      high: 'red',
      critical: 'red'
    } as const;
    
    const color = colors[complexity as keyof typeof colors] || 'gray';
    return (chalk as any)[color].bold(complexity.toUpperCase());
  }

  private getComplexityColor(complexity: string): 'green' | 'yellow' | 'red' | 'gray' {
    const colors = {
      low: 'green' as const,
      medium: 'yellow' as const,
      high: 'red' as const,
      critical: 'red' as const
    };
    return colors[complexity as keyof typeof colors] || 'gray';
  }

  private getPriorityColor(priority: string): 'red' | 'yellow' | 'blue' | 'gray' {
    const colors = {
      critical: 'red' as const,
      high: 'yellow' as const,
      medium: 'blue' as const,
      low: 'gray' as const
    };
    return colors[priority as keyof typeof colors] || 'gray';
  }

  private getPriorityIcon(priority: string): string {
    const icons = {
      critical: '🚨',
      high: '⚠️',
      medium: '📋',
      low: '💡'
    };
    return icons[priority as keyof typeof icons] || '📋';
  }

  private getWorkflowIcon(type: string): string {
    const icons = {
      'commit-split': '📦',
      'refactoring': '🔄',
      'testing': '🧪',
      'documentation': '📚'
    };
    return icons[type as keyof typeof icons] || '💡';
  }

  private getEffortColor(effort: string): 'green' | 'yellow' | 'red' {
    const colors = {
      low: 'green' as const,
      medium: 'yellow' as const,
      high: 'red' as const
    };
    return colors[effort as keyof typeof colors] || 'yellow';
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}

// Live session monitoring component
export class SessionMonitor {
  private config: MastroConfig;
  private loadingManager: LoadingStateManager;
  private isMonitoring = false;
  private currentIndicator?: StreamingIndicator;

  constructor(config: MastroConfig, loadingManager: LoadingStateManager) {
    this.config = config;
    this.loadingManager = loadingManager;
  }

  startMonitoring(session: DevelopmentSession): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.currentIndicator = this.loadingManager.startStreamingIndicator(`Monitoring session ${session.id.substring(0, 8)}`);
    
    console.log(chalk.cyan.bold('\n🔴 Live Session Monitoring Started'));
    console.log(chalk.gray(`Session: ${session.id.substring(0, 8)} | Branch: ${session.baseBranch}`));
    console.log(chalk.gray('Press Ctrl+C to stop monitoring\n'));
  }

  updateProgress(message: string, progress?: number): void {
    if (this.currentIndicator) {
      if (progress !== undefined) {
        this.currentIndicator.updateProgress(progress);
      } else {
        this.currentIndicator.nextPhase();
      }
    }
    
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${chalk.gray(`[${timestamp}]`)} ${message}`);
  }

  stopMonitoring(message = 'Session monitoring stopped'): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.currentIndicator) {
      this.currentIndicator.complete(message);
      this.currentIndicator = undefined;
    }
    
    console.log(chalk.green.bold('\n✅ Session Monitoring Stopped'));
  }

  displayRealtimeStats(stats: SessionStats): void {
    if (!this.isMonitoring) return;
    
    const output = [
      `Files: ${stats.totalFiles}`,
      `Lines: +${stats.totalInsertions}/-${stats.totalDeletions}`,
      `Duration: ${stats.duration}m`,
      `Complexity: ${stats.complexity}`
    ].join(' | ');
    
    process.stdout.write(`\r${chalk.blue('📊')} ${output}`);
  }
}