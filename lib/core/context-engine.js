import { readFileSync } from 'fs';
import { join, extname } from 'path';
export class ContextEngine {
    config;
    projectRoot;
    constructor(config) {
        this.config = config;
        this.projectRoot = process.cwd();
    }
    async analyzeSemanticChanges(context) {
        const semanticChanges = [];
        for (const change of context.changes) {
            const semanticChange = await this.analyzeFileChange(change, context);
            if (semanticChange) {
                semanticChanges.push(semanticChange);
            }
        }
        return this.consolidateChanges(semanticChanges);
    }
    async analyzeImpact(context) {
        const affectedComponents = await this.identifyAffectedComponents(context.changes);
        const potentialIssues = await this.identifyPotentialIssues(context.changes);
        const testingRecommendations = await this.generateTestingRecommendations(context.changes);
        const risk = this.assessRisk(context.changes, affectedComponents, potentialIssues);
        const scope = this.assessScope(context.changes, affectedComponents);
        return {
            risk,
            scope,
            affectedComponents,
            potentialIssues,
            testingRecommendations
        };
    }
    async extractDependencies(filePath) {
        const dependencies = [];
        try {
            const content = readFileSync(join(this.projectRoot, filePath), 'utf-8');
            const ext = extname(filePath);
            switch (ext) {
                case '.ts':
                case '.tsx':
                case '.js':
                case '.jsx': {
                    const importMatches = content.match(/from ['"]([^'"]+)['"]/g);
                    if (importMatches) {
                        dependencies.push(...importMatches.map(match => match.replace(/from ['"]([^'"]+)['"]/, '$1')).filter(dep => dep.startsWith('./') || dep.startsWith('../')));
                    }
                    break;
                }
                case '.py': {
                    const importMatches = content.match(/^from\s+(\S+)\s+import|^import\s+(\S+)/gm);
                    if (importMatches) {
                        dependencies.push(...importMatches.map(match => match.replace(/^from\s+(\S+)\s+import.*/, '$1')
                            .replace(/^import\s+(\S+).*/, '$1')).filter(dep => dep.startsWith('.')));
                    }
                    break;
                }
                case '.java': {
                    const importMatches = content.match(/import\s+([^;]+);/g);
                    if (importMatches) {
                        dependencies.push(...importMatches.map(match => match.replace(/import\s+([^;]+);/, '$1')));
                    }
                    break;
                }
            }
        }
        catch (error) {
            // File might be deleted or inaccessible
        }
        return dependencies;
    }
    async analyzeFileChange(change, context) {
        const fileExt = extname(change.file);
        const fileName = change.file.toLowerCase();
        // Determine change type based on file patterns and content
        const changeType = this.inferChangeType(change, fileName, fileExt);
        const scope = this.extractScope(change.file);
        const description = await this.generateDescription(change, changeType);
        if (!changeType)
            return null;
        return {
            type: changeType,
            scope,
            description,
            files: [change.file],
            confidence: this.calculateConfidence(change, changeType, fileName),
            reasoning: this.explainReasoning(change, changeType, fileName)
        };
    }
    inferChangeType(change, fileName, fileExt) {
        // Test files
        if (fileName.includes('test') || fileName.includes('spec') || fileName.includes('.test.') || fileName.includes('.spec.')) {
            return 'test';
        }
        // Documentation
        if (fileExt === '.md' || fileName.includes('readme') || fileName.includes('doc')) {
            return 'docs';
        }
        // Configuration files
        if (fileName.includes('config') || fileName.includes('.env') ||
            fileExt === '.json' || fileExt === '.yaml' || fileExt === '.yml' ||
            fileName.includes('package.json') || fileName.includes('tsconfig')) {
            return 'chore';
        }
        // Style files
        if (fileExt === '.css' || fileExt === '.scss' || fileExt === '.less' ||
            fileExt === '.styled' || fileName.includes('style')) {
            return 'style';
        }
        // Analyze content changes for semantic understanding
        const hasNewFeatures = this.detectNewFeatures(change);
        const hasBugFixes = this.detectBugFixes(change);
        const hasRefactoring = this.detectRefactoring(change);
        if (hasNewFeatures)
            return 'feat';
        if (hasBugFixes)
            return 'fix';
        if (hasRefactoring)
            return 'refactor';
        // Default to feat for new files, fix for modifications
        if (change.type === 'added')
            return 'feat';
        if (change.type === 'modified')
            return 'fix';
        return null;
    }
    detectNewFeatures(change) {
        for (const hunk of change.hunks) {
            const addedLines = hunk.lines.filter(line => line.type === 'added');
            const addedContent = addedLines.map(line => line.content.toLowerCase()).join(' ');
            // Look for patterns indicating new functionality
            const featurePatterns = [
                /class\s+\w+/,
                /function\s+\w+/,
                /export\s+(function|class|const)/,
                /new\s+\w+Component/,
                /add\w*Feature/,
                /implement/i
            ];
            if (featurePatterns.some(pattern => pattern.test(addedContent))) {
                return true;
            }
        }
        return false;
    }
    detectBugFixes(change) {
        for (const hunk of change.hunks) {
            const content = hunk.lines.map(line => line.content.toLowerCase()).join(' ');
            // Look for patterns indicating bug fixes
            const bugFixPatterns = [
                /fix/i,
                /bug/i,
                /error/i,
                /exception/i,
                /null\s*check/,
                /validation/i,
                /catch/i,
                /try\s*{/
            ];
            if (bugFixPatterns.some(pattern => pattern.test(content))) {
                return true;
            }
        }
        return false;
    }
    detectRefactoring(change) {
        // High deletion to insertion ratio often indicates refactoring
        if (change.deletions > change.insertions * 0.7 && change.deletions > 5) {
            return true;
        }
        for (const hunk of change.hunks) {
            const content = hunk.lines.map(line => line.content.toLowerCase()).join(' ');
            // Look for refactoring patterns
            const refactorPatterns = [
                /refactor/i,
                /rename/i,
                /extract/i,
                /move/i,
                /reorganize/i,
                /cleanup/i
            ];
            if (refactorPatterns.some(pattern => pattern.test(content))) {
                return true;
            }
        }
        return false;
    }
    extractScope(filePath) {
        const parts = filePath.split('/');
        // Common scope patterns
        if (parts.includes('components')) {
            const componentName = parts[parts.indexOf('components') + 1];
            return componentName ? componentName.replace(/\.(ts|tsx|js|jsx)$/, '') : undefined;
        }
        if (parts.includes('pages') || parts.includes('views')) {
            const pageName = parts[parts.indexOf('pages') + 1] || parts[parts.indexOf('views') + 1];
            return pageName ? pageName.replace(/\.(ts|tsx|js|jsx)$/, '') : undefined;
        }
        if (parts.includes('services') || parts.includes('api')) {
            const serviceName = parts[parts.indexOf('services') + 1] || parts[parts.indexOf('api') + 1];
            return serviceName ? serviceName.replace(/\.(ts|tsx|js|jsx)$/, '') : undefined;
        }
        // Extract from filename if no clear scope
        const fileName = parts[parts.length - 1];
        if (fileName) {
            const baseName = fileName.replace(/\.(ts|tsx|js|jsx|py|java|go|rs)$/, '');
            if (baseName.length > 0) {
                return baseName;
            }
        }
        return undefined;
    }
    async generateDescription(change, changeType) {
        const fileName = change.file.split('/').pop() || change.file;
        const baseName = fileName.replace(/\.(ts|tsx|js|jsx|py|java|go|rs)$/, '');
        switch (changeType) {
            case 'feat':
                return `add ${baseName} functionality`;
            case 'fix':
                return `fix issues in ${baseName}`;
            case 'docs':
                return `update ${baseName} documentation`;
            case 'style':
                return `update ${baseName} styling`;
            case 'refactor':
                return `refactor ${baseName} implementation`;
            case 'test':
                return `update ${baseName} tests`;
            case 'chore':
                return `update ${baseName} configuration`;
            default:
                return `update ${baseName}`;
        }
    }
    calculateConfidence(change, changeType, fileName) {
        let confidence = 0.5; // Base confidence
        // File name patterns increase confidence
        if (changeType === 'test' && (fileName.includes('test') || fileName.includes('spec'))) {
            confidence += 0.3;
        }
        if (changeType === 'docs' && fileName.includes('.md')) {
            confidence += 0.3;
        }
        if (changeType === 'style' && (fileName.includes('.css') || fileName.includes('style'))) {
            confidence += 0.3;
        }
        // Change patterns increase confidence
        const hasSemanticPatterns = this.detectSemanticPatterns(change, changeType);
        if (hasSemanticPatterns) {
            confidence += 0.2;
        }
        return Math.min(confidence, 1.0);
    }
    detectSemanticPatterns(change, changeType) {
        const allContent = change.hunks.flatMap(hunk => hunk.lines.map(line => line.content.toLowerCase())).join(' ');
        const patterns = {
            feat: [/new\s+\w+/, /add\w*/, /implement/, /create/],
            fix: [/fix/, /bug/, /error/, /issue/],
            refactor: [/refactor/, /rename/, /extract/, /move/],
            test: [/test/, /spec/, /assert/, /expect/],
            docs: [/readme/, /documentation/, /doc/],
            style: [/style/, /css/, /theme/, /color/],
            chore: [/config/, /build/, /dep/, /update/]
        };
        const relevantPatterns = patterns[changeType] || [];
        return relevantPatterns.some((pattern) => pattern.test(allContent));
    }
    explainReasoning(change, changeType, fileName) {
        const reasons = [];
        if (fileName.includes('test') && changeType === 'test') {
            reasons.push('file path indicates test file');
        }
        if (fileName.includes('.md') && changeType === 'docs') {
            reasons.push('markdown file indicates documentation');
        }
        if (changeType === 'feat' && change.type === 'added') {
            reasons.push('new file suggests new feature');
        }
        if (this.detectSemanticPatterns(change, changeType)) {
            reasons.push('code content matches change type patterns');
        }
        return reasons.length > 0 ? reasons.join(', ') : 'inferred from file changes';
    }
    consolidateChanges(changes) {
        const consolidated = new Map();
        for (const change of changes) {
            const key = `${change.type}:${change.scope || 'global'}`;
            if (consolidated.has(key)) {
                const existing = consolidated.get(key);
                existing.files.push(...change.files);
                existing.confidence = Math.max(existing.confidence, change.confidence);
                existing.description = this.mergeDescriptions(existing.description, change.description);
            }
            else {
                consolidated.set(key, { ...change });
            }
        }
        return Array.from(consolidated.values());
    }
    mergeDescriptions(desc1, desc2) {
        if (desc1 === desc2)
            return desc1;
        return `${desc1} and ${desc2}`;
    }
    async identifyAffectedComponents(changes) {
        const components = new Set();
        for (const change of changes) {
            const parts = change.file.split('/');
            // Extract component names from path
            if (parts.includes('components')) {
                const componentIndex = parts.indexOf('components');
                if (componentIndex + 1 < parts.length) {
                    components.add(parts[componentIndex + 1]);
                }
            }
            // Extract service/module names
            if (parts.includes('services') || parts.includes('modules')) {
                const serviceIndex = Math.max(parts.indexOf('services'), parts.indexOf('modules'));
                if (serviceIndex + 1 < parts.length) {
                    components.add(parts[serviceIndex + 1]);
                }
            }
            // Extract from dependencies
            const dependencies = await this.extractDependencies(change.file);
            dependencies.forEach(dep => {
                const depParts = dep.split('/');
                if (depParts.length > 0) {
                    components.add(depParts[depParts.length - 1]);
                }
            });
        }
        return Array.from(components);
    }
    async identifyPotentialIssues(changes) {
        const issues = [];
        for (const change of changes) {
            // Large changes might indicate complexity issues
            if (change.insertions + change.deletions > 200) {
                issues.push(`Large change in ${change.file} might indicate complexity issues`);
            }
            // Deleted files might break dependencies
            if (change.type === 'deleted') {
                issues.push(`Deletion of ${change.file} might break dependent components`);
            }
            // Configuration changes might affect runtime behavior
            const fileName = change.file.toLowerCase();
            if (fileName.includes('config') || fileName.includes('.env') || fileName.includes('package.json')) {
                issues.push(`Configuration change in ${change.file} might affect runtime behavior`);
            }
            // Database-related changes
            if (fileName.includes('migration') || fileName.includes('schema') || fileName.includes('model')) {
                issues.push(`Database change in ${change.file} might require migration steps`);
            }
        }
        return issues;
    }
    async generateTestingRecommendations(changes) {
        const recommendations = [];
        const changedComponents = new Set();
        for (const change of changes) {
            const fileName = change.file.toLowerCase();
            // UI components need integration testing
            if (fileName.includes('component') || fileName.includes('page') || fileName.includes('view')) {
                recommendations.push(`Test UI interactions for ${change.file}`);
                changedComponents.add(change.file);
            }
            // API changes need integration testing
            if (fileName.includes('api') || fileName.includes('service') || fileName.includes('controller')) {
                recommendations.push(`Test API endpoints affected by ${change.file}`);
            }
            // Database changes need data testing
            if (fileName.includes('model') || fileName.includes('schema') || fileName.includes('migration')) {
                recommendations.push(`Verify data integrity after changes to ${change.file}`);
            }
            // Configuration changes need environment testing
            if (fileName.includes('config') || fileName.includes('.env')) {
                recommendations.push(`Test in different environments after ${change.file} changes`);
            }
        }
        // General recommendations
        if (changedComponents.size > 1) {
            recommendations.push('Run integration tests to verify component interactions');
        }
        if (changes.some(c => c.insertions + c.deletions > 100)) {
            recommendations.push('Run comprehensive test suite for large changes');
        }
        return recommendations;
    }
    assessRisk(changes, components, issues) {
        let riskScore = 0;
        // Size-based risk
        const totalChanges = changes.reduce((sum, c) => sum + c.insertions + c.deletions, 0);
        if (totalChanges > 500)
            riskScore += 2;
        else if (totalChanges > 100)
            riskScore += 1;
        // Component count risk
        if (components.length > 5)
            riskScore += 2;
        else if (components.length > 2)
            riskScore += 1;
        // Issue count risk
        riskScore += Math.min(issues.length, 3);
        // Critical file changes
        const criticalFiles = changes.filter(c => c.file.includes('config') ||
            c.file.includes('package.json') ||
            c.file.includes('migration') ||
            c.type === 'deleted');
        riskScore += criticalFiles.length;
        if (riskScore >= 5)
            return 'high';
        if (riskScore >= 2)
            return 'medium';
        return 'low';
    }
    assessScope(changes, components) {
        // System-wide changes
        if (changes.some(c => c.file.includes('package.json') ||
            c.file.includes('global') ||
            c.file.includes('app.') ||
            c.file.includes('main.'))) {
            return 'system';
        }
        // Module-level changes
        if (components.length > 1 || changes.length > 3) {
            return 'module';
        }
        return 'local';
    }
}
//# sourceMappingURL=context-engine.js.map