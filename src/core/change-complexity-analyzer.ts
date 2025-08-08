import type {GitChange} from '../types/index.js';
import type {ChangeRankingResult} from './semantic-change-ranker.js';
import type {TokenBudget} from './token-budget-manager.js';

export interface ComplexityWarning {
  level: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  suggestions: string[];
  impact: {
    aiQuality: 'excellent' | 'good' | 'degraded' | 'poor';
    reviewability: 'easy' | 'moderate' | 'difficult' | 'very-difficult';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface ComplexityAnalysis {
  score: number; // 0-100, where 100 is most complex
  category: 'simple' | 'moderate' | 'complex' | 'very-complex';
  metrics: {
    fileCount: number;
    totalLines: number;
    criticalChanges: number;
    breakingChanges: number;
    testCoverage: number; // percentage
    frameworksAffected: number;
  };
  warnings: ComplexityWarning[];
  recommendations: string[];
  optimalSplitSuggestion?: {
    reason: string;
    suggestedCommits: Array<{
      title: string;
      files: string[];
      reasoning: string;
    }>;
  };
}

export class ChangeComplexityAnalyzer {
  private static readonly COMPLEXITY_THRESHOLDS = {
    files: {
      simple: 3,
      moderate: 8,
      complex: 15,
      veryComplex: 25
    },
    lines: {
      simple: 50,
      moderate: 200,
      complex: 500,
      veryComplex: 1000
    },
    criticalChanges: {
      simple: 0,
      moderate: 2,
      complex: 5,
      veryComplex: 10
    }
  };

  analyzeComplexity(
    changes: GitChange[],
    rankingResult?: ChangeRankingResult,
    tokenBudget?: TokenBudget
  ): ComplexityAnalysis {
    const metrics = this.calculateMetrics(changes, rankingResult);
    const score = this.calculateComplexityScore(metrics);
    const category = this.categorizeComplexity(score);
    
    const warnings = this.generateWarnings(metrics, category, tokenBudget);
    const recommendations = this.generateRecommendations(metrics, category, changes);
    const optimalSplitSuggestion = this.analyzeOptimalSplit(changes, metrics, category);

    return {
      score,
      category,
      metrics,
      warnings,
      recommendations,
      optimalSplitSuggestion
    };
  }

  private calculateMetrics(changes: GitChange[], rankingResult?: ChangeRankingResult) {
    const fileCount = changes.length;
    const totalLines = changes.reduce((sum, c) => sum + c.insertions + c.deletions, 0);
    
    // Count critical and breaking changes
    let criticalChanges = 0;
    let breakingChanges = 0;
    let testFiles = 0;
    const frameworksSet = new Set<string>();

    for (const change of changes) {
      // Count critical changes from ranking if available
      if (rankingResult) {
        const rankedChange = rankingResult.rankedChanges.find(rc => rc.file === change.file);
        if (rankedChange?.importance.category === 'critical') {
          criticalChanges++;
        }
      }

      // Detect breaking changes
      if (this.isBreakingChange(change)) {
        breakingChanges++;
      }

      // Count test files
      if (change.file.includes('test') || change.file.includes('spec')) {
        testFiles++;
      }

      // Detect frameworks
      this.detectFrameworks(change).forEach(fw => frameworksSet.add(fw));
    }

    const testCoverage = fileCount > 0 ? (testFiles / fileCount) * 100 : 0;

    return {
      fileCount,
      totalLines,
      criticalChanges,
      breakingChanges,
      testCoverage,
      frameworksAffected: frameworksSet.size
    };
  }

  private calculateComplexityScore(metrics: typeof this.calculateMetrics extends (...args: any[]) => infer R ? R : never): number {
    let score = 0;

    // File count impact (0-30 points)
    const fileScore = Math.min((metrics.fileCount / 30) * 30, 30);
    score += fileScore;

    // Total lines impact (0-25 points)
    const lineScore = Math.min((metrics.totalLines / 1500) * 25, 25);
    score += lineScore;

    // Critical changes impact (0-20 points)
    const criticalScore = Math.min((metrics.criticalChanges / 15) * 20, 20);
    score += criticalScore;

    // Breaking changes impact (0-15 points)
    const breakingScore = Math.min((metrics.breakingChanges / 5) * 15, 15);
    score += breakingScore;

    // Framework complexity (0-10 points)
    const frameworkScore = Math.min(metrics.frameworksAffected * 3, 10);
    score += frameworkScore;

    return Math.min(score, 100);
  }

  private categorizeComplexity(score: number): 'simple' | 'moderate' | 'complex' | 'very-complex' {
    if (score <= 25) return 'simple';
    if (score <= 50) return 'moderate';
    if (score <= 75) return 'complex';
    return 'very-complex';
  }

  private generateWarnings(
    metrics: ReturnType<typeof this.calculateMetrics>,
    category: string,
    tokenBudget?: TokenBudget
  ): ComplexityWarning[] {
    const warnings: ComplexityWarning[] = [];

    // File count warnings
    if (metrics.fileCount > ChangeComplexityAnalyzer.COMPLEXITY_THRESHOLDS.files.complex) {
      warnings.push({
        level: 'warning',
        title: 'Large File Count',
        message: `${metrics.fileCount} files changed. This may be difficult to review effectively.`,
        suggestions: [
          'Consider splitting into feature-focused commits',
          'Group related changes together',
          'Separate refactoring from new features'
        ],
        impact: {
          aiQuality: metrics.fileCount > 20 ? 'degraded' : 'good',
          reviewability: metrics.fileCount > 25 ? 'very-difficult' : 'difficult',
          riskLevel: 'medium'
        }
      });
    }

    // Line count warnings
    if (metrics.totalLines > ChangeComplexityAnalyzer.COMPLEXITY_THRESHOLDS.lines.complex) {
      warnings.push({
        level: 'warning',
        title: 'Large Change Size',
        message: `${metrics.totalLines} total lines changed. AI analysis may be limited.`,
        suggestions: [
          'Consider committing in smaller chunks',
          'Separate implementation from tests',
          'Split complex features into multiple commits'
        ],
        impact: {
          aiQuality: metrics.totalLines > 1000 ? 'poor' : 'degraded',
          reviewability: 'difficult',
          riskLevel: 'medium'
        }
      });
    }

    // Critical changes warnings
    if (metrics.criticalChanges > 3) {
      warnings.push({
        level: 'error',
        title: 'Multiple Critical Changes',
        message: `${metrics.criticalChanges} critical changes detected. High risk of introducing bugs.`,
        suggestions: [
          'Separate critical changes into individual commits',
          'Focus on one breaking change per commit',
          'Add comprehensive tests for critical changes'
        ],
        impact: {
          aiQuality: 'degraded',
          reviewability: 'very-difficult',
          riskLevel: 'high'
        }
      });
    }

    // Breaking changes warnings
    if (metrics.breakingChanges > 0) {
      warnings.push({
        level: metrics.breakingChanges > 2 ? 'error' : 'warning',
        title: 'Breaking Changes Detected',
        message: `${metrics.breakingChanges} potentially breaking change(s) found.`,
        suggestions: [
          'Document breaking changes in commit message',
          'Consider semantic versioning implications',
          'Add migration guides if needed',
          'Ensure backward compatibility where possible'
        ],
        impact: {
          aiQuality: 'good',
          reviewability: 'moderate',
          riskLevel: metrics.breakingChanges > 2 ? 'critical' : 'high'
        }
      });
    }

    // Test coverage warnings
    if (metrics.testCoverage < 30 && metrics.fileCount > 5) {
      warnings.push({
        level: 'warning',
        title: 'Low Test Coverage',
        message: `Only ${metrics.testCoverage.toFixed(0)}% of changed files are tests.`,
        suggestions: [
          'Add tests for new functionality',
          'Update existing tests for modified code',
          'Consider test-driven development approach'
        ],
        impact: {
          aiQuality: 'good',
          reviewability: 'moderate',
          riskLevel: 'medium'
        }
      });
    }

    // Token budget warnings
    if (tokenBudget) {
      const estimatedTokens = this.estimateTokenUsage(metrics);
      if (estimatedTokens > tokenBudget.available) {
        warnings.push({
          level: 'error',
          title: 'Token Budget Exceeded',
          message: `Changes require ~${Math.ceil(estimatedTokens/1000)}k tokens, but only ${Math.ceil(tokenBudget.available/1000)}k available.`,
          suggestions: [
            'Commit current critical changes first',
            'Use --no-cache to avoid caching partial results',
            'Consider explaining changes in smaller batches'
          ],
          impact: {
            aiQuality: 'poor',
            reviewability: 'moderate',
            riskLevel: 'low'
          }
        });
      }
    }

    return warnings;
  }

  private generateRecommendations(
    metrics: ReturnType<typeof this.calculateMetrics>,
    category: string,
    changes: GitChange[]
  ): string[] {
    const recommendations: string[] = [];

    if (category === 'simple') {
      recommendations.push('✅ Optimal change size for AI analysis and code review');
      return recommendations;
    }

    if (category === 'moderate') {
      recommendations.push('📊 Good change size. Consider running tests before committing');
      if (metrics.testCoverage < 50) {
        recommendations.push('🧪 Consider adding more test coverage');
      }
      return recommendations;
    }

    if (category === 'complex') {
      recommendations.push('⚠️  Complex change detected. Consider these strategies:');
      
      if (metrics.fileCount > 10) {
        recommendations.push('📁 Split by feature areas or components');
      }
      
      if (metrics.criticalChanges > 2) {
        recommendations.push('🔴 Isolate critical changes into separate commits');
      }
      
      if (metrics.breakingChanges > 0) {
        recommendations.push('💥 Create dedicated commits for breaking changes');
      }
      
      recommendations.push('🔍 Run comprehensive tests before proceeding');
    }

    if (category === 'very-complex') {
      recommendations.push('🚨 Very complex change. Strongly recommend splitting:');
      recommendations.push('1️⃣ Create infrastructure/setup changes first');
      recommendations.push('2️⃣ Add core feature implementation');
      recommendations.push('3️⃣ Add tests and documentation');
      recommendations.push('4️⃣ Add any supporting/cleanup changes');
    }

    return recommendations;
  }

  private analyzeOptimalSplit(
    changes: GitChange[],
    metrics: ReturnType<typeof this.calculateMetrics>,
    category: string
  ): ComplexityAnalysis['optimalSplitSuggestion'] {
    if (category === 'simple' || category === 'moderate') {
      return undefined; // No split needed
    }

    const suggestedCommits: Array<{
      title: string;
      files: string[];
      reasoning: string;
    }> = [];

    // Group files by type/purpose
    const configFiles = changes.filter(c => this.isConfigFile(c.file));
    const coreFiles = changes.filter(c => this.isCoreImplementation(c.file));
    const testFiles = changes.filter(c => this.isTestFile(c.file));
    const docFiles = changes.filter(c => this.isDocFile(c.file));
    const breakingFiles = changes.filter(c => this.isBreakingChange(c));

    // Suggest breaking changes first
    if (breakingFiles.length > 0) {
      suggestedCommits.push({
        title: 'refactor: breaking changes and API updates',
        files: breakingFiles.map(f => f.file),
        reasoning: 'Isolate breaking changes for easier review and rollback'
      });
    }

    // Suggest config changes
    if (configFiles.length > 0) {
      suggestedCommits.push({
        title: 'chore: update configuration and dependencies',
        files: configFiles.map(f => f.file),
        reasoning: 'Infrastructure changes should be separate from feature code'
      });
    }

    // Suggest core implementation
    if (coreFiles.length > 0) {
      const coreTitle = coreFiles.length > 1 ? 'feat: implement core functionality' : 'feat: add new feature';
      suggestedCommits.push({
        title: coreTitle,
        files: coreFiles.map(f => f.file),
        reasoning: 'Core implementation should be focused and reviewable'
      });
    }

    // Suggest tests
    if (testFiles.length > 0) {
      suggestedCommits.push({
        title: 'test: add comprehensive test coverage',
        files: testFiles.map(f => f.file),
        reasoning: 'Tests can be reviewed separately and provide confidence'
      });
    }

    // Suggest docs
    if (docFiles.length > 0) {
      suggestedCommits.push({
        title: 'docs: update documentation',
        files: docFiles.map(f => f.file),
        reasoning: 'Documentation updates are often independent of code changes'
      });
    }

    const reason = category === 'very-complex' 
      ? `Very complex change (${metrics.fileCount} files, ${metrics.totalLines} lines). Split recommended for quality.`
      : `Complex change detected. Splitting will improve reviewability and reduce risk.`;

    return {
      reason,
      suggestedCommits
    };
  }

  // Helper methods for file classification
  private isBreakingChange(change: GitChange): boolean {
    // Simple heuristic - can be enhanced with semantic analysis
    return change.type === 'deleted' || 
           change.file.includes('interface') ||
           change.file.includes('api') ||
           change.hunks.some(h => 
             h.lines.some(l => 
               l.type === 'removed' && 
               (l.content.includes('export') || l.content.includes('public'))
             )
           );
  }

  private isConfigFile(file: string): boolean {
    const configPatterns = [
      'package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.ts',
      '.env', 'docker-compose.yml', 'Dockerfile', '.github/',
      'jest.config.js', 'babel.config.js', 'rollup.config.js'
    ];
    return configPatterns.some(pattern => file.includes(pattern));
  }

  private isCoreImplementation(file: string): boolean {
    return file.includes('src/') && 
           !file.includes('test') && 
           !file.includes('spec') &&
           !file.includes('doc') &&
           !this.isConfigFile(file);
  }

  private isTestFile(file: string): boolean {
    return file.includes('test') || 
           file.includes('spec') || 
           file.includes('__tests__') ||
           file.endsWith('.test.ts') ||
           file.endsWith('.spec.ts');
  }

  private isDocFile(file: string): boolean {
    return file.endsWith('.md') || 
           file.includes('doc') ||
           file.includes('README');
  }

  private detectFrameworks(change: GitChange): string[] {
    const frameworks: string[] = [];
    const content = change.hunks.flatMap(h => h.lines.map(l => l.content)).join(' ');
    
    if (content.includes('react') || content.includes('React')) frameworks.push('React');
    if (content.includes('vue') || content.includes('Vue')) frameworks.push('Vue');
    if (content.includes('angular') || content.includes('Angular')) frameworks.push('Angular');
    if (content.includes('express') || content.includes('Express')) frameworks.push('Express');
    if (content.includes('django') || content.includes('Django')) frameworks.push('Django');
    if (content.includes('spring') || content.includes('Spring')) frameworks.push('Spring');
    
    return frameworks;
  }

  private estimateTokenUsage(metrics: ReturnType<typeof this.calculateMetrics>): number {
    // Rough estimation based on metrics
    const baseTokensPerFile = 100;
    const tokensPerLine = 2;
    const criticalMultiplier = 1.5;
    
    let estimate = metrics.fileCount * baseTokensPerFile;
    estimate += metrics.totalLines * tokensPerLine;
    estimate *= (1 + (metrics.criticalChanges * 0.1)); // Increase for critical changes
    
    return Math.ceil(estimate);
  }
}