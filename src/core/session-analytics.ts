import {writeFile, readFile, access, mkdir} from 'fs/promises';
import {resolve, dirname} from 'path';
import type {
  DevelopmentSession,
  SessionStats,
  SessionPattern,
  MastroConfig,
  GitChange
} from '../types/index.js';

export interface SessionAnalytics {
  sessionId: string;
  timestamp: Date;
  duration: number; // minutes
  productivity: ProductivityMetrics;
  focus: FocusMetrics;
  patterns: DetectedPattern[];
  quality: QualityMetrics;
  testingSuggestions: TestingSuggestion[];
}

export interface ProductivityMetrics {
  linesPerMinute: number;
  filesModifiedPerHour: number;
  commitFrequency: number; // commits per hour
  refactoringRatio: number; // % of changes that are refactoring
  velocityScore: number; // 0-100 overall productivity score
  peakHours: number[]; // hours of day when most productive
  optimalSessionLength: number; // minutes
}

export interface FocusMetrics {
  focusScore: number; // 0-100 based on consistency of changes
  distractionEvents: number; // context switches detected
  deepWorkSessions: number; // uninterrupted work periods > 25 minutes
  contextSwitchFrequency: number; // switches per hour
  focusSessionLength: number; // average deep work session length
}

export interface DetectedPattern {
  type: 'tdd' | 'refactor_first' | 'feature_branch' | 'hotfix' | 'spike' | 'cleanup';
  confidence: number; // 0-1
  evidence: string[];
  recommendations: string[];
  impact: 'positive' | 'neutral' | 'negative';
}

export interface QualityMetrics {
  testCoverageIncrease: number; // % increase in tests
  codeComplexityTrend: 'improving' | 'stable' | 'degrading';
  documentationRatio: number; // docs changes / code changes
  refactoringEfficiency: number; // improvement per refactoring effort
  bugFixRatio: number; // bug fixes / total changes
}

export interface TestingSuggestion {
  type: 'unit_test' | 'integration_test' | 'e2e_test';
  file: string;
  functionName?: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedEffort: string; // e.g., "5 minutes"
  testCode?: string; // AI-generated test skeleton
}

export interface SessionHistory {
  sessions: SessionAnalytics[];
  totalSessions: number;
  averageProductivity: ProductivityMetrics;
  personalBests: PersonalBests;
  trends: ProductivityTrends;
}

export interface PersonalBests {
  longestSession: number; // minutes
  mostProductiveSession: number; // velocity score
  bestFocusScore: number;
  mostFilesInSession: number;
  fastestCommitCycle: number; // minutes from start to commit
}

export interface ProductivityTrends {
  weeklyVelocity: number[]; // last 7 days
  monthlyQuality: number[]; // last 4 weeks
  focusImprovement: number; // % change over 30 days
  testingHabits: number; // % of sessions with new tests
  commitSizeOptimization: number; // trend toward smaller commits
}

/**
 * Advanced analytics engine for development sessions
 * Tracks productivity patterns, focus metrics, and provides actionable insights
 */
export class SessionAnalyticsEngine {
  private config: MastroConfig;
  private analyticsPath: string;
  private currentAnalytics?: SessionAnalytics;

  constructor(config: MastroConfig) {
    this.config = config;
    this.analyticsPath = resolve(process.cwd(), '.mastro', 'analytics.json');
  }

  /**
   * Start analytics tracking for a new session
   */
  async startSession(session: DevelopmentSession): Promise<SessionAnalytics> {
    this.currentAnalytics = {
      sessionId: session.id,
      timestamp: session.startTime,
      duration: 0,
      productivity: await this.initializeProductivityMetrics(),
      focus: this.initializeFocusMetrics(),
      patterns: [],
      quality: await this.initializeQualityMetrics(),
      testingSuggestions: []
    };

    return this.currentAnalytics;
  }

  /**
   * Update analytics with current session state
   */
  async updateSession(session: DevelopmentSession): Promise<SessionAnalytics> {
    if (!this.currentAnalytics) {
      return this.startSession(session);
    }

    this.currentAnalytics.duration = session.cumulativeStats.duration;
    this.currentAnalytics.productivity = await this.calculateProductivityMetrics(session);
    this.currentAnalytics.focus = this.calculateFocusMetrics(session);
    this.currentAnalytics.patterns = this.detectDevelopmentPatterns(session);
    this.currentAnalytics.quality = await this.calculateQualityMetrics(session);
    this.currentAnalytics.testingSuggestions = await this.generateTestingSuggestions(session);

    return this.currentAnalytics;
  }

  /**
   * Complete session and save analytics
   */
  async completeSession(session: DevelopmentSession): Promise<SessionAnalytics> {
    const analytics = await this.updateSession(session);
    await this.saveSessionAnalytics(analytics);
    return analytics;
  }

  /**
   * Get comprehensive session history and trends
   */
  async getSessionHistory(): Promise<SessionHistory> {
    try {
      const data = await readFile(this.analyticsPath, 'utf-8');
      const sessions: SessionAnalytics[] = JSON.parse(data).sessions || [];
      
      return {
        sessions,
        totalSessions: sessions.length,
        averageProductivity: this.calculateAverageProductivity(sessions),
        personalBests: this.calculatePersonalBests(sessions),
        trends: this.calculateTrends(sessions)
      };
    } catch (error) {
      // Return empty history if file doesn't exist
      return {
        sessions: [],
        totalSessions: 0,
        averageProductivity: await this.initializeProductivityMetrics(),
        personalBests: this.initializePersonalBests(),
        trends: this.initializeTrends()
      };
    }
  }

  /**
   * Get insights and recommendations based on session history
   */
  async getInsights(): Promise<string[]> {
    const history = await this.getSessionHistory();
    const insights: string[] = [];

    if (history.sessions.length < 3) {
      insights.push('Keep using mastro to build your productivity profile');
      return insights;
    }

    // Productivity insights
    const avgProductivity = history.averageProductivity.velocityScore;
    if (avgProductivity > 80) {
      insights.push('🚀 Your productivity score is excellent! Consider sharing your workflow with the team');
    } else if (avgProductivity > 60) {
      insights.push('📈 Good productivity trend! Focus on reducing context switches to reach the next level');
    } else {
      insights.push('💡 Opportunity for improvement: Try shorter, focused coding sessions with clear goals');
    }

    // Focus insights
    const recentSessions = history.sessions.slice(-5);
    const avgFocus = recentSessions.reduce((sum, s) => sum + s.focus.focusScore, 0) / recentSessions.length;
    
    if (avgFocus > 75) {
      insights.push('🎯 Excellent focus! Your deep work sessions are paying off');
    } else if (avgFocus < 50) {
      insights.push('⚠️ Consider using Focus Mode to minimize distractions during coding sessions');
    }

    // Testing insights
    const testingSessions = recentSessions.filter(s => s.quality.testCoverageIncrease > 0).length;
    const testingRatio = testingSessions / recentSessions.length;
    
    if (testingRatio > 0.8) {
      insights.push('✅ Great testing discipline! Your code quality is improving consistently');
    } else if (testingRatio < 0.3) {
      insights.push('🧪 Consider adding tests more frequently - it improves long-term velocity');
    }

    // Pattern insights
    const commonPatterns = this.findCommonPatterns(recentSessions);
    if (commonPatterns.includes('tdd')) {
      insights.push('🔄 TDD pattern detected consistently - excellent development practice!');
    }
    if (commonPatterns.includes('refactor_first')) {
      insights.push('🛠️ Good refactoring habits - this leads to cleaner, more maintainable code');
    }

    // Optimal timing insights
    const peakHours = history.averageProductivity.peakHours;
    if (peakHours.length > 0) {
      const hourStr = peakHours.map(h => `${h}:00`).join(', ');
      insights.push(`⏰ Your peak productivity hours: ${hourStr}. Schedule complex work during these times`);
    }

    // Session length insights
    const optimalLength = history.averageProductivity.optimalSessionLength;
    if (optimalLength < 60) {
      insights.push('⚡ Short, focused sessions work well for you - consider timeboxing complex tasks');
    } else if (optimalLength > 120) {
      insights.push('🏃‍♂️ You thrive in longer sessions - ensure you take breaks to maintain quality');
    }

    return insights;
  }

  // Private helper methods

  private async initializeProductivityMetrics(): Promise<ProductivityMetrics> {
    return {
      linesPerMinute: 0,
      filesModifiedPerHour: 0,
      commitFrequency: 0,
      refactoringRatio: 0,
      velocityScore: 0,
      peakHours: [],
      optimalSessionLength: 60
    };
  }

  private initializeFocusMetrics(): FocusMetrics {
    return {
      focusScore: 100,
      distractionEvents: 0,
      deepWorkSessions: 0,
      contextSwitchFrequency: 0,
      focusSessionLength: 0
    };
  }

  private async initializeQualityMetrics(): Promise<QualityMetrics> {
    return {
      testCoverageIncrease: 0,
      codeComplexityTrend: 'stable',
      documentationRatio: 0,
      refactoringEfficiency: 0,
      bugFixRatio: 0
    };
  }

  private async calculateProductivityMetrics(session: DevelopmentSession): Promise<ProductivityMetrics> {
    const totalLines = session.cumulativeStats.totalInsertions + session.cumulativeStats.totalDeletions;
    const durationHours = session.cumulativeStats.duration / 60;
    
    const linesPerMinute = session.cumulativeStats.duration > 0 ? totalLines / session.cumulativeStats.duration : 0;
    const filesModifiedPerHour = durationHours > 0 ? session.cumulativeStats.totalFiles / durationHours : 0;
    
    // Calculate velocity score based on multiple factors
    const velocityScore = Math.min(100, Math.round(
      (linesPerMinute * 10) + 
      (filesModifiedPerHour * 5) + 
      (session.cumulativeStats.complexity === 'low' ? 20 : session.cumulativeStats.complexity === 'medium' ? 10 : 0)
    ));

    const refactoringChanges = this.countRefactoringChanges(session.workingChanges.concat(session.stagedChanges));
    const refactoringRatio = totalLines > 0 ? refactoringChanges / totalLines : 0;

    return {
      linesPerMinute,
      filesModifiedPerHour,
      commitFrequency: 0, // Would need commit history to calculate
      refactoringRatio,
      velocityScore,
      peakHours: [new Date().getHours()], // Current hour as peak (simplified)
      optimalSessionLength: Math.max(30, Math.min(120, session.cumulativeStats.duration))
    };
  }

  private calculateFocusMetrics(session: DevelopmentSession): FocusMetrics {
    // Simplified focus calculation based on file consistency
    const allFiles = session.workingChanges.concat(session.stagedChanges);
    const uniqueFileTypes = new Set(allFiles.map(f => f.file.split('.').pop()));
    
    // High focus = working on fewer file types consistently
    const focusScore = Math.max(0, 100 - (uniqueFileTypes.size * 10));
    
    // Estimate context switches based on file type diversity
    const contextSwitches = Math.max(0, uniqueFileTypes.size - 1);
    const contextSwitchFrequency = session.cumulativeStats.duration > 0 ? 
      (contextSwitches * 60) / session.cumulativeStats.duration : 0;

    // Deep work sessions (simplified: if session > 25 minutes with high focus)
    const deepWorkSessions = session.cumulativeStats.duration > 25 && focusScore > 60 ? 1 : 0;

    return {
      focusScore: Math.round(focusScore),
      distractionEvents: contextSwitches,
      deepWorkSessions,
      contextSwitchFrequency,
      focusSessionLength: deepWorkSessions > 0 ? session.cumulativeStats.duration : 0
    };
  }

  private detectDevelopmentPatterns(session: DevelopmentSession): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const allChanges = session.workingChanges.concat(session.stagedChanges);
    
    // TDD Pattern Detection
    const testFiles = allChanges.filter(f => f.file.includes('.test.') || f.file.includes('.spec.'));
    const sourceFiles = allChanges.filter(f => !f.file.includes('.test.') && !f.file.includes('.spec.'));
    
    if (testFiles.length > 0 && sourceFiles.length > 0) {
      const testToSourceRatio = testFiles.length / sourceFiles.length;
      if (testToSourceRatio > 0.5) {
        patterns.push({
          type: 'tdd',
          confidence: Math.min(0.9, testToSourceRatio),
          evidence: [
            `${testFiles.length} test files modified alongside ${sourceFiles.length} source files`,
            'High test-to-source ratio suggests TDD approach'
          ],
          recommendations: [
            'Continue writing tests first',
            'Consider pairing test commits with implementation commits'
          ],
          impact: 'positive'
        });
      }
    }

    // Refactoring Pattern Detection
    const refactoringFiles = allChanges.filter(f => {
      const totalChanges = f.insertions + f.deletions;
      return totalChanges > 50 && Math.abs(f.insertions - f.deletions) < totalChanges * 0.3;
    });

    if (refactoringFiles.length > allChanges.length * 0.4) {
      patterns.push({
        type: 'refactor_first',
        confidence: 0.8,
        evidence: [
          `${refactoringFiles.length} files show balanced insertions/deletions`,
          'Suggests code restructuring rather than new features'
        ],
        recommendations: [
          'Continue refactoring in small, focused commits',
          'Consider adding integration tests after refactoring'
        ],
        impact: 'positive'
      });
    }

    // Cleanup Pattern Detection
    const docFiles = allChanges.filter(f => 
      f.file.includes('.md') || 
      f.file.includes('README') || 
      f.file.includes('doc')
    );

    if (docFiles.length > sourceFiles.length * 0.3) {
      patterns.push({
        type: 'cleanup',
        confidence: 0.7,
        evidence: [
          `${docFiles.length} documentation files being updated`,
          'High documentation activity suggests maintenance work'
        ],
        recommendations: [
          'Good documentation habits - keep this up',
          'Consider adding examples to documentation'
        ],
        impact: 'positive'
      });
    }

    return patterns;
  }

  private async calculateQualityMetrics(session: DevelopmentSession): Promise<QualityMetrics> {
    const allChanges = session.workingChanges.concat(session.stagedChanges);
    
    const testFiles = allChanges.filter(f => f.file.includes('.test.') || f.file.includes('.spec.'));
    const sourceFiles = allChanges.filter(f => !f.file.includes('.test.') && !f.file.includes('.spec.') && !f.file.includes('.md'));
    const docFiles = allChanges.filter(f => f.file.includes('.md') || f.file.includes('README'));
    
    const testCoverageIncrease = testFiles.length > 0 ? 
      (testFiles.reduce((sum, f) => sum + f.insertions, 0) / Math.max(1, sourceFiles.reduce((sum, f) => sum + f.insertions, 0))) * 100 : 0;
    
    const documentationRatio = sourceFiles.length > 0 ? docFiles.length / sourceFiles.length : 0;
    
    const bugFixFiles = allChanges.filter(f => 
      f.file.toLowerCase().includes('fix') || 
      allChanges.length < 3 // Small changes often indicate fixes
    );
    const bugFixRatio = bugFixFiles.length / Math.max(1, allChanges.length);

    return {
      testCoverageIncrease: Math.round(testCoverageIncrease),
      codeComplexityTrend: 'stable', // Would need historical data
      documentationRatio: Math.round(documentationRatio * 100) / 100,
      refactoringEfficiency: 0, // Would need before/after complexity analysis
      bugFixRatio: Math.round(bugFixRatio * 100) / 100
    };
  }

  private async generateTestingSuggestions(session: DevelopmentSession): Promise<TestingSuggestion[]> {
    const suggestions: TestingSuggestion[] = [];
    const sourceFiles = session.workingChanges.concat(session.stagedChanges)
      .filter(f => !f.file.includes('.test.') && !f.file.includes('.spec.') && !f.file.includes('.md'));
    
    for (const file of sourceFiles.slice(0, 3)) { // Limit suggestions to top 3 files
      const hasTest = session.workingChanges.concat(session.stagedChanges)
        .some(f => f.file.includes(file.file.replace(/\.[^.]+$/, '.test')));
      
      if (!hasTest && file.insertions > 20) {
        suggestions.push({
          type: 'unit_test',
          file: file.file,
          reason: `New functionality added (${file.insertions} lines) without corresponding tests`,
          priority: file.insertions > 50 ? 'high' : 'medium',
          estimatedEffort: file.insertions > 50 ? '15 minutes' : '5 minutes'
        });
      }
    }

    return suggestions;
  }

  // Helper methods for data persistence and analysis

  private async saveSessionAnalytics(analytics: SessionAnalytics): Promise<void> {
    try {
      await mkdir(dirname(this.analyticsPath), { recursive: true });
      
      let existingData: { sessions: SessionAnalytics[] } = { sessions: [] };
      
      try {
        const data = await readFile(this.analyticsPath, 'utf-8');
        existingData = JSON.parse(data);
      } catch (error) {
        // File doesn't exist, start fresh
      }

      existingData.sessions.push(analytics);
      
      // Keep only last 100 sessions to prevent file bloat
      if (existingData.sessions.length > 100) {
        existingData.sessions = existingData.sessions.slice(-100);
      }

      await writeFile(this.analyticsPath, JSON.stringify(existingData, null, 2));
    } catch (error) {
      console.warn('Could not save session analytics:', error);
    }
  }

  private calculateAverageProductivity(sessions: SessionAnalytics[]): ProductivityMetrics {
    if (sessions.length === 0) {
      return {
        linesPerMinute: 0,
        filesModifiedPerHour: 0,
        commitFrequency: 0,
        refactoringRatio: 0,
        velocityScore: 0,
        peakHours: [],
        optimalSessionLength: 60
      };
    }

    const sum = sessions.reduce((acc, session) => ({
      linesPerMinute: acc.linesPerMinute + session.productivity.linesPerMinute,
      filesModifiedPerHour: acc.filesModifiedPerHour + session.productivity.filesModifiedPerHour,
      commitFrequency: acc.commitFrequency + session.productivity.commitFrequency,
      refactoringRatio: acc.refactoringRatio + session.productivity.refactoringRatio,
      velocityScore: acc.velocityScore + session.productivity.velocityScore,
      optimalSessionLength: acc.optimalSessionLength + session.productivity.optimalSessionLength
    }), {
      linesPerMinute: 0,
      filesModifiedPerHour: 0,
      commitFrequency: 0,
      refactoringRatio: 0,
      velocityScore: 0,
      optimalSessionLength: 0
    });

    // Calculate most common peak hours
    const hourCounts = new Map<number, number>();
    sessions.forEach(session => {
      session.productivity.peakHours.forEach(hour => {
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });
    });

    const peakHours = Array.from(hourCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);

    return {
      linesPerMinute: Math.round(sum.linesPerMinute / sessions.length),
      filesModifiedPerHour: Math.round(sum.filesModifiedPerHour / sessions.length),
      commitFrequency: Math.round(sum.commitFrequency / sessions.length),
      refactoringRatio: Math.round((sum.refactoringRatio / sessions.length) * 100) / 100,
      velocityScore: Math.round(sum.velocityScore / sessions.length),
      peakHours,
      optimalSessionLength: Math.round(sum.optimalSessionLength / sessions.length)
    };
  }

  private calculatePersonalBests(sessions: SessionAnalytics[]): PersonalBests {
    if (sessions.length === 0) {
      return {
        longestSession: 0,
        mostProductiveSession: 0,
        bestFocusScore: 0,
        mostFilesInSession: 0,
        fastestCommitCycle: 0
      };
    }

    return {
      longestSession: Math.max(...sessions.map(s => s.duration)),
      mostProductiveSession: Math.max(...sessions.map(s => s.productivity.velocityScore)),
      bestFocusScore: Math.max(...sessions.map(s => s.focus.focusScore)),
      mostFilesInSession: Math.max(...sessions.map(s => s.productivity.filesModifiedPerHour)),
      fastestCommitCycle: Math.min(...sessions.map(s => s.duration).filter(d => d > 0))
    };
  }

  private calculateTrends(sessions: SessionAnalytics[]): ProductivityTrends {
    const recentSessions = sessions.slice(-28); // Last 28 sessions
    const last7 = recentSessions.slice(-7);
    
    return {
      weeklyVelocity: last7.map(s => s.productivity.velocityScore),
      monthlyQuality: [0, 0, 0, 0], // Would need more complex calculation
      focusImprovement: 0, // Would need comparison with older sessions
      testingHabits: (recentSessions.filter(s => s.quality.testCoverageIncrease > 0).length / Math.max(1, recentSessions.length)) * 100,
      commitSizeOptimization: 0 // Would need commit size tracking
    };
  }

  private countRefactoringChanges(changes: GitChange[]): number {
    return changes.filter(change => {
      const totalChanges = change.insertions + change.deletions;
      // Refactoring typically has balanced insertions/deletions
      return totalChanges > 10 && Math.abs(change.insertions - change.deletions) < totalChanges * 0.4;
    }).length;
  }

  private findCommonPatterns(sessions: SessionAnalytics[]): string[] {
    const patternCounts = new Map<string, number>();
    
    sessions.forEach(session => {
      session.patterns.forEach(pattern => {
        if (pattern.confidence > 0.6) {
          patternCounts.set(pattern.type, (patternCounts.get(pattern.type) || 0) + 1);
        }
      });
    });

    return Array.from(patternCounts.entries())
      .filter(([, count]) => count >= sessions.length * 0.3) // Pattern appears in 30%+ of sessions
      .map(([pattern]) => pattern);
  }

  private initializePersonalBests(): PersonalBests {
    return {
      longestSession: 0,
      mostProductiveSession: 0,
      bestFocusScore: 0,
      mostFilesInSession: 0,
      fastestCommitCycle: 0
    };
  }

  private initializeTrends(): ProductivityTrends {
    return {
      weeklyVelocity: [],
      monthlyQuality: [],
      focusImprovement: 0,
      testingHabits: 0,
      commitSizeOptimization: 0
    };
  }
}