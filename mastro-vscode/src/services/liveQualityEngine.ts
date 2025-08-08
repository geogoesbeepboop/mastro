import * as vscode from 'vscode';
import { MastroClient } from './mastroClient';

export interface QualityMetricDetail {
    type: 'complexity' | 'maintainability' | 'performance' | 'security' | 'test_coverage' | 'documentation';
    file: string;
    score: number; // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    trend: 'improving' | 'stable' | 'degrading';
    issues: QualityIssue[];
    suggestions: QualitySuggestion[];
    historicalData?: Array<{
        timestamp: Date;
        score: number;
    }>;
}

export interface QualityIssue {
    severity: 'error' | 'warning' | 'info';
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
    message: string;
    rule: string;
    category: 'complexity' | 'maintainability' | 'performance' | 'security' | 'style';
    autoFixable: boolean;
    codeAction?: vscode.CodeAction;
}

export interface QualitySuggestion {
    title: string;
    description: string;
    benefit: string;
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    category: string;
    codeAction?: vscode.CodeAction;
    learnMoreUrl?: string;
}

export interface ProjectQualityOverview {
    overallScore: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    fileScores: Map<string, number>;
    topIssues: QualityIssue[];
    trendingDown: string[];
    trendingUp: string[];
    hotspots: string[];
    recommendations: string[];
}

/**
 * Advanced Live Quality Metrics Engine that provides comprehensive
 * real-time code quality analysis with actionable insights
 */
export class LiveQualityEngine {
    private mastroClient: MastroClient;
    private diagnosticCollection: vscode.DiagnosticCollection;
    
    // Quality metrics cache
    private fileMetrics: Map<string, QualityMetricDetail[]> = new Map();
    private projectOverview: ProjectQualityOverview | null = null;
    private analysisQueue: Map<string, NodeJS.Timeout> = new Map();
    
    // Configuration
    private config = {
        complexityThreshold: 8,
        maintainabilityThreshold: 70,
        performanceThreshold: 80,
        securityThreshold: 90,
        testCoverageThreshold: 70,
        documentationThreshold: 60
    };

    constructor(mastroClient: MastroClient) {
        this.mastroClient = mastroClient;
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('mastro-quality');
        
        this.updateConfiguration();
        
        // Watch for configuration changes
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('mastro.realTimeAnalysis')) {
                this.updateConfiguration();
            }
        });
    }

    /**
     * Analyze file quality metrics with detailed breakdown
     */
    async analyzeFileQuality(filePath: string): Promise<QualityMetricDetail[]> {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const content = document.getText();
            
            const metrics: QualityMetricDetail[] = [];
            
            // Complexity Analysis
            const complexityMetric = await this.analyzeComplexity(document, content);
            metrics.push(complexityMetric);
            
            // Maintainability Analysis
            const maintainabilityMetric = await this.analyzeMaintainability(document, content);
            metrics.push(maintainabilityMetric);
            
            // Performance Analysis
            const performanceMetric = await this.analyzePerformance(document, content);
            metrics.push(performanceMetric);
            
            // Security Analysis
            const securityMetric = await this.analyzeSecurity(document, content);
            metrics.push(securityMetric);
            
            // Test Coverage Analysis
            const testCoverageMetric = await this.analyzeTestCoverage(document, filePath);
            metrics.push(testCoverageMetric);
            
            // Documentation Analysis
            const documentationMetric = await this.analyzeDocumentation(document, content);
            metrics.push(documentationMetric);
            
            // Cache the results
            this.fileMetrics.set(filePath, metrics);
            
            // Update diagnostics
            await this.updateDiagnostics(document, metrics);
            
            return metrics;
            
        } catch (error) {
            console.error(`Error analyzing file quality for ${filePath}:`, error);
            return [];
        }
    }

    /**
     * Get cached metrics for a file
     */
    getFileMetrics(filePath: string): QualityMetricDetail[] {
        return this.fileMetrics.get(filePath) || [];
    }

    /**
     * Analyze project-wide quality overview
     */
    async analyzeProjectQuality(): Promise<ProjectQualityOverview> {
        const files = await vscode.workspace.findFiles('**/*.{ts,js,tsx,jsx}', '**/node_modules/**');
        
        const fileScores = new Map<string, number>();
        const allIssues: QualityIssue[] = [];
        
        // Analyze each file
        for (const file of files.slice(0, 50)) { // Limit to first 50 files for performance
            const metrics = await this.analyzeFileQuality(file.fsPath);
            const averageScore = metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length;
            
            fileScores.set(file.fsPath, averageScore);
            
            // Collect all issues
            metrics.forEach(metric => allIssues.push(...metric.issues));
        }
        
        // Calculate overall score
        const scores = Array.from(fileScores.values());
        const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        
        // Sort files by score for trending analysis
        const sortedFiles = Array.from(fileScores.entries())
            .sort((a, b) => b[1] - a[1]);
        
        // Get top issues (most severe)
        const topIssues = allIssues
            .filter(issue => issue.severity === 'error' || issue.severity === 'warning')
            .sort((a, b) => a.severity === 'error' ? -1 : 1)
            .slice(0, 10);
        
        // Identify hotspots (files with many issues)
        const hotspots = Array.from(fileScores.entries())
            .filter(([_, score]) => score < 60)
            .map(([file, _]) => file)
            .slice(0, 5);
        
        const overview: ProjectQualityOverview = {
            overallScore: Math.round(overallScore),
            grade: this.scoreToGrade(overallScore),
            fileScores,
            topIssues,
            trendingDown: [], // Would need historical data
            trendingUp: [], // Would need historical data
            hotspots,
            recommendations: this.generateProjectRecommendations(overallScore, topIssues, hotspots)
        };
        
        this.projectOverview = overview;
        return overview;
    }

    /**
     * Get current project quality overview
     */
    getProjectOverview(): ProjectQualityOverview | null {
        return this.projectOverview;
    }

    private async analyzeComplexity(document: vscode.TextDocument, content: string): Promise<QualityMetricDetail> {
        const issues: QualityIssue[] = [];
        const suggestions: QualitySuggestion[] = [];
        
        const lines = content.split('\n');
        let totalComplexity = 1; // Base complexity
        
        // Analyze each function for complexity
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const functionMatch = line.match(/(?:function\s+(\w+)|(\w+)\s*[=:]\s*(?:function|\(.*\)\s*=>)|class\s+(\w+))/);
            
            if (functionMatch) {
                const complexity = this.calculateFunctionComplexity(lines, i);
                totalComplexity += complexity;
                
                if (complexity > this.config.complexityThreshold) {
                    const functionName = functionMatch[1] || functionMatch[2] || functionMatch[3] || 'anonymous';
                    
                    issues.push({
                        severity: complexity > 15 ? 'error' : 'warning',
                        line: i,
                        column: 0,
                        endLine: i,
                        endColumn: line.length,
                        message: `Function '${functionName}' has high complexity (${complexity}). Consider refactoring.`,
                        rule: 'complexity-threshold',
                        category: 'complexity',
                        autoFixable: false
                    });
                    
                    suggestions.push({
                        title: `Reduce ${functionName} complexity`,
                        description: `Function has complexity ${complexity}, consider breaking it into smaller functions`,
                        benefit: 'Improved readability and maintainability',
                        effort: complexity > 20 ? 'high' : 'medium',
                        impact: 'high',
                        category: 'refactoring'
                    });
                }
            }
        }
        
        const averageComplexity = totalComplexity / Math.max(1, this.countFunctions(content));
        const score = Math.max(0, 100 - averageComplexity * 5);
        
        return {
            type: 'complexity',
            file: document.fileName,
            score: Math.round(score),
            grade: this.scoreToGrade(score),
            trend: 'stable',
            issues,
            suggestions
        };
    }

    private async analyzeMaintainability(document: vscode.TextDocument, content: string): Promise<QualityMetricDetail> {
        const issues: QualityIssue[] = [];
        const suggestions: QualitySuggestion[] = [];
        
        let score = 100;
        const lines = content.split('\n');
        
        // Check for code smells
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Long lines
            if (line.length > 120) {
                issues.push({
                    severity: 'info',
                    line: i,
                    column: 120,
                    endLine: i,
                    endColumn: line.length,
                    message: 'Line too long (>120 characters). Consider breaking it up.',
                    rule: 'max-line-length',
                    category: 'style',
                    autoFixable: true
                });
                score -= 2;
            }
            
            // TODO comments (technical debt)
            if (/\/\/\s*TODO|\/\*\s*TODO|\#\s*TODO/i.test(line)) {
                issues.push({
                    severity: 'info',
                    line: i,
                    column: line.indexOf('TODO'),
                    endLine: i,
                    endColumn: line.length,
                    message: 'TODO comment found. Consider creating a ticket or addressing it.',
                    rule: 'no-todo',
                    category: 'maintainability',
                    autoFixable: false
                });
                score -= 1;
            }
            
            // Magic numbers
            const magicNumberMatch = line.match(/[^a-zA-Z_]\d{2,}[^a-zA-Z_\d]/);
            if (magicNumberMatch && !line.includes('//') && !line.includes('const')) {
                issues.push({
                    severity: 'info',
                    line: i,
                    column: magicNumberMatch.index || 0,
                    endLine: i,
                    endColumn: (magicNumberMatch.index || 0) + magicNumberMatch[0].length,
                    message: 'Magic number detected. Consider using a named constant.',
                    rule: 'no-magic-numbers',
                    category: 'maintainability',
                    autoFixable: false
                });
                score -= 3;
            }
        }
        
        // Duplicate code detection (simple)
        const duplicateLines = this.findDuplicateLines(lines);
        if (duplicateLines.length > 0) {
            score -= duplicateLines.length * 5;
            
            suggestions.push({
                title: 'Extract duplicate code',
                description: `Found ${duplicateLines.length} potentially duplicate code blocks`,
                benefit: 'Reduced maintenance burden and improved consistency',
                effort: 'medium',
                impact: 'medium',
                category: 'refactoring'
            });
        }
        
        return {
            type: 'maintainability',
            file: document.fileName,
            score: Math.max(0, Math.round(score)),
            grade: this.scoreToGrade(score),
            trend: 'stable',
            issues,
            suggestions
        };
    }

    private async analyzePerformance(document: vscode.TextDocument, content: string): Promise<QualityMetricDetail> {
        const issues: QualityIssue[] = [];
        const suggestions: QualitySuggestion[] = [];
        
        let score = 100;
        const lines = content.split('\n');
        
        // Performance anti-patterns
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Nested loops
            if (line.includes('for') && this.hasNestedLoop(lines, i)) {
                issues.push({
                    severity: 'warning',
                    line: i,
                    column: line.indexOf('for'),
                    endLine: i,
                    endColumn: line.length,
                    message: 'Nested loops detected. Consider optimizing algorithm complexity.',
                    rule: 'no-nested-loops',
                    category: 'performance',
                    autoFixable: false
                });
                score -= 10;
            }
            
            // Inefficient array methods
            if (line.includes('.find(') && line.includes('.filter(')) {
                issues.push({
                    severity: 'info',
                    line: i,
                    column: 0,
                    endLine: i,
                    endColumn: line.length,
                    message: 'Chain of array methods may be inefficient. Consider using find() or a single pass.',
                    rule: 'efficient-array-methods',
                    category: 'performance',
                    autoFixable: false
                });
                score -= 5;
            }
            
            // Large object literals (potential memory issues)
            const objectMatch = line.match(/\{[^}]{100,}\}/);
            if (objectMatch) {
                suggestions.push({
                    title: 'Consider breaking up large object',
                    description: 'Large object literal found that might impact performance',
                    benefit: 'Better memory usage and code organization',
                    effort: 'low',
                    impact: 'low',
                    category: 'performance'
                });
                score -= 3;
            }
        }
        
        return {
            type: 'performance',
            file: document.fileName,
            score: Math.max(0, Math.round(score)),
            grade: this.scoreToGrade(score),
            trend: 'stable',
            issues,
            suggestions
        };
    }

    private async analyzeSecurity(document: vscode.TextDocument, content: string): Promise<QualityMetricDetail> {
        const issues: QualityIssue[] = [];
        const suggestions: QualitySuggestion[] = [];
        
        let score = 100;
        const lines = content.split('\n');
        
        // Security vulnerability patterns
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Potential password/token logging
            if (/console\.log.*(?:password|token|secret|key)/i.test(line)) {
                issues.push({
                    severity: 'error',
                    line: i,
                    column: 0,
                    endLine: i,
                    endColumn: line.length,
                    message: 'Potential sensitive data logging detected. Avoid logging passwords, tokens, or secrets.',
                    rule: 'no-secrets-logging',
                    category: 'security',
                    autoFixable: false
                });
                score -= 20;
            }
            
            // eval() usage
            if (line.includes('eval(')) {
                issues.push({
                    severity: 'error',
                    line: i,
                    column: line.indexOf('eval('),
                    endLine: i,
                    endColumn: line.indexOf('eval(') + 5,
                    message: 'Use of eval() is dangerous and should be avoided.',
                    rule: 'no-eval',
                    category: 'security',
                    autoFixable: false
                });
                score -= 25;
            }
            
            // innerHTML usage (XSS risk)
            if (line.includes('.innerHTML')) {
                issues.push({
                    severity: 'warning',
                    line: i,
                    column: line.indexOf('.innerHTML'),
                    endLine: i,
                    endColumn: line.indexOf('.innerHTML') + 10,
                    message: 'Use of innerHTML may create XSS vulnerabilities. Consider using textContent or proper sanitization.',
                    rule: 'no-inner-html',
                    category: 'security',
                    autoFixable: false
                });
                score -= 15;
            }
            
            // Hardcoded credentials
            const credentialsPattern = /(?:password|secret|token|key)\s*[:=]\s*['"][^'"]+['"]/i;
            if (credentialsPattern.test(line)) {
                issues.push({
                    severity: 'error',
                    line: i,
                    column: 0,
                    endLine: i,
                    endColumn: line.length,
                    message: 'Hardcoded credentials detected. Use environment variables or secure configuration.',
                    rule: 'no-hardcoded-credentials',
                    category: 'security',
                    autoFixable: false
                });
                score -= 30;
            }
        }
        
        return {
            type: 'security',
            file: document.fileName,
            score: Math.max(0, Math.round(score)),
            grade: this.scoreToGrade(score),
            trend: 'stable',
            issues,
            suggestions
        };
    }

    private async analyzeTestCoverage(document: vscode.TextDocument, filePath: string): Promise<QualityMetricDetail> {
        const issues: QualityIssue[] = [];
        const suggestions: QualitySuggestion[] = [];
        
        // Look for corresponding test file
        const testFile = await this.findTestFile(filePath);
        let score = 0;
        
        if (testFile) {
            const testDocument = await vscode.workspace.openTextDocument(testFile);
            const testContent = testDocument.getText();
            const sourceContent = document.getText();
            
            // Simple heuristic: estimate coverage based on test/source ratio
            const testLines = testContent.split('\n').filter(line => line.trim().length > 0).length;
            const sourceLines = sourceContent.split('\n').filter(line => line.trim().length > 0).length;
            
            score = Math.min(90, Math.round((testLines / sourceLines) * 70));
            
            if (score < this.config.testCoverageThreshold) {
                suggestions.push({
                    title: 'Improve test coverage',
                    description: `Estimated coverage is ${score}%, consider adding more tests`,
                    benefit: 'Better code reliability and easier refactoring',
                    effort: 'medium',
                    impact: 'high',
                    category: 'testing'
                });
            }
        } else {
            suggestions.push({
                title: 'Create test file',
                description: 'No corresponding test file found',
                benefit: 'Ensure code reliability and prevent regressions',
                effort: 'high',
                impact: 'high',
                category: 'testing'
            });
        }
        
        return {
            type: 'test_coverage',
            file: document.fileName,
            score: Math.round(score),
            grade: this.scoreToGrade(score),
            trend: 'stable',
            issues,
            suggestions
        };
    }

    private async analyzeDocumentation(document: vscode.TextDocument, content: string): Promise<QualityMetricDetail> {
        const issues: QualityIssue[] = [];
        const suggestions: QualitySuggestion[] = [];
        
        let score = 100;
        const lines = content.split('\n');
        
        // Count functions and their documentation
        let functionCount = 0;
        let documentedFunctions = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const functionMatch = line.match(/(?:function\s+(\w+)|(\w+)\s*[=:]\s*(?:function|\(.*\)\s*=>))/);
            
            if (functionMatch) {
                functionCount++;
                
                // Check if function is documented (JSDoc comment above)
                const isDocumented = i > 0 && (
                    lines[i - 1].trim().includes('*/') ||
                    lines[i - 1].trim().startsWith('//') ||
                    (i > 1 && lines[i - 2].trim().includes('*/'))
                );
                
                if (isDocumented) {
                    documentedFunctions++;
                } else {
                    const functionName = functionMatch[1] || functionMatch[2] || 'anonymous';
                    
                    // Only flag public/exported functions as needing documentation
                    if (line.includes('export') || !line.includes('private')) {
                        issues.push({
                            severity: 'info',
                            line: i,
                            column: 0,
                            endLine: i,
                            endColumn: line.length,
                            message: `Function '${functionName}' lacks documentation. Consider adding JSDoc comments.`,
                            rule: 'missing-docs',
                            category: 'style',
                            autoFixable: false
                        });
                        
                        suggestions.push({
                            title: `Document ${functionName} function`,
                            description: 'Add JSDoc comment explaining parameters, return value, and purpose',
                            benefit: 'Better code maintainability and team collaboration',
                            effort: 'low',
                            impact: 'medium',
                            category: 'documentation'
                        });
                    }
                }
            }
        }
        
        // Calculate documentation score
        if (functionCount > 0) {
            score = Math.round((documentedFunctions / functionCount) * 100);
        }
        
        return {
            type: 'documentation',
            file: document.fileName,
            score: Math.round(score),
            grade: this.scoreToGrade(score),
            trend: 'stable',
            issues,
            suggestions
        };
    }

    private async updateDiagnostics(document: vscode.TextDocument, metrics: QualityMetricDetail[]): Promise<void> {
        const diagnostics: vscode.Diagnostic[] = [];
        
        for (const metric of metrics) {
            for (const issue of metric.issues) {
                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(issue.line, issue.column, issue.endLine, issue.endColumn),
                    issue.message,
                    this.severityToDiagnosticSeverity(issue.severity)
                );
                
                diagnostic.code = issue.rule;
                diagnostic.source = 'Mastro Quality';
                diagnostic.tags = issue.category === 'style' ? [vscode.DiagnosticTag.Unnecessary] : undefined;
                
                diagnostics.push(diagnostic);
            }
        }
        
        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    // Helper methods
    
    private updateConfiguration(): void {
        const config = vscode.workspace.getConfiguration('mastro.realTimeAnalysis');
        this.config = {
            complexityThreshold: config.get<number>('complexityThreshold', 8),
            maintainabilityThreshold: config.get<number>('maintainabilityThreshold', 70),
            performanceThreshold: config.get<number>('performanceThreshold', 80),
            securityThreshold: config.get<number>('securityThreshold', 90),
            testCoverageThreshold: config.get<number>('testCoverageThreshold', 70),
            documentationThreshold: config.get<number>('documentationThreshold', 60)
        };
    }

    private calculateFunctionComplexity(lines: string[], startLine: number): number {
        let complexity = 1; // Base complexity
        let braceCount = 0;
        let inFunction = false;
        
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            
            // Track braces to know when we're inside the function
            braceCount += (line.match(/\{/g) || []).length;
            braceCount -= (line.match(/\}/g) || []).length;
            
            if (braceCount > 0) {
                inFunction = true;
            }
            
            if (inFunction && braceCount === 0 && i > startLine) {
                break; // End of function
            }
            
            if (inFunction) {
                // Count complexity-increasing constructs
                complexity += (line.match(/\bif\b/g) || []).length;
                complexity += (line.match(/\belse\b/g) || []).length;
                complexity += (line.match(/\bswitch\b/g) || []).length;
                complexity += (line.match(/\bcase\b/g) || []).length;
                complexity += (line.match(/\bfor\b/g) || []).length;
                complexity += (line.match(/\bwhile\b/g) || []).length;
                complexity += (line.match(/\bdo\b/g) || []).length;
                complexity += (line.match(/\bcatch\b/g) || []).length;
                complexity += (line.match(/\?\s*:/g) || []).length; // Ternary
                complexity += (line.match(/&&|\|\|/g) || []).length; // Logical operators
            }
        }
        
        return complexity;
    }

    private countFunctions(content: string): number {
        const functionPatterns = [
            /function\s+\w+/g,
            /\w+\s*[=:]\s*function/g,
            /\w+\s*[=:]\s*\(.*\)\s*=>/g,
            /class\s+\w+/g
        ];
        
        let count = 0;
        for (const pattern of functionPatterns) {
            const matches = content.match(pattern);
            count += matches ? matches.length : 0;
        }
        
        return Math.max(1, count);
    }

    private findDuplicateLines(lines: string[]): Array<{line1: number, line2: number}> {
        const duplicates: Array<{line1: number, line2: number}> = [];
        const processedLines = lines.map(line => line.trim()).filter(line => line.length > 10);
        
        for (let i = 0; i < processedLines.length - 1; i++) {
            for (let j = i + 1; j < processedLines.length; j++) {
                if (processedLines[i] === processedLines[j] && processedLines[i].length > 20) {
                    duplicates.push({line1: i, line2: j});
                }
            }
        }
        
        return duplicates.slice(0, 5); // Limit to first 5 duplicates
    }

    private hasNestedLoop(lines: string[], startLine: number): boolean {
        let loopDepth = 0;
        let braceCount = 0;
        
        for (let i = startLine; i < Math.min(startLine + 20, lines.length); i++) {
            const line = lines[i];
            
            braceCount += (line.match(/\{/g) || []).length;
            braceCount -= (line.match(/\}/g) || []).length;
            
            if (line.includes('for') || line.includes('while')) {
                loopDepth++;
                if (loopDepth > 1) return true;
            }
            
            if (braceCount <= 0 && i > startLine) break;
        }
        
        return false;
    }

    private async findTestFile(filePath: string): Promise<string | null> {
        const testPatterns = [
            filePath.replace(/\.(ts|js|tsx|jsx)$/, '.test.$1'),
            filePath.replace(/\.(ts|js|tsx|jsx)$/, '.spec.$1'),
            filePath.replace('/src/', '/test/'),
            filePath.replace('/src/', '/__tests__/'),
            filePath.replace('/lib/', '/test/')
        ];
        
        for (const testPath of testPatterns) {
            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(testPath));
                return testPath;
            } catch {
                // File doesn't exist, try next pattern
            }
        }
        
        return null;
    }

    private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    private severityToDiagnosticSeverity(severity: 'error' | 'warning' | 'info'): vscode.DiagnosticSeverity {
        switch (severity) {
            case 'error': return vscode.DiagnosticSeverity.Error;
            case 'warning': return vscode.DiagnosticSeverity.Warning;
            case 'info': return vscode.DiagnosticSeverity.Information;
        }
    }

    private generateProjectRecommendations(
        overallScore: number,
        topIssues: QualityIssue[],
        hotspots: string[]
    ): string[] {
        const recommendations: string[] = [];
        
        if (overallScore < 70) {
            recommendations.push('Overall project quality is below target. Focus on addressing critical issues first.');
        }
        
        if (topIssues.filter(i => i.category === 'security').length > 0) {
            recommendations.push('Security issues detected. Address these immediately to reduce vulnerabilities.');
        }
        
        if (topIssues.filter(i => i.category === 'complexity').length > 3) {
            recommendations.push('Multiple high-complexity functions found. Consider refactoring for better maintainability.');
        }
        
        if (hotspots.length > 0) {
            recommendations.push(`Focus refactoring efforts on ${hotspots.length} identified hotspot files.`);
        }
        
        return recommendations;
    }

    dispose(): void {
        this.diagnosticCollection.dispose();
    }
}