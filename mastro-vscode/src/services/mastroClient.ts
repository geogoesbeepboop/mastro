import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execAsync = promisify(exec);

export interface MastroCommandResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
}

export interface SessionData {
  id: string;
  startTime: string;
  duration: number; // minutes
  totalFiles: number;
  totalInsertions: number;
  totalDeletions: number;
  complexity: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  patterns: string[];
}

export interface AnalyticsData {
  totalSessions: number;
  averageProductivity: number;
  focusScore: number;
  weeklyVelocity: number[];
  insights: string[];
}

export interface CommitBoundary {
  id: string;
  theme: string;
  priority: 'high' | 'medium' | 'low';
  files: string[];
  suggestedMessage: string;
  rationale: string;
}

/**
 * Service for interacting with the mastro CLI from VS Code
 * Handles all communication between the extension and the mastro command line tool
 */
export class MastroClient {
  private readonly cliPath: string;
  private readonly workspaceRoot: string;
  private readonly outputChannel: vscode.OutputChannel;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.cliPath = this.getCliPath();
    this.outputChannel = vscode.window.createOutputChannel('Mastro');
  }

  /**
   * Check if mastro CLI is available and working
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.executeCommand(['--version']);
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current development session data
   */
  async getCurrentSession(): Promise<SessionData | null> {
    try {
      const result = await this.executeCommand(['analytics', '--update-current', '--format=json']);
      
      if (result.success && result.output) {
        const data = JSON.parse(result.output);
        return this.parseSessionData(data);
      }
      return null;
    } catch (error) {
      this.logError('Failed to get current session', error);
      return null;
    }
  }

  /**
   * Generate AI-powered commit message for staged changes
   */
  async generateCommit(options?: { interactive?: boolean; dryRun?: boolean }): Promise<MastroCommandResult> {
    const args = ['commit'];
    
    if (options?.interactive) {
      args.push('--interactive');
    }
    
    if (options?.dryRun) {
      args.push('--dry-run');
    }

    return this.executeCommand(args);
  }

  /**
   * Perform session-based code review
   */
  async reviewSession(options?: { 
    persona?: string;
    strictness?: string;
    format?: string;
    stream?: boolean;
  }): Promise<MastroCommandResult> {
    const args = ['review'];
    
    if (options?.persona) {
      args.push('--persona', options.persona);
    }
    
    if (options?.strictness) {
      args.push('--strictness', options.strictness);
    }
    
    if (options?.format) {
      args.push('--format', options.format);
    }
    
    if (options?.stream) {
      args.push('--stream');
    }

    return this.executeCommand(args);
  }

  /**
   * Analyze commit boundaries for working changes
   */
  async splitChanges(options?: { 
    autoStage?: boolean; 
    dryRun?: boolean;
    format?: string;
  }): Promise<CommitBoundary[] | null> {
    const args = ['split'];
    
    if (options?.autoStage) {
      args.push('--auto-stage');
    }
    
    if (options?.dryRun) {
      args.push('--dry-run');
    }
    
    if (options?.format) {
      args.push('--format', options.format);
    } else {
      args.push('--format=json'); // Always use JSON for parsing
    }

    try {
      const result = await this.executeCommand(args);
      
      if (result.success && result.output) {
        const data = JSON.parse(result.output);
        return this.parseCommitBoundaries(data);
      }
      return null;
    } catch (error) {
      this.logError('Failed to split changes', error);
      return null;
    }
  }

  /**
   * Get productivity analytics and insights
   */
  async getAnalytics(options?: {
    period?: string;
    insights?: boolean;
  }): Promise<AnalyticsData | null> {
    const args = ['analytics', '--format=json'];
    
    if (options?.period) {
      args.push('--period', options.period);
    }
    
    if (options?.insights) {
      args.push('--insights');
    }

    try {
      const result = await this.executeCommand(args);
      
      if (result.success && result.output) {
        const data = JSON.parse(result.output);
        return this.parseAnalyticsData(data);
      }
      return null;
    } catch (error) {
      this.logError('Failed to get analytics', error);
      return null;
    }
  }

  /**
   * Explain code changes (commit diff analysis)
   */
  async explainChanges(options?: {
    revision?: string;
    audience?: string;
    format?: string;
    impact?: boolean;
  }): Promise<MastroCommandResult> {
    const args = ['explain'];
    
    if (options?.revision) {
      args.push(options.revision);
    }
    
    if (options?.audience) {
      args.push('--audience', options.audience);
    }
    
    if (options?.format) {
      args.push('--format', options.format);
    }
    
    if (options?.impact) {
      args.push('--impact');
    }

    return this.executeCommand(args);
  }

  /**
   * Create smart pull request
   */
  async createPR(options?: {
    template?: string;
    title?: string;
    draft?: boolean;
    dryRun?: boolean;
  }): Promise<MastroCommandResult> {
    const args = ['pr', 'create'];
    
    if (options?.template) {
      args.push('--template', options.template);
    }
    
    if (options?.title) {
      args.push('--title', options.title);
    }
    
    if (options?.draft) {
      args.push('--draft');
    }
    
    if (options?.dryRun) {
      args.push('--dry-run');
    }

    return this.executeCommand(args);
  }

  /**
   * Install pre-commit hooks
   */
  async installHooks(options?: {
    strictness?: string;
    persona?: string;
    force?: boolean;
  }): Promise<MastroCommandResult> {
    const args = ['hooks', 'install'];
    
    if (options?.strictness) {
      args.push('--strictness', options.strictness);
    }
    
    if (options?.persona) {
      args.push('--persona', options.persona);
    }
    
    if (options?.force) {
      args.push('--force');
    }

    return this.executeCommand(args);
  }

  /**
   * Check hook status
   */
  async getHookStatus(): Promise<MastroCommandResult> {
    return this.executeCommand(['hooks', 'status']);
  }

  /**
   * Enable focus mode
   */
  async enableFocusMode(): Promise<MastroCommandResult> {
    return this.executeCommand(['analytics', '--focus-mode']);
  }

  /**
   * Check if we're in a git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      const result = await execAsync('git rev-parse --is-inside-work-tree', {
        cwd: this.workspaceRoot
      });
      return result.stdout.trim() === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if there are staged changes
   */
  async hasStagedChanges(): Promise<boolean> {
    try {
      const result = await execAsync('git diff --cached --name-only', {
        cwd: this.workspaceRoot
      });
      return result.stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if there are working directory changes
   */
  async hasWorkingChanges(): Promise<boolean> {
    try {
      const result = await execAsync('git status --porcelain', {
        cwd: this.workspaceRoot
      });
      return result.stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  // Private helper methods

  private async executeCommand(args: string[]): Promise<MastroCommandResult> {
    const command = `${this.cliPath} ${args.join(' ')}`;
    this.outputChannel.appendLine(`> ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workspaceRoot,
        timeout: 30000 // 30 second timeout
      });

      this.outputChannel.appendLine(stdout);
      if (stderr) {
        this.outputChannel.appendLine(`stderr: ${stderr}`);
      }

      return {
        success: true,
        output: stdout,
        error: stderr || undefined
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      this.outputChannel.appendLine(`Error: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        exitCode: error.code
      };
    }
  }

  private getCliPath(): string {
    const config = vscode.workspace.getConfiguration('mastro');
    return config.get<string>('cliPath', 'mastro');
  }

  private parseSessionData(data: any): SessionData | null {
    try {
      // Parse the analytics JSON structure to extract session data
      if (data.analytics?.sessions?.length > 0) {
        const latestSession = data.analytics.sessions[data.analytics.sessions.length - 1];
        return {
          id: latestSession.sessionId,
          startTime: latestSession.timestamp,
          duration: latestSession.duration,
          totalFiles: latestSession.productivity?.filesModifiedPerHour || 0,
          totalInsertions: 0, // Would need to be added to analytics data
          totalDeletions: 0, // Would need to be added to analytics data
          complexity: 'medium', // Would need to be calculated
          riskLevel: 'low', // Would need to be calculated
          patterns: latestSession.patterns?.map((p: any) => p.type) || []
        };
      }
      return null;
    } catch (error) {
      this.logError('Failed to parse session data', error);
      return null;
    }
  }

  private parseCommitBoundaries(data: any): CommitBoundary[] {
    try {
      if (data.commits) {
        return data.commits.map((commit: any) => ({
          id: commit.boundary.id,
          theme: commit.boundary.theme,
          priority: commit.boundary.priority,
          files: commit.boundary.files.map((f: any) => f.path),
          suggestedMessage: commit.suggestedMessage.title,
          rationale: commit.rationale
        }));
      }
      return [];
    } catch (error) {
      this.logError('Failed to parse commit boundaries', error);
      return [];
    }
  }

  private parseAnalyticsData(data: any): AnalyticsData | null {
    try {
      const analytics = data.analytics;
      if (!analytics) return null;

      return {
        totalSessions: analytics.totalSessions || 0,
        averageProductivity: analytics.averageProductivity?.velocityScore || 0,
        focusScore: 0, // Would need to be calculated from recent sessions
        weeklyVelocity: analytics.trends?.weeklyVelocity || [],
        insights: [] // Would be provided separately via insights flag
      };
    } catch (error) {
      this.logError('Failed to parse analytics data', error);
      return null;
    }
  }

  private logError(message: string, error: any): void {
    this.outputChannel.appendLine(`Error: ${message}`);
    this.outputChannel.appendLine(error?.message || error?.toString() || 'Unknown error');
    console.error(message, error);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}