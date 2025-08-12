import type {GitChange, CommitContext, DocumentationType} from '../types/index.js';

export interface ChangeTypeAnalysis {
  type: ChangeCategory;
  confidence: number;
  affectedDocTypes: DocumentationType[];
  reasoning: string;
  suggestedActions: string[];
}

export type ChangeCategory = 
  | 'feature-addition'
  | 'bug-fix' 
  | 'refactor'
  | 'breaking-change'
  | 'performance-improvement'
  | 'security-fix'
  | 'documentation'
  | 'testing'
  | 'configuration'
  | 'dependency-update'
  | 'deployment'
  | 'api-change';

export class ChangeDetector {
  
  async analyzeChanges(context: CommitContext): Promise<ChangeTypeAnalysis[]> {
    const analyses: ChangeTypeAnalysis[] = [];
    
    // Analyze each change individually
    for (const change of context.changes) {
      const analysis = await this.analyzeIndividualChange(change, context);
      if (analysis) {
        analyses.push(analysis);
      }
    }
    
    // Merge and consolidate analyses
    return this.consolidateAnalyses(analyses);
  }

  private async analyzeIndividualChange(change: GitChange, context: CommitContext): Promise<ChangeTypeAnalysis | null> {
    const filePath = change.file.toLowerCase();
    const fileContent = this.extractChangeContent(change);
    
    // API changes detection
    if (this.isApiFile(filePath)) {
      return this.analyzeApiChange(change, fileContent);
    }
    
    // Test file changes
    if (this.isTestFile(filePath)) {
      return this.analyzeTestChange(change, fileContent);
    }
    
    // Configuration changes
    if (this.isConfigFile(filePath)) {
      return this.analyzeConfigChange(change, fileContent);
    }
    
    // Documentation changes
    if (this.isDocumentationFile(filePath)) {
      return this.analyzeDocumentationChange(change, fileContent);
    }
    
    // Security-related changes
    if (this.isSecurityRelated(filePath, fileContent)) {
      return this.analyzeSecurityChange(change, fileContent);
    }
    
    // Performance-related changes
    if (this.isPerformanceRelated(filePath, fileContent)) {
      return this.analyzePerformanceChange(change, fileContent);
    }
    
    // Deployment changes
    if (this.isDeploymentFile(filePath)) {
      return this.analyzeDeploymentChange(change, fileContent);
    }
    
    // General source code changes
    if (this.isSourceFile(filePath)) {
      return this.analyzeSourceCodeChange(change, fileContent);
    }
    
    return null;
  }

  private analyzeApiChange(change: GitChange, content: string): ChangeTypeAnalysis {
    const hasNewEndpoints = content.includes('+') && (
      content.includes('app.get') || 
      content.includes('app.post') || 
      content.includes('router.') ||
      content.includes('@Get') ||
      content.includes('@Post') ||
      content.includes('export async function')
    );
    
    const hasDeletedEndpoints = content.includes('-') && (
      content.includes('app.get') || 
      content.includes('app.post') || 
      content.includes('router.')
    );
    
    const hasParameterChanges = content.includes('params') || content.includes('query') || content.includes('body');
    
    let type: ChangeCategory = 'api-change';
    let confidence = 0.8;
    let reasoning = 'API-related file modified';
    const affectedDocTypes: DocumentationType[] = ['api'];
    const suggestedActions: string[] = [];
    
    if (hasNewEndpoints) {
      type = 'feature-addition';
      confidence = 0.9;
      reasoning = 'New API endpoints detected';
      affectedDocTypes.push('architecture', 'user-guide');
      suggestedActions.push('Update API documentation with new endpoints');
      suggestedActions.push('Add usage examples for new endpoints');
    } else if (hasDeletedEndpoints) {
      type = 'breaking-change';
      confidence = 0.95;
      reasoning = 'API endpoints removed';
      affectedDocTypes.push('architecture', 'changelog');
      suggestedActions.push('Document breaking changes');
      suggestedActions.push('Update migration guide');
    } else if (hasParameterChanges) {
      type = 'api-change';
      confidence = 0.85;
      reasoning = 'API parameter changes detected';
      suggestedActions.push('Update API parameter documentation');
    }
    
    return {
      type,
      confidence,
      affectedDocTypes,
      reasoning,
      suggestedActions
    };
  }

  private analyzeTestChange(change: GitChange, content: string): ChangeTypeAnalysis {
    const hasNewTests = content.includes('+') && (
      content.includes('it(') || 
      content.includes('test(') || 
      content.includes('describe(')
    );
    
    const hasTestFixes = content.includes('expect') && change.type === 'modified';
    
    return {
      type: 'testing',
      confidence: 0.9,
      affectedDocTypes: ['testing', 'contributing'],
      reasoning: hasNewTests ? 'New tests added' : 'Test modifications detected',
      suggestedActions: hasNewTests 
        ? ['Update testing documentation', 'Document new test scenarios']
        : ['Review test coverage documentation']
    };
  }

  private analyzeConfigChange(change: GitChange, content: string): ChangeTypeAnalysis {
    const isPackageJson = change.file.includes('package.json');
    const isDependencyUpdate = isPackageJson && (content.includes('"dependencies"') || content.includes('"devDependencies"'));
    
    if (isDependencyUpdate) {
      return {
        type: 'dependency-update',
        confidence: 0.95,
        affectedDocTypes: ['readme', 'deployment', 'contributing'],
        reasoning: 'Package dependencies updated',
        suggestedActions: [
          'Update installation instructions',
          'Check for breaking changes in dependencies',
          'Update deployment documentation if needed'
        ]
      };
    }
    
    return {
      type: 'configuration',
      confidence: 0.8,
      affectedDocTypes: ['deployment', 'contributing'],
      reasoning: 'Configuration files modified',
      suggestedActions: ['Update configuration documentation']
    };
  }

  private analyzeDocumentationChange(change: GitChange, content: string): ChangeTypeAnalysis {
    return {
      type: 'documentation',
      confidence: 1.0,
      affectedDocTypes: [],
      reasoning: 'Documentation files modified',
      suggestedActions: ['Documentation update detected - no further action needed']
    };
  }

  private analyzeSecurityChange(change: GitChange, content: string): ChangeTypeAnalysis {
    const hasSecurityKeywords = content.toLowerCase().includes('auth') ||
                               content.toLowerCase().includes('security') ||
                               content.toLowerCase().includes('permission') ||
                               content.toLowerCase().includes('encrypt') ||
                               content.toLowerCase().includes('token');
    
    return {
      type: 'security-fix',
      confidence: hasSecurityKeywords ? 0.9 : 0.7,
      affectedDocTypes: ['security', 'api', 'deployment'],
      reasoning: 'Security-related changes detected',
      suggestedActions: [
        'Update security documentation',
        'Review API security sections',
        'Update deployment security guidelines'
      ]
    };
  }

  private analyzePerformanceChange(change: GitChange, content: string): ChangeTypeAnalysis {
    const hasPerformanceKeywords = content.toLowerCase().includes('cache') ||
                                  content.toLowerCase().includes('optimize') ||
                                  content.toLowerCase().includes('performance') ||
                                  content.toLowerCase().includes('async') ||
                                  content.toLowerCase().includes('lazy');
    
    return {
      type: 'performance-improvement',
      confidence: hasPerformanceKeywords ? 0.85 : 0.6,
      affectedDocTypes: ['performance', 'architecture'],
      reasoning: 'Performance-related changes detected',
      suggestedActions: [
        'Update performance documentation',
        'Document performance improvements',
        'Update architecture diagrams if needed'
      ]
    };
  }

  private analyzeDeploymentChange(change: GitChange, content: string): ChangeTypeAnalysis {
    return {
      type: 'deployment',
      confidence: 0.9,
      affectedDocTypes: ['deployment', 'contributing'],
      reasoning: 'Deployment configuration changes detected',
      suggestedActions: [
        'Update deployment documentation',
        'Review CI/CD pipeline documentation'
      ]
    };
  }

  private analyzeSourceCodeChange(change: GitChange, content: string): ChangeTypeAnalysis {
    // Analyze source code patterns
    const hasNewClasses = content.includes('+') && (content.includes('class ') || content.includes('interface '));
    const hasNewFunctions = content.includes('+') && (content.includes('function ') || content.includes('const ') && content.includes('=>'));
    const hasBreakingChanges = this.detectBreakingChanges(content);
    const isBugFix = this.detectBugFix(change, content);
    const isRefactor = this.detectRefactor(content);
    
    if (hasBreakingChanges) {
      return {
        type: 'breaking-change',
        confidence: 0.9,
        affectedDocTypes: ['api', 'architecture', 'changelog', 'user-guide'],
        reasoning: 'Breaking changes detected in source code',
        suggestedActions: [
          'Document breaking changes',
          'Update migration guide',
          'Update API documentation',
          'Review architecture documentation'
        ]
      };
    }
    
    if (isBugFix) {
      return {
        type: 'bug-fix',
        confidence: 0.8,
        affectedDocTypes: ['changelog', 'troubleshooting'],
        reasoning: 'Bug fix detected',
        suggestedActions: [
          'Update changelog',
          'Update troubleshooting guide if applicable'
        ]
      };
    }
    
    if (hasNewClasses || hasNewFunctions) {
      return {
        type: 'feature-addition',
        confidence: 0.85,
        affectedDocTypes: ['api', 'architecture', 'component', 'user-guide'],
        reasoning: 'New functionality added',
        suggestedActions: [
          'Document new features',
          'Update API documentation',
          'Update user guide with new capabilities',
          'Update architecture documentation if needed'
        ]
      };
    }
    
    if (isRefactor) {
      return {
        type: 'refactor',
        confidence: 0.75,
        affectedDocTypes: ['architecture'],
        reasoning: 'Code refactoring detected',
        suggestedActions: [
          'Review architecture documentation for accuracy',
          'Update component documentation if structure changed'
        ]
      };
    }
    
    return {
      type: 'feature-addition',
      confidence: 0.5,
      affectedDocTypes: ['architecture'],
      reasoning: 'General source code changes detected',
      suggestedActions: ['Review affected documentation sections']
    };
  }

  private consolidateAnalyses(analyses: ChangeTypeAnalysis[]): ChangeTypeAnalysis[] {
    if (analyses.length === 0) return [];
    
    // Group by change type
    const grouped = new Map<ChangeCategory, ChangeTypeAnalysis[]>();
    for (const analysis of analyses) {
      const existing = grouped.get(analysis.type) || [];
      existing.push(analysis);
      grouped.set(analysis.type, existing);
    }
    
    // Consolidate each group
    const consolidated: ChangeTypeAnalysis[] = [];
    for (const [type, group] of grouped) {
      if (group.length === 1) {
        consolidated.push(group[0]);
      } else {
        // Merge multiple analyses of the same type
        const merged = this.mergeAnalyses(group);
        consolidated.push(merged);
      }
    }
    
    return consolidated.sort((a, b) => b.confidence - a.confidence);
  }

  private mergeAnalyses(analyses: ChangeTypeAnalysis[]): ChangeTypeAnalysis {
    const allDocTypes = new Set<DocumentationType>();
    const allActions = new Set<string>();
    let totalConfidence = 0;
    const reasons: string[] = [];
    
    for (const analysis of analyses) {
      analysis.affectedDocTypes.forEach(type => allDocTypes.add(type));
      analysis.suggestedActions.forEach(action => allActions.add(action));
      totalConfidence += analysis.confidence;
      reasons.push(analysis.reasoning);
    }
    
    return {
      type: analyses[0].type,
      confidence: totalConfidence / analyses.length,
      affectedDocTypes: Array.from(allDocTypes),
      reasoning: reasons.join('; '),
      suggestedActions: Array.from(allActions)
    };
  }

  private extractChangeContent(change: GitChange): string {
    return change.hunks
      .map(hunk => hunk.lines.map(line => `${line.type}${line.content}`).join('\n'))
      .join('\n');
  }

  private isApiFile(filePath: string): boolean {
    return filePath.includes('api') || 
           filePath.includes('routes') || 
           filePath.includes('controller') ||
           filePath.includes('endpoint') ||
           filePath.includes('handler');
  }

  private isTestFile(filePath: string): boolean {
    return filePath.includes('test') || 
           filePath.includes('spec') || 
           filePath.includes('__tests__') ||
           filePath.endsWith('.test.ts') ||
           filePath.endsWith('.spec.ts');
  }

  private isConfigFile(filePath: string): boolean {
    return filePath.includes('config') ||
           filePath.includes('package.json') ||
           filePath.includes('tsconfig') ||
           filePath.includes('.env') ||
           filePath.includes('docker') ||
           filePath.includes('makefile') ||
           filePath.includes('.yml') ||
           filePath.includes('.yaml');
  }

  private isDocumentationFile(filePath: string): boolean {
    return filePath.includes('docs') ||
           filePath.endsWith('.md') ||
           filePath.endsWith('.rst') ||
           filePath.includes('readme');
  }

  private isDeploymentFile(filePath: string): boolean {
    return filePath.includes('deploy') ||
           filePath.includes('ci') ||
           filePath.includes('cd') ||
           filePath.includes('github/workflows') ||
           filePath.includes('docker') ||
           filePath.includes('k8s') ||
           filePath.includes('kubernetes');
  }

  private isSourceFile(filePath: string): boolean {
    return filePath.endsWith('.ts') ||
           filePath.endsWith('.js') ||
           filePath.endsWith('.tsx') ||
           filePath.endsWith('.jsx') ||
           filePath.endsWith('.py') ||
           filePath.endsWith('.java') ||
           filePath.endsWith('.go') ||
           filePath.endsWith('.rs');
  }

  private isSecurityRelated(filePath: string, content: string): boolean {
    return filePath.includes('auth') ||
           filePath.includes('security') ||
           filePath.includes('permission') ||
           content.toLowerCase().includes('authenticate') ||
           content.toLowerCase().includes('authorize') ||
           content.toLowerCase().includes('jwt') ||
           content.toLowerCase().includes('oauth');
  }

  private isPerformanceRelated(filePath: string, content: string): boolean {
    return filePath.includes('cache') ||
           filePath.includes('performance') ||
           content.toLowerCase().includes('optimize') ||
           content.toLowerCase().includes('cache') ||
           content.toLowerCase().includes('memoiz') ||
           content.toLowerCase().includes('lazy') ||
           content.toLowerCase().includes('debounce') ||
           content.toLowerCase().includes('throttle');
  }

  private detectBreakingChanges(content: string): boolean {
    // Look for removed public methods/functions
    const removedPublicMethods = content.includes('-') && (
      content.includes('export function') ||
      content.includes('export class') ||
      content.includes('export interface') ||
      content.includes('public ')
    );
    
    // Look for signature changes
    const signatureChanges = content.includes('function') && 
                             content.includes('+') && 
                             content.includes('-');
    
    return removedPublicMethods || signatureChanges;
  }

  private detectBugFix(change: GitChange, content: string): boolean {
    const filePath = change.file.toLowerCase();
    
    // Check commit message context if available
    const bugKeywords = ['fix', 'bug', 'issue', 'error', 'problem', 'resolve'];
    
    // Check for typical bug fix patterns in code
    const hasBugFixPatterns = content.includes('null') && content.includes('undefined') ||
                             content.includes('try') && content.includes('catch') ||
                             content.includes('if') && content.includes('error');
    
    return hasBugFixPatterns;
  }

  private detectRefactor(content: string): boolean {
    // Look for moved code (same content, different location)
    const hasMovedCode = content.includes('+') && 
                        content.includes('-') && 
                        !content.includes('function') && 
                        !content.includes('class');
    
    // Look for renamed variables/functions
    const hasRenames = content.includes('function') &&
                       content.includes('+') &&
                       content.includes('-') &&
                       !this.detectBreakingChanges(content);
    
    return hasMovedCode || hasRenames;
  }
}