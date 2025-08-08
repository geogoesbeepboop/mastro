import { LoadingStateManager } from './loading-states.js';
import type { DevelopmentSession, SessionStats, SessionRisk, SessionPattern, ActionableItem, WorkflowSuggestion, MastroConfig } from '../types/index.js';
export declare class SessionUI {
    private loadingManager;
    private config;
    constructor(config: MastroConfig);
    displaySessionOverview(session: DevelopmentSession): void;
    displaySessionStats(stats: SessionStats, output?: string[]): void;
    displayRiskAssessment(risk: SessionRisk, output?: string[]): void;
    displaySessionPatterns(patterns: SessionPattern[], output?: string[]): void;
    displaySessionProgress(currentStep: string, totalSteps: number, completedSteps: number, details?: string): void;
    displayActionableItemsSummary(items: ActionableItem[]): void;
    displayWorkflowSuggestions(suggestions: WorkflowSuggestion[]): void;
    createSessionComparisonView(current: DevelopmentSession, previous?: DevelopmentSession): void;
    showInteractiveSessionMenu(): void;
    displaySessionHistory(sessions: DevelopmentSession[], limit?: number): void;
    createLiveSessionMonitor(): SessionMonitor;
    private createProgressBar;
    private groupActionablesByPriority;
    private formatComparison;
    private compareComplexity;
    private formatTimeAgo;
    private getStatsIcon;
    private getRiskIcon;
    private getRiskColor;
    private getPatternIcon;
    private formatPatternName;
    private formatComplexity;
    private getComplexityColor;
    private getPriorityColor;
    private getPriorityIcon;
    private getWorkflowIcon;
    private getEffortColor;
    private formatDuration;
}
export declare class SessionMonitor {
    private config;
    private loadingManager;
    private isMonitoring;
    private currentIndicator?;
    constructor(config: MastroConfig, loadingManager: LoadingStateManager);
    startMonitoring(session: DevelopmentSession): void;
    updateProgress(message: string, progress?: number): void;
    stopMonitoring(message?: string): void;
    displayRealtimeStats(stats: SessionStats): void;
}
//# sourceMappingURL=session-ui.d.ts.map