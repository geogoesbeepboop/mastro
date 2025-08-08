import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
export class DocumentationAnalyzer {
    workingDir = '';
    async analyzeProjectStructure(workingDir) {
        this.workingDir = workingDir;
        const directories = await this.scanDirectories(workingDir);
        const files = await this.scanFiles(workingDir, directories);
        return {
            directories,
            files,
            entryPoints: this.identifyEntryPoints(files),
            configFiles: this.identifyConfigFiles(files),
            testFiles: this.identifyTestFiles(files),
            docFiles: this.identifyDocFiles(files)
        };
    }
    async analyzeCodebase(projectStructure) {
        const complexity = this.calculateProjectComplexity(projectStructure);
        const patterns = this.detectArchitecturalPatterns(projectStructure);
        const dependencies = await this.analyzeDependencies();
        const userFlows = this.extractUserFlows(projectStructure);
        const dataModels = this.extractDataModels(projectStructure);
        return {
            complexity,
            patterns,
            dependencies,
            userFlows,
            dataModels
        };
    }
    async scanDirectories(rootPath) {
        const directories = [];
        const excludeDirs = new Set(['node_modules', '.git', '.vscode', 'dist', 'build', '.next', 'coverage']);
        const scanRecursive = (currentPath, basePath = '') => {
            try {
                const items = readdirSync(currentPath);
                for (const item of items) {
                    const fullPath = join(currentPath, item);
                    const relativePath = join(basePath, item);
                    if (!excludeDirs.has(item) && statSync(fullPath).isDirectory()) {
                        const files = this.getDirectoryFiles(fullPath);
                        const type = this.classifyDirectoryType(relativePath, files);
                        directories.push({
                            path: relativePath,
                            type,
                            files: files.map(f => relative(this.workingDir, f)),
                            description: this.getDirectoryDescription(type, relativePath)
                        });
                        // Recurse into subdirectories
                        scanRecursive(fullPath, relativePath);
                    }
                }
            }
            catch (error) {
                // Skip directories we can't read
            }
        };
        scanRecursive(rootPath);
        return directories;
    }
    async scanFiles(workingDir, directories) {
        const files = [];
        const excludeExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.tar', '.gz']);
        for (const dir of directories) {
            for (const filePath of dir.files) {
                const fullPath = join(workingDir, filePath);
                const ext = extname(filePath);
                if (!excludeExts.has(ext)) {
                    try {
                        const fileInfo = await this.analyzeFile(fullPath, filePath);
                        files.push(fileInfo);
                    }
                    catch (error) {
                        // Skip files we can't analyze
                    }
                }
            }
        }
        return files;
    }
    async analyzeFile(fullPath, relativePath) {
        const ext = extname(relativePath);
        const language = this.getLanguageFromExtension(ext);
        const type = this.classifyFileType(relativePath);
        let content = '';
        try {
            content = readFileSync(fullPath, 'utf-8');
        }
        catch (error) {
            // Handle binary files or permission issues
            content = '';
        }
        const exports = this.extractExports(content, language);
        const imports = this.extractImports(content, language);
        const functions = this.extractFunctions(content, language);
        const classes = this.extractClasses(content, language);
        const apis = this.extractApiEndpoints(content, relativePath, language);
        const framework = this.detectFrameworkFromContent(content, imports);
        return {
            path: relativePath,
            type,
            language,
            framework,
            exports,
            imports,
            functions,
            classes,
            apis
        };
    }
    getDirectoryFiles(dirPath) {
        const files = [];
        try {
            const items = readdirSync(dirPath);
            for (const item of items) {
                const fullPath = join(dirPath, item);
                if (statSync(fullPath).isFile()) {
                    files.push(fullPath);
                }
            }
        }
        catch (error) {
            // Skip directories we can't read
        }
        return files;
    }
    classifyDirectoryType(path, files) {
        const name = path.split('/').pop()?.toLowerCase() || '';
        if (name.includes('test') || name.includes('spec') || name.includes('__test__')) {
            return 'test';
        }
        if (name.includes('doc') || name.includes('readme')) {
            return 'docs';
        }
        if (name.includes('config') || name.includes('conf')) {
            return 'config';
        }
        if (name.includes('build') || name.includes('dist') || name.includes('out')) {
            return 'build';
        }
        if (name.includes('asset') || name.includes('static') || name.includes('public')) {
            return 'assets';
        }
        return 'source';
    }
    getDirectoryDescription(type, path) {
        const descriptions = {
            'source': 'Source code files',
            'test': 'Test files and test utilities',
            'config': 'Configuration files',
            'docs': 'Documentation files',
            'build': 'Build output and artifacts',
            'assets': 'Static assets and resources'
        };
        return descriptions[type] || 'Project files';
    }
    classifyFileType(path) {
        if (path.includes('test') || path.includes('spec') || path.includes('.test.') || path.includes('.spec.')) {
            return 'test';
        }
        if (path.includes('config') || path.includes('.config.') || path.endsWith('.json') || path.endsWith('.yaml') || path.endsWith('.yml')) {
            return 'config';
        }
        if (path.includes('doc') || path.endsWith('.md') || path.endsWith('.txt')) {
            return 'docs';
        }
        if (path.includes('build') || path.includes('dist')) {
            return 'build';
        }
        return 'source';
    }
    getLanguageFromExtension(ext) {
        const languageMap = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.rb': 'ruby',
            '.php': 'php',
            '.cs': 'csharp',
            '.cpp': 'cpp',
            '.c': 'c',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.md': 'markdown'
        };
        return languageMap[ext] || 'unknown';
    }
    extractExports(content, language) {
        const exports = [];
        if (language === 'javascript' || language === 'typescript') {
            // Export patterns
            const patterns = [
                /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g,
                /export\s+\{\s*([^}]+)\s*\}/g,
                /export\s+default\s+(\w+)/g,
                /module\.exports\s*=\s*(\w+)/g
            ];
            for (const pattern of patterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const name = match[1];
                    if (name) {
                        exports.push({
                            name: name.trim(),
                            type: this.determineExportType(content, name),
                            isDefault: match[0].includes('default'),
                            signature: this.extractSignature(content, name)
                        });
                    }
                }
            }
        }
        return exports;
    }
    extractImports(content, language) {
        const imports = [];
        if (language === 'javascript' || language === 'typescript') {
            const patterns = [
                /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
                /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
                /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
            ];
            for (const pattern of patterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const module = match[1];
                    if (module) {
                        imports.push({
                            module,
                            imports: this.extractImportNames(match[0]),
                            isLocalImport: module.startsWith('./') || module.startsWith('../'),
                            usage: []
                        });
                    }
                }
            }
        }
        return imports;
    }
    extractFunctions(content, language) {
        const functions = [];
        if (language === 'javascript' || language === 'typescript') {
            const patterns = [
                /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/g,
                /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
                /(\w+)\s*:\s*(?:async\s+)?\([^)]*\)\s*=>/g
            ];
            for (const pattern of patterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const name = match[1];
                    if (name) {
                        functions.push({
                            name,
                            signature: match[0],
                            isAsync: match[0].includes('async'),
                            complexity: this.estimateFunctionComplexity(this.extractFunctionBody(content, name))
                        });
                    }
                }
            }
        }
        return functions;
    }
    extractClasses(content, language) {
        const classes = [];
        if (language === 'javascript' || language === 'typescript') {
            const classPattern = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*\{([^}]+)\}/g;
            let match;
            while ((match = classPattern.exec(content)) !== null) {
                const name = match[1];
                const extendsClass = match[2];
                const implementsInterfaces = match[3] ? match[3].split(',').map(i => i.trim()) : undefined;
                const body = match[4];
                classes.push({
                    name,
                    methods: this.extractClassMethods(body),
                    properties: this.extractClassProperties(body),
                    extends: extendsClass,
                    implements: implementsInterfaces
                });
            }
        }
        return classes;
    }
    extractApiEndpoints(content, filePath, language) {
        const endpoints = [];
        if (language === 'javascript' || language === 'typescript') {
            // Express.js patterns
            const expressPatterns = [
                /app\.get\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g,
                /app\.post\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g,
                /app\.put\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g,
                /app\.delete\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g,
                /router\.get\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g,
                /router\.post\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g
            ];
            for (const pattern of expressPatterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const path = match[1];
                    const handler = match[2];
                    const method = this.extractMethodFromPattern(pattern.toString());
                    endpoints.push({
                        path,
                        method: method,
                        handler,
                        description: this.extractEndpointDescription(content, handler)
                    });
                }
            }
        }
        return endpoints;
    }
    detectFrameworkFromContent(content, imports) {
        const frameworks = {
            'react': ['react', '@react'],
            'vue': ['vue', '@vue'],
            'angular': ['@angular'],
            'express': ['express'],
            'next': ['next'],
            'nuxt': ['nuxt'],
            'fastapi': ['fastapi'],
            'django': ['django'],
            'flask': ['flask'],
            'spring': ['org.springframework']
        };
        for (const [framework, patterns] of Object.entries(frameworks)) {
            for (const pattern of patterns) {
                if (imports.some(imp => imp.module.includes(pattern))) {
                    return framework;
                }
            }
        }
        return undefined;
    }
    calculateProjectComplexity(projectStructure) {
        const sourceFiles = projectStructure.files.filter(f => f.type === 'source');
        const totalFiles = sourceFiles.length;
        // Calculate total lines (approximation)
        const totalLines = totalFiles * 50; // Rough estimate
        // Calculate cyclomatic complexity
        const cyclomaticComplexity = sourceFiles.reduce((sum, file) => {
            return sum + file.functions.reduce((funcSum, func) => {
                const complexity = func.complexity === 'high' ? 10 : func.complexity === 'medium' ? 5 : 2;
                return funcSum + complexity;
            }, 0);
        }, 0);
        // Count API endpoints
        const apiEndpoints = sourceFiles.reduce((sum, file) => sum + file.apis.length, 0);
        // Determine overall complexity
        let overall = 'simple';
        if (totalFiles > 100 || cyclomaticComplexity > 100 || apiEndpoints > 20) {
            overall = 'enterprise';
        }
        else if (totalFiles > 50 || cyclomaticComplexity > 50 || apiEndpoints > 10) {
            overall = 'complex';
        }
        else if (totalFiles > 20 || cyclomaticComplexity > 20 || apiEndpoints > 5) {
            overall = 'moderate';
        }
        return {
            overall,
            metrics: {
                totalFiles,
                totalLines,
                cyclomaticComplexity,
                dependencyDepth: 3, // Simplified
                apiEndpoints
            },
            recommendations: this.generateComplexityRecommendations(overall)
        };
    }
    detectArchitecturalPatterns(projectStructure) {
        const patterns = [];
        // Detect MVC pattern
        const hasModels = projectStructure.directories.some(d => d.path.includes('model'));
        const hasViews = projectStructure.directories.some(d => d.path.includes('view') || d.path.includes('component'));
        const hasControllers = projectStructure.directories.some(d => d.path.includes('controller') || d.path.includes('handler'));
        if (hasModels && hasViews && hasControllers) {
            patterns.push({
                name: 'Model-View-Controller (MVC)',
                type: 'mvc',
                confidence: 0.8,
                evidence: ['models directory', 'views/components directory', 'controllers directory'],
                components: ['models', 'views', 'controllers']
            });
        }
        // Detect component-based architecture
        const hasComponents = projectStructure.directories.some(d => d.path.includes('component'));
        const reactFiles = projectStructure.files.filter(f => f.imports.some(imp => imp.module === 'react'));
        if (hasComponents || reactFiles.length > 5) {
            patterns.push({
                name: 'Component-Based Architecture',
                type: 'component-based',
                confidence: 0.9,
                evidence: ['React components', 'component directory structure'],
                components: ['components', 'hooks', 'utilities']
            });
        }
        // Detect layered architecture
        const hasLayers = ['service', 'repository', 'controller', 'entity'].filter(layer => projectStructure.directories.some(d => d.path.includes(layer))).length;
        if (hasLayers >= 3) {
            patterns.push({
                name: 'Layered Architecture',
                type: 'layered',
                confidence: 0.7,
                evidence: [`${hasLayers} distinct layers identified`],
                components: ['presentation', 'business', 'data access']
            });
        }
        return patterns;
    }
    async analyzeDependencies() {
        const dependencies = [];
        try {
            const packageJsonPath = join(this.workingDir, 'package.json');
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
            const allDeps = {
                ...packageJson.dependencies || {},
                ...packageJson.devDependencies || {},
                ...packageJson.peerDependencies || {}
            };
            for (const [name, version] of Object.entries(allDeps)) {
                const type = this.getDependencyType(name, packageJson);
                const purpose = this.guessDependencyPurpose(name);
                const critical = this.isDependencyCritical(name);
                dependencies.push({
                    name,
                    version: version,
                    type,
                    purpose,
                    critical
                });
            }
        }
        catch (error) {
            // No package.json or can't read it
        }
        return dependencies;
    }
    extractUserFlows(projectStructure) {
        const flows = [];
        // Simple user flow detection based on file patterns
        const componentFiles = projectStructure.files.filter(f => f.path.includes('component') || f.path.includes('page') || f.path.includes('view'));
        if (componentFiles.length > 0) {
            flows.push({
                name: 'Main User Journey',
                steps: [
                    { action: 'Load Application', component: 'App', description: 'User opens the application' },
                    { action: 'Navigate', component: 'Router', description: 'User navigates through the interface' },
                    { action: 'Interact', component: 'Components', description: 'User interacts with UI components' }
                ],
                entryPoints: ['index.js', 'App.js', 'main.ts'].filter(ep => projectStructure.entryPoints.some(e => e.includes(ep))),
                exitPoints: ['logout', 'close'],
                complexity: componentFiles.length > 10 ? 'complex' : 'moderate'
            });
        }
        return flows;
    }
    extractDataModels(projectStructure) {
        const models = [];
        // Look for model/entity files
        const modelFiles = projectStructure.files.filter(f => f.path.includes('model') || f.path.includes('entity') || f.path.includes('schema'));
        for (const file of modelFiles) {
            for (const cls of file.classes) {
                models.push({
                    name: cls.name,
                    type: 'entity',
                    fields: cls.properties.map((prop) => ({
                        name: prop,
                        type: 'unknown',
                        required: true
                    })),
                    relationships: cls.implements || [],
                    file: file.path
                });
            }
        }
        return models;
    }
    // Helper methods
    identifyEntryPoints(files) {
        const entryPatterns = ['index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts', 'server.js', 'server.ts'];
        return files
            .filter(f => entryPatterns.some(pattern => f.path.includes(pattern)))
            .map(f => f.path);
    }
    identifyConfigFiles(files) {
        return files
            .filter(f => f.type === 'config' || f.path.includes('config'))
            .map(f => f.path);
    }
    identifyTestFiles(files) {
        return files
            .filter(f => f.type === 'test')
            .map(f => f.path);
    }
    identifyDocFiles(files) {
        return files
            .filter(f => f.type === 'docs')
            .map(f => f.path);
    }
    determineExportType(content, name) {
        if (content.includes(`class ${name}`))
            return 'class';
        if (content.includes(`function ${name}`))
            return 'function';
        if (content.includes(`interface ${name}`))
            return 'interface';
        if (content.includes(`type ${name}`))
            return 'type';
        return 'variable';
    }
    extractSignature(content, name) {
        const patterns = [
            new RegExp(`(?:export\\s+)?(?:class|function|const|interface|type)\\s+${name}[^{;]*`),
        ];
        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match)
                return match[0];
        }
        return undefined;
    }
    extractImportNames(importStatement) {
        const match = importStatement.match(/import\s+\{([^}]+)\}/);
        if (match) {
            return match[1].split(',').map(name => name.trim());
        }
        const defaultMatch = importStatement.match(/import\s+(\w+)/);
        if (defaultMatch) {
            return [defaultMatch[1]];
        }
        return [];
    }
    estimateFunctionComplexity(body) {
        const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch'];
        const count = complexityKeywords.reduce((sum, keyword) => {
            return sum + (body.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
        }, 0);
        if (count > 10)
            return 'high';
        if (count > 5)
            return 'medium';
        return 'low';
    }
    extractFunctionBody(content, functionName) {
        const pattern = new RegExp(`(?:function\\s+${functionName}|${functionName}\\s*[=:])[^{]*\\{([^}]+)\\}`, 's');
        const match = content.match(pattern);
        return match ? match[1] : '';
    }
    extractClassMethods(classBody) {
        const methodPattern = /(\w+)\s*\([^)]*\)\s*\{/g;
        const methods = [];
        let match;
        while ((match = methodPattern.exec(classBody)) !== null) {
            methods.push(match[1]);
        }
        return methods;
    }
    extractClassProperties(classBody) {
        const propertyPattern = /(?:private|public|protected)?\s*(\w+)\s*[:=]/g;
        const properties = [];
        let match;
        while ((match = propertyPattern.exec(classBody)) !== null) {
            properties.push(match[1]);
        }
        return properties;
    }
    extractMethodFromPattern(patternStr) {
        if (patternStr.includes('get'))
            return 'GET';
        if (patternStr.includes('post'))
            return 'POST';
        if (patternStr.includes('put'))
            return 'PUT';
        if (patternStr.includes('delete'))
            return 'DELETE';
        return 'GET';
    }
    extractEndpointDescription(content, handlerName) {
        // Look for comments above the handler
        const handlerPattern = new RegExp(`//.*\\n.*${handlerName}`, 's');
        const match = content.match(handlerPattern);
        if (match) {
            const comment = match[0].match(/\/\/\s*(.+)/);
            return comment ? comment[1] : undefined;
        }
        return undefined;
    }
    generateComplexityRecommendations(overall) {
        const recommendations = {
            simple: ['Consider adding more comprehensive tests', 'Document key functions and classes'],
            moderate: ['Implement comprehensive testing strategy', 'Consider code review processes', 'Document architecture decisions'],
            complex: ['Break down large functions', 'Implement monitoring and logging', 'Consider microservices for scaling'],
            enterprise: ['Implement comprehensive CI/CD', 'Use architectural decision records', 'Regular security audits', 'Performance monitoring']
        };
        return recommendations[overall] || [];
    }
    getDependencyType(name, packageJson) {
        if (packageJson.dependencies?.[name])
            return 'production';
        if (packageJson.devDependencies?.[name])
            return 'development';
        if (packageJson.peerDependencies?.[name])
            return 'peer';
        return 'production';
    }
    guessDependencyPurpose(name) {
        const purposes = {
            'react': 'UI framework',
            'express': 'Web server framework',
            'lodash': 'Utility library',
            'axios': 'HTTP client',
            'jest': 'Testing framework',
            'typescript': 'Type checking',
            'webpack': 'Build tool',
            'eslint': 'Code linting'
        };
        return purposes[name] || 'Library dependency';
    }
    isDependencyCritical(name) {
        const critical = ['react', 'express', 'vue', 'angular', 'typescript', 'node'];
        return critical.includes(name);
    }
}
//# sourceMappingURL=doc-analyzer.js.map