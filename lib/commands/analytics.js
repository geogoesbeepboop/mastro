import { Flags } from '@oclif/core';
import { BaseCommand } from '../base/command.js';
import { UIRenderer } from '../ui/renderer.js';
import { SessionTracker } from '../core/session-tracker.js';
import { SessionAnalyticsEngine } from '../core/session-analytics.js';
export default class Analytics extends BaseCommand {
    static description = 'Display productivity analytics and insights from development sessions';
    static examples = [
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> --insights',
        '<%= config.bin %> <%= command.id %> --format=json',
        '<%= config.bin %> <%= command.id %> --focus-mode'
    ];
    static flags = {
        ...BaseCommand.baseFlags,
        format: Flags.string({
            char: 'f',
            description: 'output format',
            options: ['terminal', 'json', 'markdown'],
            default: 'terminal'
        }),
        insights: Flags.boolean({
            char: 'i',
            description: 'show personalized insights and recommendations',
            default: false
        }),
        'focus-mode': Flags.boolean({
            description: 'enable focus mode with distraction-free environment',
            default: false
        }),
        period: Flags.string({
            char: 'p',
            description: 'time period for analysis',
            options: ['day', 'week', 'month', 'all'],
            default: 'week'
        }),
        'update-current': Flags.boolean({
            description: 'update analytics for current active session',
            default: false
        })
    };
    renderer;
    sessionTracker;
    analyticsEngine;
    async run() {
        const { flags } = await this.parse(Analytics);
        try {
            // Initialize components
            this.renderer = new UIRenderer(this.mastroConfig);
            this.sessionTracker = new SessionTracker(this.mastroConfig);
            this.analyticsEngine = new SessionAnalyticsEngine(this.mastroConfig);
            // Ensure we're in a git repository
            await this.ensureGitRepository();
            // Handle focus mode
            if (flags['focus-mode']) {
                await this.enableFocusMode();
                return;
            }
            // Update current session analytics if requested
            if (flags['update-current']) {
                await this.updateCurrentSessionAnalytics();
            }
            this.startSpinner('Loading session analytics...');
            // Get session history
            const history = await this.analyticsEngine.getSessionHistory();
            this.stopSpinner(true, `Loaded ${history.totalSessions} session(s)`);
            // Display analytics based on format
            if (flags.format === 'json') {
                this.outputJSON(history, flags);
            }
            else if (flags.format === 'markdown') {
                this.outputMarkdown(history, flags);
            }
            else {
                await this.outputTerminal(history, flags);
            }
            // Show insights if requested
            if (flags.insights) {
                await this.displayInsights();
            }
        }
        catch (error) {
            await this.handleError(error, 'analyze session analytics');
        }
    }
    async updateCurrentSessionAnalytics() {
        this.startSpinner('Updating current session analytics...');
        try {
            const currentSession = await this.sessionTracker.getCurrentSession();
            await this.analyticsEngine.updateSession(currentSession);
            this.stopSpinner(true, 'Current session analytics updated');
        }
        catch (error) {
            this.stopSpinner(false, 'Failed to update session analytics');
            throw error;
        }
    }
    async outputTerminal(history, flags) {
        if (history.totalSessions === 0) {
            console.log('\n' + this.renderer.renderWarning('No session data available yet. Start coding with mastro to build your analytics!'));
            console.log('\nTry running:');
            console.log('  mastro review    # Start a session-based code review');
            console.log('  mastro split     # Analyze working changes');
            return;
        }
        console.log('\n' + this.renderer.renderTitle('📊 Development Analytics Dashboard'));
        // Overview Stats
        const recentSessions = this.filterSessionsByPeriod(history.sessions, flags.period);
        console.log(this.renderer.renderSection('📈 Overview (Last ' + flags.period + ')', [
            `Total Sessions: ${recentSessions.length}`,
            `Average Productivity Score: ${Math.round(history.averageProductivity.velocityScore)}/100`,
            `Average Session Duration: ${Math.round(history.averageProductivity.optimalSessionLength)} minutes`,
            `Best Focus Score: ${history.personalBests.bestFocusScore}/100`
        ]));
        // Personal Bests
        console.log(this.renderer.renderSection('🏆 Personal Bests', [
            `Longest Session: ${this.formatDuration(history.personalBests.longestSession)}`,
            `Most Productive Session: ${history.personalBests.mostProductiveSession}/100`,
            `Best Focus Score: ${history.personalBests.bestFocusScore}/100`,
            `Most Files Modified: ${Math.round(history.personalBests.mostFilesInSession)}`
        ]));
        // Productivity Metrics
        console.log(this.renderer.renderSection('⚡ Productivity Metrics', [
            `Lines per Minute: ${history.averageProductivity.linesPerMinute.toFixed(1)}`,
            `Files Modified per Hour: ${history.averageProductivity.filesModifiedPerHour.toFixed(1)}`,
            `Refactoring Ratio: ${Math.round(history.averageProductivity.refactoringRatio * 100)}%`,
            `Peak Hours: ${this.formatPeakHours(history.averageProductivity.peakHours)}`
        ]));
        // Recent Session Quality
        if (recentSessions.length > 0) {
            const avgQuality = this.calculateAverageQuality(recentSessions);
            console.log(this.renderer.renderSection('🎯 Code Quality Trends', [
                `Test Coverage Improvement: ${avgQuality.testCoverageIncrease.toFixed(1)}%`,
                `Documentation Ratio: ${avgQuality.documentationRatio.toFixed(2)}`,
                `Bug Fix Ratio: ${Math.round(avgQuality.bugFixRatio * 100)}%`
            ]));
        }
        // Development Patterns
        if (recentSessions.length > 0) {
            const commonPatterns = this.findCommonPatterns(recentSessions);
            if (commonPatterns.length > 0) {
                console.log(this.renderer.renderSection('🔍 Development Patterns', commonPatterns.map(pattern => `${this.getPatternIcon(pattern.type)} ${this.getPatternDescription(pattern.type)} (${Math.round(pattern.confidence * 100)}% confidence)`)));
            }
        }
        // Weekly Velocity Trend
        if (history.trends.weeklyVelocity.length > 0) {
            console.log(this.renderer.renderSection('📊 Weekly Velocity Trend', [
                this.createSimpleChart(history.trends.weeklyVelocity, 'Velocity Score')
            ]));
        }
    }
    outputJSON(history, flags) {
        const filteredHistory = {
            ...history,
            sessions: this.filterSessionsByPeriod(history.sessions, flags.period)
        };
        const output = {
            analytics: filteredHistory,
            meta: {
                period: flags.period,
                timestamp: new Date().toISOString(),
                totalSessions: filteredHistory.sessions.length
            }
        };
        console.log(JSON.stringify(output, null, 2));
    }
    outputMarkdown(history, flags) {
        const recentSessions = this.filterSessionsByPeriod(history.sessions, flags.period);
        console.log('# Development Analytics Report\n');
        console.log(`**Period**: ${flags.period}  `);
        console.log(`**Generated**: ${new Date().toISOString()}  `);
        console.log(`**Total Sessions**: ${recentSessions.length}\n`);
        console.log('## 📈 Overview\n');
        console.log(`- **Average Productivity Score**: ${Math.round(history.averageProductivity.velocityScore)}/100`);
        console.log(`- **Average Session Duration**: ${Math.round(history.averageProductivity.optimalSessionLength)} minutes`);
        console.log(`- **Best Focus Score**: ${history.personalBests.bestFocusScore}/100\n`);
        console.log('## 🏆 Personal Bests\n');
        console.log(`- **Longest Session**: ${this.formatDuration(history.personalBests.longestSession)}`);
        console.log(`- **Most Productive Session**: ${history.personalBests.mostProductiveSession}/100`);
        console.log(`- **Best Focus Score**: ${history.personalBests.bestFocusScore}/100\n`);
        console.log('## ⚡ Productivity Metrics\n');
        console.log(`- **Lines per Minute**: ${history.averageProductivity.linesPerMinute.toFixed(1)}`);
        console.log(`- **Files Modified per Hour**: ${history.averageProductivity.filesModifiedPerHour.toFixed(1)}`);
        console.log(`- **Refactoring Ratio**: ${Math.round(history.averageProductivity.refactoringRatio * 100)}%`);
        console.log(`- **Peak Hours**: ${this.formatPeakHours(history.averageProductivity.peakHours)}\n`);
        if (recentSessions.length > 0) {
            const avgQuality = this.calculateAverageQuality(recentSessions);
            console.log('## 🎯 Code Quality\n');
            console.log(`- **Test Coverage Improvement**: ${avgQuality.testCoverageIncrease.toFixed(1)}%`);
            console.log(`- **Documentation Ratio**: ${avgQuality.documentationRatio.toFixed(2)}`);
            console.log(`- **Bug Fix Ratio**: ${Math.round(avgQuality.bugFixRatio * 100)}%\n`);
        }
    }
    async displayInsights() {
        this.startSpinner('Generating personalized insights...');
        try {
            const insights = await this.analyticsEngine.getInsights();
            this.stopSpinner(true, 'Insights generated');
            console.log('\n' + this.renderer.renderTitle('💡 Personalized Insights & Recommendations'));
            if (insights.length === 0) {
                console.log(this.renderer.renderWarning('Not enough data for insights. Continue using mastro to build your profile.'));
                return;
            }
            insights.forEach((insight, index) => {
                console.log(`\n${index + 1}. ${insight}`);
            });
            console.log('\n' + this.renderer.renderMuted('Tip: Run `mastro analytics --focus-mode` to enter distraction-free development mode'));
        }
        catch (error) {
            this.stopSpinner(false, 'Failed to generate insights');
            throw error;
        }
    }
    async enableFocusMode() {
        console.log('\n' + this.renderer.renderTitle('🎯 Focus Mode Activated'));
        console.log('');
        console.log('Focus mode helps you maintain deep work sessions with minimal distractions.');
        console.log('');
        console.log(this.renderer.renderSection('Focus Mode Features', [
            '🔇 Minimal terminal output',
            '⏱️ Session time tracking',
            '📊 Real-time productivity monitoring',
            '✨ Distraction-free environment'
        ]));
        console.log('');
        console.log(this.renderer.renderHighlight('Focus session started! Use Ctrl+C to exit when done.'));
        console.log('');
        // Start a focus session
        const startTime = Date.now();
        let sessionTime = 0;
        // Simple focus mode implementation
        const interval = setInterval(() => {
            sessionTime = Math.floor((Date.now() - startTime) / 1000 / 60);
            process.stdout.write(`\r🎯 Focus Session: ${sessionTime} minutes | Press Ctrl+C to exit`);
        }, 60000); // Update every minute
        // Handle exit
        process.on('SIGINT', () => {
            clearInterval(interval);
            console.log('\n\n' + this.renderer.renderTitle('Focus Session Complete'));
            console.log(`Total focus time: ${sessionTime} minutes`);
            console.log('Great work! 🎉');
            process.exit(0);
        });
        // Keep the process alive
        await new Promise(() => { }); // This will run until SIGINT
    }
    // Helper methods
    filterSessionsByPeriod(sessions, period) {
        const now = new Date();
        let cutoffDate;
        switch (period) {
            case 'day':
                cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'all':
            default:
                return sessions;
        }
        return sessions.filter(session => new Date(session.timestamp) >= cutoffDate);
    }
    calculateAverageQuality(sessions) {
        if (sessions.length === 0) {
            return { testCoverageIncrease: 0, documentationRatio: 0, bugFixRatio: 0 };
        }
        const sum = sessions.reduce((acc, session) => ({
            testCoverageIncrease: acc.testCoverageIncrease + session.quality.testCoverageIncrease,
            documentationRatio: acc.documentationRatio + session.quality.documentationRatio,
            bugFixRatio: acc.bugFixRatio + session.quality.bugFixRatio
        }), { testCoverageIncrease: 0, documentationRatio: 0, bugFixRatio: 0 });
        return {
            testCoverageIncrease: sum.testCoverageIncrease / sessions.length,
            documentationRatio: sum.documentationRatio / sessions.length,
            bugFixRatio: sum.bugFixRatio / sessions.length
        };
    }
    findCommonPatterns(sessions) {
        const patternCounts = new Map();
        sessions.forEach(session => {
            session.patterns.forEach(pattern => {
                const key = pattern.type;
                const current = patternCounts.get(key) || { count: 0, totalConfidence: 0 };
                patternCounts.set(key, {
                    count: current.count + 1,
                    totalConfidence: current.totalConfidence + pattern.confidence
                });
            });
        });
        return Array.from(patternCounts.entries())
            .filter(([, data]) => data.count >= Math.max(1, sessions.length * 0.2)) // 20% threshold
            .map(([type, data]) => ({
            type,
            confidence: data.totalConfidence / data.count
        }))
            .sort((a, b) => b.confidence - a.confidence);
    }
    formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
    formatPeakHours(hours) {
        if (hours.length === 0)
            return 'Not enough data';
        return hours.map(h => `${h}:00`).join(', ');
    }
    getPatternIcon(type) {
        const icons = {
            'tdd': '🧪',
            'refactor_first': '🛠️',
            'feature_branch': '🌿',
            'hotfix': '🚨',
            'spike': '⚡',
            'cleanup': '🧹'
        };
        return icons[type] || '📋';
    }
    getPatternDescription(type) {
        const descriptions = {
            'tdd': 'Test-Driven Development',
            'refactor_first': 'Refactoring Focus',
            'feature_branch': 'Feature Development',
            'hotfix': 'Urgent Bug Fixes',
            'spike': 'Exploration/Prototyping',
            'cleanup': 'Code Maintenance'
        };
        return descriptions[type] || type;
    }
    createSimpleChart(values, label) {
        if (values.length === 0)
            return 'No data';
        const max = Math.max(...values);
        const min = Math.min(...values);
        const range = max - min || 1;
        const bars = values.map(value => {
            const normalized = (value - min) / range;
            const barLength = Math.round(normalized * 20);
            const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
            return `${bar} ${value}`;
        });
        return `${label}:\n` + bars.map((bar, index) => `  Day ${index + 1}: ${bar}`).join('\n');
    }
}
//# sourceMappingURL=analytics.js.map