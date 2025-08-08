"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealTimeAnalyzer = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Real-time development guidance system that provides live code analysis,
 * quality metrics, and proactive suggestions during development.
 */
class RealTimeAnalyzer {
    constructor(workspaceRoot, mastroClient, notificationService) {
        this.workspaceRoot = workspaceRoot;
        this.analysisQueue = new Map();
        this.recentChanges = new Map();
        this.isAnalysisEnabled = true;
        this.analysisInterval = 3000; // 3 seconds debounce
        this.maxRecentChanges = 50;
        // Real-time metrics cache
        this.currentMetrics = new Map();
        this.refactoringOpportunities = new Map();
        this.detectedPatterns = [];
        this.mastroClient = mastroClient;
        this.notificationService = notificationService;
        // Watch for configuration changes
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('mastro.realTimeAnalysis')) {
                this.updateConfiguration();
            }
        });
        this.updateConfiguration();
    }
    /**
     * Start real-time analysis and file watching
     */
    async startAnalysis() {
        if (!this.isAnalysisEnabled)
            return;
        await this.initializeFileWatcher();
        await this.initializeTextDocumentWatcher();
        console.log('🔍 Real-time development analysis started');
    }
    /**
     * Stop real-time analysis and cleanup watchers
     */
    stopAnalysis() {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = undefined;
        }
        if (this.textDocumentWatcher) {
            this.textDocumentWatcher.dispose();
            this.textDocumentWatcher = undefined;
        }
        // Clear analysis queue
        this.analysisQueue.forEach(timeout => clearTimeout(timeout));
        this.analysisQueue.clear();
        console.log('🔍 Real-time development analysis stopped');
    }
    /**
     * Get current quality metrics for a file
     */
    getFileMetrics(file) {
        return this.currentMetrics.get(file) || [];
    }
    /**
     * Get current refactoring opportunities for a file
     */
    getRefactoringOpportunities(file) {
        return this.refactoringOpportunities.get(file) || [];
    }
    /**
     * Get currently detected development patterns
     */
    getCurrentPatterns() {
        return this.detectedPatterns;
    }
    /**
     * Manually trigger analysis for current workspace
     */
    async triggerAnalysis() {
        if (!this.isAnalysisEnabled) {
            vscode.window.showInformationMessage('Real-time analysis is disabled');
            return;
        }
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            await this.analyzeFile(activeEditor.document.uri.fsPath);
        }
        await this.analyzeWorkspacePatterns();
        vscode.window.showInformationMessage('✅ Real-time analysis completed');
    }
    async initializeFileWatcher() {
        // Watch for file system changes
        const pattern = new vscode.RelativePattern(this.workspaceRoot, '**/*.{ts,js,tsx,jsx,py,java,go,rs,cpp,c,h}');
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
        this.fileWatcher.onDidCreate(uri => {
            this.handleFileChange('created', uri.fsPath);
        });
        this.fileWatcher.onDidChange(uri => {
            this.handleFileChange('modified', uri.fsPath);
        });
        this.fileWatcher.onDidDelete(uri => {
            this.handleFileChange('deleted', uri.fsPath);
        });
    }
    async initializeTextDocumentWatcher() {
        // Watch for text document changes (more granular than file system)
        this.textDocumentWatcher = vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.uri.scheme === 'file') {
                this.handleTextDocumentChange(event);
            }
        });
    }
    handleFileChange(type, filePath) {
        const changeEvent = {
            type,
            file: filePath,
            timestamp: new Date()
        };
        // Store recent changes
        const fileChanges = this.recentChanges.get(filePath) || [];
        fileChanges.push(changeEvent);
        // Keep only recent changes
        if (fileChanges.length > this.maxRecentChanges) {
            fileChanges.shift();
        }
        this.recentChanges.set(filePath, fileChanges);
        // Debounce analysis
        this.debounceAnalysis(filePath);
    }
    handleTextDocumentChange(event) {
        const filePath = event.document.uri.fsPath;
        // Calculate change metrics
        let linesAdded = 0;
        let linesDeleted = 0;
        for (const change of event.contentChanges) {
            const newLines = change.text.split('\n').length - 1;
            const deletedLines = change.range.end.line - change.range.start.line;
            linesAdded += Math.max(0, newLines - deletedLines);
            linesDeleted += Math.max(0, deletedLines - newLines);
        }
        const changeEvent = {
            type: 'modified',
            file: filePath,
            timestamp: new Date(),
            contentChange: {
                linesAdded,
                linesDeleted,
                complexity: this.estimateComplexity(event.document.getText()),
                language: event.document.languageId
            }
        };
        this.handleFileChange('modified', filePath);
    }
    debounceAnalysis(filePath) {
        // Clear existing timeout
        const existingTimeout = this.analysisQueue.get(filePath);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        // Set new timeout
        const timeout = setTimeout(async () => {
            await this.analyzeFile(filePath);
            this.analysisQueue.delete(filePath);
        }, this.analysisInterval);
        this.analysisQueue.set(filePath, timeout);
    }
    async analyzeFile(filePath) {
        try {
            // Get current session context
            const sessionData = await this.mastroClient.getCurrentSession();
            // Skip analysis for non-source files
            if (!this.isSourceFile(filePath)) {
                return;
            }
            // Analyze quality metrics
            const qualityMetrics = await this.analyzeQualityMetrics(filePath, sessionData);
            this.currentMetrics.set(filePath, qualityMetrics);
            // Find refactoring opportunities
            const refactorOps = await this.findRefactoringOpportunities(filePath);
            this.refactoringOpportunities.set(filePath, refactorOps);
            // Detect development patterns
            await this.analyzeWorkspacePatterns();
            // Generate proactive suggestions
            await this.generateProactiveSuggestions(filePath, qualityMetrics, refactorOps);
        }
        catch (error) {
            console.error(`Error analyzing file ${filePath}:`, error);
        }
    }
    async analyzeQualityMetrics(filePath, sessionData) {
        const metrics = [];
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const content = document.getText();
            // Complexity analysis
            const complexity = this.estimateComplexity(content);
            metrics.push({
                type: 'complexity',
                file: filePath,
                score: Math.max(0, 100 - complexity * 10), // Higher complexity = lower score
                trend: this.getComplexityTrend(filePath, complexity),
                suggestions: this.getComplexitySuggestions(complexity),
                priority: complexity > 8 ? 'high' : complexity > 5 ? 'medium' : 'low'
            });
            // Test coverage estimation
            const testCoverage = await this.estimateTestCoverage(filePath);
            metrics.push({
                type: 'test_coverage',
                file: filePath,
                score: testCoverage,
                trend: 'stable', // Would need historical data
                suggestions: this.getTestCoverageSuggestions(testCoverage, filePath),
                priority: testCoverage < 50 ? 'high' : testCoverage < 80 ? 'medium' : 'low'
            });
            // Security analysis
            const securityScore = this.analyzeSecurityPatterns(content);
            if (securityScore < 100) {
                metrics.push({
                    type: 'security',
                    file: filePath,
                    score: securityScore,
                    trend: 'stable',
                    suggestions: this.getSecuritySuggestions(content),
                    priority: securityScore < 70 ? 'high' : 'medium'
                });
            }
        }
        catch (error) {
            console.error(`Error analyzing quality metrics for ${filePath}:`, error);
        }
        return metrics;
    }
    async findRefactoringOpportunities(filePath) {
        const opportunities = [];
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const content = document.getText();
            const lines = content.split('\n');
            // Find long functions
            const longFunctions = this.findLongFunctions(lines);
            for (const func of longFunctions) {
                opportunities.push({
                    type: 'extract_function',
                    file: filePath,
                    line: func.line,
                    column: func.column,
                    description: `Function ${func.name} has ${func.lines} lines and could benefit from extraction`,
                    benefit: 'Improve readability and maintainability',
                    effort: func.lines > 50 ? 'high' : 'medium'
                });
            }
            // Find complex conditionals
            const complexConditionals = this.findComplexConditionals(lines);
            for (const conditional of complexConditionals) {
                opportunities.push({
                    type: 'simplify_conditional',
                    file: filePath,
                    line: conditional.line,
                    column: conditional.column,
                    description: `Complex conditional with ${conditional.complexity} nested levels`,
                    benefit: 'Improve code readability and reduce cognitive load',
                    effort: 'medium'
                });
            }
        }
        catch (error) {
            console.error(`Error finding refactoring opportunities for ${filePath}:`, error);
        }
        return opportunities;
    }
    async analyzeWorkspacePatterns() {
        const patterns = [];
        try {
            const sessionData = await this.mastroClient.getCurrentSession();
            if (!sessionData)
                return;
            // Analyze recent file changes to detect patterns
            const allChanges = [];
            this.recentChanges.forEach(changes => allChanges.push(...changes));
            // Sort by timestamp
            allChanges.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            // Look for TDD pattern (test files created/modified before implementation)
            const tddPattern = this.detectTDDPattern(allChanges);
            if (tddPattern.confidence > 0.6) {
                patterns.push(tddPattern);
            }
            // Look for refactor-first pattern
            const refactorPattern = this.detectRefactorFirstPattern(allChanges);
            if (refactorPattern.confidence > 0.5) {
                patterns.push(refactorPattern);
            }
            // Look for spike pattern (lots of exploration/experimentation)
            const spikePattern = this.detectSpikePattern(allChanges);
            if (spikePattern.confidence > 0.4) {
                patterns.push(spikePattern);
            }
        }
        catch (error) {
            console.error('Error analyzing workspace patterns:', error);
        }
        this.detectedPatterns = patterns;
    }
    async generateProactiveSuggestions(filePath, metrics, opportunities) {
        const suggestions = [];
        // High complexity suggestion
        const complexityMetric = metrics.find(m => m.type === 'complexity');
        if (complexityMetric && complexityMetric.score < 60) {
            suggestions.push({
                type: 'warning',
                title: 'High Complexity Detected',
                message: `${filePath} has high complexity (${complexityMetric.score}/100). Consider refactoring.`,
                actions: ['View Opportunities', 'Explain Changes', 'Dismiss'],
                priority: 'high'
            });
        }
        // Test coverage suggestion
        const testMetric = metrics.find(m => m.type === 'test_coverage');
        if (testMetric && testMetric.score < 70) {
            suggestions.push({
                type: 'suggestion',
                title: 'Low Test Coverage',
                message: `${filePath} has ${testMetric.score}% test coverage. Consider adding tests.`,
                actions: ['Create Test', 'View Coverage', 'Dismiss'],
                priority: 'medium'
            });
        }
        // Refactoring opportunity suggestion
        if (opportunities.length > 0) {
            const highPriorityOps = opportunities.filter(op => op.effort === 'low');
            if (highPriorityOps.length > 0) {
                suggestions.push({
                    type: 'suggestion',
                    title: 'Quick Refactoring Opportunity',
                    message: `Found ${highPriorityOps.length} quick improvement(s) in ${filePath}.`,
                    actions: ['Show Details', 'Apply Fix', 'Dismiss'],
                    priority: 'low'
                });
            }
        }
        // Send suggestions to notification service
        for (const suggestion of suggestions) {
            // Only show suggestions for currently active file to avoid spam
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.uri.fsPath === filePath) {
                // Use a small delay to avoid overwhelming the user
                setTimeout(() => {
                    // We don't have a direct method to show individual suggestions,
                    // so we'll integrate this with the existing notification system
                    // in a future enhancement
                }, 1000);
            }
        }
    }
    // Helper methods
    updateConfiguration() {
        const config = vscode.workspace.getConfiguration('mastro.realTimeAnalysis');
        this.isAnalysisEnabled = config.get('enabled', true);
        this.analysisInterval = config.get('debounceInterval', 3000);
    }
    isSourceFile(filePath) {
        const ext = filePath.split('.').pop()?.toLowerCase();
        return ['ts', 'js', 'tsx', 'jsx', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'h'].includes(ext || '');
    }
    estimateComplexity(content) {
        // Simple complexity estimation based on control structures
        let complexity = 1; // Base complexity
        const patterns = [
            /\bif\b/g, /\belse\b/g, /\bswitch\b/g, /\bcase\b/g,
            /\bfor\b/g, /\bwhile\b/g, /\bdo\b/g,
            /\bcatch\b/g, /\btry\b/g,
            /\?\s*:/g, // Ternary operators
            /&&|\|\|/g // Logical operators
        ];
        for (const pattern of patterns) {
            const matches = content.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        }
        return Math.min(complexity, 20); // Cap at 20
    }
    getComplexityTrend(filePath, currentComplexity) {
        // This would require historical data - for now, return stable
        return 'stable';
    }
    getComplexitySuggestions(complexity) {
        if (complexity > 10) {
            return [
                'Consider breaking this into smaller functions',
                'Look for opportunities to extract methods',
                'Simplify conditional logic where possible'
            ];
        }
        else if (complexity > 7) {
            return [
                'Monitor complexity as this function grows',
                'Consider early returns to reduce nesting'
            ];
        }
        return ['Complexity is at a good level'];
    }
    async estimateTestCoverage(filePath) {
        // Look for corresponding test file
        const testPatterns = [
            filePath.replace(/\.(ts|js|tsx|jsx)$/, '.test.$1'),
            filePath.replace(/\.(ts|js|tsx|jsx)$/, '.spec.$1'),
            filePath.replace('/src/', '/test/').replace('/src/', '/__tests__/'),
            filePath.replace('/lib/', '/test/')
        ];
        for (const testPath of testPatterns) {
            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(testPath));
                // If test file exists, estimate coverage based on file sizes
                const sourceDoc = await vscode.workspace.openTextDocument(filePath);
                const testDoc = await vscode.workspace.openTextDocument(testPath);
                const sourceLines = sourceDoc.getText().split('\n').length;
                const testLines = testDoc.getText().split('\n').length;
                // Simple heuristic: test coverage roughly proportional to test/source line ratio
                return Math.min(85, Math.round((testLines / sourceLines) * 60));
            }
            catch {
                // Test file doesn't exist
                continue;
            }
        }
        return 0; // No test file found
    }
    getTestCoverageSuggestions(coverage, filePath) {
        if (coverage === 0) {
            return [
                'No test file found - consider creating tests',
                'Start with testing the main functions',
                'Use TDD approach for new features'
            ];
        }
        else if (coverage < 50) {
            return [
                'Add tests for uncovered code paths',
                'Focus on edge cases and error conditions',
                'Consider integration tests'
            ];
        }
        else if (coverage < 80) {
            return [
                'Good test coverage, consider testing edge cases',
                'Add property-based tests for complex logic'
            ];
        }
        return ['Excellent test coverage!'];
    }
    analyzeSecurityPatterns(content) {
        let score = 100;
        const securityIssues = [
            { pattern: /console\.log\(.*password.*\)/i, penalty: 20, issue: 'password logging' },
            { pattern: /console\.log\(.*token.*\)/i, penalty: 20, issue: 'token logging' },
            { pattern: /eval\(/g, penalty: 30, issue: 'eval usage' },
            { pattern: /innerHTML\s*=/g, penalty: 15, issue: 'innerHTML usage' },
            { pattern: /document\.write\(/g, penalty: 15, issue: 'document.write usage' },
            { pattern: /sql.*\+.*\+/i, penalty: 25, issue: 'potential SQL injection' }
        ];
        for (const issue of securityIssues) {
            const matches = content.match(issue.pattern);
            if (matches) {
                score -= issue.penalty * matches.length;
            }
        }
        return Math.max(0, score);
    }
    getSecuritySuggestions(content) {
        const suggestions = [];
        if (content.includes('console.log') && /password|token|key/i.test(content)) {
            suggestions.push('Avoid logging sensitive information like passwords or tokens');
        }
        if (content.includes('eval(')) {
            suggestions.push('Replace eval() with safer alternatives');
        }
        if (content.includes('innerHTML')) {
            suggestions.push('Consider using textContent or proper sanitization with innerHTML');
        }
        return suggestions;
    }
    findLongFunctions(lines) {
        const functions = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const functionMatch = line.match(/(?:function\s+(\w+)|(\w+)\s*[=:]\s*(?:function|\(.*\)\s*=>))/);
            if (functionMatch) {
                const name = functionMatch[1] || functionMatch[2] || 'anonymous';
                const startLine = i;
                let braceCount = 0;
                let functionLines = 0;
                // Count lines until function ends
                for (let j = i; j < lines.length; j++) {
                    const currentLine = lines[j];
                    braceCount += (currentLine.match(/\{/g) || []).length;
                    braceCount -= (currentLine.match(/\}/g) || []).length;
                    functionLines++;
                    if (braceCount === 0 && j > i) {
                        break;
                    }
                }
                if (functionLines > 25) { // Functions longer than 25 lines
                    functions.push({
                        name,
                        line: startLine,
                        column: line.indexOf(functionMatch[0]),
                        lines: functionLines
                    });
                }
            }
        }
        return functions;
    }
    findComplexConditionals(lines) {
        const conditionals = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const ifMatch = line.match(/\bif\s*\(/);
            if (ifMatch) {
                let complexity = 1;
                let parenCount = 0;
                let inCondition = false;
                // Analyze the condition complexity
                for (const char of line) {
                    if (char === '(') {
                        parenCount++;
                        inCondition = true;
                    }
                    else if (char === ')') {
                        parenCount--;
                        if (parenCount === 0)
                            break;
                    }
                    else if (inCondition && (line.includes('&&') || line.includes('||'))) {
                        complexity++;
                    }
                }
                // Check for nested ifs in following lines
                for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                    if (lines[j].includes('if (')) {
                        complexity++;
                    }
                }
                if (complexity > 3) {
                    conditionals.push({
                        line: i,
                        column: ifMatch.index || 0,
                        complexity
                    });
                }
            }
        }
        return conditionals;
    }
    detectTDDPattern(changes) {
        const testFileChanges = changes.filter(c => this.isTestFile(c.file));
        const sourceFileChanges = changes.filter(c => !this.isTestFile(c.file) && this.isSourceFile(c.file));
        let tddEvidence = 0;
        // Look for test files modified before corresponding source files
        for (const testChange of testFileChanges) {
            const correspondingSource = this.getCorrespondingSourceFile(testChange.file);
            const sourceChange = sourceFileChanges.find(c => c.file === correspondingSource);
            if (sourceChange && testChange.timestamp > sourceChange.timestamp) {
                tddEvidence++;
            }
        }
        const confidence = Math.min(1, tddEvidence / Math.max(1, testFileChanges.length));
        return {
            pattern: 'test_driven',
            confidence,
            evidence: [`${tddEvidence} test files modified before corresponding source files`],
            recommendations: confidence > 0.7 ?
                ['Excellent TDD practice! Keep writing tests first'] :
                ['Consider writing tests before implementation for better TDD'],
            nextBestAction: confidence < 0.5 ? 'Write a test for the next feature' : undefined
        };
    }
    detectRefactorFirstPattern(changes) {
        let refactorEvidence = 0;
        // Look for patterns indicating refactoring (many small changes, renames, etc.)
        for (const change of changes) {
            if (change.contentChange) {
                const { linesAdded, linesDeleted } = change.contentChange;
                // Refactoring often has similar adds/deletes (moving code around)
                if (Math.abs(linesAdded - linesDeleted) < Math.max(linesAdded, linesDeleted) * 0.5) {
                    refactorEvidence++;
                }
            }
        }
        const confidence = Math.min(1, refactorEvidence / Math.max(1, changes.length * 0.3));
        return {
            pattern: 'refactor_first',
            confidence,
            evidence: [`${refactorEvidence} changes show refactoring patterns`],
            recommendations: confidence > 0.6 ?
                ['Good refactoring practice - clean code before adding features'] :
                ['Consider refactoring before adding new functionality']
        };
    }
    detectSpikePattern(changes) {
        const recentChanges = changes.filter(c => Date.now() - c.timestamp.getTime() < 30 * 60 * 1000 // Last 30 minutes
        );
        const uniqueFiles = new Set(recentChanges.map(c => c.file));
        const changesPerFile = recentChanges.length / uniqueFiles.size;
        // Spike pattern: many changes across many files in short time
        const confidence = Math.min(1, (changesPerFile * uniqueFiles.size) / 20);
        return {
            pattern: 'spike',
            confidence,
            evidence: [`${recentChanges.length} changes across ${uniqueFiles.size} files in 30 minutes`],
            recommendations: confidence > 0.5 ?
                ['Exploration phase detected - consider documenting findings',
                    'Create a summary of what you\'ve learned'] :
                []
        };
    }
    isTestFile(filePath) {
        return /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filePath) ||
            filePath.includes('/test/') ||
            filePath.includes('/__tests__/');
    }
    getCorrespondingSourceFile(testFilePath) {
        return testFilePath
            .replace(/\.(test|spec)\./, '.')
            .replace('/test/', '/src/')
            .replace('/__tests__/', '/src/');
    }
    dispose() {
        this.stopAnalysis();
    }
}
exports.RealTimeAnalyzer = RealTimeAnalyzer;
//# sourceMappingURL=realTimeAnalyzer.js.map