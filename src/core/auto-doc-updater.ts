import {ChangeDetector, ChangeTypeAnalysis} from '../analyzers/change-detector.js';
import {DocumentationEngine} from './doc-engine.js';
import {FileSystemManager} from './file-manager.js';
import {AIClient} from './ai-client.js';
import type {CommitContext, MastroConfig, DocumentationType, DocumentationOutput} from '../types/index.js';

export interface AutoUpdateConfig {
  enabled: boolean;
  docTypes: DocumentationType[];
  autoCommit: boolean;
  dryRun: boolean;
  threshold: number; // Minimum confidence score to trigger updates
}

export interface UpdateSummary {
  changesDetected: ChangeTypeAnalysis[];
  documentsUpdated: string[];
  documentsCreated: string[];
  errors: string[];
  skipped: string[];
  suggestions: string[];
}

export class AutoDocumentationUpdater {
  private changeDetector: ChangeDetector;
  private docEngine: DocumentationEngine;
  private fileManager: FileSystemManager;
  private aiClient: AIClient;
  private config: MastroConfig;

  constructor(
    config: MastroConfig,
    aiClient: AIClient,
    outputDir = './docs'
  ) {
    this.config = config;
    this.aiClient = aiClient;
    this.changeDetector = new ChangeDetector();
    this.docEngine = new DocumentationEngine(config, aiClient);
    this.fileManager = new FileSystemManager(outputDir);
  }

  async analyzeAndUpdateDocumentation(
    context: CommitContext,
    updateConfig: AutoUpdateConfig
  ): Promise<UpdateSummary> {
    const summary: UpdateSummary = {
      changesDetected: [],
      documentsUpdated: [],
      documentsCreated: [],
      errors: [],
      skipped: [],
      suggestions: []
    };

    try {
      // 1. Analyze the changes
      const changeAnalyses = await this.changeDetector.analyzeChanges(context);
      summary.changesDetected = changeAnalyses;

      if (changeAnalyses.length === 0) {
        summary.suggestions.push('No significant changes detected that require documentation updates');
        return summary;
      }

      // 2. Filter analyses by confidence threshold
      const significantChanges = changeAnalyses.filter(
        change => change.confidence >= updateConfig.threshold
      );

      if (significantChanges.length === 0) {
        summary.suggestions.push(
          `No changes met the confidence threshold of ${updateConfig.threshold}. ` +
          `Detected changes had confidence scores: ${changeAnalyses.map(c => c.confidence.toFixed(2)).join(', ')}`
        );
        return summary;
      }

      // 3. Determine which documents need updates
      const docTypesToUpdate = this.determineDocumentUpdates(significantChanges, updateConfig);

      if (docTypesToUpdate.size === 0) {
        summary.suggestions.push('No documentation updates required for detected changes');
        return summary;
      }

      // 4. Build documentation context
      const docContext = await this.buildDocumentationContext(context);

      // 5. Update or create documents
      for (const docType of docTypesToUpdate) {
        try {
          const updateResult = await this.updateOrCreateDocument(
            docType,
            docContext,
            significantChanges,
            updateConfig
          );

          if (updateResult.created) {
            summary.documentsCreated.push(updateResult.filePath);
          } else if (updateResult.updated) {
            summary.documentsUpdated.push(updateResult.filePath);
          } else {
            summary.skipped.push(`${docType}: ${updateResult.reason || 'No changes needed'}`);
          }
        } catch (error) {
          const errorMsg = `Failed to update ${docType}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          summary.errors.push(errorMsg);
        }
      }

      // 6. Generate suggestions for manual review
      summary.suggestions = this.generateSuggestions(significantChanges, summary);

    } catch (error) {
      summary.errors.push(`Auto-documentation update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return summary;
  }

  private determineDocumentUpdates(
    changes: ChangeTypeAnalysis[],
    config: AutoUpdateConfig
  ): Set<DocumentationType> {
    const docTypes = new Set<DocumentationType>();

    for (const change of changes) {
      for (const docType of change.affectedDocTypes) {
        // Only include doc types that are enabled in config
        if (config.docTypes.includes(docType)) {
          docTypes.add(docType);
        }
      }
    }

    return docTypes;
  }

  private async buildDocumentationContext(context: CommitContext) {
    // Reuse the same context building logic from the documentation generator
    return {
      repository: context.repository,
      projectStructure: {
        files: [] as any[], // Would be populated by actual project analysis
        directories: [] as any[],
        entryPoints: [] as string[],
        configFiles: [] as string[],
        testFiles: [] as string[],
        docFiles: [] as string[]
      },
      codeAnalysis: {
        complexity: { overall: 'medium' as const, metrics: { totalLines: 0, apiEndpoints: 0 } },
        patterns: [] as any[],
        dependencies: [] as any[],
        userFlows: [] as any[]
      },
      workingDir: context.workingDir
    };
  }

  private async updateOrCreateDocument(
    docType: DocumentationType,
    docContext: any,
    changes: ChangeTypeAnalysis[],
    config: AutoUpdateConfig
  ): Promise<{ created: boolean; updated: boolean; filePath: string; reason?: string }> {
    
    const docConfig = {
      outputDirectory: './docs',
      types: [docType],
      templates: {
        'api': 'default-api-template',
        'architecture': 'default-arch-template',
        'user-guide': 'default-guide-template',
        'readme': 'default-readme-template',
        'component': 'default-component-template',
        'deployment': 'default-deployment-template',
        'troubleshooting': 'default-troubleshooting-template',
        'changelog': 'default-changelog-template',
        'contributing': 'default-contributing-template',
        'security': 'default-security-template',
        'performance': 'default-performance-template',
        'testing': 'default-testing-template',
        'workflow': 'default-workflow-template',
        'integration': 'default-integration-template',
        'all': 'default-all-template'
      },
      includePrivate: false,
      includeTodos: false,
      generateMermaid: true,
      autoUpdate: true
    };

    // Check if document already exists
    const existingDoc = await this.fileManager.documentExists(docType);
    
    if (config.dryRun) {
      return {
        created: !existingDoc,
        updated: existingDoc,
        filePath: this.getDocumentPath(docType),
        reason: 'Dry run - no actual changes made'
      };
    }

    if (existingDoc) {
      // Update existing document
      const updatedDoc = await this.updateExistingDocument(docType, docContext, changes, docConfig);
      if (updatedDoc) {
        await this.fileManager.writeDocumentation(updatedDoc);
        return { created: false, updated: true, filePath: updatedDoc.filePath };
      }
      return { created: false, updated: false, filePath: this.getDocumentPath(docType), reason: 'No updates needed' };
    } else {
      // Create new document
      const newDoc = await this.docEngine.generateDocumentation(docType, docContext, docConfig);
      await this.fileManager.writeDocumentation(newDoc);
      return { created: true, updated: false, filePath: newDoc.filePath };
    }
  }

  private async updateExistingDocument(
    docType: DocumentationType,
    docContext: any,
    changes: ChangeTypeAnalysis[],
    docConfig: any
  ): Promise<DocumentationOutput | null> {
    
    // Read existing document
    const existingContent = await this.fileManager.readExistingDocument(docType);
    if (!existingContent) {
      // If we can't read existing content, generate new
      return await this.docEngine.generateDocumentation(docType, docContext, docConfig);
    }

    // Enhanced: Use existing content as context for better generation
    const enhancedDocContext = {
      ...docContext,
      existingDocumentation: {
        type: docType,
        content: existingContent,
        structure: this.parseMarkdownStructure(existingContent),
        changeContext: changes
      }
    };

    // Generate updated content with existing docs as context
    const updatedDoc = await this.docEngine.generateDocumentation(
      docType, 
      enhancedDocContext, 
      {
        ...docConfig,
        contextAware: true,
        preserveExistingQuality: true
      }
    );
    
    // Smart merge: use AI-powered synthesis to combine the best of both
    const mergedContent = await this.intelligentMerge(existingContent, updatedDoc.content, changes);
    
    if (mergedContent === existingContent) {
      return null; // No changes needed
    }

    return {
      ...updatedDoc,
      content: mergedContent
    };
  }

  private async intelligentMerge(
    existing: string,
    updated: string,
    changes: ChangeTypeAnalysis[]
  ): Promise<string> {
    // Enhanced intelligent merge that uses existing docs as context
    // to produce the best possible final documentation
    
    const existingStructure = this.parseMarkdownStructure(existing);
    const updatedStructure = this.parseMarkdownStructure(updated);
    
    // Use AI to synthesize the best content from both sources
    const synthesizedContent = await this.synthesizeDocumentationContent(
      existingStructure,
      updatedStructure,
      changes
    );
    
    if (synthesizedContent === existing) {
      return existing; // No meaningful changes
    }
    
    return synthesizedContent;
  }

  private parseMarkdownStructure(content: string) {
    const lines = content.split('\n');
    const structure: {
      title?: string;
      sections: {
        heading: string;
        level: number;
        content: string;
        isAutoGenerated: boolean;
      }[];
      frontMatter?: string;
    } = { sections: [] };
    
    let currentSection: any = null;
    let inFrontMatter = false;
    let frontMatterLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle front matter
      if (line.trim() === '---' && i === 0) {
        inFrontMatter = true;
        continue;
      }
      if (inFrontMatter && line.trim() === '---') {
        inFrontMatter = false;
        structure.frontMatter = frontMatterLines.join('\n');
        continue;
      }
      if (inFrontMatter) {
        frontMatterLines.push(line);
        continue;
      }
      
      // Handle headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        // Save previous section
        if (currentSection) {
          structure.sections.push(currentSection);
        }
        
        const level = headingMatch[1].length;
        const heading = headingMatch[2];
        
        // Check if section looks auto-generated
        const isAutoGenerated = heading.includes('Generated') || 
                               heading.includes('Auto-updated') ||
                               line.includes('🤖') ||
                               line.includes('*Auto-updated on');
        
        currentSection = {
          heading,
          level,
          content: '',
          isAutoGenerated
        };
        
        if (!structure.title && level === 1) {
          structure.title = heading;
        }
      } else if (currentSection) {
        currentSection.content += line + '\n';
      } else {
        // Content before any heading
        if (!structure.sections.length) {
          structure.sections.push({
            heading: '',
            level: 0,
            content: line + '\n',
            isAutoGenerated: false
          });
        }
      }
    }
    
    // Add final section
    if (currentSection) {
      structure.sections.push(currentSection);
    }
    
    return structure;
  }

  private async synthesizeDocumentationContent(
    existing: any,
    updated: any,
    changes: ChangeTypeAnalysis[]
  ): Promise<string> {
    // Create a synthesis prompt for the AI to intelligently merge content
    const contextPrompt = `
You are an expert technical writer tasked with synthesizing the best possible documentation by intelligently merging existing documentation with newly generated content.

EXISTING DOCUMENTATION STRUCTURE:
${JSON.stringify(existing, null, 2)}

UPDATED DOCUMENTATION STRUCTURE:  
${JSON.stringify(updated, null, 2)}

DETECTED CHANGES:
${changes.map(c => `- ${c.type}: ${c.reasoning} (confidence: ${c.confidence})`).join('\n')}

REQUIREMENTS:
1. Preserve valuable existing content, especially manual additions and refinements
2. Integrate new insights and updates from the generated content
3. Maintain consistency in tone, style, and structure
4. Remove outdated information
5. Enhance clarity and completeness
6. Keep the documentation concise but comprehensive

Please synthesize these into a single, high-quality markdown document that represents the best of both sources. Return only the markdown content, no explanations.
`;

    try {
      const synthesizedContent = await this.aiClient.performCustomAnalysis(
        contextPrompt,
        'Synthesize the best possible documentation from existing and updated content.',
        2000,
        0.3
      );
      
      if (!synthesizedContent) {
        return this.fallbackIntelligentMerge(existing, updated, changes);
      }
      
      return synthesizedContent.trim();
    } catch (error) {
      console.warn('AI synthesis failed, falling back to intelligent manual merge:', error);
      return this.fallbackIntelligentMerge(existing, updated, changes);
    }
  }
  
  private fallbackIntelligentMerge(
    existing: any,
    updated: any, 
    changes: ChangeTypeAnalysis[]
  ): string {
    // Fallback: manually merge by preserving manual sections and updating auto-generated ones
    let result = '';
    
    // Add front matter if it exists
    if (existing.frontMatter || updated.frontMatter) {
      result += '---\n';
      result += updated.frontMatter || existing.frontMatter || '';
      result += '\n---\n\n';
    }
    
    // Use title from updated if available, otherwise existing
    const title = updated.title || existing.title;
    if (title) {
      result += `# ${title}\n\n`;
    }
    
    // Merge sections intelligently
    const allSections = new Map<string, any>();
    
    // Add existing sections (prioritize manual content)
    existing.sections?.forEach((section: any) => {
      if (section.heading) {
        allSections.set(section.heading, {
          ...section,
          source: 'existing'
        });
      }
    });
    
    // Merge or replace with updated sections
    updated.sections?.forEach((section: any) => {
      if (section.heading) {
        const existingSection = allSections.get(section.heading);
        if (existingSection) {
          // If existing section is manual and updated is auto-generated, keep existing
          if (!existingSection.isAutoGenerated && section.isAutoGenerated) {
            return; // Keep existing manual section
          }
          // Otherwise, prefer updated content but note the merge
          allSections.set(section.heading, {
            ...section,
            source: 'updated',
            merged: true
          });
        } else {
          allSections.set(section.heading, {
            ...section,
            source: 'updated'
          });
        }
      }
    });
    
    // Reconstruct document
    for (const [heading, section] of allSections) {
      if (heading) {
        result += `${'#'.repeat(section.level)} ${heading}\n\n`;
      }
      result += section.content.trim() + '\n\n';
    }
    
    // Add update note
    const changeTypes = changes.map(c => c.type).join(', ');
    const timestamp = new Date().toISOString().split('T')[0];
    result += `\n---\n*Documentation updated on ${timestamp} based on: ${changeTypes}*\n`;
    
    return result.trim();
  }

  private getDocumentPath(docType: DocumentationType): string {
    const fileNames: Record<DocumentationType, string> = {
      'api': 'api.md',
      'architecture': 'architecture.md',
      'user-guide': 'user-guide.md',
      'readme': 'README.md',
      'component': 'components.md',
      'deployment': 'deployment.md',
      'troubleshooting': 'TROUBLESHOOTING.md',
      'changelog': 'CHANGELOG.md',
      'contributing': 'CONTRIBUTING.md',
      'security': 'SECURITY.md',
      'performance': 'PERFORMANCE.md',
      'testing': 'TESTING.md',
      'workflow': 'WORKFLOW_GUIDE.md',
      'integration': 'INTEGRATION.md',
      'all': 'COMPLETE_DOCS.md'
    };
    
    return `./docs/${fileNames[docType]}`;
  }

  private generateSuggestions(changes: ChangeTypeAnalysis[], summary: UpdateSummary): string[] {
    const suggestions: string[] = [];
    
    // Suggest manual review for high-impact changes
    const breakingChanges = changes.filter(c => c.type === 'breaking-change');
    if (breakingChanges.length > 0) {
      suggestions.push('Breaking changes detected - manual review of migration documentation recommended');
    }

    // Suggest specific documentation updates
    const apiChanges = changes.filter(c => c.affectedDocTypes.includes('api'));
    if (apiChanges.length > 0) {
      suggestions.push('API changes detected - review and update code examples in documentation');
    }

    // Suggest version updates
    if (changes.some(c => c.type === 'feature-addition')) {
      suggestions.push('New features added - consider updating version number and changelog');
    }

    // Suggest testing documentation updates
    const testChanges = changes.filter(c => c.type === 'testing');
    if (testChanges.length > 0) {
      suggestions.push('Test changes detected - ensure testing guides are up to date');
    }

    // General suggestions based on update results
    if (summary.documentsCreated.length > 0) {
      suggestions.push(`New documentation created: ${summary.documentsCreated.join(', ')} - review and customize as needed`);
    }

    if (summary.errors.length > 0) {
      suggestions.push('Some documentation updates failed - manual intervention required');
    }

    return suggestions;
  }

  // Utility method to generate a preview of what would be updated
  async previewUpdates(
    context: CommitContext,
    updateConfig: AutoUpdateConfig
  ): Promise<{
    changes: ChangeTypeAnalysis[];
    affectedDocs: DocumentationType[];
    suggestions: string[];
  }> {
    const changes = await this.changeDetector.analyzeChanges(context);
    const significantChanges = changes.filter(c => c.confidence >= updateConfig.threshold);
    const affectedDocs = Array.from(this.determineDocumentUpdates(significantChanges, updateConfig));
    
    return {
      changes: significantChanges,
      affectedDocs,
      suggestions: this.generateSuggestions(significantChanges, {
        changesDetected: changes,
        documentsUpdated: [],
        documentsCreated: [],
        errors: [],
        skipped: [],
        suggestions: []
      })
    };
  }
}