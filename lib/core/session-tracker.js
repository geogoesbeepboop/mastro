import { simpleGit } from 'simple-git';
import { randomUUID } from 'crypto';
import { GitAnalyzer } from './git-analyzer.js';
export class SessionTracker {
    git;
    gitAnalyzer;
    currentSession;
    config;
    constructor(config) {
        this.git = simpleGit();
        this.gitAnalyzer = new GitAnalyzer();
        this.config = config;
    }
    async initializeSession() {
        const baseCommit = await this.getCurrentCommit();
        const baseBranch = await this.gitAnalyzer.getCurrentBranch();
        this.currentSession = {
            id: randomUUID(),
            startTime: new Date(),
            baseCommit,
            baseBranch,
            workingChanges: [],
            stagedChanges: [],
            cumulativeStats: {
                totalFiles: 0,
                totalInsertions: 0,
                totalDeletions: 0,
                changedLines: 0,
                complexity: 'low',
                duration: 0
            },
            riskAssessment: {
                level: 'low',
                factors: [],
                recommendations: []
            },
            patterns: []
        };
        return this.currentSession;
    }
    async getCurrentSession() {
        if (!this.currentSession) {
            return this.initializeSession();
        }
        // Update session with current changes
        await this.updateSessionState();
        return this.currentSession;
    }
    async updateSessionState() {
        if (!this.currentSession) {
            throw new Error('No active session found');
        }
        // Get current working and staged changes
        this.currentSession.workingChanges = await this.getWorkingDirectoryChanges();
        this.currentSession.stagedChanges = await this.gitAnalyzer.getStagedChanges();
        // Update cumulative statistics
        this.currentSession.cumulativeStats = this.calculateSessionStats();
        // Assess risk levels
        this.currentSession.riskAssessment = this.assessSessionRisk();
        // Detect development patterns
        this.currentSession.patterns = this.detectSessionPatterns();
        // Update duration
        this.currentSession.cumulativeStats.duration = Math.floor((Date.now() - this.currentSession.startTime.getTime()) / (1000 * 60));
    }
    async getWorkingDirectoryChanges() {
        const status = await this.git.status();
        const changes = [];
        // Process modified files
        for (const file of status.modified) {
            const change = await this.analyzeFileChange(file, 'modified');
            if (change)
                changes.push(change);
        }
        // Process new files (if configured to include untracked)
        if (this.config.git.includeUntracked) {
            for (const file of status.not_added) {
                const change = await this.analyzeFileChange(file, 'added');
                if (change)
                    changes.push(change);
            }
        }
        // Process deleted files
        for (const file of status.deleted) {
            const change = await this.analyzeFileChange(file, 'deleted');
            if (change)
                changes.push(change);
        }
        return changes;
    }
    async analyzeFileChange(file, type) {
        try {
            const diff = await this.git.diff(['HEAD', '--', file]);
            return this.gitAnalyzer.parseDiffForFile(diff, file, type);
        }
        catch (error) {
            // Handle cases where file doesn't exist in HEAD (new files)
            if (type === 'added') {
                return {
                    file,
                    type: 'added',
                    insertions: 0,
                    deletions: 0,
                    hunks: []
                };
            }
            return null;
        }
    }
    calculateSessionStats() {
        if (!this.currentSession) {
            throw new Error('No active session');
        }
        const allChanges = [...this.currentSession.workingChanges, ...this.currentSession.stagedChanges];
        const totalFiles = new Set(allChanges.map(c => c.file)).size;
        const totalInsertions = allChanges.reduce((sum, c) => sum + c.insertions, 0);
        const totalDeletions = allChanges.reduce((sum, c) => sum + c.deletions, 0);
        const changedLines = totalInsertions + totalDeletions;
        const complexity = this.determineComplexity(totalFiles, changedLines, allChanges);
        return {
            totalFiles,
            totalInsertions,
            totalDeletions,
            changedLines,
            complexity,
            duration: this.currentSession.cumulativeStats.duration
        };
    }
    determineComplexity(fileCount, lineCount, changes) {
        const criticalFiles = changes.filter(c => c.file.includes('package.json') ||
            c.file.includes('Dockerfile') ||
            c.file.includes('.env') ||
            c.file.includes('migrations/')).length;
        const hasBreakingChanges = changes.some(c => c.hunks.some(h => h.lines.some(l => l.type === 'removed' &&
            (l.content.includes('export') || l.content.includes('function') || l.content.includes('class')))));
        if (criticalFiles > 0 || hasBreakingChanges || lineCount > 1000 || fileCount > 20) {
            return 'critical';
        }
        else if (lineCount > 500 || fileCount > 10) {
            return 'high';
        }
        else if (lineCount > 100 || fileCount > 5) {
            return 'medium';
        }
        else {
            return 'low';
        }
    }
    assessSessionRisk() {
        if (!this.currentSession) {
            throw new Error('No active session');
        }
        const factors = [];
        const recommendations = [];
        const splitSuggestions = [];
        const stats = this.currentSession.cumulativeStats;
        // Size-based risk factors
        if (stats.totalFiles > 15) {
            factors.push({
                type: 'size',
                description: `Large changeset affecting ${stats.totalFiles} files`,
                impact: stats.totalFiles > 25 ? 'high' : 'medium'
            });
            recommendations.push('Consider splitting this change into smaller, focused commits');
            splitSuggestions.push('Group related file changes by feature or component');
        }
        if (stats.changedLines > 500) {
            factors.push({
                type: 'size',
                description: `Extensive changes with ${stats.changedLines} modified lines`,
                impact: stats.changedLines > 1000 ? 'high' : 'medium'
            });
        }
        // Complexity-based risk factors
        if (stats.complexity === 'critical' || stats.complexity === 'high') {
            factors.push({
                type: 'complexity',
                description: 'High complexity changes detected',
                impact: stats.complexity === 'critical' ? 'high' : 'medium'
            });
            recommendations.push('Add comprehensive tests for complex changes');
            recommendations.push('Consider code review from senior team member');
        }
        // Scope-based risk factors
        const allChanges = [...this.currentSession.workingChanges, ...this.currentSession.stagedChanges];
        const hasSystemFiles = allChanges.some(c => c.file.includes('package.json') ||
            c.file.includes('tsconfig.json') ||
            c.file.includes('webpack.config') ||
            c.file.includes('Dockerfile'));
        if (hasSystemFiles) {
            factors.push({
                type: 'scope',
                description: 'System configuration files modified',
                impact: 'high'
            });
            recommendations.push('Test build and deployment processes');
            recommendations.push('Verify all team members can run the project');
        }
        // Security-based risk factors
        const hasSecurityFiles = allChanges.some(c => c.file.includes('.env') ||
            c.file.includes('security') ||
            c.file.includes('auth') ||
            c.hunks.some(h => h.lines.some(l => l.content.includes('password') ||
                l.content.includes('secret') ||
                l.content.includes('token') ||
                l.content.includes('key'))));
        if (hasSecurityFiles) {
            factors.push({
                type: 'security',
                description: 'Security-related changes detected',
                impact: 'high'
            });
            recommendations.push('Review for exposed secrets or credentials');
            recommendations.push('Ensure security best practices are followed');
        }
        // Breaking changes
        const hasBreakingChanges = allChanges.some(c => c.hunks.some(h => h.lines.some(l => l.type === 'removed' &&
            (l.content.includes('export') || l.content.includes('function') || l.content.includes('class')))));
        if (hasBreakingChanges) {
            factors.push({
                type: 'breaking',
                description: 'Potential breaking changes detected',
                impact: 'high'
            });
            recommendations.push('Update API documentation');
            recommendations.push('Plan migration strategy for dependent code');
            splitSuggestions.push('Isolate breaking changes into separate commit');
        }
        // Determine overall risk level
        const highImpactFactors = factors.filter(f => f.impact === 'high').length;
        const mediumImpactFactors = factors.filter(f => f.impact === 'medium').length;
        let level;
        if (highImpactFactors >= 3) {
            level = 'critical';
        }
        else if (highImpactFactors >= 2 || mediumImpactFactors >= 4) {
            level = 'high';
        }
        else if (highImpactFactors >= 1 || mediumImpactFactors >= 2) {
            level = 'medium';
        }
        else {
            level = 'low';
        }
        return {
            level,
            factors,
            recommendations,
            splitSuggestions: splitSuggestions.length > 0 ? splitSuggestions : undefined
        };
    }
    detectSessionPatterns() {
        if (!this.currentSession) {
            throw new Error('No active session');
        }
        const patterns = [];
        const allChanges = [...this.currentSession.workingChanges, ...this.currentSession.stagedChanges];
        const stats = this.currentSession.cumulativeStats;
        // Rapid iteration pattern
        if (stats.duration > 0 && allChanges.length > 0) {
            const changesPerHour = (allChanges.length / stats.duration) * 60;
            if (changesPerHour > 10) {
                patterns.push({
                    type: 'rapid-iteration',
                    confidence: 0.8,
                    evidence: [`High change frequency: ${changesPerHour.toFixed(1)} changes/hour`]
                });
            }
        }
        // Feature branch pattern
        if (this.currentSession.baseBranch !== 'main' && this.currentSession.baseBranch !== 'master') {
            const featureKeywords = ['feature', 'feat', 'add', 'implement', 'create'];
            const isFeatureBranch = featureKeywords.some(keyword => this.currentSession.baseBranch.toLowerCase().includes(keyword));
            if (isFeatureBranch && allChanges.length > 3) {
                patterns.push({
                    type: 'feature-branch',
                    confidence: 0.9,
                    evidence: [`Branch name suggests feature work: ${this.currentSession.baseBranch}`]
                });
            }
        }
        // Refactoring pattern
        const refactoringIndicators = allChanges.filter(c => c.hunks.some(h => h.lines.some(l => (l.type === 'removed' || l.type === 'added') &&
            (l.content.includes('function') || l.content.includes('class') || l.content.includes('import'))))).length;
        const refactoringRatio = refactoringIndicators / allChanges.length;
        if (refactoringRatio > 0.6 && allChanges.length > 5) {
            patterns.push({
                type: 'refactoring',
                confidence: refactoringRatio,
                evidence: [`${refactoringIndicators} of ${allChanges.length} files show refactoring patterns`]
            });
        }
        // Bug fixing pattern
        const bugKeywords = ['fix', 'bug', 'error', 'issue', 'patch'];
        const hasBugKeywords = bugKeywords.some(keyword => this.currentSession.baseBranch.toLowerCase().includes(keyword));
        const hasErrorHandling = allChanges.some(c => c.hunks.some(h => h.lines.some(l => l.type === 'added' &&
            (l.content.includes('try') || l.content.includes('catch') || l.content.includes('error')))));
        if ((hasBugKeywords || hasErrorHandling) && stats.complexity === 'low') {
            patterns.push({
                type: 'bug-fixing',
                confidence: hasBugKeywords ? 0.8 : 0.6,
                evidence: hasBugKeywords ?
                    [`Branch name suggests bug fix: ${this.currentSession.baseBranch}`] :
                    ['Error handling code added']
            });
        }
        return patterns;
    }
    async resetSession() {
        this.currentSession = undefined;
    }
    async getCurrentCommit() {
        return await this.git.revparse(['HEAD']);
    }
    async hasSessionChanges() {
        if (!this.currentSession) {
            return false;
        }
        await this.updateSessionState();
        const hasStaged = this.currentSession.stagedChanges.length > 0;
        const hasWorking = this.currentSession.workingChanges.length > 0;
        const hasUnpushed = await this.hasUnpushedCommits();
        return hasStaged || hasWorking || hasUnpushed;
    }
    /**
     * Check if there are commits ahead of the remote branch
     * This helps detect committed but unpushed changes
     */
    async hasUnpushedCommits() {
        try {
            // Get commits that exist locally but not on remote
            const ahead = await this.git.log(['HEAD', '--not', '--remotes']);
            return ahead.total > 0;
        }
        catch (error) {
            // If there's no remote or other git issues, assume no unpushed commits
            return false;
        }
    }
}
//# sourceMappingURL=session-tracker.js.map