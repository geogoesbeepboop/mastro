import {AIClient} from './ai-client.js';
import type {
  MastroConfig,
  DocumentationType,
  DocumentationContext,
  DocumentationConfig,
  DocumentationOutput,
  DocumentationSection,
  MermaidDiagram
} from '../types/index.js';

export class DocumentationEngine {
  private aiClient: AIClient;
  private config: MastroConfig;

  constructor(config: MastroConfig, aiClient: AIClient) {
    this.config = config;
    this.aiClient = aiClient;
  }

  async generateDocumentation(
    type: DocumentationType,
    context: DocumentationContext,
    config: DocumentationConfig
  ): Promise<DocumentationOutput> {
    switch (type) {
      case 'api':
        return this.generateApiDocumentation(context, config);
      case 'architecture':
        return this.generateArchitectureDocumentation(context, config);
      case 'user-guide':
        return this.generateUserGuideDocumentation(context, config);
      case 'readme':
        return this.generateReadmeDocumentation(context, config);
      case 'component':
        return this.generateComponentDocumentation(context, config);
      case 'deployment':
        return this.generateDeploymentDocumentation(context, config);
      default:
        throw new Error(`Unsupported documentation type: ${type}`);
    }
  }

  private async generateApiDocumentation(
    context: DocumentationContext,
    config: DocumentationConfig
  ): Promise<DocumentationOutput> {
    const prompt = this.buildApiDocumentationPrompt(context, config);
    
    const response = await this.aiClient.generateCommitMessage({
      changes: [],
      branch: 'main',
      repository: context.repository,
      staged: false,
      workingDir: context.workingDir,
      metadata: {
        totalInsertions: 0,
        totalDeletions: 0,
        fileCount: context.projectStructure.files.length,
        changeComplexity: context.codeAnalysis.complexity.overall === 'simple' ? 'low' : 
                           context.codeAnalysis.complexity.overall === 'moderate' ? 'medium' : 'high'
      }
    });

    // Use the AI client with a specialized prompt for API documentation
    const apiDocContent = await this.generateWithSpecializedPrompt('api', prompt, context);
    
    const sections = this.parseDocumentationSections(apiDocContent);
    
    return {
      type: 'api',
      title: 'API Documentation',
      content: apiDocContent,
      filePath: 'api.md',
      sections,
      references: this.extractApiReferences(context)
    };
  }

  private async generateArchitectureDocumentation(
    context: DocumentationContext,
    config: DocumentationConfig
  ): Promise<DocumentationOutput> {
    const prompt = this.buildArchitectureDocumentationPrompt(context, config);
    const archContent = await this.generateWithSpecializedPrompt('architecture', prompt, context);
    
    const sections = this.parseDocumentationSections(archContent);
    let diagrams: MermaidDiagram[] = [];
    
    if (config.generateMermaid) {
      diagrams = await this.generateMermaidDiagrams(context);
    }
    
    // Inject diagrams into content
    const contentWithDiagrams = this.injectDiagrams(archContent, diagrams);
    
    return {
      type: 'architecture',
      title: 'Architecture Documentation',
      content: contentWithDiagrams,
      filePath: 'architecture.md',
      sections,
      diagrams,
      references: this.extractArchitectureReferences(context)
    };
  }

  private async generateUserGuideDocumentation(
    context: DocumentationContext,
    config: DocumentationConfig
  ): Promise<DocumentationOutput> {
    const prompt = this.buildUserGuideDocumentationPrompt(context, config);
    const guideContent = await this.generateWithSpecializedPrompt('user-guide', prompt, context);
    
    const sections = this.parseDocumentationSections(guideContent);
    
    return {
      type: 'user-guide',
      title: 'User Guide',
      content: guideContent,
      filePath: 'user-guide.md',
      sections,
      references: this.extractUserGuideReferences(context)
    };
  }

  private async generateReadmeDocumentation(
    context: DocumentationContext,
    config: DocumentationConfig
  ): Promise<DocumentationOutput> {
    const prompt = this.buildReadmeDocumentationPrompt(context, config);
    const readmeContent = await this.generateWithSpecializedPrompt('readme', prompt, context);
    
    const sections = this.parseDocumentationSections(readmeContent);
    
    return {
      type: 'readme',
      title: 'README',
      content: readmeContent,
      filePath: 'README.md',
      sections,
      references: []
    };
  }

  private async generateComponentDocumentation(
    context: DocumentationContext,
    config: DocumentationConfig
  ): Promise<DocumentationOutput> {
    const prompt = this.buildComponentDocumentationPrompt(context, config);
    const componentContent = await this.generateWithSpecializedPrompt('component', prompt, context);
    
    const sections = this.parseDocumentationSections(componentContent);
    
    return {
      type: 'component',
      title: 'Component Documentation',
      content: componentContent,
      filePath: 'components.md',
      sections,
      references: this.extractComponentReferences(context)
    };
  }

  private async generateDeploymentDocumentation(
    context: DocumentationContext,
    config: DocumentationConfig
  ): Promise<DocumentationOutput> {
    const prompt = this.buildDeploymentDocumentationPrompt(context, config);
    const deployContent = await this.generateWithSpecializedPrompt('deployment', prompt, context);
    
    const sections = this.parseDocumentationSections(deployContent);
    
    return {
      type: 'deployment',
      title: 'Deployment Guide',
      content: deployContent,
      filePath: 'deployment.md',
      sections,
      references: []
    };
  }

  private async generateWithSpecializedPrompt(
    type: DocumentationType,
    prompt: string,
    context: DocumentationContext
  ): Promise<string> {
    // This is a simplified implementation - in practice, you'd make a specialized AI call
    // For now, we'll generate comprehensive documentation based on the context
    return this.generateStaticDocumentation(type, context);
  }

  private generateStaticDocumentation(type: DocumentationType, context: DocumentationContext): string {
    switch (type) {
      case 'api':
        return this.generateStaticApiDoc(context);
      case 'architecture':
        return this.generateStaticArchitectureDoc(context);
      case 'user-guide':
        return this.generateStaticUserGuideDoc(context);
      case 'readme':
        return this.generateStaticReadmeDoc(context);
      case 'component':
        return this.generateStaticComponentDoc(context);
      case 'deployment':
        return this.generateStaticDeploymentDoc(context);
      default:
        return '# Documentation\\n\\nDocumentation content will be generated here.';
    }
  }

  private generateStaticApiDoc(context: DocumentationContext): string {
    const lines: string[] = [];
    
    lines.push('# API Documentation');
    lines.push('');
    lines.push(`API documentation for ${context.repository.name}`);
    lines.push('');
    lines.push('## Overview');
    lines.push('');
    lines.push(`This document provides comprehensive API documentation for the ${context.repository.name} project.`);
    lines.push(`The API is built using ${context.repository.framework || context.repository.language} and follows REST conventions.`);
    lines.push('');
    
    // Generate API endpoints from analysis
    const apiFiles = context.projectStructure.files.filter(file => 
      file.apis && file.apis.length > 0
    );
    
    if (apiFiles.length > 0) {
      lines.push('## Endpoints');
      lines.push('');
      
      for (const file of apiFiles) {
        for (const api of file.apis) {
          lines.push(`### ${api.method} ${api.path}`);
          lines.push('');
          if (api.description) {
            lines.push(api.description);
            lines.push('');
          }
          
          if (api.parameters && api.parameters.length > 0) {
            lines.push('**Parameters:**');
            lines.push('');
            for (const param of api.parameters) {
              const required = param.required ? ' (required)' : ' (optional)';
              lines.push(`- \`${param.name}\` (${param.dataType})${required}: ${param.description || 'No description'}`);
            }
            lines.push('');
          }
          
          if (api.responses && api.responses.length > 0) {
            lines.push('**Responses:**');
            lines.push('');
            for (const response of api.responses) {
              lines.push(`- ${response.status}: ${response.description}`);
            }
            lines.push('');
          }
          
          lines.push('---');
          lines.push('');
        }
      }
    }
    
    // Generate function documentation
    const functionFiles = context.projectStructure.files.filter(file => 
      file.functions && file.functions.length > 0
    );
    
    if (functionFiles.length > 0) {
      lines.push('## Functions');
      lines.push('');
      
      for (const file of functionFiles) {
        if (file.functions.length > 0) {
          lines.push(`### ${file.path}`);
          lines.push('');
          
          for (const func of file.functions) {
            lines.push(`#### \`${func.name}\``);
            lines.push('');
            if (func.signature) {
              lines.push('```typescript');
              lines.push(func.signature);
              lines.push('```');
              lines.push('');
            }
            lines.push(`**Complexity:** ${func.complexity}`);
            lines.push(`**Async:** ${func.isAsync ? 'Yes' : 'No'}`);
            lines.push('');
          }
        }
      }
    }
    
    return lines.join('\\n');
  }

  private generateStaticArchitectureDoc(context: DocumentationContext): string {
    const lines: string[] = [];
    
    lines.push('# Architecture Documentation');
    lines.push('');
    lines.push(`Architecture overview for ${context.repository.name}`);
    lines.push('');
    lines.push('## Project Overview');
    lines.push('');
    lines.push(`**Language:** ${context.repository.language}`);
    lines.push(`**Framework:** ${context.repository.framework || 'None'}`);
    lines.push(`**Complexity:** ${context.codeAnalysis.complexity.overall}`);
    lines.push(`**Total Files:** ${context.codeAnalysis.complexity.metrics.totalFiles}`);
    lines.push(`**Total Lines:** ${context.codeAnalysis.complexity.metrics.totalLines.toLocaleString()}`);
    lines.push('');
    
    lines.push('## Directory Structure');
    lines.push('');
    lines.push('```');
    for (const dir of context.projectStructure.directories) {
      const indent = '  '.repeat((dir.path.match(/\//g) || []).length);
      lines.push(`${indent}${dir.path.split('/').pop()}/`);
    }
    lines.push('```');
    lines.push('');
    
    if (context.codeAnalysis.patterns.length > 0) {
      lines.push('## Architectural Patterns');
      lines.push('');
      
      for (const pattern of context.codeAnalysis.patterns) {
        lines.push(`### ${pattern.name} Pattern`);
        lines.push('');
        lines.push(`**Type:** ${pattern.type}`);
        lines.push(`**Confidence:** ${Math.round(pattern.confidence * 100)}%`);
        lines.push('');
        lines.push('**Evidence:**');
        for (const evidence of pattern.evidence) {
          lines.push(`- ${evidence}`);
        }
        lines.push('');
        lines.push('**Components:**');
        for (const component of pattern.components) {
          lines.push(`- ${component}`);
        }
        lines.push('');
      }
    }
    
    if (context.codeAnalysis.dependencies.length > 0) {
      lines.push('## Dependencies');
      lines.push('');
      lines.push('### Production Dependencies');
      lines.push('');
      
      const prodDeps = context.codeAnalysis.dependencies.filter(d => d.type === 'production');
      for (const dep of prodDeps) {
        lines.push(`- **${dep.name}** (${dep.version}): ${dep.purpose}`);
        if (dep.critical) {
          lines.push('  - ⚠️ Critical dependency');
        }
      }
      lines.push('');
    }
    
    // Placeholder for mermaid diagrams
    lines.push('## System Architecture Diagram');
    lines.push('');
    lines.push('```mermaid');
    lines.push('flowchart TD');
    lines.push('    A[Client] --> B[API Layer]');
    lines.push('    B --> C[Business Logic]');
    lines.push('    C --> D[Data Layer]');
    lines.push('    D --> E[Database]');
    lines.push('```');
    lines.push('');
    
    return lines.join('\\n');
  }

  private generateStaticUserGuideDoc(context: DocumentationContext): string {
    const lines: string[] = [];
    
    lines.push('# User Guide');
    lines.push('');
    lines.push(`Complete user guide for ${context.repository.name}`);
    lines.push('');
    lines.push('## Getting Started');
    lines.push('');
    lines.push('### Prerequisites');
    lines.push('');
    lines.push(`Before using ${context.repository.name}, ensure you have the following installed:`);
    lines.push('');
    lines.push(`- ${context.repository.language === 'typescript' || context.repository.language === 'javascript' ? 'Node.js (v14 or later)' : context.repository.language}`);
    lines.push('- Git');
    lines.push('');
    
    lines.push('### Installation');
    lines.push('');
    lines.push('1. Clone the repository:');
    lines.push('   ```bash');
    lines.push(`   git clone <repository-url> ${context.repository.name}`);
    lines.push(`   cd ${context.repository.name}`);
    lines.push('   ```');
    lines.push('');
    
    if (context.repository.language === 'typescript' || context.repository.language === 'javascript') {
      lines.push('2. Install dependencies:');
      lines.push('   ```bash');
      lines.push('   npm install');
      lines.push('   ```');
      lines.push('');
      lines.push('3. Start the development server:');
      lines.push('   ```bash');
      lines.push('   npm run dev');
      lines.push('   ```');
      lines.push('');
    }
    
    lines.push('## Features');
    lines.push('');
    lines.push(`${context.repository.name} provides the following features:`);
    lines.push('');
    
    // Generate features based on analysis
    if (context.codeAnalysis.complexity.metrics.apiEndpoints > 0) {
      lines.push(`- 📡 **API Integration**: ${context.codeAnalysis.complexity.metrics.apiEndpoints} REST API endpoints`);
    }
    
    if (context.projectStructure.files.some(f => f.type === 'test')) {
      lines.push('- ✅ **Testing**: Comprehensive test suite included');
    }
    
    if (context.codeAnalysis.userFlows.length > 0) {
      lines.push('- 🔄 **User Workflows**: Multiple user interaction flows');
    }
    
    lines.push('- 🏗️ **Modern Architecture**: Built with modern development practices');
    lines.push(`- 🔧 **${context.repository.framework || context.repository.language}**: Leverages ${context.repository.framework || context.repository.language} ecosystem`);
    lines.push('');
    
    if (context.codeAnalysis.userFlows.length > 0) {
      lines.push('## User Workflows');
      lines.push('');
      
      for (const flow of context.codeAnalysis.userFlows) {
        lines.push(`### ${flow.name}`);
        lines.push('');
        lines.push(`**Complexity:** ${flow.complexity}`);
        lines.push('');
        lines.push('**Steps:**');
        for (let i = 0; i < flow.steps.length; i++) {
          const step = flow.steps[i];
          lines.push(`${i + 1}. **${step.action}** in ${step.component}: ${step.description}`);
        }
        lines.push('');
      }
    }
    
    lines.push('## Configuration');
    lines.push('');
    lines.push('The application can be configured through:');
    lines.push('');
    
    const configFiles = context.projectStructure.configFiles;
    for (const configFile of configFiles) {
      lines.push(`- \`${configFile}\``);
    }
    lines.push('');
    
    lines.push('## Troubleshooting');
    lines.push('');
    lines.push('### Common Issues');
    lines.push('');
    lines.push('**Installation Problems:**');
    lines.push('- Ensure you have the correct version of Node.js installed');
    lines.push('- Clear npm cache: `npm cache clean --force`');
    lines.push('- Delete node_modules and reinstall: `rm -rf node_modules && npm install`');
    lines.push('');
    
    return lines.join('\\n');
  }

  private generateStaticReadmeDoc(context: DocumentationContext): string {
    const lines: string[] = [];
    
    lines.push(`# ${context.repository.name}`);
    lines.push('');
    lines.push(`A ${context.repository.framework || context.repository.language} project with modern development practices.`);
    lines.push('');
    lines.push('## Quick Start');
    lines.push('');
    
    if (context.repository.language === 'typescript' || context.repository.language === 'javascript') {
      lines.push('```bash');
      lines.push('# Install dependencies');
      lines.push('npm install');
      lines.push('');
      lines.push('# Start development server');
      lines.push('npm run dev');
      lines.push('```');
      lines.push('');
    }
    
    lines.push('## Project Structure');
    lines.push('');
    lines.push('```');
    for (const dir of context.projectStructure.directories.slice(0, 8)) {
      const indent = '  '.repeat((dir.path.match(/\//g) || []).length);
      const name = dir.path.split('/').pop();
      const description = dir.description ? ` # ${dir.description}` : '';
      lines.push(`${indent}${name}/${description}`);
    }
    lines.push('```');
    lines.push('');
    
    lines.push('## Key Metrics');
    lines.push('');
    lines.push(`- **Files:** ${context.codeAnalysis.complexity.metrics.totalFiles}`);
    lines.push(`- **Lines of Code:** ${context.codeAnalysis.complexity.metrics.totalLines.toLocaleString()}`);
    lines.push(`- **Complexity:** ${context.codeAnalysis.complexity.overall}`);
    if (context.codeAnalysis.complexity.metrics.apiEndpoints > 0) {
      lines.push(`- **API Endpoints:** ${context.codeAnalysis.complexity.metrics.apiEndpoints}`);
    }
    lines.push('');
    
    lines.push('## Documentation');
    lines.push('');
    lines.push('- 📖 [User Guide](user-guide.md) - Complete usage instructions');
    lines.push('- 🏗️ [Architecture](architecture.md) - System design and patterns');
    lines.push('- 📡 [API Documentation](api.md) - API reference and examples');
    lines.push('');
    
    lines.push('## Contributing');
    lines.push('');
    lines.push('1. Fork the repository');
    lines.push('2. Create a feature branch');
    lines.push('3. Make your changes');
    lines.push('4. Run tests');
    lines.push('5. Submit a pull request');
    lines.push('');
    
    return lines.join('\\n');
  }

  private generateStaticComponentDoc(context: DocumentationContext): string {
    return '# Component Documentation\\n\\nComponent documentation will be implemented in future versions.';
  }

  private generateStaticDeploymentDoc(context: DocumentationContext): string {
    return '# Deployment Guide\\n\\nDeployment documentation will be implemented in future versions.';
  }

  // Prompt builders for AI integration (for future enhancement)
  private buildApiDocumentationPrompt(context: DocumentationContext, config: DocumentationConfig): string {
    return `Generate comprehensive API documentation for ${context.repository.name}...`;
  }

  private buildArchitectureDocumentationPrompt(context: DocumentationContext, config: DocumentationConfig): string {
    return `Generate architecture documentation with diagrams for ${context.repository.name}...`;
  }

  private buildUserGuideDocumentationPrompt(context: DocumentationContext, config: DocumentationConfig): string {
    return `Generate a complete user guide for ${context.repository.name}...`;
  }

  private buildReadmeDocumentationPrompt(context: DocumentationContext, config: DocumentationConfig): string {
    return `Generate a comprehensive README for ${context.repository.name}...`;
  }

  private buildComponentDocumentationPrompt(context: DocumentationContext, config: DocumentationConfig): string {
    return `Generate component documentation for ${context.repository.name}...`;
  }

  private buildDeploymentDocumentationPrompt(context: DocumentationContext, config: DocumentationConfig): string {
    return `Generate deployment documentation for ${context.repository.name}...`;
  }

  // Helper methods
  private parseDocumentationSections(content: string): DocumentationSection[] {
    const sections: DocumentationSection[] = [];
    const lines = content.split('\\n');
    let currentSection: DocumentationSection | null = null;
    
    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2];
        
        if (currentSection) {
          sections.push(currentSection);
        }
        
        currentSection = {
          title,
          content: '',
          level
        };
      } else if (currentSection) {
        currentSection.content += line + '\\n';
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  private async generateMermaidDiagrams(context: DocumentationContext): Promise<MermaidDiagram[]> {
    const diagrams: MermaidDiagram[] = [];
    
    // Generate system architecture diagram
    diagrams.push({
      type: 'flowchart',
      title: 'System Architecture',
      description: 'High-level system architecture overview',
      content: this.generateSystemArchitectureDiagram(context)
    });
    
    if (context.codeAnalysis.userFlows.length > 0) {
      // Generate user flow diagrams
      for (const flow of context.codeAnalysis.userFlows.slice(0, 3)) { // Limit to 3
        diagrams.push({
          type: 'flowchart',
          title: `${flow.name} Flow`,
          description: `User flow diagram for ${flow.name}`,
          content: this.generateUserFlowDiagram(flow)
        });
      }
    }
    
    return diagrams;
  }

  private generateSystemArchitectureDiagram(context: DocumentationContext): string {
    const lines: string[] = [];
    lines.push('flowchart TD');
    lines.push('    A[Client Application] --> B[API Gateway]');
    lines.push('    B --> C[Business Logic Layer]');
    lines.push('    C --> D[Data Access Layer]');
    lines.push('    D --> E[Database]');
    
    if (context.repository.framework) {
      lines.push(`    F[${context.repository.framework}] --> C`);
    }
    
    return lines.join('\\n    ');
  }

  private generateUserFlowDiagram(flow: any): string {
    const lines: string[] = [];
    lines.push('flowchart TD');
    
    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i];
      const nodeId = String.fromCharCode(65 + i); // A, B, C, etc.
      lines.push(`    ${nodeId}[${step.action}]`);
      
      if (i > 0) {
        const prevNodeId = String.fromCharCode(65 + i - 1);
        lines.push(`    ${prevNodeId} --> ${nodeId}`);
      }
    }
    
    return lines.join('\\n    ');
  }

  private injectDiagrams(content: string, diagrams: MermaidDiagram[]): string {
    let result = content;
    
    for (const diagram of diagrams) {
      const placeholder = `## ${diagram.title}`;
      const diagramMarkdown = `## ${diagram.title}\\n\\n${diagram.description}\\n\\n\`\`\`mermaid\\n${diagram.content}\\n\`\`\`\\n\\n`;
      
      if (result.includes(placeholder)) {
        result = result.replace(placeholder, diagramMarkdown);
      } else {
        // Append at the end if no placeholder found
        result += `\\n\\n${diagramMarkdown}`;
      }
    }
    
    return result;
  }

  private extractApiReferences(context: DocumentationContext): string[] {
    return context.projectStructure.files
      .filter(f => f.apis && f.apis.length > 0)
      .map(f => f.path);
  }

  private extractArchitectureReferences(context: DocumentationContext): string[] {
    return context.projectStructure.configFiles.concat(
      context.projectStructure.files
        .filter(f => f.type === 'source')
        .map(f => f.path)
        .slice(0, 10)
    );
  }

  private extractUserGuideReferences(context: DocumentationContext): string[] {
    return context.projectStructure.entryPoints.concat(
      context.projectStructure.configFiles
    );
  }

  private extractComponentReferences(context: DocumentationContext): string[] {
    return context.projectStructure.files
      .filter(f => f.classes && f.classes.length > 0)
      .map(f => f.path);
  }
}