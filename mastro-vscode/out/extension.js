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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const mastroClient_1 = require("./services/mastroClient");
const notificationService_1 = require("./services/notificationService");
const realTimeAnalyzer_1 = require("./services/realTimeAnalyzer");
const liveQualityEngine_1 = require("./services/liveQualityEngine");
const codeActionProvider_1 = require("./providers/codeActionProvider");
const proactiveSuggestionsEngine_1 = require("./services/proactiveSuggestionsEngine");
let mastroClient;
let notificationService;
let realTimeAnalyzer;
let liveQualityEngine;
let codeActionProvider;
let proactiveSuggestionsEngine;
let statusBarItem;
let sessionDataProvider;
function activate(context) {
    console.log('Mastro VS Code extension is being activated...');
    // Initialize the mastro client
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
    if (!workspaceRoot) {
        vscode.window.showWarningMessage('Mastro: No workspace folder detected. Open a folder to use Mastro features.');
        return;
    }
    mastroClient = new mastroClient_1.MastroClient(workspaceRoot);
    notificationService = new notificationService_1.NotificationService(mastroClient);
    liveQualityEngine = new liveQualityEngine_1.LiveQualityEngine(mastroClient);
    realTimeAnalyzer = new realTimeAnalyzer_1.RealTimeAnalyzer(workspaceRoot, mastroClient, notificationService);
    codeActionProvider = new codeActionProvider_1.MastroCodeActionProvider(liveQualityEngine, realTimeAnalyzer);
    proactiveSuggestionsEngine = new proactiveSuggestionsEngine_1.ProactiveSuggestionsEngine(realTimeAnalyzer, liveQualityEngine);
    // Register code action provider
    const codeActionProviderDisposable = vscode.languages.registerCodeActionsProvider([{ language: 'typescript' }, { language: 'javascript' }, { language: 'typescriptreact' }, { language: 'javascriptreact' }], codeActionProvider, {
        providedCodeActionKinds: [
            vscode.CodeActionKind.QuickFix,
            vscode.CodeActionKind.Refactor,
            vscode.CodeActionKind.RefactorExtract,
            vscode.CodeActionKind.Source
        ]
    });
    context.subscriptions.push(codeActionProviderDisposable);
    // Check if mastro CLI is available
    checkMastroAvailability();
    // Initialize UI components
    initializeStatusBar(context);
    initializeTreeView(context);
    // Register all commands
    registerCommands(context);
    // Set up context keys for conditional menu visibility
    setContextKeys();
    // Auto-refresh session data if enabled
    if (vscode.workspace.getConfiguration('mastro').get('autoRefreshSession', true)) {
        startAutoRefresh();
    }
    // Start real-time analysis if enabled
    const realTimeConfig = vscode.workspace.getConfiguration('mastro.realTimeAnalysis');
    if (realTimeConfig.get('enabled', true)) {
        realTimeAnalyzer.startAnalysis();
    }
    console.log('Mastro VS Code extension is now active!');
}
function deactivate() {
    if (mastroClient) {
        mastroClient.dispose();
    }
    if (notificationService) {
        notificationService.dispose();
    }
    if (realTimeAnalyzer) {
        realTimeAnalyzer.dispose();
    }
    if (liveQualityEngine) {
        liveQualityEngine.dispose();
    }
    if (proactiveSuggestionsEngine) {
        proactiveSuggestionsEngine.dispose();
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
async function checkMastroAvailability() {
    const isAvailable = await mastroClient.isAvailable();
    if (!isAvailable) {
        const action = await vscode.window.showWarningMessage('Mastro CLI not found or not working. Please ensure mastro is installed and accessible.', 'Open Settings', 'View Output');
        if (action === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'mastro.cliPath');
        }
        else if (action === 'View Output') {
            vscode.commands.executeCommand('mastro.showOutput');
        }
    }
}
function initializeStatusBar(context) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'mastro.showAnalytics';
    const config = vscode.workspace.getConfiguration('mastro');
    if (config.get('statusBarEnabled', true)) {
        statusBarItem.show();
        updateStatusBar();
    }
    context.subscriptions.push(statusBarItem);
}
function initializeTreeView(context) {
    sessionDataProvider = new SessionTreeDataProvider();
    const treeView = vscode.window.createTreeView('mastroSession', {
        treeDataProvider: sessionDataProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);
}
function registerCommands(context) {
    // Generate AI commit message
    const generateCommit = vscode.commands.registerCommand('mastro.generateCommit', async () => {
        if (!await mastroClient.hasStagedChanges()) {
            vscode.window.showInformationMessage('No staged changes found. Stage some changes first.');
            return;
        }
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating AI commit message...',
            cancellable: false
        }, async () => {
            const result = await mastroClient.generateCommit();
            if (result.success) {
                vscode.window.showInformationMessage('✅ Commit created successfully!');
                refreshSessionData();
            }
            else {
                vscode.window.showErrorMessage(`Failed to generate commit: ${result.error}`);
            }
        });
    });
    // Review current session
    const reviewSession = vscode.commands.registerCommand('mastro.reviewSession', async () => {
        if (!await mastroClient.hasWorkingChanges()) {
            vscode.window.showInformationMessage('No changes detected in current session.');
            return;
        }
        // Show options for review persona
        const persona = await vscode.window.showQuickPick([
            'security',
            'performance',
            'maintainability',
            'testing'
        ], {
            placeHolder: 'Select review focus (or cancel for general review)'
        });
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing current session...',
            cancellable: false
        }, async () => {
            const options = persona ? { persona, stream: true } : { stream: true };
            const result = await mastroClient.reviewSession(options);
            if (result.success) {
                // Show results in a new editor
                const doc = await vscode.workspace.openTextDocument({
                    content: result.output || 'No output received',
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);
            }
            else {
                vscode.window.showErrorMessage(`Review failed: ${result.error}`);
            }
        });
    });
    // Analyze commit boundaries
    const splitChanges = vscode.commands.registerCommand('mastro.splitChanges', async () => {
        if (!await mastroClient.hasWorkingChanges()) {
            vscode.window.showInformationMessage('No working changes detected.');
            return;
        }
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing commit boundaries...',
            cancellable: false
        }, async () => {
            const boundaries = await mastroClient.splitChanges();
            if (boundaries && boundaries.length > 0) {
                // Show split suggestions in quick pick
                const items = boundaries.map(b => ({
                    label: `${b.priority === 'high' ? '🔥' : b.priority === 'medium' ? '⚡' : '📝'} ${b.theme}`,
                    description: `${b.files.length} files`,
                    detail: b.rationale,
                    boundary: b
                }));
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a commit boundary to view details',
                    matchOnDescription: true,
                    matchOnDetail: true
                });
                if (selected) {
                    const info = [
                        `**Theme**: ${selected.boundary.theme}`,
                        `**Priority**: ${selected.boundary.priority}`,
                        `**Files**: ${selected.boundary.files.join(', ')}`,
                        `**Suggested Message**: ${selected.boundary.suggestedMessage}`,
                        `\n**Rationale**:\n${selected.boundary.rationale}`
                    ].join('\n\n');
                    const doc = await vscode.workspace.openTextDocument({
                        content: info,
                        language: 'markdown'
                    });
                    await vscode.window.showTextDocument(doc);
                }
            }
            else {
                vscode.window.showInformationMessage('No logical commit boundaries detected in current changes.');
            }
        });
    });
    // Show analytics
    const showAnalytics = vscode.commands.registerCommand('mastro.showAnalytics', async () => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Fetching productivity analytics...',
            cancellable: false
        }, async () => {
            const analytics = await mastroClient.getAnalytics({ insights: true });
            if (analytics) {
                const report = [
                    `# Mastro Productivity Analytics\n`,
                    `**Total Sessions**: ${analytics.totalSessions}`,
                    `**Average Productivity**: ${analytics.averageProductivity.toFixed(1)}%`,
                    `**Focus Score**: ${analytics.focusScore.toFixed(1)}%`,
                    `**Weekly Velocity**: ${analytics.weeklyVelocity.join(', ')}`,
                    `\n## Insights\n`,
                    ...analytics.insights.map(insight => `- ${insight}`)
                ].join('\n');
                const doc = await vscode.workspace.openTextDocument({
                    content: report,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);
            }
            else {
                vscode.window.showErrorMessage('Failed to fetch analytics data.');
            }
        });
    });
    // Explain code changes
    const explainChanges = vscode.commands.registerCommand('mastro.explainChanges', async () => {
        const result = await mastroClient.explainChanges({ format: 'markdown' });
        if (result.success) {
            const doc = await vscode.workspace.openTextDocument({
                content: result.output || 'No explanation generated',
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        }
        else {
            vscode.window.showErrorMessage(`Failed to explain changes: ${result.error}`);
        }
    });
    // Create smart PR
    const createPR = vscode.commands.registerCommand('mastro.createPR', async () => {
        const title = await vscode.window.showInputBox({
            prompt: 'Enter PR title (optional - leave empty for auto-generation)',
            placeHolder: 'Add authentication system'
        });
        const template = await vscode.window.showQuickPick([
            'feature',
            'bugfix',
            'hotfix',
            'refactor',
            'docs'
        ], {
            placeHolder: 'Select PR template (or cancel for auto-detection)'
        });
        const options = {};
        if (title)
            options.title = title;
        if (template)
            options.template = template;
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Creating smart PR...',
            cancellable: false
        }, async () => {
            const result = await mastroClient.createPR(options);
            if (result.success) {
                vscode.window.showInformationMessage('✅ PR created successfully!');
            }
            else {
                vscode.window.showErrorMessage(`Failed to create PR: ${result.error}`);
            }
        });
    });
    // Install pre-commit hooks
    const installHooks = vscode.commands.registerCommand('mastro.installHooks', async () => {
        const strictness = await vscode.window.showQuickPick([
            'strict',
            'moderate',
            'lenient'
        ], {
            placeHolder: 'Select hook strictness level'
        });
        if (strictness) {
            const result = await mastroClient.installHooks({ strictness });
            if (result.success) {
                vscode.window.showInformationMessage('✅ Pre-commit hooks installed successfully!');
            }
            else {
                vscode.window.showErrorMessage(`Failed to install hooks: ${result.error}`);
            }
        }
    });
    // Enable focus mode
    const focusMode = vscode.commands.registerCommand('mastro.focusMode', async () => {
        const result = await mastroClient.enableFocusMode();
        if (result.success) {
            notificationService.enableFocusMode();
            updateStatusBar();
        }
        else {
            vscode.window.showErrorMessage(`Failed to enable focus mode: ${result.error}`);
        }
    });
    // Refresh session data
    const refreshSession = vscode.commands.registerCommand('mastro.refreshSession', async () => {
        await refreshSessionData();
        vscode.window.showInformationMessage('Session data refreshed');
    });
    // Show output channel
    const showOutput = vscode.commands.registerCommand('mastro.showOutput', () => {
        mastroClient['outputChannel'].show();
    });
    // Trigger quality check
    const qualityCheck = vscode.commands.registerCommand('mastro.qualityCheck', async () => {
        await notificationService.triggerQualityCheck();
    });
    // Real-time analysis commands
    const startRealTimeAnalysis = vscode.commands.registerCommand('mastro.startRealTimeAnalysis', async () => {
        await realTimeAnalyzer.startAnalysis();
        vscode.window.showInformationMessage('🔍 Real-time analysis started');
    });
    const stopRealTimeAnalysis = vscode.commands.registerCommand('mastro.stopRealTimeAnalysis', () => {
        realTimeAnalyzer.stopAnalysis();
        vscode.window.showInformationMessage('🔍 Real-time analysis stopped');
    });
    const triggerAnalysis = vscode.commands.registerCommand('mastro.triggerAnalysis', async () => {
        await realTimeAnalyzer.triggerAnalysis();
    });
    const showFileMetrics = vscode.commands.registerCommand('mastro.showFileMetrics', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showInformationMessage('No active file to analyze');
            return;
        }
        const filePath = activeEditor.document.uri.fsPath;
        const metrics = realTimeAnalyzer.getFileMetrics(filePath);
        const opportunities = realTimeAnalyzer.getRefactoringOpportunities(filePath);
        if (metrics.length === 0 && opportunities.length === 0) {
            vscode.window.showInformationMessage('No metrics available for this file. Try triggering analysis first.');
            return;
        }
        // Create a detailed report
        const report = [
            `# Quality Metrics for ${filePath}\n`,
            '## Metrics',
            ...metrics.map(m => `- **${m.type}**: ${m.score}/100 (${m.trend}) - ${m.suggestions.join(', ')}`),
            '\n## Refactoring Opportunities',
            ...opportunities.map(op => `- **${op.type}** at line ${op.line}: ${op.description} (${op.effort} effort)`)
        ].join('\n');
        const doc = await vscode.workspace.openTextDocument({
            content: report,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);
    });
    const showDevelopmentPatterns = vscode.commands.registerCommand('mastro.showDevelopmentPatterns', async () => {
        const patterns = realTimeAnalyzer.getCurrentPatterns();
        if (patterns.length === 0) {
            vscode.window.showInformationMessage('No development patterns detected yet');
            return;
        }
        const report = [
            '# Development Patterns Detected\n',
            ...patterns.map(pattern => [
                `## ${pattern.pattern.replace(/_/g, ' ').toUpperCase()}`,
                `**Confidence**: ${Math.round(pattern.confidence * 100)}%`,
                '**Evidence**:',
                ...pattern.evidence.map(e => `- ${e}`),
                '**Recommendations**:',
                ...pattern.recommendations.map(r => `- ${r}`),
                pattern.nextBestAction ? `\n**Next Best Action**: ${pattern.nextBestAction}` : ''
            ].join('\n'))
        ].join('\n\n');
        const doc = await vscode.workspace.openTextDocument({
            content: report,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);
    });
    // Live Quality Engine commands
    const analyzeFileQuality = vscode.commands.registerCommand('mastro.analyzeFileQuality', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showInformationMessage('No active file to analyze');
            return;
        }
        const filePath = activeEditor.document.uri.fsPath;
        const metrics = await liveQualityEngine.analyzeFileQuality(filePath);
        if (metrics.length === 0) {
            vscode.window.showInformationMessage('No quality metrics available for this file');
            return;
        }
        // Create detailed quality report
        const overallGrade = calculateOverallGrade(metrics);
        const report = [
            `# Quality Analysis: ${filePath}\n`,
            `**Overall Grade**: ${overallGrade}\n`,
            ...metrics.map(metric => [
                `## ${metric.type.toUpperCase()} - Grade ${metric.grade} (${metric.score}/100)`,
                `**Trend**: ${metric.trend}`,
                '',
                '### Issues:',
                ...metric.issues.map(issue => `- **${issue.severity.toUpperCase()}**: ${issue.message} (Line ${issue.line + 1})`),
                '',
                '### Suggestions:',
                ...metric.suggestions.map(suggestion => `- **${suggestion.title}**: ${suggestion.description} (${suggestion.effort} effort, ${suggestion.impact} impact)`),
                ''
            ].join('\n'))
        ].join('\n');
        const doc = await vscode.workspace.openTextDocument({
            content: report,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);
    });
    const analyzeProjectQuality = vscode.commands.registerCommand('mastro.analyzeProjectQuality', async () => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing project quality...',
            cancellable: false
        }, async () => {
            const overview = await liveQualityEngine.analyzeProjectQuality();
            const report = [
                '# Project Quality Overview\n',
                `**Overall Grade**: ${overview.grade} (${overview.overallScore}/100)\n`,
                '## Top Issues',
                ...overview.topIssues.slice(0, 5).map(issue => `- **${issue.severity.toUpperCase()}**: ${issue.message} (Line ${issue.line + 1})`),
                '\n## Quality Hotspots',
                ...overview.hotspots.map(file => `- ${file}`),
                '\n## Recommendations',
                ...overview.recommendations.map(rec => `- ${rec}`)
            ].join('\n');
            const doc = await vscode.workspace.openTextDocument({
                content: report,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        });
    });
    // Refactoring helper commands
    const showExtractFunctionHelp = vscode.commands.registerCommand('mastro.showExtractFunctionHelp', codeActionProvider_1.MastroRefactoringHelper.showExtractFunctionHelp);
    const showSimplifyConditionalHelp = vscode.commands.registerCommand('mastro.showSimplifyConditionalHelp', codeActionProvider_1.MastroRefactoringHelper.showSimplifyConditionalHelp);
    const showComplexityHelp = vscode.commands.registerCommand('mastro.showComplexityHelp', codeActionProvider_1.MastroRefactoringHelper.showComplexityHelp);
    const addDocumentation = vscode.commands.registerCommand('mastro.addDocumentation', codeActionProvider_1.MastroRefactoringHelper.addDocumentation);
    const createTest = vscode.commands.registerCommand('mastro.createTest', codeActionProvider_1.MastroRefactoringHelper.createTest);
    const analyzePerformance = vscode.commands.registerCommand('mastro.analyzePerformance', codeActionProvider_1.MastroRefactoringHelper.analyzePerformance);
    // Proactive suggestions command
    const triggerSuggestions = vscode.commands.registerCommand('mastro.triggerSuggestions', async () => {
        await proactiveSuggestionsEngine.generateSuggestions();
        vscode.window.showInformationMessage('✨ Proactive suggestions generated');
    });
    // Register all commands
    context.subscriptions.push(generateCommit, reviewSession, splitChanges, showAnalytics, explainChanges, createPR, installHooks, focusMode, refreshSession, showOutput, qualityCheck, startRealTimeAnalysis, stopRealTimeAnalysis, triggerAnalysis, showFileMetrics, showDevelopmentPatterns, analyzeFileQuality, analyzeProjectQuality, showExtractFunctionHelp, showSimplifyConditionalHelp, showComplexityHelp, addDocumentation, createTest, analyzePerformance, triggerSuggestions);
}
async function setContextKeys() {
    const isGitRepo = await mastroClient.isGitRepository();
    const hasStaged = await mastroClient.hasStagedChanges();
    const hasChanges = await mastroClient.hasWorkingChanges();
    await vscode.commands.executeCommand('setContext', 'mastro.isGitRepository', isGitRepo);
    await vscode.commands.executeCommand('setContext', 'mastro.hasStaged', hasStaged);
    await vscode.commands.executeCommand('setContext', 'mastro.hasChanges', hasChanges);
}
function startAutoRefresh() {
    // Refresh context keys and session data every 30 seconds
    setInterval(async () => {
        await setContextKeys();
        await refreshSessionData();
    }, 30000);
    // Also refresh on file system changes
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        setContextKeys();
    });
    vscode.workspace.onDidSaveTextDocument(() => {
        setContextKeys();
        refreshSessionData();
    });
}
async function refreshSessionData() {
    const sessionData = await mastroClient.getCurrentSession();
    updateStatusBar(sessionData);
    sessionDataProvider.refresh(sessionData);
    // Trigger smart notifications based on session data
    if (notificationService) {
        await notificationService.analyzeAndNotify(sessionData);
    }
}
function updateStatusBar(sessionData) {
    if (!statusBarItem)
        return;
    if (sessionData) {
        statusBarItem.text = `$(pulse) Mastro: ${sessionData.duration}min | ${sessionData.totalFiles} files`;
        statusBarItem.tooltip = `Session: ${sessionData.id}\nComplexity: ${sessionData.complexity}\nRisk: ${sessionData.riskLevel}`;
    }
    else {
        statusBarItem.text = '$(tools) Mastro';
        statusBarItem.tooltip = 'Click to view productivity analytics';
    }
}
// Tree data provider for session view
class SessionTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.sessionData = null;
    }
    refresh(sessionData) {
        this.sessionData = sessionData || null;
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!this.sessionData) {
            return Promise.resolve([new SessionItem('No active session', vscode.TreeItemCollapsibleState.None)]);
        }
        if (!element) {
            // Root items
            return Promise.resolve([
                new SessionItem(`Session: ${this.sessionData.id}`, vscode.TreeItemCollapsibleState.Expanded),
                new SessionItem(`Duration: ${this.sessionData.duration} min`, vscode.TreeItemCollapsibleState.None),
                new SessionItem(`Files Modified: ${this.sessionData.totalFiles}`, vscode.TreeItemCollapsibleState.None),
                new SessionItem(`Complexity: ${this.sessionData.complexity}`, vscode.TreeItemCollapsibleState.None),
                new SessionItem(`Risk Level: ${this.sessionData.riskLevel}`, vscode.TreeItemCollapsibleState.None),
                new SessionItem('Patterns', vscode.TreeItemCollapsibleState.Collapsed)
            ]);
        }
        if (element.label === 'Patterns') {
            return Promise.resolve(this.sessionData.patterns.map(pattern => new SessionItem(pattern, vscode.TreeItemCollapsibleState.None)));
        }
        return Promise.resolve([]);
    }
}
class SessionItem extends vscode.TreeItem {
    constructor(label, collapsibleState, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.command = command;
        this.tooltip = `${this.label}`;
        this.contextValue = 'sessionItem';
    }
}
// Helper functions
function calculateOverallGrade(metrics) {
    const totalScore = metrics.reduce((sum, metric) => sum + metric.score, 0);
    const averageScore = totalScore / metrics.length;
    if (averageScore >= 90)
        return 'A';
    if (averageScore >= 80)
        return 'B';
    if (averageScore >= 70)
        return 'C';
    if (averageScore >= 60)
        return 'D';
    return 'F';
}
//# sourceMappingURL=extension.js.map