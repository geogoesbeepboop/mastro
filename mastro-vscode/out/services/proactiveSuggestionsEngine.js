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
exports.ProactiveSuggestionsEngine = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Proactive Suggestions Engine that provides intelligent, context-aware
 * suggestions based on real-time code analysis and development patterns
 */
class ProactiveSuggestionsEngine {
    constructor(realTimeAnalyzer, liveQualityEngine) {
        this.activeSuggestions = new Map();
        this.suggestionHistory = [];
        this.lastSuggestionTime = 0;
        this.suggestionCooldown = 10000; // 10 seconds between suggestions
        // Configuration
        this.config = {
            enableQualitySuggestions: true,
            enableRefactoringSuggestions: true,
            enablePatternSuggestions: true,
            enableTestSuggestions: true,
            enableSecuritySuggestions: true,
            maxActiveSuggestions: 3,
            minPriorityThreshold: 'low'
        };
        this.realTimeAnalyzer = realTimeAnalyzer;
        this.liveQualityEngine = liveQualityEngine;
        this.updateConfiguration();
        // Watch for configuration changes
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('mastro.proactiveSuggestions')) {
                this.updateConfiguration();
            }
        });
        // Start periodic analysis
        this.startPeriodicAnalysis();
    }
    /**
     * Generate proactive suggestions for the current context
     */
    async generateSuggestions() {
        try {
            // Respect cooldown period
            const now = Date.now();
            if (now - this.lastSuggestionTime < this.suggestionCooldown) {
                return;
            }
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor || !this.isSourceFile(activeEditor.document.uri.fsPath)) {
                return;
            }
            const filePath = activeEditor.document.uri.fsPath;
            const suggestions = [];
            // Quality-based suggestions
            if (this.config.enableQualitySuggestions) {
                const qualityMetrics = this.liveQualityEngine.getFileMetrics(filePath);
                const qualitySuggestions = await this.generateQualitySuggestions(filePath, qualityMetrics);
                suggestions.push(...qualitySuggestions);
            }
            // Refactoring suggestions
            if (this.config.enableRefactoringSuggestions) {
                const opportunities = this.realTimeAnalyzer.getRefactoringOpportunities(filePath);
                const refactorSuggestions = this.generateRefactoringSuggestions(filePath, opportunities);
                suggestions.push(...refactorSuggestions);
            }
            // Pattern-based suggestions
            if (this.config.enablePatternSuggestions) {
                const patterns = this.realTimeAnalyzer.getCurrentPatterns();
                const patternSuggestions = this.generatePatternSuggestions(patterns);
                suggestions.push(...patternSuggestions);
            }
            // Test coverage suggestions
            if (this.config.enableTestSuggestions) {
                const testSuggestions = await this.generateTestSuggestions(filePath);
                suggestions.push(...testSuggestions);
            }
            // Security suggestions
            if (this.config.enableSecuritySuggestions) {
                const qualityMetrics = this.liveQualityEngine.getFileMetrics(filePath);
                const securitySuggestions = await this.generateSecuritySuggestions(filePath, qualityMetrics);
                suggestions.push(...securitySuggestions);
            }
            // Filter and prioritize suggestions
            const filteredSuggestions = this.filterAndPrioritizeSuggestions(suggestions);
            // Show suggestions
            for (const suggestion of filteredSuggestions.slice(0, this.config.maxActiveSuggestions)) {
                await this.showSuggestion(suggestion);
            }
            this.lastSuggestionTime = now;
        }
        catch (error) {
            console.error('Error generating proactive suggestions:', error);
        }
    }
    /**
     * Generate quality-based suggestions
     */
    async generateQualitySuggestions(filePath, metrics) {
        const suggestions = [];
        for (const metric of metrics) {
            // High complexity suggestion
            if (metric.type === 'complexity' && metric.score < 60) {
                suggestions.push({
                    id: `complexity-${filePath}-${Date.now()}`,
                    type: 'quality',
                    priority: metric.score < 40 ? 'high' : 'medium',
                    title: `High Complexity Detected`,
                    message: `File has complexity score of ${metric.score}/100. Consider refactoring to improve maintainability.`,
                    file: filePath,
                    actions: [
                        {
                            label: 'Show File Metrics',
                            command: 'mastro.showFileMetrics',
                            primary: true
                        },
                        {
                            label: 'View Opportunities',
                            command: 'mastro.analyzeFileQuality'
                        },
                        {
                            label: 'Learn About Complexity',
                            command: 'mastro.showComplexityHelp'
                        }
                    ],
                    dismissable: true
                });
            }
            // Security issues
            if (metric.type === 'security' && metric.score < 80) {
                const criticalIssues = metric.issues.filter(issue => issue.severity === 'error');
                if (criticalIssues.length > 0) {
                    suggestions.push({
                        id: `security-${filePath}-${Date.now()}`,
                        type: 'security',
                        priority: 'critical',
                        title: `Security Issues Detected`,
                        message: `Found ${criticalIssues.length} critical security issue(s). Immediate attention required.`,
                        file: filePath,
                        line: criticalIssues[0].line,
                        actions: [
                            {
                                label: 'Show Issues',
                                command: 'mastro.analyzeFileQuality',
                                primary: true
                            },
                            {
                                label: 'Apply Quick Fixes',
                                command: 'editor.action.quickFix'
                            }
                        ],
                        dismissable: false
                    });
                }
            }
            // Documentation suggestions
            if (metric.type === 'documentation' && metric.score < 50) {
                suggestions.push({
                    id: `docs-${filePath}-${Date.now()}`,
                    type: 'quality',
                    priority: 'low',
                    title: `Improve Documentation`,
                    message: `Functions are missing documentation (${metric.score}% documented). Consider adding JSDoc comments.`,
                    file: filePath,
                    actions: [
                        {
                            label: 'Add Documentation',
                            command: 'mastro.addDocumentation',
                            primary: true
                        },
                        {
                            label: 'View Guidelines',
                            command: 'vscode.open',
                            args: [vscode.Uri.parse('https://docs.mastro.ai/documentation-guidelines')]
                        }
                    ],
                    dismissable: true
                });
            }
        }
        return suggestions;
    }
    /**
     * Generate refactoring suggestions
     */
    generateRefactoringSuggestions(filePath, opportunities) {
        const suggestions = [];
        const quickWins = opportunities.filter(op => op.effort === 'low');
        if (quickWins.length > 0) {
            suggestions.push({
                id: `refactor-${filePath}-${Date.now()}`,
                type: 'refactor',
                priority: 'medium',
                title: `Quick Refactoring Opportunities`,
                message: `Found ${quickWins.length} low-effort improvement(s) in this file.`,
                file: filePath,
                line: quickWins[0].line,
                actions: [
                    {
                        label: 'Show Opportunities',
                        command: 'mastro.showFileMetrics',
                        primary: true
                    },
                    {
                        label: 'Apply Quick Fix',
                        command: 'editor.action.quickFix'
                    }
                ],
                dismissable: true
            });
        }
        return suggestions;
    }
    /**
     * Generate pattern-based suggestions
     */
    generatePatternSuggestions(patterns) {
        const suggestions = [];
        for (const pattern of patterns) {
            if (pattern.confidence > 0.7 && pattern.nextBestAction) {
                suggestions.push({
                    id: `pattern-${pattern.pattern}-${Date.now()}`,
                    type: 'pattern',
                    priority: 'low',
                    title: `${pattern.pattern.replace(/_/g, ' ').toUpperCase()} Pattern Detected`,
                    message: `${pattern.nextBestAction}`,
                    actions: [
                        {
                            label: 'View Patterns',
                            command: 'mastro.showDevelopmentPatterns',
                            primary: true
                        },
                        {
                            label: 'Learn More',
                            command: 'vscode.open',
                            args: [vscode.Uri.parse(`https://docs.mastro.ai/patterns/${pattern.pattern}`)]
                        }
                    ],
                    dismissable: true
                });
            }
        }
        return suggestions;
    }
    /**
     * Generate test coverage suggestions
     */
    async generateTestSuggestions(filePath) {
        const suggestions = [];
        // Check if file has corresponding test
        const hasTest = await this.hasCorrespondingTest(filePath);
        if (!hasTest) {
            suggestions.push({
                id: `test-${filePath}-${Date.now()}`,
                type: 'test',
                priority: 'medium',
                title: `No Test File Found`,
                message: `Consider creating tests for better code reliability and easier refactoring.`,
                file: filePath,
                actions: [
                    {
                        label: 'Create Test',
                        command: 'mastro.createTest',
                        primary: true
                    },
                    {
                        label: 'Learn TDD',
                        command: 'vscode.open',
                        args: [vscode.Uri.parse('https://docs.mastro.ai/testing/tdd')]
                    }
                ],
                dismissable: true
            });
        }
        return suggestions;
    }
    /**
     * Generate security suggestions
     */
    async generateSecuritySuggestions(filePath, metrics) {
        const suggestions = [];
        const securityMetric = metrics.find(m => m.type === 'security');
        if (securityMetric && securityMetric.score < 90) {
            const highPriorityIssues = securityMetric.issues.filter(issue => issue.severity === 'error' && issue.category === 'security');
            if (highPriorityIssues.length > 0) {
                suggestions.push({
                    id: `security-alert-${filePath}-${Date.now()}`,
                    type: 'security',
                    priority: 'critical',
                    title: `Critical Security Alert`,
                    message: `Potential security vulnerabilities detected. Please review immediately.`,
                    file: filePath,
                    line: highPriorityIssues[0].line,
                    actions: [
                        {
                            label: 'Review Issues',
                            command: 'mastro.analyzeFileQuality',
                            primary: true
                        },
                        {
                            label: 'Security Guidelines',
                            command: 'vscode.open',
                            args: [vscode.Uri.parse('https://docs.mastro.ai/security/best-practices')]
                        }
                    ],
                    dismissable: false
                });
            }
        }
        return suggestions;
    }
    /**
     * Filter and prioritize suggestions
     */
    filterAndPrioritizeSuggestions(suggestions) {
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        // Filter out duplicates and already active suggestions
        const filtered = suggestions.filter(suggestion => !this.activeSuggestions.has(suggestion.id) &&
            priorityOrder[suggestion.priority] >= priorityOrder[this.config.minPriorityThreshold]);
        // Sort by priority
        return filtered.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    }
    /**
     * Show a suggestion to the user
     */
    async showSuggestion(suggestion) {
        this.activeSuggestions.set(suggestion.id, suggestion);
        const actions = suggestion.actions.map(action => action.label);
        if (suggestion.dismissable) {
            actions.push('Dismiss');
        }
        const priorityIcon = {
            'critical': '🚨',
            'high': '⚠️',
            'medium': '💡',
            'low': '💭'
        };
        const message = `${priorityIcon[suggestion.priority]} ${suggestion.message}`;
        let result;
        if (suggestion.priority === 'critical') {
            result = await vscode.window.showErrorMessage(suggestion.title, { modal: false }, ...actions);
        }
        else if (suggestion.priority === 'high') {
            result = await vscode.window.showWarningMessage(suggestion.title, { detail: message }, ...actions);
        }
        else {
            result = await vscode.window.showInformationMessage(suggestion.title, { detail: message }, ...actions);
        }
        if (result && result !== 'Dismiss') {
            const action = suggestion.actions.find(a => a.label === result);
            if (action) {
                await this.executeSuggestionAction(action, suggestion);
            }
        }
        // Clean up
        this.activeSuggestions.delete(suggestion.id);
        this.suggestionHistory.push(suggestion);
        // Keep history manageable
        if (this.suggestionHistory.length > 100) {
            this.suggestionHistory = this.suggestionHistory.slice(-50);
        }
    }
    /**
     * Execute a suggestion action
     */
    async executeSuggestionAction(action, suggestion) {
        try {
            if (action.args) {
                await vscode.commands.executeCommand(action.command, ...action.args);
            }
            else {
                await vscode.commands.executeCommand(action.command);
            }
        }
        catch (error) {
            console.error(`Error executing suggestion action ${action.command}:`, error);
            vscode.window.showErrorMessage(`Failed to execute action: ${action.label}`);
        }
    }
    /**
     * Start periodic analysis for proactive suggestions
     */
    startPeriodicAnalysis() {
        // Trigger on file changes
        vscode.workspace.onDidSaveTextDocument(async () => {
            setTimeout(() => this.generateSuggestions(), 2000); // Small delay after save
        });
        // Trigger on active editor change
        vscode.window.onDidChangeActiveTextEditor(async () => {
            setTimeout(() => this.generateSuggestions(), 1000); // Small delay after editor change
        });
        // Periodic check every 2 minutes
        setInterval(() => {
            this.generateSuggestions();
        }, 120000);
    }
    /**
     * Check if file has corresponding test
     */
    async hasCorrespondingTest(filePath) {
        const testPatterns = [
            filePath.replace(/\.(ts|js|tsx|jsx)$/, '.test.$1'),
            filePath.replace(/\.(ts|js|tsx|jsx)$/, '.spec.$1'),
            filePath.replace('/src/', '/test/'),
            filePath.replace('/src/', '/__tests__/')
        ];
        for (const testPath of testPatterns) {
            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(testPath));
                return true;
            }
            catch {
                continue;
            }
        }
        return false;
    }
    /**
     * Check if file is a source file
     */
    isSourceFile(filePath) {
        const ext = filePath.split('.').pop()?.toLowerCase();
        return ['ts', 'js', 'tsx', 'jsx', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'h'].includes(ext || '');
    }
    /**
     * Update configuration from VS Code settings
     */
    updateConfiguration() {
        const config = vscode.workspace.getConfiguration('mastro.proactiveSuggestions');
        this.config = {
            enableQualitySuggestions: config.get('enableQuality', true),
            enableRefactoringSuggestions: config.get('enableRefactoring', true),
            enablePatternSuggestions: config.get('enablePatterns', true),
            enableTestSuggestions: config.get('enableTesting', true),
            enableSecuritySuggestions: config.get('enableSecurity', true),
            maxActiveSuggestions: config.get('maxActive', 3),
            minPriorityThreshold: config.get('minPriority', 'low')
        };
        this.suggestionCooldown = config.get('cooldownMs', 10000);
    }
    /**
     * Get suggestion history
     */
    getSuggestionHistory() {
        return [...this.suggestionHistory];
    }
    /**
     * Clear suggestion history
     */
    clearSuggestionHistory() {
        this.suggestionHistory = [];
    }
    /**
     * Dispose of resources
     */
    dispose() {
        this.activeSuggestions.clear();
        this.suggestionHistory = [];
    }
}
exports.ProactiveSuggestionsEngine = ProactiveSuggestionsEngine;
//# sourceMappingURL=proactiveSuggestionsEngine.js.map