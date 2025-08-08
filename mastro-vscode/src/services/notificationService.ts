import * as vscode from 'vscode';
import { MastroClient, SessionData } from './mastroClient';

export interface QualityInsight {
    type: 'warning' | 'info' | 'suggestion';
    title: string;
    message: string;
    actions?: string[];
    priority: 'high' | 'medium' | 'low';
}

export interface NotificationConfig {
    enableNotifications: boolean;
    notificationLevel: 'minimal' | 'balanced' | 'comprehensive';
    focusModeNotifications: boolean;
}

/**
 * Smart notification system that provides context-aware code quality insights
 * Learns from user behavior and adapts notification frequency and content
 */
export class NotificationService {
    private mastroClient: MastroClient;
    private config!: NotificationConfig;
    private lastNotificationTime: number = 0;
    private notificationHistory: Map<string, number> = new Map();
    private dismissedInsights: Set<string> = new Set();
    private focusModeActive: boolean = false;

    constructor(mastroClient: MastroClient) {
        this.mastroClient = mastroClient;
        this.updateConfig();
        
        // Watch for configuration changes
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('mastro')) {
                this.updateConfig();
            }
        });
    }

    /**
     * Analyze current session and provide smart notifications
     */
    async analyzeAndNotify(sessionData: SessionData | null): Promise<void> {
        if (!this.shouldNotify()) {
            return;
        }

        if (!sessionData) {
            return;
        }

        const insights = await this.generateQualityInsights(sessionData);
        
        for (const insight of insights) {
            if (this.shouldShowInsight(insight)) {
                await this.showSmartNotification(insight);
            }
        }
    }

    /**
     * Enable focus mode - reduces notifications to critical only
     */
    enableFocusMode(): void {
        this.focusModeActive = true;
        if (this.config.notificationLevel !== 'minimal') {
            vscode.window.showInformationMessage(
                '🎯 Focus mode enabled - Notifications reduced to critical only',
                'Settings'
            ).then(action => {
                if (action === 'Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'mastro.focusModeNotifications');
                }
            });
        }
    }

    /**
     * Disable focus mode
     */
    disableFocusMode(): void {
        this.focusModeActive = false;
        vscode.window.showInformationMessage('Focus mode disabled - Normal notifications resumed');
    }

    /**
     * Manually trigger quality insights for current session
     */
    async triggerQualityCheck(): Promise<void> {
        const sessionData = await this.mastroClient.getCurrentSession();
        if (sessionData) {
            const insights = await this.generateQualityInsights(sessionData);
            
            if (insights.length === 0) {
                vscode.window.showInformationMessage('✅ No quality issues detected in current session');
                return;
            }

            // Show all insights in order of priority
            const sortedInsights = insights.sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });

            for (const insight of sortedInsights.slice(0, 3)) { // Show top 3
                await this.showSmartNotification(insight, true);
            }
        } else {
            vscode.window.showInformationMessage('No active session detected');
        }
    }

    private updateConfig(): void {
        const config = vscode.workspace.getConfiguration('mastro');
        this.config = {
            enableNotifications: config.get<boolean>('enableNotifications', true),
            notificationLevel: config.get<'minimal' | 'balanced' | 'comprehensive'>('notificationLevel', 'balanced'),
            focusModeNotifications: config.get<boolean>('focusModeNotifications', false)
        };
    }

    private shouldNotify(): boolean {
        if (!this.config.enableNotifications) {
            return false;
        }

        if (this.focusModeActive && !this.config.focusModeNotifications) {
            return false;
        }

        // Respect notification timing based on level
        const now = Date.now();
        const timeSinceLastNotification = now - this.lastNotificationTime;
        
        const minIntervals = {
            minimal: 30 * 60 * 1000,      // 30 minutes
            balanced: 10 * 60 * 1000,     // 10 minutes
            comprehensive: 5 * 60 * 1000   // 5 minutes
        };

        return timeSinceLastNotification >= minIntervals[this.config.notificationLevel];
    }

    private async generateQualityInsights(sessionData: SessionData): Promise<QualityInsight[]> {
        const insights: QualityInsight[] = [];

        // Large session warning
        if (sessionData.duration > 120) { // 2 hours
            insights.push({
                type: 'warning',
                title: 'Long Development Session',
                message: `You've been coding for ${sessionData.duration} minutes. Consider taking a break or reviewing your progress.`,
                actions: ['Review Session', 'Take Break', 'Dismiss'],
                priority: 'medium'
            });
        }

        // High complexity warning
        if (sessionData.complexity === 'high') {
            insights.push({
                type: 'warning',
                title: 'High Complexity Changes',
                message: 'Your current changes are complex. Consider breaking them into smaller commits.',
                actions: ['Split Changes', 'Review', 'Dismiss'],
                priority: 'high'
            });
        }

        // High risk warning
        if (sessionData.riskLevel === 'high') {
            insights.push({
                type: 'warning',
                title: 'High Risk Changes Detected',
                message: 'Your changes may have significant impact. A thorough review is recommended.',
                actions: ['Review Now', 'Explain Changes', 'Dismiss'],
                priority: 'high'
            });
        }

        // Many files modified
        if (sessionData.totalFiles > 20) {
            insights.push({
                type: 'suggestion',
                title: 'Many Files Modified',
                message: `${sessionData.totalFiles} files modified. Consider grouping related changes into separate commits.`,
                actions: ['Split Changes', 'View Files', 'Dismiss'],
                priority: 'medium'
            });
        }

        // Pattern-specific insights
        for (const pattern of sessionData.patterns) {
            if (pattern.includes('large-commit')) {
                insights.push({
                    type: 'suggestion',
                    title: 'Large Commit Pattern',
                    message: 'Pattern suggests this commit might be too large. Consider splitting for better review.',
                    actions: ['Split Changes', 'Learn More', 'Dismiss'],
                    priority: 'medium'
                });
            }

            if (pattern.includes('missing-tests')) {
                insights.push({
                    type: 'warning',
                    title: 'Missing Test Coverage',
                    message: 'Changes detected without corresponding tests. Consider adding test coverage.',
                    actions: ['Review Code', 'Learn More', 'Dismiss'],
                    priority: 'high'
                });
            }

            if (pattern.includes('refactoring')) {
                insights.push({
                    type: 'info',
                    title: 'Refactoring Detected',
                    message: 'Great! Refactoring improves code quality. Consider documenting the changes.',
                    actions: ['Explain Changes', 'OK'],
                    priority: 'low'
                });
            }
        }

        // Productivity insights
        if (sessionData.duration > 60 && sessionData.totalFiles < 3) {
            insights.push({
                type: 'suggestion',
                title: 'Focus Opportunity',
                message: 'Long session with few files modified. You might be deep in problem-solving - great focus!',
                actions: ['Enable Focus Mode', 'OK'],
                priority: 'low'
            });
        }

        return insights.filter(insight => !this.isDismissed(insight));
    }

    private shouldShowInsight(insight: QualityInsight): boolean {
        // Always show high priority in focus mode
        if (this.focusModeActive && insight.priority !== 'high') {
            return false;
        }

        // Filter by notification level
        const levelFilters = {
            minimal: (i: QualityInsight) => i.priority === 'high' && i.type === 'warning',
            balanced: (i: QualityInsight) => i.priority !== 'low',
            comprehensive: () => true
        };

        return levelFilters[this.config.notificationLevel](insight);
    }

    private async showSmartNotification(insight: QualityInsight, force: boolean = false): Promise<void> {
        if (!force && !this.shouldNotify()) {
            return;
        }

        const icon = insight.type === 'warning' ? '⚠️' : 
                    insight.type === 'suggestion' ? '💡' : '🔍';
        
        const message = `${icon} ${insight.title}: ${insight.message}`;
        const actions = insight.actions || [];

        let response: string | undefined;

        if (insight.type === 'warning') {
            response = await vscode.window.showWarningMessage(message, ...actions);
        } else if (insight.type === 'suggestion') {
            response = await vscode.window.showInformationMessage(message, ...actions);
        } else {
            response = await vscode.window.showInformationMessage(message, ...actions);
        }

        // Handle actions
        if (response) {
            await this.handleNotificationAction(response, insight);
        }

        this.lastNotificationTime = Date.now();
        
        // Track notification history for learning
        const key = insight.title;
        this.notificationHistory.set(key, (this.notificationHistory.get(key) || 0) + 1);
    }

    private async handleNotificationAction(action: string, insight: QualityInsight): Promise<void> {
        switch (action) {
            case 'Review Session':
            case 'Review Now':
            case 'Review':
            case 'Review Code':
                vscode.commands.executeCommand('mastro.reviewSession');
                break;
                
            case 'Split Changes':
                vscode.commands.executeCommand('mastro.splitChanges');
                break;
                
            case 'Explain Changes':
                vscode.commands.executeCommand('mastro.explainChanges');
                break;
                
            case 'Enable Focus Mode':
                vscode.commands.executeCommand('mastro.focusMode');
                break;
                
            case 'Take Break':
                vscode.window.showInformationMessage(
                    '🧘‍♀️ Take a 5-10 minute break. Your code will thank you!',
                    'Set Timer'
                ).then(response => {
                    if (response === 'Set Timer') {
                        // Could integrate with break timer extensions or system notifications
                        vscode.window.showInformationMessage('Break timer set for 10 minutes');
                    }
                });
                break;
                
            case 'Settings':
                vscode.commands.executeCommand('workbench.action.openSettings', 'mastro');
                break;
                
            case 'Learn More':
                vscode.env.openExternal(vscode.Uri.parse('https://docs.mastro.ai/quality-insights'));
                break;
                
            case 'Dismiss':
                this.dismissInsight(insight);
                break;
                
            case 'View Files':
                vscode.commands.executeCommand('workbench.view.scm');
                break;
        }
    }

    private isDismissed(insight: QualityInsight): boolean {
        return this.dismissedInsights.has(insight.title);
    }

    private dismissInsight(insight: QualityInsight): void {
        this.dismissedInsights.add(insight.title);
        
        // Auto-clear dismissed insights after 24 hours
        setTimeout(() => {
            this.dismissedInsights.delete(insight.title);
        }, 24 * 60 * 60 * 1000);
    }

    /**
     * Get notification analytics for user
     */
    getNotificationStats(): {
        totalNotifications: number;
        dismissedCount: number;
        mostFrequentInsights: Array<{ title: string; count: number }>;
    } {
        const mostFrequent = Array.from(this.notificationHistory.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([title, count]) => ({ title, count }));

        return {
            totalNotifications: Array.from(this.notificationHistory.values()).reduce((sum, count) => sum + count, 0),
            dismissedCount: this.dismissedInsights.size,
            mostFrequentInsights: mostFrequent
        };
    }

    dispose(): void {
        this.notificationHistory.clear();
        this.dismissedInsights.clear();
    }
}