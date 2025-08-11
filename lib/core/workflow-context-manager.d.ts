import type { WorkflowContext, WorkflowCheckpoint, BoundaryMetrics } from '../types/index.js';
export declare class WorkflowContextManager {
    private contextPath;
    private checkpointPath;
    constructor();
    saveContext(context: WorkflowContext): Promise<void>;
    loadContext(): Promise<WorkflowContext | null>;
    createContext(boundaries: any[], settings?: any): Promise<WorkflowContext>;
    updateContext(updates: Partial<WorkflowContext>): Promise<WorkflowContext>;
    addBoundaryMetrics(metrics: BoundaryMetrics): Promise<void>;
    getCurrentBoundary(): Promise<any>;
    advanceBoundary(): Promise<boolean>;
    isWorkflowComplete(): Promise<boolean>;
    clearContext(): Promise<void>;
    saveCheckpoint(step: WorkflowCheckpoint['step'], data: any): Promise<void>;
    private generateSessionId;
    getWorkflowSummary(): Promise<{
        totalBoundaries: number;
        processedBoundaries: number;
        remainingBoundaries: number;
        totalTime: number;
        avgTimePerBoundary: number;
    } | null>;
}
//# sourceMappingURL=workflow-context-manager.d.ts.map