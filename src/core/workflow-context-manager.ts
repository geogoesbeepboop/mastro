import {writeFileSync, readFileSync, existsSync} from 'fs';
import {join} from 'path';
import type {WorkflowContext, WorkflowCheckpoint, BoundaryMetrics} from '../types/index.js';

export class WorkflowContextManager {
  private contextPath: string;
  private checkpointPath: string;

  constructor() {
    // Store workflow context in .git directory to keep it project-specific
    this.contextPath = join(process.cwd(), '.git', 'mastro-workflow.json');
    this.checkpointPath = join(process.cwd(), '.git', 'mastro-checkpoints.json');
  }

  async saveContext(context: WorkflowContext): Promise<void> {
    try {
      writeFileSync(this.contextPath, JSON.stringify(context, null, 2));
    } catch (error) {
      throw new Error(`Failed to save workflow context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async loadContext(): Promise<WorkflowContext | null> {
    try {
      if (!existsSync(this.contextPath)) {
        return null;
      }
      
      const content = readFileSync(this.contextPath, 'utf-8');
      return JSON.parse(content) as WorkflowContext;
    } catch (error) {
      console.warn(`Warning: Failed to load workflow context: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async createContext(boundaries: any[], settings: any = {}): Promise<WorkflowContext> {
    const context: WorkflowContext = {
      sessionId: this.generateSessionId(),
      boundaries,
      currentBoundaryIndex: 0,
      reviewFindings: [],
      commitHashes: [],
      metrics: [],
      startTime: Date.now(),
      settings
    };

    await this.saveContext(context);
    return context;
  }

  async updateContext(updates: Partial<WorkflowContext>): Promise<WorkflowContext> {
    const existing = await this.loadContext();
    if (!existing) {
      throw new Error('No workflow context found to update');
    }

    const updated = { ...existing, ...updates };
    await this.saveContext(updated);
    return updated;
  }

  async addBoundaryMetrics(metrics: BoundaryMetrics): Promise<void> {
    const context = await this.loadContext();
    if (!context) {
      throw new Error('No workflow context found');
    }

    context.metrics.push(metrics);
    await this.saveContext(context);
  }

  async getCurrentBoundary(): Promise<any> {
    const context = await this.loadContext();
    if (!context || context.currentBoundaryIndex >= context.boundaries.length) {
      return null;
    }

    return context.boundaries[context.currentBoundaryIndex];
  }

  async advanceBoundary(): Promise<boolean> {
    const context = await this.loadContext();
    if (!context) {
      return false;
    }

    context.currentBoundaryIndex++;
    await this.saveContext(context);
    
    return context.currentBoundaryIndex < context.boundaries.length;
  }

  async isWorkflowComplete(): Promise<boolean> {
    const context = await this.loadContext();
    if (!context) {
      return true;
    }

    return context.currentBoundaryIndex >= context.boundaries.length;
  }

  async clearContext(): Promise<void> {
    try {
      if (existsSync(this.contextPath)) {
        const fs = await import('fs').then(fs => fs.promises);
        await fs.unlink(this.contextPath);
      }
      if (existsSync(this.checkpointPath)) {
        const fs = await import('fs').then(fs => fs.promises);
        await fs.unlink(this.checkpointPath);
      }
    } catch (error) {
      console.warn(`Warning: Failed to clear workflow context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveCheckpoint(step: WorkflowCheckpoint['step'], data: any): Promise<void> {
    const context = await this.loadContext();
    if (!context) {
      return;
    }

    const checkpoint: WorkflowCheckpoint = {
      contextId: context.sessionId,
      step,
      timestamp: Date.now(),
      data
    };

    try {
      let checkpoints: WorkflowCheckpoint[] = [];
      if (existsSync(this.checkpointPath)) {
        const content = readFileSync(this.checkpointPath, 'utf-8');
        checkpoints = JSON.parse(content) || [];
      }

      checkpoints.push(checkpoint);
      writeFileSync(this.checkpointPath, JSON.stringify(checkpoints, null, 2));
    } catch (error) {
      console.warn(`Warning: Failed to save checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateSessionId(): string {
    return `workflow-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  // Helper methods for workflow orchestration
  
  async getWorkflowSummary(): Promise<{
    totalBoundaries: number;
    processedBoundaries: number;
    remainingBoundaries: number;
    totalTime: number;
    avgTimePerBoundary: number;
  } | null> {
    const context = await this.loadContext();
    if (!context) {
      return null;
    }

    const totalTime = Date.now() - context.startTime;
    const processedBoundaries = context.currentBoundaryIndex;
    const avgTimePerBoundary = processedBoundaries > 0 ? totalTime / processedBoundaries : 0;

    return {
      totalBoundaries: context.boundaries.length,
      processedBoundaries,
      remainingBoundaries: context.boundaries.length - processedBoundaries,
      totalTime,
      avgTimePerBoundary
    };
  }
}