import type { DocumentationOutput } from '../types/index.js';
export declare class FileSystemManager {
    private outputDirectory;
    constructor(outputDirectory?: string);
    writeDocumentation(output: DocumentationOutput): Promise<void>;
    writeMultipleDocuments(outputs: DocumentationOutput[]): Promise<void>;
    updateDocumentation(output: DocumentationOutput): Promise<void>;
    createDocumentationIndex(outputs: DocumentationOutput[]): Promise<void>;
    createDirectoryStructure(): Promise<void>;
    backupExistingDocumentation(): Promise<string | null>;
    getDocumentationStats(): {
        totalFiles: number;
        totalSize: number;
        lastModified: Date | null;
    };
    private ensureDirectoryExists;
    private prepareContentWithMetadata;
    private mergeWithExistingContent;
    private buildDocumentationIndex;
    private groupDocumentsByType;
    private capitalizeFirstLetter;
    private getDocumentTypeIcon;
    private estimateDocumentSize;
    writeAssets(diagrams: any[]): Promise<void>;
    createTemplateFiles(): Promise<void>;
    getOutputDirectory(): string;
    setOutputDirectory(directory: string): void;
}
//# sourceMappingURL=file-manager.d.ts.map