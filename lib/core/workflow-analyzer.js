import { SemanticAnalyzer } from '../analyzers/semantic-analyzer.js';
import { GitAnalyzer } from './git-analyzer.js';
export class WorkflowAnalyzer {
    semanticAnalyzer;
    gitAnalyzer;
    config;
    constructor(config) {
        this.config = config;
        this.semanticAnalyzer = new SemanticAnalyzer();
        this.gitAnalyzer = new GitAnalyzer();
    }
    async analyzeWorkflowPatterns(session) {
        const patterns = [];
        const allChanges = [...session.workingChanges, ...session.stagedChanges];
        const stats = session.cumulativeStats;
        // Test-Driven Development Detection
        const tddPattern = this.detectTDDPattern(allChanges, session);
        if (tddPattern)
            patterns.push(tddPattern);
        // Feature Flag Pattern
        const featureFlagPattern = this.detectFeatureFlagPattern(allChanges);
        if (featureFlagPattern)
            patterns.push(featureFlagPattern);
        // Microcommit Pattern
        const microcommitPattern = this.detectMicrocommitPattern(session);
        if (microcommitPattern)
            patterns.push(microcommitPattern);
        // Refactoring Sprint Pattern
        const refactoringPattern = this.detectRefactoringSprintPattern(allChanges, stats);
        if (refactoringPattern)
            patterns.push(refactoringPattern);
        // Documentation-Driven Development
        const docsPattern = this.detectDocumentationPattern(allChanges);
        if (docsPattern)
            patterns.push(docsPattern);
        // Hotfix Pattern
        const hotfixPattern = this.detectHotfixPattern(session);
        if (hotfixPattern)
            patterns.push(hotfixPattern);
        return patterns;
    }
    async detectPRType(session) {
        const allChanges = [...session.workingChanges, ...session.stagedChanges];
        const branch = session.baseBranch.toLowerCase();
        // Branch name analysis
        if (branch.includes('hotfix') || branch.includes('urgent')) {
            return 'hotfix';
        }
        if (branch.includes('bug') || branch.includes('fix')) {
            return 'bugfix';
        }
        if (branch.includes('doc') || branch.includes('readme')) {
            return 'docs';
        }
        if (branch.includes('refactor') || branch.includes('cleanup')) {
            return 'refactor';
        }
        // Content analysis
        const hasNewFeatures = allChanges.some(c => c.hunks.some(h => h.lines.some(l => l.type === 'added' &&
            (l.content.includes('function') || l.content.includes('class') || l.content.includes('component')))));
        const hasOnlyTests = allChanges.every(c => c.file.includes('test') || c.file.includes('spec'));
        const hasOnlyDocs = allChanges.every(c => c.file.includes('.md') || c.file.includes('doc') || c.file.includes('README'));
        const hasBugFixes = allChanges.some(c => c.hunks.some(h => h.lines.some(l => l.content.toLowerCase().includes('fix') ||
            l.content.toLowerCase().includes('bug') ||
            l.content.includes('try') || l.content.includes('catch'))));
        if (hasOnlyDocs)
            return 'docs';
        if (hasOnlyTests)
            return 'refactor';
        if (hasBugFixes && !hasNewFeatures)
            return 'bugfix';
        if (hasNewFeatures)
            return 'feature';
        return 'feature'; // Default fallback
    }
    async generateWorkflowSuggestions(session) {
        const suggestions = [];
        const allChanges = [...session.workingChanges, ...session.stagedChanges];
        const stats = session.cumulativeStats;
        const antiPatterns = this.detectAntiPatterns(session);
        // Large changeset suggestion
        if (stats.totalFiles > 15 || stats.changedLines > 800) {
            suggestions.push({
                type: 'commit-split',
                description: 'Consider breaking this large change into smaller, focused commits',
                benefit: 'Easier code review, safer deployments, better git history',
                effort: 'medium'
            });
        }
        // Missing tests suggestion
        const codeFiles = allChanges.filter(c => !this.isTestFile(c.file) && !this.isDocFile(c.file));
        const testFiles = allChanges.filter(c => this.isTestFile(c.file));
        if (codeFiles.length > 0 && testFiles.length === 0) {
            suggestions.push({
                type: 'testing',
                description: 'Add tests for the new functionality or changes',
                benefit: 'Prevent regression bugs, improve code confidence, better maintainability',
                effort: 'medium'
            });
        }
        // Documentation suggestion
        const hasPublicAPIs = allChanges.some(c => c.hunks.some(h => h.lines.some(l => l.type === 'added' &&
            (l.content.includes('export') || l.content.includes('public') || l.content.includes('@api')))));
        if (hasPublicAPIs && !allChanges.some(c => this.isDocFile(c.file))) {
            suggestions.push({
                type: 'documentation',
                description: 'Update documentation for new public APIs',
                benefit: 'Better developer experience, easier adoption, reduced support burden',
                effort: 'low'
            });
        }
        // Refactoring opportunity
        const duplicatedCode = this.detectCodeDuplication(allChanges);
        if (duplicatedCode.length > 0) {
            suggestions.push({
                type: 'refactoring',
                description: 'Extract common patterns into reusable functions/components',
                benefit: 'Reduced code duplication, improved maintainability, DRY principle',
                effort: 'medium'
            });
        }
        // Anti-pattern based suggestions
        for (const antiPattern of antiPatterns) {
            if (antiPattern.severity === 'high') {
                suggestions.push({
                    type: this.mapAntiPatternToSuggestionType(antiPattern.type),
                    description: antiPattern.suggestion,
                    benefit: `Address ${antiPattern.type} anti-pattern`,
                    effort: antiPattern.severity === 'high' ? 'high' : 'medium'
                });
            }
        }
        return suggestions.slice(0, 5); // Limit to top 5 suggestions
    }
    async analyzeTeamWorkflow(recentSessions) {
        const commonPatterns = this.extractCommonPatterns(recentSessions);
        const developmentStyle = this.inferDevelopmentStyle(recentSessions);
        const qualityMetrics = this.calculateQualityMetrics(recentSessions);
        const recommendations = await this.generateTeamRecommendations(recentSessions);
        const antiPatterns = this.detectTeamAntiPatterns(recentSessions);
        return {
            commonPatterns,
            developmentStyle,
            qualityMetrics,
            recommendations,
            antiPatterns
        };
    }
    async optimizeCommitStrategy(session) {
        const allChanges = [...session.workingChanges, ...session.stagedChanges];
        const suggestions = [];
        // Group by logical boundaries
        const fileGroups = this.groupFilesByLogicalBoundary(allChanges);
        if (fileGroups.length > 1) {
            suggestions.push(`Split into ${fileGroups.length} commits by logical boundaries:`);
            fileGroups.forEach((group, index) => {
                const groupDescription = this.describeFileGroup(group);
                suggestions.push(`  ${index + 1}. ${groupDescription}`);
            });
        }
        // Feature flag strategy
        const hasFeatureFlags = allChanges.some(c => c.hunks.some(h => h.lines.some(l => l.content.includes('feature') && l.content.includes('flag'))));
        if (hasFeatureFlags) {
            suggestions.push('Consider using feature flags for safe, incremental deployment');
        }
        // Breaking change strategy
        const hasBreakingChanges = allChanges.some(c => c.hunks.some(h => h.lines.some(l => l.type === 'removed' &&
            (l.content.includes('export') || l.content.includes('public')))));
        if (hasBreakingChanges) {
            suggestions.push('Breaking changes detected - consider deprecation strategy');
            suggestions.push('Create separate commit for breaking changes');
            suggestions.push('Update CHANGELOG.md with migration notes');
        }
        return suggestions;
    }
    // Private helper methods
    detectTDDPattern(changes, session) {
        const testFiles = changes.filter(c => this.isTestFile(c.file));
        const codeFiles = changes.filter(c => !this.isTestFile(c.file) && !this.isDocFile(c.file));
        // TDD pattern: tests added/modified before or alongside code
        if (testFiles.length > 0 && testFiles.length >= codeFiles.length * 0.8) {
            return {
                type: 'rapid-iteration', // Using existing type, but could add 'tdd'
                confidence: 0.8,
                evidence: [`${testFiles.length} test files modified with ${codeFiles.length} code files`]
            };
        }
        return null;
    }
    detectFeatureFlagPattern(changes) {
        const hasFeatureFlags = changes.some(c => c.hunks.some(h => h.lines.some(l => l.content.includes('featureFlag') ||
            l.content.includes('feature_flag') ||
            l.content.includes('toggles') ||
            l.content.includes('LaunchDarkly') ||
            l.content.includes('ConfigCat'))));
        if (hasFeatureFlags) {
            return {
                type: 'feature-branch',
                confidence: 0.9,
                evidence: ['Feature flag usage detected in changes']
            };
        }
        return null;
    }
    detectMicrocommitPattern(session) {
        const stats = session.cumulativeStats;
        // Small, frequent changes pattern
        if (stats.totalFiles <= 3 && stats.changedLines <= 50 && stats.duration <= 60) {
            return {
                type: 'rapid-iteration',
                confidence: 0.7,
                evidence: [`Small change: ${stats.totalFiles} files, ${stats.changedLines} lines, ${stats.duration}min`]
            };
        }
        return null;
    }
    detectRefactoringSprintPattern(changes, stats) {
        const refactoringIndicators = changes.filter(c => c.hunks.some(h => {
            const added = h.lines.filter(l => l.type === 'added').length;
            const removed = h.lines.filter(l => l.type === 'removed').length;
            return Math.abs(added - removed) < Math.max(added, removed) * 0.3; // Similar add/remove ratio
        })).length;
        const refactoringRatio = refactoringIndicators / changes.length;
        if (refactoringRatio > 0.7 && changes.length > 5) {
            return {
                type: 'refactoring',
                confidence: refactoringRatio,
                evidence: [`${refactoringIndicators}/${changes.length} files show refactoring patterns`]
            };
        }
        return null;
    }
    detectDocumentationPattern(changes) {
        const docFiles = changes.filter(c => this.isDocFile(c.file));
        const docRatio = docFiles.length / changes.length;
        if (docRatio > 0.5) {
            return {
                type: 'rapid-iteration', // Could add 'documentation' type
                confidence: 0.8,
                evidence: [`${docFiles.length}/${changes.length} files are documentation`]
            };
        }
        return null;
    }
    detectHotfixPattern(session) {
        const branch = session.baseBranch.toLowerCase();
        const isHotfixBranch = branch.includes('hotfix') || branch.includes('urgent') || branch.includes('critical');
        const isSmallChange = session.cumulativeStats.totalFiles <= 5 && session.cumulativeStats.changedLines <= 200;
        const isFastDevelopment = session.cumulativeStats.duration <= 30;
        if (isHotfixBranch || (isSmallChange && isFastDevelopment)) {
            return {
                type: 'bug-fixing',
                confidence: isHotfixBranch ? 0.9 : 0.6,
                evidence: [
                    `Branch suggests hotfix: ${isHotfixBranch}`,
                    `Small scope: ${session.cumulativeStats.totalFiles} files`,
                    `Fast development: ${session.cumulativeStats.duration} minutes`
                ].filter(e => !e.includes('false'))
            };
        }
        return null;
    }
    detectAntiPatterns(session) {
        const antiPatterns = [];
        const allChanges = [...session.workingChanges, ...session.stagedChanges];
        const stats = session.cumulativeStats;
        // Large commits anti-pattern
        if (stats.totalFiles > 20 || stats.changedLines > 1000) {
            antiPatterns.push({
                type: 'large-commits',
                severity: stats.totalFiles > 30 ? 'high' : 'medium',
                description: 'Commit is too large for effective code review',
                evidence: [`${stats.totalFiles} files changed`, `${stats.changedLines} lines modified`],
                suggestion: 'Break into smaller, logically-grouped commits'
            });
        }
        // No tests anti-pattern
        const hasCodeChanges = allChanges.some(c => !this.isTestFile(c.file) && !this.isDocFile(c.file));
        const hasTests = allChanges.some(c => this.isTestFile(c.file));
        if (hasCodeChanges && !hasTests) {
            antiPatterns.push({
                type: 'no-tests',
                severity: 'medium',
                description: 'Code changes without corresponding tests',
                evidence: ['No test files modified', 'Code changes present'],
                suggestion: 'Add tests to verify new functionality and prevent regressions'
            });
        }
        // Mixed concerns anti-pattern
        const concernTypes = this.identifyFileConcerns(allChanges);
        if (concernTypes.length > 3) {
            antiPatterns.push({
                type: 'mixed-concerns',
                severity: 'medium',
                description: 'Commit mixes multiple unrelated concerns',
                evidence: [`Changes span ${concernTypes.length} different areas: ${concernTypes.join(', ')}`],
                suggestion: 'Separate unrelated changes into different commits'
            });
        }
        // Breaking changes anti-pattern
        const hasBreakingChanges = allChanges.some(c => c.hunks.some(h => h.lines.some(l => l.type === 'removed' &&
            (l.content.includes('export') || l.content.includes('public')))));
        if (hasBreakingChanges) {
            antiPatterns.push({
                type: 'breaking-changes',
                severity: 'high',
                description: 'Breaking changes without proper migration strategy',
                evidence: ['Public API removals detected'],
                suggestion: 'Document breaking changes and provide migration guide'
            });
        }
        return antiPatterns;
    }
    extractCommonPatterns(sessions) {
        // Analysis of multiple sessions to find common patterns
        const patternCounts = new Map();
        sessions.forEach(session => {
            session.patterns.forEach(pattern => {
                patternCounts.set(pattern.type, (patternCounts.get(pattern.type) || 0) + 1);
            });
        });
        return Array.from(patternCounts.entries())
            .filter(([_, count]) => count > sessions.length * 0.3)
            .sort((a, b) => b[1] - a[1])
            .map(([pattern]) => pattern);
    }
    inferDevelopmentStyle(sessions) {
        const testPatternCount = sessions.filter(s => s.patterns.some(p => p.type === 'rapid-iteration') // TDD-like
        ).length;
        const featurePatternCount = sessions.filter(s => s.patterns.some(p => p.type === 'feature-branch')).length;
        const refactorPatternCount = sessions.filter(s => s.patterns.some(p => p.type === 'refactoring')).length;
        const totalSessions = sessions.length;
        if (testPatternCount > totalSessions * 0.6)
            return 'test-driven';
        if (featurePatternCount > totalSessions * 0.6)
            return 'feature-first';
        if (refactorPatternCount > totalSessions * 0.4)
            return 'iterative';
        return 'mixed';
    }
    calculateQualityMetrics(sessions) {
        const avgDuration = sessions.reduce((sum, s) => sum + s.cumulativeStats.duration, 0) / sessions.length;
        const avgFiles = sessions.reduce((sum, s) => sum + s.cumulativeStats.totalFiles, 0) / sessions.length;
        return {
            sessionDuration: avgDuration,
            commitFrequency: sessions.length / 30, // Assuming 30-day period
            changeVelocity: avgFiles / avgDuration,
            testCoverage: 0.75, // Would calculate from actual test coverage
            codeQuality: 0.8, // Would calculate from code complexity metrics
            refactoringRatio: sessions.filter(s => s.patterns.some(p => p.type === 'refactoring')).length / sessions.length
        };
    }
    async generateTeamRecommendations(sessions) {
        const recommendations = [];
        // Add team-level recommendations based on session analysis
        const avgComplexity = sessions.reduce((sum, s) => {
            const complexityScore = s.cumulativeStats.complexity === 'critical' ? 4 :
                s.cumulativeStats.complexity === 'high' ? 3 :
                    s.cumulativeStats.complexity === 'medium' ? 2 : 1;
            return sum + complexityScore;
        }, 0) / sessions.length;
        if (avgComplexity > 2.5) {
            recommendations.push({
                type: 'commit-split',
                description: 'Team tends to make large commits - consider smaller, focused changes',
                benefit: 'Improved code review quality, easier debugging, safer deployments',
                effort: 'low'
            });
        }
        return recommendations;
    }
    detectTeamAntiPatterns(sessions) {
        const antiPatterns = [];
        const largeCommitSessions = sessions.filter(s => s.cumulativeStats.totalFiles > 15).length;
        if (largeCommitSessions > sessions.length * 0.4) {
            antiPatterns.push('Frequent large commits');
        }
        return antiPatterns;
    }
    groupFilesByLogicalBoundary(changes) {
        const groups = [];
        const testFiles = changes.filter(c => this.isTestFile(c.file));
        const docFiles = changes.filter(c => this.isDocFile(c.file));
        const configFiles = changes.filter(c => this.isConfigFile(c.file));
        const codeFiles = changes.filter(c => !this.isTestFile(c.file) && !this.isDocFile(c.file) && !this.isConfigFile(c.file));
        if (codeFiles.length > 0)
            groups.push(codeFiles);
        if (testFiles.length > 0)
            groups.push(testFiles);
        if (docFiles.length > 0)
            groups.push(docFiles);
        if (configFiles.length > 0)
            groups.push(configFiles);
        return groups;
    }
    describeFileGroup(files) {
        if (files.every(f => this.isTestFile(f.file)))
            return 'Test updates';
        if (files.every(f => this.isDocFile(f.file)))
            return 'Documentation changes';
        if (files.every(f => this.isConfigFile(f.file)))
            return 'Configuration updates';
        const mainFile = files[0];
        if (files.length === 1)
            return `${mainFile.file} changes`;
        return `${mainFile.file} and ${files.length - 1} related files`;
    }
    detectCodeDuplication(changes) {
        // Simple duplication detection
        const duplicates = [];
        const addedLines = new Map();
        changes.forEach(change => {
            change.hunks.forEach(hunk => {
                hunk.lines.forEach(line => {
                    if (line.type === 'added' && line.content.trim().length > 10) {
                        const content = line.content.trim();
                        addedLines.set(content, (addedLines.get(content) || 0) + 1);
                    }
                });
            });
        });
        addedLines.forEach((count, content) => {
            if (count > 1) {
                duplicates.push(content);
            }
        });
        return duplicates;
    }
    identifyFileConcerns(changes) {
        const concerns = new Set();
        changes.forEach(change => {
            if (this.isTestFile(change.file))
                concerns.add('testing');
            else if (this.isDocFile(change.file))
                concerns.add('documentation');
            else if (this.isConfigFile(change.file))
                concerns.add('configuration');
            else if (change.file.includes('ui') || change.file.includes('component'))
                concerns.add('ui');
            else if (change.file.includes('api') || change.file.includes('service'))
                concerns.add('backend');
            else if (change.file.includes('util') || change.file.includes('helper'))
                concerns.add('utilities');
            else
                concerns.add('core');
        });
        return Array.from(concerns);
    }
    mapAntiPatternToSuggestionType(antiPatternType) {
        switch (antiPatternType) {
            case 'large-commits': return 'commit-split';
            case 'no-tests': return 'testing';
            case 'mixed-concerns': return 'commit-split';
            case 'breaking-changes': return 'documentation';
            default: return 'refactoring';
        }
    }
    isTestFile(filename) {
        return filename.includes('test') ||
            filename.includes('spec') ||
            filename.includes('__tests__') ||
            filename.endsWith('.test.ts') ||
            filename.endsWith('.spec.ts');
    }
    isDocFile(filename) {
        return filename.endsWith('.md') ||
            filename.includes('README') ||
            filename.includes('doc') ||
            filename.includes('CHANGELOG');
    }
    isConfigFile(filename) {
        return filename.includes('config') ||
            filename.includes('package.json') ||
            filename.includes('tsconfig') ||
            filename.includes('.env') ||
            filename.includes('webpack') ||
            filename.includes('babel') ||
            filename.includes('eslint');
    }
}
//# sourceMappingURL=workflow-analyzer.js.map