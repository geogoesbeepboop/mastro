/**
 * Analyzes working directory changes to detect logical commit boundaries
 * and suggest optimal staging strategies for better commit hygiene.
 */
export class CommitBoundaryAnalyzer {
    config;
    semanticAnalyzer;
    impactAnalyzer;
    constructor(config, semanticAnalyzer, impactAnalyzer) {
        this.config = config;
        this.semanticAnalyzer = semanticAnalyzer;
        this.impactAnalyzer = impactAnalyzer;
    }
    /**
     * Main entry point: analyze all working changes and detect commit boundaries
     */
    async analyzeCommitBoundaries(changes) {
        if (changes.length <= 3) {
            // Small change set - probably doesn't need splitting
            return [{
                    id: 'single-commit',
                    files: changes,
                    reasoning: 'Small change set - single commit recommended',
                    priority: 'high',
                    estimatedComplexity: this.calculateComplexity(changes),
                    dependencies: [],
                    theme: await this.detectTheme(changes)
                }];
        }
        // 1. Analyze file relationships
        const relationships = await this.analyzeFileRelationships(changes);
        // 2. Group by impact/concern
        const impactGroups = await this.groupByImpact(changes);
        // 3. Build dependency graph
        const dependencyGraph = await this.buildDependencyGraph(changes);
        // 4. Detect boundaries using clustering
        const boundaries = await this.detectBoundariesML(relationships, impactGroups, dependencyGraph);
        return this.optimizeBoundaries(boundaries);
    }
    /**
     * Generate a staging strategy with specific commit recommendations
     */
    async suggestStagingStrategy(boundaries) {
        const commits = await Promise.all(boundaries.map(async (boundary) => ({
            boundary,
            suggestedMessage: await this.generateCommitMessage(boundary),
            rationale: this.generateRationale(boundary),
            risk: this.assessCommitRisk(boundary),
            estimatedTime: this.estimateCommitTime(boundary)
        })));
        const warnings = this.identifyPotentialIssues(boundaries);
        const strategy = this.determineOptimalStrategy(boundaries);
        const overallRisk = this.assessOverallRisk(boundaries);
        return {
            strategy,
            commits,
            warnings,
            overallRisk
        };
    }
    /**
     * Analyze relationships between files to identify which should be committed together
     */
    async analyzeFileRelationships(changes) {
        const relationships = [];
        for (let i = 0; i < changes.length; i++) {
            for (let j = i + 1; j < changes.length; j++) {
                const file1 = changes[i];
                const file2 = changes[j];
                // Check for import relationships
                const importRelation = await this.checkImportRelationship(file1, file2);
                if (importRelation.strength > 0.3) {
                    relationships.push({
                        file1: file1.file,
                        file2: file2.file,
                        relationshipType: 'import',
                        strength: importRelation.strength
                    });
                }
                // Check for test-source pairs
                const testRelation = this.checkTestRelationship(file1, file2);
                if (testRelation.strength > 0.7) {
                    relationships.push({
                        file1: file1.file,
                        file2: file2.file,
                        relationshipType: 'test_pair',
                        strength: testRelation.strength
                    });
                }
                // Check for similar changes (same functions modified, similar patterns)
                const similarityRelation = await this.checkSimilarChanges(file1, file2);
                if (similarityRelation.strength > 0.4) {
                    relationships.push({
                        file1: file1.file,
                        file2: file2.file,
                        relationshipType: 'similar_changes',
                        strength: similarityRelation.strength
                    });
                }
                // Check for config-related files
                const configRelation = this.checkConfigRelationship(file1, file2);
                if (configRelation.strength > 0.5) {
                    relationships.push({
                        file1: file1.file,
                        file2: file2.file,
                        relationshipType: 'config_related',
                        strength: configRelation.strength
                    });
                }
            }
        }
        return relationships.sort((a, b) => b.strength - a.strength);
    }
    /**
     * Group changes by their impact type (business logic, UI, tests, docs, etc.)
     */
    async groupByImpact(changes) {
        const groups = new Map();
        for (const change of changes) {
            const analysis = await this.semanticAnalyzer.analyzeChanges([change]);
            const impactTypes = this.categorizeImpactType(change, analysis);
            for (const impactType of impactTypes) {
                if (!groups.has(impactType)) {
                    groups.set(impactType, []);
                }
                groups.get(impactType).push(change);
            }
        }
        return groups;
    }
    /**
     * Build a dependency graph to understand which changes depend on others
     */
    async buildDependencyGraph(changes) {
        const graph = new Map();
        // Initialize all files
        for (const change of changes) {
            graph.set(change.file, []);
        }
        // Analyze dependencies based on imports, function calls, etc.
        for (const change of changes) {
            const dependencies = await this.findFileDependencies(change, changes);
            graph.set(change.file, dependencies);
        }
        return graph;
    }
    /**
     * Use ML-style clustering to detect logical boundaries
     */
    async detectBoundariesML(relationships, impactGroups, dependencyGraph) {
        const boundaries = [];
        const processed = new Set();
        // Start with impact groups as initial clustering
        for (const [impactType, files] of impactGroups) {
            if (files.length === 0)
                continue;
            // Check if any files in this group have already been processed
            const unprocessedFiles = files.filter(f => !processed.has(f.file));
            if (unprocessedFiles.length === 0)
                continue;
            // Create boundary for this impact group
            const boundary = {
                id: `boundary-${boundaries.length + 1}`,
                files: unprocessedFiles,
                reasoning: `Related ${impactType} changes that should be committed together`,
                priority: this.determinePriority(impactType, unprocessedFiles),
                estimatedComplexity: this.calculateComplexity(unprocessedFiles),
                dependencies: this.findBoundaryDependencies(unprocessedFiles, dependencyGraph),
                theme: await this.detectTheme(unprocessedFiles)
            };
            boundaries.push(boundary);
            unprocessedFiles.forEach(f => processed.add(f.file));
        }
        // Handle any remaining files that didn't fit into impact groups
        const remainingChanges = impactGroups.get('mixed') || [];
        const unprocessedRemaining = remainingChanges.filter(f => !processed.has(f.file));
        if (unprocessedRemaining.length > 0) {
            boundaries.push({
                id: `boundary-mixed`,
                files: unprocessedRemaining,
                reasoning: 'Mixed changes that don\'t clearly fit other categories',
                priority: 'low',
                estimatedComplexity: this.calculateComplexity(unprocessedRemaining),
                dependencies: [],
                theme: 'miscellaneous'
            });
        }
        return boundaries;
    }
    /**
     * Optimize boundaries by merging small ones and splitting large ones
     */
    optimizeBoundaries(boundaries) {
        const optimized = [];
        for (const boundary of boundaries) {
            // Split large boundaries (>8 files)
            if (boundary.files.length > 8) {
                const split = this.splitLargeBoundary(boundary);
                optimized.push(...split);
            }
            // Merge very small boundaries with similar themes
            else if (boundary.files.length === 1) {
                const merged = this.tryMergeSmallBoundary(boundary, optimized);
                if (!merged) {
                    optimized.push(boundary);
                }
            }
            else {
                optimized.push(boundary);
            }
        }
        return optimized;
    }
    // Helper methods for relationship analysis
    async checkImportRelationship(file1, file2) {
        // Simple heuristic: if one file's changes include imports of the other
        const file1Content = file1.hunks.map(h => h.lines.map(l => l.content).join('\n')).join('\n');
        const file2Content = file2.hunks.map(h => h.lines.map(l => l.content).join('\n')).join('\n');
        const file1Name = file1.file.split('/').pop()?.replace(/\.(ts|js|tsx|jsx)$/, '') || '';
        const file2Name = file2.file.split('/').pop()?.replace(/\.(ts|js|tsx|jsx)$/, '') || '';
        let strength = 0;
        if (file1Content.includes(file2Name) || file2Content.includes(file1Name)) {
            strength += 0.6;
        }
        if (file1Content.includes(`from './${file2Name}`) || file2Content.includes(`from './${file1Name}`)) {
            strength += 0.8;
        }
        return { strength: Math.min(strength, 1) };
    }
    checkTestRelationship(file1, file2) {
        const isTest1 = file1.file.includes('.test.') || file1.file.includes('.spec.') || file1.file.includes('__tests__');
        const isTest2 = file2.file.includes('.test.') || file2.file.includes('.spec.') || file2.file.includes('__tests__');
        if (isTest1 && !isTest2) {
            const sourceName = file2.file.split('/').pop()?.replace(/\.(ts|js|tsx|jsx)$/, '') || '';
            if (file1.file.includes(sourceName)) {
                return { strength: 0.9 };
            }
        }
        if (isTest2 && !isTest1) {
            const sourceName = file1.file.split('/').pop()?.replace(/\.(ts|js|tsx|jsx)$/, '') || '';
            if (file2.file.includes(sourceName)) {
                return { strength: 0.9 };
            }
        }
        return { strength: 0 };
    }
    async checkSimilarChanges(file1, file2) {
        // Analyze if both files have similar types of changes
        const file1Functions = this.extractFunctionNames(file1);
        const file2Functions = this.extractFunctionNames(file2);
        const commonFunctions = file1Functions.filter(f => file2Functions.includes(f));
        const similarity = commonFunctions.length / Math.max(file1Functions.length, file2Functions.length, 1);
        return { strength: similarity * 0.7 };
    }
    checkConfigRelationship(file1, file2) {
        const configPatterns = ['config', 'env', 'settings', 'constants', '.json', '.yml', '.yaml', '.toml'];
        const isConfig1 = configPatterns.some(pattern => file1.file.toLowerCase().includes(pattern));
        const isConfig2 = configPatterns.some(pattern => file2.file.toLowerCase().includes(pattern));
        if (isConfig1 && isConfig2) {
            return { strength: 0.8 };
        }
        return { strength: 0 };
    }
    // Helper methods for impact categorization
    categorizeImpactType(change, analysis) {
        const types = [];
        const filepath = change.file.toLowerCase();
        // Test files
        if (filepath.includes('.test.') || filepath.includes('.spec.') || filepath.includes('__tests__')) {
            types.push('tests');
        }
        // Documentation
        else if (filepath.includes('.md') || filepath.includes('readme') || filepath.includes('docs/')) {
            types.push('documentation');
        }
        // Configuration
        else if (filepath.includes('config') || filepath.includes('.json') || filepath.includes('.yml')) {
            types.push('configuration');
        }
        // UI/Styling
        else if (filepath.includes('.css') || filepath.includes('.scss') || filepath.includes('style') || filepath.includes('component')) {
            types.push('ui');
        }
        // Business logic
        else if (filepath.includes('service') || filepath.includes('controller') || filepath.includes('model')) {
            types.push('business_logic');
        }
        // Database/Migration
        else if (filepath.includes('migration') || filepath.includes('schema') || filepath.includes('database')) {
            types.push('database');
        }
        // API/Routes
        else if (filepath.includes('route') || filepath.includes('api') || filepath.includes('endpoint')) {
            types.push('api');
        }
        else {
            types.push('mixed');
        }
        return types;
    }
    determinePriority(impactType, files) {
        const highPriorityTypes = ['business_logic', 'api', 'database'];
        const mediumPriorityTypes = ['ui', 'configuration'];
        if (highPriorityTypes.includes(impactType))
            return 'high';
        if (mediumPriorityTypes.includes(impactType))
            return 'medium';
        return 'low';
    }
    calculateComplexity(files) {
        let complexity = 0;
        for (const file of files) {
            complexity += file.insertions + file.deletions;
            complexity += file.hunks.length * 0.5; // Multiple hunks increase complexity
        }
        return Math.round(complexity);
    }
    async detectTheme(files) {
        // Simple theme detection based on file paths and change patterns
        const themes = new Map();
        for (const file of files) {
            const path = file.file.toLowerCase();
            if (path.includes('auth') || path.includes('login') || path.includes('user')) {
                themes.set('authentication', (themes.get('authentication') || 0) + 1);
            }
            if (path.includes('ui') || path.includes('component') || path.includes('style')) {
                themes.set('user interface', (themes.get('user interface') || 0) + 1);
            }
            if (path.includes('api') || path.includes('route') || path.includes('endpoint')) {
                themes.set('api development', (themes.get('api development') || 0) + 1);
            }
            if (path.includes('test') || path.includes('spec')) {
                themes.set('testing', (themes.get('testing') || 0) + 1);
            }
            if (path.includes('config') || path.includes('env')) {
                themes.set('configuration', (themes.get('configuration') || 0) + 1);
            }
        }
        if (themes.size === 0)
            return 'code improvements';
        // Return the most common theme
        return Array.from(themes.entries()).sort((a, b) => b[1] - a[1])[0][0];
    }
    // Additional helper methods
    async findFileDependencies(change, allChanges) {
        const dependencies = [];
        const content = change.hunks.map(h => h.lines.map(l => l.content).join('\n')).join('\n');
        for (const otherChange of allChanges) {
            if (otherChange.file === change.file)
                continue;
            const otherFileName = otherChange.file.split('/').pop()?.replace(/\.(ts|js|tsx|jsx)$/, '') || '';
            if (content.includes(otherFileName)) {
                dependencies.push(otherChange.file);
            }
        }
        return dependencies;
    }
    findBoundaryDependencies(files, dependencyGraph) {
        const allDeps = new Set();
        for (const file of files) {
            const deps = dependencyGraph.get(file.file) || [];
            deps.forEach(dep => allDeps.add(dep));
        }
        // Remove internal dependencies (files within the same boundary)
        const fileNames = new Set(files.map(f => f.file));
        return Array.from(allDeps).filter(dep => !fileNames.has(dep));
    }
    extractFunctionNames(change) {
        const functions = [];
        const content = change.hunks.map(h => h.lines.map(l => l.content).join('\n')).join('\n');
        // Simple regex to find function definitions
        const functionRegex = /(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:function|\(|async))/g;
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
            const functionName = match[1] || match[2];
            if (functionName) {
                functions.push(functionName);
            }
        }
        return functions;
    }
    // Optimization helper methods
    splitLargeBoundary(boundary) {
        const chunks = [];
        const chunkSize = 4; // Max 4 files per boundary
        for (let i = 0; i < boundary.files.length; i += chunkSize) {
            chunks.push(boundary.files.slice(i, i + chunkSize));
        }
        return chunks.map((chunk, index) => ({
            ...boundary,
            id: `${boundary.id}-part${index + 1}`,
            files: chunk,
            reasoning: `${boundary.reasoning} (part ${index + 1} of ${chunks.length})`,
            estimatedComplexity: this.calculateComplexity(chunk)
        }));
    }
    tryMergeSmallBoundary(boundary, existingBoundaries) {
        for (const existing of existingBoundaries) {
            if (existing.theme === boundary.theme && existing.files.length < 4) {
                existing.files.push(...boundary.files);
                existing.reasoning += ` + ${boundary.reasoning}`;
                existing.estimatedComplexity += boundary.estimatedComplexity;
                return true;
            }
        }
        return false;
    }
    // Strategy generation methods
    async generateCommitMessage(boundary) {
        const type = this.inferCommitType(boundary);
        const scope = this.inferScope(boundary);
        const description = this.generateDescription(boundary);
        const title = scope
            ? `${type}(${scope}): ${description}`
            : `${type}: ${description}`;
        const body = boundary.files.length > 3
            ? `Changes include:\n${boundary.files.map(f => `- ${f.file}`).join('\n')}`
            : undefined;
        return { title, type, body };
    }
    inferCommitType(boundary) {
        if (boundary.theme.includes('test'))
            return 'test';
        if (boundary.theme.includes('doc'))
            return 'docs';
        if (boundary.theme.includes('config'))
            return 'chore';
        if (boundary.theme.includes('ui') || boundary.theme.includes('style'))
            return 'feat';
        if (boundary.files.some(f => f.file.includes('fix') || f.file.includes('bug')))
            return 'fix';
        return 'feat';
    }
    inferScope(boundary) {
        const commonPath = this.findCommonPath(boundary.files.map(f => f.file));
        if (commonPath && commonPath !== '.') {
            return commonPath.split('/').pop() || null;
        }
        return null;
    }
    generateDescription(boundary) {
        if (boundary.theme === 'authentication')
            return 'implement authentication system';
        if (boundary.theme === 'user interface')
            return 'update UI components';
        if (boundary.theme === 'api development')
            return 'add API endpoints';
        if (boundary.theme === 'testing')
            return 'add test coverage';
        if (boundary.theme === 'configuration')
            return 'update configuration';
        return boundary.theme.replace(/_/g, ' ');
    }
    findCommonPath(paths) {
        if (paths.length === 0)
            return '.';
        if (paths.length === 1)
            return paths[0].split('/').slice(0, -1).join('/') || '.';
        const parts = paths[0].split('/');
        let commonLength = 0;
        for (let i = 0; i < parts.length - 1; i++) { // -1 to exclude filename
            if (paths.every(path => path.split('/')[i] === parts[i])) {
                commonLength = i + 1;
            }
            else {
                break;
            }
        }
        return commonLength > 0 ? parts.slice(0, commonLength).join('/') : '.';
    }
    generateRationale(boundary) {
        return `This commit groups ${boundary.files.length} files related to ${boundary.theme}. ${boundary.reasoning}`;
    }
    assessCommitRisk(boundary) {
        if (boundary.estimatedComplexity > 500)
            return 'high';
        if (boundary.estimatedComplexity > 200)
            return 'medium';
        return 'low';
    }
    estimateCommitTime(boundary) {
        const baseTime = Math.max(2, Math.ceil(boundary.files.length / 2));
        return `${baseTime} minutes`;
    }
    identifyPotentialIssues(boundaries) {
        const warnings = [];
        if (boundaries.length > 5) {
            warnings.push(`Large number of commits (${boundaries.length}) - consider if some can be combined`);
        }
        const highRiskBoundaries = boundaries.filter(b => this.assessCommitRisk(b) === 'high');
        if (highRiskBoundaries.length > 0) {
            warnings.push(`${highRiskBoundaries.length} high-risk commits detected - extra review recommended`);
        }
        const dependentBoundaries = boundaries.filter(b => b.dependencies.length > 0);
        if (dependentBoundaries.length > 0) {
            warnings.push('Some commits have dependencies - ensure proper commit order');
        }
        return warnings;
    }
    determineOptimalStrategy(boundaries) {
        const hasDependencies = boundaries.some(b => b.dependencies.length > 0);
        const hasHighRisk = boundaries.some(b => this.assessCommitRisk(b) === 'high');
        if (hasDependencies)
            return 'sequential';
        if (hasHighRisk)
            return 'progressive';
        return 'parallel';
    }
    assessOverallRisk(boundaries) {
        const risks = boundaries.map(b => this.assessCommitRisk(b));
        const highRiskCount = risks.filter(r => r === 'high').length;
        const mediumRiskCount = risks.filter(r => r === 'medium').length;
        if (highRiskCount > 0)
            return 'high';
        if (mediumRiskCount > boundaries.length / 2)
            return 'medium';
        return 'low';
    }
}
//# sourceMappingURL=commit-boundary-analyzer.js.map