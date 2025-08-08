import type { GitChange } from '../types/index.js';
export interface SemanticAnalysis {
    changeType: 'feature' | 'bugfix' | 'refactor' | 'test' | 'docs' | 'chore';
    confidence: number;
    patterns: SemanticPattern[];
    codeStructure: CodeStructure;
    complexity: ComplexityMetrics;
    riskFactors: RiskFactor[];
}
export interface SemanticPattern {
    type: string;
    description: string;
    confidence: number;
    evidence: string[];
}
export interface CodeStructure {
    language: string;
    framework?: string;
    addedFunctions: FunctionInfo[];
    modifiedFunctions: FunctionInfo[];
    removedFunctions: FunctionInfo[];
    addedClasses: ClassInfo[];
    modifiedClasses: ClassInfo[];
    removedClasses: ClassInfo[];
    imports: ImportChange[];
    exports: ExportChange[];
}
export interface FunctionInfo {
    name: string;
    signature?: string;
    lineNumber?: number;
    isAsync: boolean;
    complexity: 'low' | 'medium' | 'high';
}
export interface ClassInfo {
    name: string;
    methods: string[];
    properties: string[];
    extends?: string;
    implements?: string[];
}
export interface ImportChange {
    module: string;
    type: 'added' | 'removed' | 'modified';
    isLocalImport: boolean;
}
export interface ExportChange {
    name: string;
    type: 'added' | 'removed' | 'modified';
    isDefault: boolean;
}
export interface ComplexityMetrics {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    linesOfCode: number;
    nestingDepth: number;
}
export interface RiskFactor {
    type: 'performance' | 'security' | 'breaking' | 'data' | 'concurrency';
    severity: 'low' | 'medium' | 'high';
    description: string;
    file: string;
    line?: number;
}
export declare class SemanticAnalyzer {
    analyzeChanges(changes: GitChange[]): Promise<SemanticAnalysis>;
    private analyzeFileChange;
    private analyzeHunk;
    private detectPrimaryLanguage;
    private getLanguageFromExtension;
    private detectFramework;
    private detectFunction;
    private detectClass;
    private detectImport;
    private detectExport;
    private isOpeningBrace;
    private isClosingBrace;
    private isComplexityIncreasing;
    private detectRiskFactors;
    private estimateFunctionComplexity;
    private classifyChangeType;
    private calculateConfidence;
    private isPatternRelevantToChangeType;
    private calculateCognitiveComplexity;
    private calculateCognitiveComplexityFromPatterns;
}
//# sourceMappingURL=semantic-analyzer.d.ts.map