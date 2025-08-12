import { ChangeTypeAnalysis } from '../analyzers/change-detector.js';
import { AIClient } from './ai-client.js';
import type { CommitContext, MastroConfig, DocumentationType } from '../types/index.js';
export interface AutoUpdateConfig {
    enabled: boolean;
    docTypes: DocumentationType[];
    autoCommit: boolean;
    dryRun: boolean;
    threshold: number;
}
export interface UpdateSummary {
    changesDetected: ChangeTypeAnalysis[];
    documentsUpdated: string[];
    documentsCreated: string[];
    errors: string[];
    skipped: string[];
    suggestions: string[];
}
export declare class AutoDocumentationUpdater {
    private changeDetector;
    private docEngine;
    private fileManager;
    private aiClient;
    private config;
    constructor(config: MastroConfig, aiClient: AIClient, outputDir?: string);
    analyzeAndUpdateDocumentation(context: CommitContext, updateConfig: AutoUpdateConfig): Promise<UpdateSummary>;
    private determineDocumentUpdates;
    private buildDocumentationContext;
    private updateOrCreateDocument;
    private updateExistingDocument;
    private intelligentMerge;
    private parseMarkdownStructure;
    private synthesizeDocumentationContent;
    private fallbackIntelligentMerge;
    private getDocumentPath;
    private generateSuggestions;
    previewUpdates(context: CommitContext, updateConfig: AutoUpdateConfig): Promise<{
        changes: ChangeTypeAnalysis[];
        affectedDocs: DocumentationType[];
        suggestions: string[];
    }>;
}
//# sourceMappingURL=auto-doc-updater.d.ts.map