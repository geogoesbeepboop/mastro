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
exports.MastroClient = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const vscode = __importStar(require("vscode"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Service for interacting with the mastro CLI from VS Code
 * Handles all communication between the extension and the mastro command line tool
 */
class MastroClient {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.cliPath = this.getCliPath();
        this.outputChannel = vscode.window.createOutputChannel('Mastro');
    }
    /**
     * Check if mastro CLI is available and working
     */
    async isAvailable() {
        try {
            const result = await this.executeCommand(['--version']);
            return result.success;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get current development session data
     */
    async getCurrentSession() {
        try {
            const result = await this.executeCommand(['analytics', '--update-current', '--format=json']);
            if (result.success && result.output) {
                const data = JSON.parse(result.output);
                return this.parseSessionData(data);
            }
            return null;
        }
        catch (error) {
            this.logError('Failed to get current session', error);
            return null;
        }
    }
    /**
     * Generate AI-powered commit message for staged changes
     */
    async generateCommit(options) {
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
    async reviewSession(options) {
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
    async splitChanges(options) {
        const args = ['split'];
        if (options?.autoStage) {
            args.push('--auto-stage');
        }
        if (options?.dryRun) {
            args.push('--dry-run');
        }
        if (options?.format) {
            args.push('--format', options.format);
        }
        else {
            args.push('--format=json'); // Always use JSON for parsing
        }
        try {
            const result = await this.executeCommand(args);
            if (result.success && result.output) {
                const data = JSON.parse(result.output);
                return this.parseCommitBoundaries(data);
            }
            return null;
        }
        catch (error) {
            this.logError('Failed to split changes', error);
            return null;
        }
    }
    /**
     * Get productivity analytics and insights
     */
    async getAnalytics(options) {
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
        }
        catch (error) {
            this.logError('Failed to get analytics', error);
            return null;
        }
    }
    /**
     * Explain code changes (commit diff analysis)
     */
    async explainChanges(options) {
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
    async createPR(options) {
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
    async installHooks(options) {
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
    async getHookStatus() {
        return this.executeCommand(['hooks', 'status']);
    }
    /**
     * Enable focus mode
     */
    async enableFocusMode() {
        return this.executeCommand(['analytics', '--focus-mode']);
    }
    /**
     * Check if we're in a git repository
     */
    async isGitRepository() {
        try {
            const result = await execAsync('git rev-parse --is-inside-work-tree', {
                cwd: this.workspaceRoot
            });
            return result.stdout.trim() === 'true';
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Check if there are staged changes
     */
    async hasStagedChanges() {
        try {
            const result = await execAsync('git diff --cached --name-only', {
                cwd: this.workspaceRoot
            });
            return result.stdout.trim().length > 0;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Check if there are working directory changes
     */
    async hasWorkingChanges() {
        try {
            const result = await execAsync('git status --porcelain', {
                cwd: this.workspaceRoot
            });
            return result.stdout.trim().length > 0;
        }
        catch (error) {
            return false;
        }
    }
    // Private helper methods
    async executeCommand(args) {
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
        }
        catch (error) {
            const errorMessage = error.message || 'Unknown error';
            this.outputChannel.appendLine(`Error: ${errorMessage}`);
            return {
                success: false,
                error: errorMessage,
                exitCode: error.code
            };
        }
    }
    getCliPath() {
        const config = vscode.workspace.getConfiguration('mastro');
        return config.get('cliPath', 'mastro');
    }
    parseSessionData(data) {
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
                    patterns: latestSession.patterns?.map((p) => p.type) || []
                };
            }
            return null;
        }
        catch (error) {
            this.logError('Failed to parse session data', error);
            return null;
        }
    }
    parseCommitBoundaries(data) {
        try {
            if (data.commits) {
                return data.commits.map((commit) => ({
                    id: commit.boundary.id,
                    theme: commit.boundary.theme,
                    priority: commit.boundary.priority,
                    files: commit.boundary.files.map((f) => f.path),
                    suggestedMessage: commit.suggestedMessage.title,
                    rationale: commit.rationale
                }));
            }
            return [];
        }
        catch (error) {
            this.logError('Failed to parse commit boundaries', error);
            return [];
        }
    }
    parseAnalyticsData(data) {
        try {
            const analytics = data.analytics;
            if (!analytics)
                return null;
            return {
                totalSessions: analytics.totalSessions || 0,
                averageProductivity: analytics.averageProductivity?.velocityScore || 0,
                focusScore: 0, // Would need to be calculated from recent sessions
                weeklyVelocity: analytics.trends?.weeklyVelocity || [],
                insights: [] // Would be provided separately via insights flag
            };
        }
        catch (error) {
            this.logError('Failed to parse analytics data', error);
            return null;
        }
    }
    logError(message, error) {
        this.outputChannel.appendLine(`Error: ${message}`);
        this.outputChannel.appendLine(error?.message || error?.toString() || 'Unknown error');
        console.error(message, error);
    }
    /**
     * Dispose of resources
     */
    dispose() {
        this.outputChannel.dispose();
    }
}
exports.MastroClient = MastroClient;
//# sourceMappingURL=mastroClient.js.map