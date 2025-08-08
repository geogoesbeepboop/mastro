import { extname } from 'path';
export class SemanticAnalyzer {
    async analyzeChanges(changes) {
        const allPatterns = [];
        const allRiskFactors = [];
        const codeStructure = {
            language: this.detectPrimaryLanguage(changes),
            addedFunctions: [],
            modifiedFunctions: [],
            removedFunctions: [],
            addedClasses: [],
            modifiedClasses: [],
            removedClasses: [],
            imports: [],
            exports: []
        };
        let totalComplexity = 0;
        let totalLinesAdded = 0;
        let maxNesting = 0;
        for (const change of changes) {
            const fileAnalysis = await this.analyzeFileChange(change);
            allPatterns.push(...fileAnalysis.patterns);
            allRiskFactors.push(...fileAnalysis.riskFactors);
            // Aggregate code structure
            codeStructure.addedFunctions.push(...fileAnalysis.codeStructure.addedFunctions);
            codeStructure.modifiedFunctions.push(...fileAnalysis.codeStructure.modifiedFunctions);
            codeStructure.removedFunctions.push(...fileAnalysis.codeStructure.removedFunctions);
            codeStructure.addedClasses.push(...fileAnalysis.codeStructure.addedClasses);
            codeStructure.modifiedClasses.push(...fileAnalysis.codeStructure.modifiedClasses);
            codeStructure.removedClasses.push(...fileAnalysis.codeStructure.removedClasses);
            codeStructure.imports.push(...fileAnalysis.codeStructure.imports);
            codeStructure.exports.push(...fileAnalysis.codeStructure.exports);
            totalComplexity += fileAnalysis.complexity.cyclomaticComplexity;
            totalLinesAdded += change.insertions;
            maxNesting = Math.max(maxNesting, fileAnalysis.complexity.nestingDepth);
        }
        // Detect framework if not already detected
        if (!codeStructure.framework) {
            codeStructure.framework = this.detectFramework(codeStructure);
        }
        const changeType = this.classifyChangeType(allPatterns, changes);
        const confidence = this.calculateConfidence(allPatterns, changeType);
        const complexity = {
            cyclomaticComplexity: totalComplexity,
            cognitiveComplexity: this.calculateCognitiveComplexity(allPatterns),
            linesOfCode: totalLinesAdded,
            nestingDepth: maxNesting
        };
        return {
            changeType,
            confidence,
            patterns: allPatterns,
            codeStructure,
            complexity,
            riskFactors: allRiskFactors
        };
    }
    async analyzeFileChange(change) {
        const ext = extname(change.file);
        const language = this.getLanguageFromExtension(ext);
        const patterns = [];
        const riskFactors = [];
        const codeStructure = {
            language,
            addedFunctions: [],
            modifiedFunctions: [],
            removedFunctions: [],
            addedClasses: [],
            modifiedClasses: [],
            removedClasses: [],
            imports: [],
            exports: []
        };
        let cyclomaticComplexity = 0;
        let nestingDepth = 0;
        // Analyze each hunk in the file
        for (const hunk of change.hunks) {
            const hunkAnalysis = this.analyzeHunk(hunk, change.file, language);
            patterns.push(...hunkAnalysis.patterns);
            riskFactors.push(...hunkAnalysis.riskFactors);
            // Merge code structure
            codeStructure.addedFunctions.push(...hunkAnalysis.codeStructure.addedFunctions);
            codeStructure.modifiedFunctions.push(...hunkAnalysis.codeStructure.modifiedFunctions);
            codeStructure.imports.push(...hunkAnalysis.codeStructure.imports);
            codeStructure.exports.push(...hunkAnalysis.codeStructure.exports);
            cyclomaticComplexity += hunkAnalysis.complexity.cyclomaticComplexity;
            nestingDepth = Math.max(nestingDepth, hunkAnalysis.complexity.nestingDepth);
        }
        const complexity = {
            cyclomaticComplexity,
            cognitiveComplexity: this.calculateCognitiveComplexityFromPatterns(patterns),
            linesOfCode: change.insertions,
            nestingDepth
        };
        return { patterns, riskFactors, codeStructure, complexity };
    }
    analyzeHunk(hunk, filePath, language) {
        const patterns = [];
        const riskFactors = [];
        const codeStructure = {
            language,
            addedFunctions: [],
            modifiedFunctions: [],
            removedFunctions: [],
            addedClasses: [],
            modifiedClasses: [],
            removedClasses: [],
            imports: [],
            exports: []
        };
        const addedLines = hunk.lines.filter(line => line.type === 'added');
        const removedLines = hunk.lines.filter(line => line.type === 'removed');
        let cyclomaticComplexity = 0;
        let nestingDepth = 0;
        let currentNesting = 0;
        // Analyze added lines for patterns
        for (const line of addedLines) {
            const content = line.content.trim();
            if (!content)
                continue;
            // Update nesting depth tracking
            if (this.isOpeningBrace(content, language)) {
                currentNesting++;
                nestingDepth = Math.max(nestingDepth, currentNesting);
            }
            else if (this.isClosingBrace(content, language)) {
                currentNesting = Math.max(0, currentNesting - 1);
            }
            // Detect function definitions
            const functionMatch = this.detectFunction(content, language);
            if (functionMatch) {
                codeStructure.addedFunctions.push(functionMatch);
                patterns.push({
                    type: 'function_addition',
                    description: `Added function: ${functionMatch.name}`,
                    confidence: 0.9,
                    evidence: [content]
                });
            }
            // Detect class definitions
            const classMatch = this.detectClass(content, language);
            if (classMatch) {
                codeStructure.addedClasses.push(classMatch);
                patterns.push({
                    type: 'class_addition',
                    description: `Added class: ${classMatch.name}`,
                    confidence: 0.9,
                    evidence: [content]
                });
            }
            // Detect imports/exports
            const importMatch = this.detectImport(content, language);
            if (importMatch) {
                codeStructure.imports.push(importMatch);
                patterns.push({
                    type: 'dependency_change',
                    description: `Added import: ${importMatch.module}`,
                    confidence: 0.8,
                    evidence: [content]
                });
            }
            const exportMatch = this.detectExport(content, language);
            if (exportMatch) {
                codeStructure.exports.push(exportMatch);
                patterns.push({
                    type: 'api_change',
                    description: `Added export: ${exportMatch.name}`,
                    confidence: 0.8,
                    evidence: [content]
                });
            }
            // Detect complexity patterns
            if (this.isComplexityIncreasing(content, language)) {
                cyclomaticComplexity++;
            }
            // Detect risk factors
            const risks = this.detectRiskFactors(content, language, filePath, line.lineNumber);
            riskFactors.push(...risks);
        }
        // Analyze removed lines for breaking changes
        for (const line of removedLines) {
            const content = line.content.trim();
            if (!content)
                continue;
            const functionMatch = this.detectFunction(content, language);
            if (functionMatch) {
                codeStructure.removedFunctions.push(functionMatch);
                patterns.push({
                    type: 'function_removal',
                    description: `Removed function: ${functionMatch.name}`,
                    confidence: 0.9,
                    evidence: [content]
                });
                riskFactors.push({
                    type: 'breaking',
                    severity: 'high',
                    description: `Function removal may break dependent code: ${functionMatch.name}`,
                    file: filePath,
                    line: line.lineNumber
                });
            }
            const exportMatch = this.detectExport(content, language);
            if (exportMatch) {
                riskFactors.push({
                    type: 'breaking',
                    severity: 'high',
                    description: `Export removal may break dependent modules: ${exportMatch.name}`,
                    file: filePath,
                    line: line.lineNumber
                });
            }
        }
        const complexity = {
            cyclomaticComplexity,
            cognitiveComplexity: cyclomaticComplexity, // Simplified for now
            linesOfCode: addedLines.length,
            nestingDepth
        };
        return { patterns, riskFactors, codeStructure, complexity };
    }
    detectPrimaryLanguage(changes) {
        const languageCounts = new Map();
        for (const change of changes) {
            const ext = extname(change.file);
            const language = this.getLanguageFromExtension(ext);
            languageCounts.set(language, (languageCounts.get(language) || 0) + change.insertions + change.deletions);
        }
        let primaryLanguage = 'unknown';
        let maxCount = 0;
        for (const [language, count] of languageCounts) {
            if (count > maxCount) {
                maxCount = count;
                primaryLanguage = language;
            }
        }
        return primaryLanguage;
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
            '.clj': 'clojure'
        };
        return languageMap[ext] || 'unknown';
    }
    detectFramework(codeStructure) {
        const imports = codeStructure.imports.map(imp => imp.module.toLowerCase());
        if (imports.some(imp => imp.includes('react')))
            return 'react';
        if (imports.some(imp => imp.includes('vue')))
            return 'vue';
        if (imports.some(imp => imp.includes('angular')))
            return 'angular';
        if (imports.some(imp => imp.includes('express')))
            return 'express';
        if (imports.some(imp => imp.includes('next')))
            return 'nextjs';
        if (imports.some(imp => imp.includes('django')))
            return 'django';
        if (imports.some(imp => imp.includes('flask')))
            return 'flask';
        if (imports.some(imp => imp.includes('fastapi')))
            return 'fastapi';
        if (imports.some(imp => imp.includes('spring')))
            return 'spring';
        return undefined;
    }
    detectFunction(content, language) {
        const patterns = {
            typescript: [
                /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
                /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/,
                /(\w+)\s*:\s*(?:async\s+)?\(/,
                /(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*=>/
            ],
            javascript: [
                /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
                /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/,
                /(\w+)\s*\([^)]*\)\s*=>/
            ],
            python: [
                /def\s+(\w+)\s*\(/,
                /async\s+def\s+(\w+)\s*\(/
            ],
            java: [
                /(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?\w+\s+(\w+)\s*\(/
            ]
        };
        const langPatterns = patterns[language] || [];
        for (const pattern of langPatterns) {
            const match = content.match(pattern);
            if (match) {
                return {
                    name: match[1],
                    signature: content.trim(),
                    isAsync: content.includes('async'),
                    complexity: this.estimateFunctionComplexity(content)
                };
            }
        }
        return null;
    }
    detectClass(content, language) {
        const patterns = {
            typescript: /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/,
            javascript: /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/,
            python: /class\s+(\w+)(?:\(([^)]+)\))?:/,
            java: /(?:public\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/
        };
        const pattern = patterns[language];
        if (!pattern)
            return null;
        const match = content.match(pattern);
        if (match) {
            return {
                name: match[1],
                methods: [],
                properties: [],
                extends: match[2],
                implements: match[3] ? match[3].split(',').map(s => s.trim()) : undefined
            };
        }
        return null;
    }
    detectImport(content, language) {
        const patterns = {
            typescript: [
                /import\s+.*\s+from\s+['"]([^'"]+)['"]/,
                /import\s*\(\s*['"]([^'"]+)['"]\s*\)/,
                /require\s*\(\s*['"]([^'"]+)['"]\s*\)/
            ],
            javascript: [
                /import\s+.*\s+from\s+['"]([^'"]+)['"]/,
                /require\s*\(\s*['"]([^'"]+)['"]\s*\)/
            ],
            python: [
                /from\s+([^\s]+)\s+import/,
                /import\s+([^\s,]+)/
            ]
        };
        const langPatterns = patterns[language] || [];
        for (const pattern of langPatterns) {
            const match = content.match(pattern);
            if (match) {
                return {
                    module: match[1],
                    type: 'added',
                    isLocalImport: match[1].startsWith('./') || match[1].startsWith('../')
                };
            }
        }
        return null;
    }
    detectExport(content, language) {
        const patterns = {
            typescript: [
                /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/,
                /export\s+\{\s*([^}]+)\s*\}/,
                /export\s+default\s+(\w+)/
            ],
            javascript: [
                /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/,
                /module\.exports\s*=\s*(\w+)/
            ]
        };
        const langPatterns = patterns[language] || [];
        for (const pattern of langPatterns) {
            const match = content.match(pattern);
            if (match) {
                return {
                    name: match[1],
                    type: 'added',
                    isDefault: content.includes('default')
                };
            }
        }
        return null;
    }
    isOpeningBrace(content, language) {
        return content.includes('{') ||
            (language === 'python' && content.endsWith(':'));
    }
    isClosingBrace(content, language) {
        return content.includes('}');
    }
    isComplexityIncreasing(content, language) {
        const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try', '&&', '||', '?'];
        return complexityKeywords.some(keyword => content.includes(keyword));
    }
    detectRiskFactors(content, language, filePath, lineNumber) {
        const risks = [];
        // Security risks
        if (content.includes('eval(') || content.includes('innerHTML') || content.includes('document.write')) {
            risks.push({
                type: 'security',
                severity: 'high',
                description: 'Potentially unsafe code pattern detected',
                file: filePath,
                line: lineNumber
            });
        }
        // Performance risks
        if (content.includes('for') && content.includes('for')) { // Nested loops
            risks.push({
                type: 'performance',
                severity: 'medium',
                description: 'Nested loop detected - potential performance impact',
                file: filePath,
                line: lineNumber
            });
        }
        // Breaking change risks
        if (content.includes('TODO') || content.includes('FIXME') || content.includes('HACK')) {
            risks.push({
                type: 'data',
                severity: 'low',
                description: 'Code contains TODO/FIXME comments indicating incomplete implementation',
                file: filePath,
                line: lineNumber
            });
        }
        return risks;
    }
    estimateFunctionComplexity(content) {
        const complexityIndicators = (content.match(/if|else|for|while|switch|case|catch|\?|&&|\|\|/g) || []).length;
        if (complexityIndicators > 10)
            return 'high';
        if (complexityIndicators > 5)
            return 'medium';
        return 'low';
    }
    classifyChangeType(patterns, changes) {
        // Analyze patterns to classify the overall change type
        const patternTypes = patterns.map(p => p.type);
        if (patternTypes.includes('function_addition') || patternTypes.includes('class_addition')) {
            return 'feature';
        }
        if (patternTypes.includes('function_removal') || patterns.some(p => p.description.includes('fix'))) {
            return 'bugfix';
        }
        if (patterns.length > 2 && !patternTypes.includes('function_addition')) {
            return 'refactor';
        }
        // Check file types
        const hasTestFiles = changes.some(c => c.file.includes('test') || c.file.includes('spec'));
        if (hasTestFiles)
            return 'test';
        const hasDocFiles = changes.some(c => c.file.includes('.md') || c.file.includes('doc'));
        if (hasDocFiles)
            return 'docs';
        return 'chore';
    }
    calculateConfidence(patterns, changeType) {
        if (patterns.length === 0)
            return 0.5;
        const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
        // Boost confidence if patterns align with change type
        const relevantPatterns = patterns.filter(p => this.isPatternRelevantToChangeType(p.type, changeType));
        const relevanceBoost = relevantPatterns.length / patterns.length * 0.2;
        return Math.min(avgConfidence + relevanceBoost, 1.0);
    }
    isPatternRelevantToChangeType(patternType, changeType) {
        const relevanceMap = {
            'feature': ['function_addition', 'class_addition', 'api_change'],
            'bugfix': ['function_removal', 'complexity_reduction'],
            'refactor': ['function_modification', 'class_modification'],
            'test': ['test_addition', 'assertion_addition'],
            'docs': ['documentation_addition'],
            'chore': ['dependency_change', 'config_change']
        };
        return relevanceMap[changeType]?.includes(patternType) || false;
    }
    calculateCognitiveComplexity(patterns) {
        // Simplified cognitive complexity calculation
        return patterns.reduce((sum, pattern) => {
            const complexityWeights = {
                'function_addition': 2,
                'class_addition': 3,
                'function_removal': 1,
                'dependency_change': 1,
                'api_change': 2
            };
            return sum + (complexityWeights[pattern.type] || 0);
        }, 0);
    }
    calculateCognitiveComplexityFromPatterns(patterns) {
        return this.calculateCognitiveComplexity(patterns);
    }
}
//# sourceMappingURL=semantic-analyzer.js.map