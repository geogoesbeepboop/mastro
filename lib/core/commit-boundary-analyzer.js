import { AIClient } from './ai-client.js';
/**
 * Analyzes working directory changes to detect logical commit boundaries
 * and suggest optimal staging strategies for better commit hygiene.
 */
export class CommitBoundaryAnalyzer {
    config;
    semanticAnalyzer;
    impactAnalyzer;
    aiClient;
    constructor(config, semanticAnalyzer, impactAnalyzer) {
        this.config = config;
        this.semanticAnalyzer = semanticAnalyzer;
        this.impactAnalyzer = impactAnalyzer;
        this.aiClient = new AIClient({
            provider: config.ai.provider,
            apiKey: config.ai.apiKey,
            model: config.ai.model,
            maxTokens: config.ai.maxTokens,
            temperature: config.ai.temperature
        });
    }
    /**
     * Main entry point: analyze all working changes and detect commit boundaries
     */
    async analyzeCommitBoundaries(changes) {
        if (changes.length === 0) {
            return [];
        }
        // Use AI-powered analysis for better boundary detection
        const aiAnalysis = await this.performAIBoundaryAnalysis(changes);
        // If AI analysis yields good boundaries, use them
        if (aiAnalysis.boundaries.length > 1 || changes.length > 8) {
            return this.optimizeBoundaries(aiAnalysis.boundaries);
        }
        // For smaller sets, still do traditional analysis but enhanced with AI categorization
        // 1. Analyze file relationships
        const relationships = await this.analyzeFileRelationships(changes);
        // 2. Group by AI-enhanced impact analysis
        const impactGroups = await this.groupByImpactWithAI(changes);
        // 3. Build dependency graph
        const dependencyGraph = await this.buildDependencyGraph(changes);
        // 4. Detect boundaries using enhanced clustering
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
        // Enhanced theme detection based on file paths, extensions, and change patterns
        const themes = new Map();
        // Categorize files by directory and purpose first
        const docFiles = files.filter(f => this.isDocumentationFile(f.file));
        const testFiles = files.filter(f => this.isTestFile(f.file));
        const configFiles = files.filter(f => this.isConfigFile(f.file));
        const sourceFiles = files.filter(f => !this.isDocumentationFile(f.file) && !this.isTestFile(f.file) && !this.isConfigFile(f.file));
        // Documentation changes
        if (docFiles.length > 0) {
            if (docFiles.length === files.length) {
                // All files are documentation
                themes.set('documentation', docFiles.length * 2);
            }
            else {
                // Mixed with other files
                themes.set('documentation', docFiles.length);
            }
        }
        // Test changes
        if (testFiles.length > 0) {
            themes.set('testing', testFiles.length * 1.5);
        }
        // Configuration changes  
        if (configFiles.length > 0) {
            themes.set('configuration', configFiles.length);
        }
        // Analyze source files for specific patterns
        for (const file of sourceFiles) {
            const path = file.file.toLowerCase();
            const fileName = file.file.split('/').pop()?.toLowerCase() || '';
            // Authentication-related
            if (path.includes('auth') || path.includes('login') || path.includes('signin') ||
                path.includes('jwt') || fileName.includes('auth')) {
                themes.set('authentication', (themes.get('authentication') || 0) + 2);
            }
            // UI/Frontend-related
            if (path.includes('component') || path.includes('ui/') || path.includes('frontend') ||
                fileName.endsWith('.vue') || fileName.endsWith('.jsx') || fileName.endsWith('.tsx') ||
                path.includes('style') || path.includes('css')) {
                themes.set('user interface', (themes.get('user interface') || 0) + 2);
            }
            // API/Backend-related (but not docs)
            if ((path.includes('api/') || path.includes('route') || path.includes('endpoint') ||
                path.includes('controller') || path.includes('service')) &&
                !this.isDocumentationFile(file.file)) {
                themes.set('backend development', (themes.get('backend development') || 0) + 2);
            }
            // Database-related
            if (path.includes('model') || path.includes('schema') || path.includes('migration') ||
                path.includes('database') || fileName.includes('db')) {
                themes.set('database', (themes.get('database') || 0) + 2);
            }
            // Security-related
            if (path.includes('security') || path.includes('permission') || path.includes('role') ||
                path.includes('csrf') || path.includes('xss')) {
                themes.set('security', (themes.get('security') || 0) + 2);
            }
            // Performance/optimization
            if (path.includes('optimize') || path.includes('cache') || path.includes('performance') ||
                path.includes('lazy') || path.includes('bundle')) {
                themes.set('performance', (themes.get('performance') || 0) + 2);
            }
            // Bug fixes (analyze change patterns)
            if (this.isBugFixFile(file)) {
                themes.set('bug fixes', (themes.get('bug fixes') || 0) + 1.5);
            }
            // Feature development (fallback for source files)
            if (!themes.has('authentication') && !themes.has('user interface') &&
                !themes.has('backend development') && !themes.has('database') &&
                !themes.has('security') && !themes.has('performance')) {
                themes.set('feature development', (themes.get('feature development') || 0) + 1);
            }
        }
        // Default themes based on file types if no specific theme detected
        if (themes.size === 0) {
            if (files.every(f => this.isDocumentationFile(f.file))) {
                return 'documentation updates';
            }
            else if (files.every(f => this.isTestFile(f.file))) {
                return 'testing improvements';
            }
            else if (files.every(f => this.isConfigFile(f.file))) {
                return 'configuration changes';
            }
            else {
                return 'code improvements';
            }
        }
        // Return the most common theme
        return Array.from(themes.entries()).sort((a, b) => b[1] - a[1])[0][0];
    }
    isDocumentationFile(filePath) {
        const path = filePath.toLowerCase();
        return path.includes('readme') || path.includes('doc') ||
            path.endsWith('.md') || path.endsWith('.rst') ||
            path.includes('changelog') || path.includes('license') ||
            path.includes('contributing') || path.includes('guide');
    }
    isTestFile(filePath) {
        const path = filePath.toLowerCase();
        return path.includes('test') || path.includes('spec') ||
            path.includes('__tests__') || path.includes('.test.') ||
            path.includes('.spec.') || path.includes('cypress') ||
            path.includes('jest');
    }
    isConfigFile(filePath) {
        const path = filePath.toLowerCase();
        const fileName = filePath.split('/').pop()?.toLowerCase() || '';
        return path.includes('config') || path.includes('env') ||
            fileName.startsWith('.env') || fileName.includes('config') ||
            fileName === 'package.json' || fileName === 'tsconfig.json' ||
            fileName.includes('webpack') || fileName.includes('babel') ||
            fileName.includes('eslint') || fileName.includes('prettier');
    }
    isBugFixFile(file) {
        const path = file.file.toLowerCase();
        const hasSmallChanges = file.insertions + file.deletions < 50;
        const hasBugKeywords = path.includes('fix') || path.includes('bug') ||
            path.includes('patch') || path.includes('hotfix');
        return hasSmallChanges && hasBugKeywords;
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
    // AI-Enhanced Methods
    async performAIBoundaryAnalysis(changes) {
        try {
            // Prepare file information for AI analysis
            const fileInfo = changes.map(change => ({
                file: change.file,
                type: change.type,
                insertions: change.insertions,
                deletions: change.deletions,
                // Get a snippet of the changes if available
                summary: `${change.type} change: +${change.insertions} -${change.deletions} lines`
            }));
            const prompt = `Analyze these code changes and suggest logical commit boundaries:

Files changed:
${fileInfo.map(f => `- ${f.file} (${f.summary})`).join('\n')}

Please group these files into logical commit boundaries based on:
1. Functional relationships (files that work together)
2. Impact scope (UI changes, API changes, database changes, etc.)
3. Dependencies between changes
4. Best practices for atomic commits

Each boundary should represent a single, focused change that can be committed independently.`;
            const content = await this.aiClient.performCustomAnalysis(prompt, `You are a senior software engineer analyzing code changes for optimal commit organization. 

Return a JSON object with this structure:
{
  "boundaries": [
    {
      "id": "boundary-1",
      "files": ["file1.js", "file2.js"],
      "theme": "brief description of what this group does",
      "reasoning": "why these files should be grouped together",
      "priority": "high|medium|low",
      "estimatedComplexity": 1-5
    }
  ]
}

Create meaningful, logical groupings that follow commit best practices. Avoid having too many files in one boundary (max 6-8 files).`, 1000, 0.3);
            if (content) {
                const parsed = JSON.parse(content);
                const boundaries = parsed.boundaries.map((boundary, index) => {
                    const boundaryFiles = changes.filter(change => boundary.files.includes(change.file));
                    return {
                        id: boundary.id || `ai-boundary-${index + 1}`,
                        files: boundaryFiles,
                        reasoning: boundary.reasoning || 'AI-generated boundary based on semantic analysis',
                        priority: boundary.priority || 'medium',
                        estimatedComplexity: boundary.estimatedComplexity || this.calculateComplexity(boundaryFiles),
                        dependencies: [],
                        theme: boundary.theme || 'code changes'
                    };
                });
                return { boundaries: boundaries.filter(b => b.files.length > 0) };
            }
        }
        catch (error) {
            // Fall back to traditional analysis if AI fails
            console.warn('AI boundary analysis failed, falling back to traditional method:', error);
        }
        // Fallback: return empty boundaries to trigger traditional analysis
        return { boundaries: [] };
    }
    async groupByImpactWithAI(changes) {
        const groups = new Map();
        for (const change of changes) {
            // Use both traditional and AI-enhanced categorization
            const traditionalTypes = this.categorizeImpactType(change, {});
            const aiTypes = await this.aiCategorizeFile(change);
            // Combine and deduplicate categories
            const combinedTypes = [...new Set([...traditionalTypes, ...aiTypes])];
            for (const impactType of combinedTypes) {
                if (!groups.has(impactType)) {
                    groups.set(impactType, []);
                }
                groups.get(impactType).push(change);
            }
        }
        return groups;
    }
    async aiCategorizeFile(change) {
        try {
            const prompt = `Categorize this code file for commit organization:

File: ${change.file}
Change type: ${change.type}
Lines changed: +${change.insertions} -${change.deletions}

Based on the file path and change information, what categories does this belong to?`;
            const content = await this.aiClient.performCustomAnalysis(prompt, `You are a code analysis expert. Categorize this file into one or more of these categories:
- api: API endpoints, routes, controllers
- ui: User interface, components, views
- business_logic: Core business logic, services, models
- database: Database schemas, migrations, queries
- tests: Test files
- configuration: Config files, settings
- documentation: Documentation, README files
- build: Build scripts, CI/CD, deployment
- utilities: Helper functions, utilities, libraries
- security: Authentication, authorization, security
- performance: Caching, optimization, monitoring

Return JSON: {"categories": ["category1", "category2"]}`, 100, 0.1);
            if (content) {
                const parsed = JSON.parse(content);
                return parsed.categories || [];
            }
        }
        catch (error) {
            // Fall back to traditional categorization
        }
        return [];
    }
}
//# sourceMappingURL=commit-boundary-analyzer.js.map