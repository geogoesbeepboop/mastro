import { SemanticAnalyzer } from '../analyzers/semantic-analyzer.js';
import { ImpactAnalyzer } from '../analyzers/impact-analyzer.js';
import { AIClient } from './ai-client.js';
import { ChangeComplexityAnalyzer } from './change-complexity-analyzer.js';
export class ReviewEngine {
    semanticAnalyzer;
    impactAnalyzer;
    complexityAnalyzer;
    aiClient;
    config;
    constructor(config) {
        this.config = config;
        this.semanticAnalyzer = new SemanticAnalyzer();
        this.impactAnalyzer = new ImpactAnalyzer();
        this.complexityAnalyzer = new ChangeComplexityAnalyzer();
        this.aiClient = new AIClient({
            provider: config.ai.provider,
            apiKey: config.ai.apiKey,
            model: config.ai.model,
            maxTokens: config.ai.maxTokens,
            temperature: config.ai.temperature
        });
    }
    async reviewSession(session, persona) {
        const reviewPersona = persona || this.config.team.reviewPersona;
        // Combine all changes for comprehensive analysis
        const allChanges = [...session.workingChanges, ...session.stagedChanges];
        if (allChanges.length === 0) {
            return this.createEmptySessionReview(session, reviewPersona);
        }
        // Convert session to CommitContext for existing analyzers
        const commitContext = this.sessionToCommitContext(session);
        // Get traditional code review from AI
        const baseReview = await this.aiClient.reviewCode(commitContext, reviewPersona);
        // Enhance with session-specific analysis
        const sessionAnalysis = await this.analyzeSessionChanges(session, reviewPersona);
        // Generate actionable items
        const actionableItems = this.generateActionableItems(session, baseReview, sessionAnalysis);
        // Create workflow suggestions
        const workflowSuggestions = this.generateWorkflowSuggestions(session, sessionAnalysis);
        // Generate learning points
        const learningPoints = this.generateLearningPoints(session, baseReview, sessionAnalysis);
        return {
            ...baseReview,
            sessionId: session.id,
            scope: this.determineScope(session),
            actionableItems,
            learningPoints,
            workflowSuggestions
        };
    }
    async analyzeSessionChanges(session, persona) {
        const allChanges = [...session.workingChanges, ...session.stagedChanges];
        // Semantic analysis
        const semanticAnalysis = await this.semanticAnalyzer.analyzeChanges(allChanges);
        // Impact analysis  
        const impactAnalysis = await this.impactAnalyzer.analyzeImpact(allChanges, semanticAnalysis);
        // Complexity analysis
        const complexityResult = await this.complexityAnalyzer.analyzeComplexity(allChanges);
        return {
            semantic: semanticAnalysis,
            impact: impactAnalysis,
            complexity: complexityResult,
            sessionRisk: session.riskAssessment,
            patterns: session.patterns
        };
    }
    generateActionableItems(session, review, analysis) {
        const items = [];
        // Convert review suggestions to actionable items
        for (const suggestion of review.suggestions) {
            items.push({
                id: `review-${Math.random().toString(36).substring(7)}`,
                type: this.mapSuggestionTypeToActionable(suggestion.type),
                priority: this.mapSeverityToPriority(suggestion.severity),
                file: suggestion.file,
                line: suggestion.line,
                title: this.generateActionableTitle(suggestion),
                description: suggestion.message,
                suggestion: suggestion.suggestion,
                estimatedEffort: this.estimateEffort(suggestion)
            });
        }
        // Add blockers as critical actionable items
        for (const blocker of review.blockers) {
            items.push({
                id: `blocker-${Math.random().toString(36).substring(7)}`,
                type: 'fix',
                priority: 'critical',
                file: blocker.file,
                line: blocker.line,
                title: `BLOCKER: ${this.generateActionableTitle(blocker)}`,
                description: `${blocker.message}\n\nThis issue must be resolved before proceeding.`,
                suggestion: blocker.suggestion,
                estimatedEffort: 'medium'
            });
        }
        // Add session-specific risk items
        for (const risk of session.riskAssessment.factors) {
            if (risk.impact === 'high') {
                items.push({
                    id: `risk-${Math.random().toString(36).substring(7)}`,
                    type: 'warning',
                    priority: 'high',
                    file: '',
                    title: `Risk: ${risk.description}`,
                    description: `Session-wide risk detected: ${risk.description}`,
                    estimatedEffort: 'substantial'
                });
            }
        }
        // Add complexity warnings
        if (analysis.complexity.risk === 'high' || analysis.complexity.risk === 'critical') {
            items.push({
                id: `complexity-${Math.random().toString(36).substring(7)}`,
                type: 'improvement',
                priority: analysis.complexity.risk === 'critical' ? 'critical' : 'high',
                file: '',
                title: 'High Complexity Change Detected',
                description: `This session involves ${analysis.complexity.risk} complexity changes. Consider breaking down into smaller commits.`,
                suggestion: 'Split changes by logical boundaries and test incrementally',
                estimatedEffort: 'substantial'
            });
        }
        // Add missing test coverage items
        const changedFiles = [...session.workingChanges, ...session.stagedChanges];
        const nonTestFiles = changedFiles.filter(c => !c.file.includes('test') && !c.file.includes('spec'));
        const testFiles = changedFiles.filter(c => c.file.includes('test') || c.file.includes('spec'));
        if (nonTestFiles.length > 0 && testFiles.length === 0) {
            items.push({
                id: `tests-${Math.random().toString(36).substring(7)}`,
                type: 'todo',
                priority: 'medium',
                file: '',
                title: 'Add Test Coverage',
                description: `${nonTestFiles.length} files changed without corresponding test updates`,
                suggestion: 'Add or update tests for the modified functionality',
                estimatedEffort: 'medium'
            });
        }
        return items.sort((a, b) => this.priorityWeight(a.priority) - this.priorityWeight(b.priority));
    }
    generateWorkflowSuggestions(session, analysis) {
        const suggestions = [];
        // Commit splitting suggestions
        if (session.riskAssessment.splitSuggestions) {
            suggestions.push({
                type: 'commit-split',
                description: 'Consider splitting this large change into smaller commits',
                benefit: 'Easier to review, safer to deploy, better git history',
                effort: 'medium'
            });
        }
        // Refactoring suggestions based on patterns
        const hasRefactoringPattern = session.patterns.find(p => p.type === 'refactoring');
        if (hasRefactoringPattern) {
            suggestions.push({
                type: 'refactoring',
                description: 'Refactoring pattern detected - consider extracting common patterns',
                benefit: 'Better code maintainability and reusability',
                effort: 'low'
            });
        }
        // Testing suggestions
        const changedFiles = [...session.workingChanges, ...session.stagedChanges];
        const hasLogicChanges = changedFiles.some(c => c.hunks.some(h => h.lines.some(l => l.type === 'added' &&
            (l.content.includes('if') || l.content.includes('for') || l.content.includes('while')))));
        if (hasLogicChanges) {
            suggestions.push({
                type: 'testing',
                description: 'Logic changes detected - add tests for edge cases',
                benefit: 'Prevent regression bugs and improve code reliability',
                effort: 'medium'
            });
        }
        // Documentation suggestions
        const hasPublicAPIChanges = changedFiles.some(c => c.hunks.some(h => h.lines.some(l => l.type === 'added' &&
            (l.content.includes('export') || l.content.includes('public')))));
        if (hasPublicAPIChanges) {
            suggestions.push({
                type: 'documentation',
                description: 'Public API changes detected - update documentation',
                benefit: 'Better developer experience and API adoption',
                effort: 'low'
            });
        }
        return suggestions;
    }
    generateLearningPoints(session, review, analysis) {
        const points = [];
        // Add pattern-based learning points
        for (const pattern of session.patterns) {
            switch (pattern.type) {
                case 'rapid-iteration':
                    points.push('Consider longer planning phases to reduce iteration cycles');
                    break;
                case 'refactoring':
                    points.push('Great job refactoring! Consider documenting the architectural improvements');
                    break;
                case 'bug-fixing':
                    points.push('When fixing bugs, consider adding tests to prevent regression');
                    break;
            }
        }
        // Add complexity-based learning points
        if (analysis.complexity.risk === 'high' || analysis.complexity.risk === 'critical') {
            points.push('Large changes increase review burden - consider smaller, incremental changes');
            points.push('Complex changes benefit from pair programming or design reviews');
        }
        // Add positive reinforcement from compliments
        if (review.compliments.length > 0) {
            points.push(`Positive patterns noted: ${review.compliments[0]}`);
        }
        // Add persona-specific learning points
        const persona = this.config.team.reviewPersona;
        if (persona.focus.includes('security') && analysis.impact.securityImpact?.vulnerabilityIntroduction) {
            points.push('Security-focused review detected vulnerabilities - consider security training');
        }
        if (persona.focus.includes('performance') && analysis.impact.performanceImpact?.responseTime === 'slower') {
            points.push('Performance impacts detected - consider profiling and optimization techniques');
        }
        return points.slice(0, 5); // Limit to most important learning points
    }
    sessionToCommitContext(session) {
        const allChanges = [...session.workingChanges, ...session.stagedChanges];
        return {
            changes: allChanges,
            branch: session.baseBranch,
            repository: {
                name: 'current-session',
                root: process.cwd(),
                language: 'typescript', // This should be detected properly
                patterns: this.config.team,
                recentCommits: []
            },
            staged: session.stagedChanges.length > 0,
            workingDir: process.cwd(),
            metadata: {
                totalInsertions: session.cumulativeStats.totalInsertions,
                totalDeletions: session.cumulativeStats.totalDeletions,
                fileCount: session.cumulativeStats.totalFiles,
                changeComplexity: session.cumulativeStats.complexity === 'critical' ? 'high' : session.cumulativeStats.complexity
            }
        };
    }
    determineScope(session) {
        if (session.stagedChanges.length > 0 && session.workingChanges.length > 0) {
            return 'session';
        }
        else if (session.stagedChanges.length > 0) {
            return 'staged';
        }
        else {
            return 'working';
        }
    }
    createEmptySessionReview(session, persona) {
        return {
            sessionId: session.id,
            scope: 'session',
            overall: {
                rating: 'good',
                confidence: 1.0,
                summary: 'No changes detected in current session'
            },
            suggestions: [],
            compliments: ['Session is clean with no pending changes'],
            blockers: [],
            actionableItems: [],
            learningPoints: ['Consider making some changes to get meaningful feedback'],
            workflowSuggestions: []
        };
    }
    mapSuggestionTypeToActionable(type) {
        switch (type) {
            case 'bug': return 'fix';
            case 'security': return 'fix';
            case 'performance': return 'improvement';
            case 'maintainability': return 'improvement';
            case 'style': return 'todo';
            default: return 'improvement';
        }
    }
    mapSeverityToPriority(severity) {
        switch (severity) {
            case 'error': return 'critical';
            case 'warning': return 'high';
            case 'info': return 'medium';
            default: return 'low';
        }
    }
    generateActionableTitle(suggestion) {
        return `${suggestion.type.charAt(0).toUpperCase()}${suggestion.type.slice(1)}: ${suggestion.message.split('.')[0]}`;
    }
    estimateEffort(suggestion) {
        if (suggestion.type === 'security' || suggestion.type === 'bug') {
            return 'substantial';
        }
        else if (suggestion.type === 'performance') {
            return 'medium';
        }
        else {
            return 'quick';
        }
    }
    priorityWeight(priority) {
        switch (priority) {
            case 'critical': return 0;
            case 'high': return 1;
            case 'medium': return 2;
            case 'low': return 3;
            default: return 4;
        }
    }
}
//# sourceMappingURL=review-engine.js.map