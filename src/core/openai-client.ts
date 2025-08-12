import OpenAI from 'openai';
import type {
  AIProvider,
  CommitContext,
  CommitMessage,
  DiffExplanation,
  PRDescription,
  CodeReview,
  ReviewPersona
} from '../types/index.js';

interface AIConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  readonly capabilities: import('../types/index.js').AICapabilities = {
    maxTokens: 128000,
    supportsStreaming: true,
    supportsJsonMode: true,
    supportsToolUse: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    supportsCaching: false,
    contextWindow: 128000,
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo'
    ],
    features: [
      'code-analysis',
      'documentation-generation',
      'test-generation',
      'security-analysis',
      'performance-analysis',
      'refactoring-suggestions',
      'architectural-insights',
      'best-practices',
      'code-review',
      'commit-messages',
      'pr-descriptions'
    ]
  };
  
  private client: OpenAI;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable or configure it in mastro.config.json');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey
    });
  }

  async generateCommitMessage(context: CommitContext): Promise<CommitMessage> {
    const prompt = this.buildCommitPrompt(context);
    
    try {
      // Prepend explicit json hint in the input to satisfy text.format=json_object enforcement
      const response = await this.client.responses.create({
        model: this.config.model,
        input: `Format: json\n${prompt}`,
        instructions: `You are a Principal Software Engineer with 15+ years of experience leading engineering teams at top-tier technology companies. Your responsibility is to ensure the highest standards of code quality, maintainability, and engineering best practices across the entire codebase.

As the technical authority, you:
- Enforce conventional commit standards and semantic versioning principles
- Ensure commit messages provide clear context for future developers and maintainers
- Identify potential architectural issues and breaking changes
- Maintain consistency with established team patterns and coding standards
- Consider the broader impact of changes on system reliability and performance

Generate commit messages that reflect your senior-level understanding of software engineering principles. Focus on clarity, precision, and long-term maintainability. Respond with valid json only. Return only json.`,
        max_output_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        text: { format: { type: 'json_object' } }
      });

      const content = response.output_text || 
        (response.output?.[0]?.type === 'message' ? (response.output[0] as any).content?.[0]?.text : null);
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content) as CommitMessage;
      return this.validateCommitMessage(parsed);
    } catch (error) {
      throw new Error(`Failed to generate commit message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async refineCommitMessage(originalMessage: CommitMessage, refinementInstruction: string, context: CommitContext): Promise<CommitMessage> {
    const prompt = this.buildRefinementPrompt(originalMessage, refinementInstruction, context);
    
    try {
      // Prepend explicit json hint in the input to satisfy text.format=json_object enforcement
      const response = await this.client.responses.create({
        model: this.config.model,
        input: `Format: json\n${prompt}`,
        instructions: `You are a Principal Software Engineer with 15+ years of experience. Your task is to refine commit messages based on specific instructions while maintaining technical accuracy and team conventions.

Your refinement responsibilities:
- Apply the specific refinement instruction precisely while maintaining message quality
- Ensure the refined message still accurately describes the code changes
- Preserve important technical details and context
- Maintain adherence to team conventions and commit standards
- Keep the message clear, concise, and professional

Provide a refined commit message that addresses the user's specific request while improving the overall quality. Respond with valid json only. Return only json.`,
        max_output_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        text: { format: { type: 'json_object' } }
      });

      const content = response.output_text || 
        (response.output?.[0]?.type === 'message' ? (response.output[0] as any).content?.[0]?.text : null);
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content) as CommitMessage;
      return this.validateCommitMessage(parsed);
    } catch (error) {
      throw new Error(`Failed to refine commit message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async explainChanges(context: CommitContext): Promise<DiffExplanation> {
    const prompt = this.buildExplanationPrompt(context);
    
    try {
      // Prepend explicit json hint in the input to satisfy text.format=json_object enforcement
      const response = await this.client.responses.create({
        model: this.config.model,
        input: `Format: json\n${prompt}`,
        instructions: `You are a Principal Software Engineer and Technical Lead responsible for code quality and system architecture. Your deep expertise spans multiple domains: system design, performance optimization, security, scalability, and team leadership.

Your analysis responsibilities:
- Provide comprehensive technical analysis that considers both immediate and long-term implications
- Identify potential risks, performance impacts, and architectural concerns
- Explain changes in context of the broader system architecture
- Consider maintainability, scalability, and operational impact
- Highlight security implications and best practice adherence
- Assess the quality of the implementation approach

Deliver insights that demonstrate your principal-level understanding of software engineering. Focus on what matters most for system reliability, team productivity, and business success. Respond with valid json only. Return only json.`,
        max_output_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        text: { format: { type: 'json_object' } }
      });

      const content = response.output_text || 
        (response.output?.[0]?.type === 'message' ? (response.output[0] as any).content?.[0]?.text : null);
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content) as DiffExplanation;
    } catch (error) {
      throw new Error(`Failed to explain changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createPRDescription(context: CommitContext): Promise<PRDescription> {
    const prompt = this.buildPRPrompt(context);
    
    try {
      // Prepend explicit json hint in the input to satisfy text.format=json_object enforcement
      const response = await this.client.responses.create({
        model: this.config.model,
        input: `Format: json\n${prompt}`,
        instructions: `You are a Principal Software Engineer and Technical Lead responsible for maintaining the highest standards of code delivery and team collaboration. You have extensive experience with code reviews, release management, and cross-functional team coordination.

Your PR description responsibilities:
- Create comprehensive, professional PR descriptions that facilitate effective code reviews
- Ensure proper documentation of changes, rationale, and testing approach
- Identify and communicate potential risks, breaking changes, and deployment considerations
- Provide clear testing instructions that enable thorough validation
- Consider the impact on different stakeholders: developers, QA, operations, and business teams
- Establish clear acceptance criteria and success metrics

Craft PR descriptions that reflect your senior leadership perspective and commitment to engineering excellence. Focus on clarity, completeness, and enabling successful collaboration. Respond with valid json only. Return only json.`,
        max_output_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        text: { format: { type: 'json_object' } }
      });

      const content = response.output_text || 
        (response.output?.[0]?.type === 'message' ? (response.output[0] as any).content?.[0]?.text : null);
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content) as PRDescription;
    } catch (error) {
      throw new Error(`Failed to create PR description: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async reviewCode(context: CommitContext, persona: ReviewPersona): Promise<CodeReview> {
    const prompt = this.buildReviewPrompt(context, persona);
    
    try {
      // Prepend explicit json hint in the input to satisfy text.format=json_object enforcement
      const response = await this.client.responses.create({
        model: this.config.model,
        input: `Format: json\n${prompt}`,
        instructions: `You are a Principal Software Engineer acting as a ${persona.name} conducting a ${persona.strictness} code review. You have the authority and responsibility to ensure this code meets production standards and company engineering guidelines.

As a technical leader with deep domain expertise, you focus on: ${persona.focus.join(', ')}
Custom review criteria: ${persona.customRules.join(', ')}

Your review standards:
- Code must be production-ready, maintainable, and aligned with architectural principles
- Security vulnerabilities and performance issues are non-negotiable blockers
- Ensure proper error handling, logging, and observability
- Validate adherence to team coding standards and best practices
- Consider long-term maintainability and technical debt implications
- Provide constructive, actionable feedback that helps developers grow

CRITICAL: For blockers, you MUST provide:
1. A detailed, specific message explaining EXACTLY what the issue is
2. WHY it's a blocker (what problem it could cause in production)
3. A concrete, actionable suggestion with code example if applicable
4. Never use generic messages like "Issue detected" - be specific

Examples of good blocker messages:
- "SQL injection vulnerability: User input directly concatenated into query without sanitization"
- "Memory leak: EventListener registered but never removed in cleanup"
- "Deadlock potential: Multiple mutexes acquired in different order"

Conduct this review with the rigor and insight expected from a principal-level engineer. Be thorough, authoritative, and focused on system reliability and team success. Respond with valid json only. Return only json.`,
        max_output_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        text: { format: { type: 'json_object' } }
      });

      const content = response.output_text || 
        (response.output?.[0]?.type === 'message' ? (response.output[0] as any).content?.[0]?.text : null);
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content) as CodeReview;
      return await this.validateCodeReview(parsed);
    } catch (error) {
      throw new Error(`Failed to review code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateDocumentation(type: string, context: any, config: any): Promise<string> {
    const prompt = this.buildDocumentationPrompt(type, context, config);
    
    try {
      const response = await this.client.responses.create({
        model: this.config.model,
        input: `Format: markdown\n${prompt}`,
        instructions: `You are a Principal Technical Writer and Software Architect with extensive experience creating comprehensive technical documentation. Your expertise spans API documentation, system architecture, user guides, and technical communication.

Your documentation responsibilities:
- Create clear, comprehensive, and accurate technical documentation
- Focus on practical usage and real-world examples
- Structure content for different audiences (developers, users, stakeholders)
- Ensure documentation is maintainable and follows best practices
- Include relevant code examples, diagrams, and troubleshooting guides
- Consider both immediate needs and long-term documentation strategy

Generate ${type} documentation that demonstrates your principal-level understanding of technical communication and software architecture. Focus on clarity, completeness, and practical value for the target audience.

Return only the markdown documentation content, no JSON wrapper.`,
        max_output_tokens: this.config.maxTokens * 2, // Use more tokens for documentation
        temperature: 0.2, // Lower temperature for more consistent documentation
      });

      const content = response.output_text || 
        (response.output?.[0]?.type === 'message' ? (response.output[0] as any).content?.[0]?.text : null);
      
      if (!content) {
        throw new Error('No response from OpenAI for documentation generation');
      }

      return content;
    } catch (error) {
      throw new Error(`Failed to generate ${type} documentation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async performCustomAnalysis(prompt: string, instructions: string, maxTokens?: number, temperature?: number): Promise<string | null> {
    try {
      const response = await this.client.responses.create({
        model: this.config.model,
        input: `Format: json\n${prompt}`,
        instructions: `${instructions}\n\nReturn valid json only.`,
        max_output_tokens: maxTokens || 500,
        temperature: temperature || 0.3,
        text: { format: { type: 'json_object' } }
      });

      const content = response.output_text || 
        (response.output?.[0]?.type === 'message' ? (response.output[0] as any).content?.[0]?.text : null);
        
      return content;
    } catch (error) {
      console.warn('Custom AI analysis failed:', error);
      return null;
    }
  }

  private buildCommitPrompt(context: CommitContext): string {
    // Prioritize code changes over docs when listing changes
    const isDocs = (file: string) => ((/^docs\//i).test(file) || (/\.md$/i).test(file));
    const codeChanges = context.changes.filter(c => !isDocs(c.file));
    const docChanges = context.changes.filter(c => isDocs(c.file));
    const orderedChanges = [...codeChanges, ...docChanges];
    const changesStr = orderedChanges.map(change => 
      `File: ${change.file} (${change.type}, +${change.insertions} -${change.deletions})`
    ).join('\n');

    const patterns = context.repository.patterns;
    
    const hasCodeChanges = codeChanges.length > 0;

    return `You are an expert software engineer analyzing git changes to generate highly specific, descriptive commit messages. Focus on WHAT functionality changed and WHY.

Repository Context:
- Name: ${context.repository.name} (${context.repository.language}${context.repository.framework ? `, ${context.repository.framework}` : ''})
- Branch: ${context.branch}
- Changes: ${context.metadata.fileCount} files, +${context.metadata.totalInsertions} -${context.metadata.totalDeletions}

ACTUAL CHANGES ANALYSIS:
${changesStr}

Team Style Guidelines:
- Format: ${patterns.commitStyle}
- Allowed prefixes: ${patterns.prefixes.join(', ')}
- Max length: ${patterns.maxLength} chars
- Avoid generic words: ${patterns.commonPhrases.join(', ')}

Recent commits for style context:
${context.repository.recentCommits.slice(0, 5).map(c => `- ${c.message}`).join('\n')}

COMMIT MESSAGE REQUIREMENTS:
1. BE EXTREMELY SPECIFIC - describe the actual functionality, feature, or behavior that changed
2. Use PRECISE technical terms instead of vague words like "update", "improve", "enhance", "modify"
3. Focus on BUSINESS VALUE or USER IMPACT when possible
4. ${hasCodeChanges ? 'Prioritize CODE functionality changes in title; documentation is secondary' : 'Focus on documentation content changes specifically'}
5. Include SCOPE if it helps clarify which component/module was affected
6. Use past tense for what was accomplished (e.g., "added user authentication", "fixed memory leak")

EXAMPLES OF SPECIFIC vs GENERIC:
❌ Generic: "fix: update user handling"
✅ Specific: "fix: prevent duplicate user registration with same email"

❌ Generic: "feat: improve search functionality" 
✅ Specific: "feat: add fuzzy search with highlighting for product catalog"

❌ Generic: "refactor: enhance code quality"
✅ Specific: "refactor: extract payment validation into reusable service"

Analyze the actual code changes and generate a commit message that clearly communicates the business/technical value delivered.

Respond with JSON in this format:
{
  "title": "commit message title",
  "body": "optional detailed body",
  "type": "conventional commit type",
  "scope": "optional scope",
  "confidence": 0.95,
  "reasoning": "why this message was chosen"
}`;
  }

  private buildExplanationPrompt(context: CommitContext): string {
    // Optimize by limiting diff details to avoid token limits
    const changesStr = context.changes.map(change => {
      const summary = `File: ${change.file} (${change.type}, +${change.insertions} -${change.deletions})`;
      
      // Limit the amount of diff content we send
      if (change.hunks.length > 3) {
        return `${summary}\n  [Large file with ${change.hunks.length} changes - summary only]`;
      }
      
      const limitedHunks = change.hunks.slice(0, 2).map(hunk => {
        const limitedLines = hunk.lines.slice(0, 10).map(l => `    ${l.type}: ${l.content.substring(0, 100)}`).join('\n');
        return `  ${hunk.header}\n${limitedLines}${hunk.lines.length > 10 ? '\n    [... truncated]' : ''}`;
      }).join('\n');
      
      return `${summary}\n${limitedHunks}${change.hunks.length > 2 ? '\n  [... more changes]' : ''}`;
    }).join('\n\n');

    return `Explain these code changes in detail:

Repository: ${context.repository.name} (${context.repository.language}${context.repository.framework ? `, ${context.repository.framework}` : ''})
Branch: ${context.branch}
Complexity: ${context.metadata.changeComplexity}

Changes:
${changesStr}

Provide a comprehensive explanation including:
1. What was changed (summary)
2. Why it was likely changed (intent)
3. Potential impact on the system
4. Any risks or considerations
5. Testing recommendations

Respond with JSON in this format:
{
  "summary": "brief overview of changes",
  "impact": {
    "risk": "low/medium/high",
    "scope": "local/module/system",
    "affectedComponents": ["list", "of", "components"],
    "potentialIssues": ["potential", "issues"],
    "testingRecommendations": ["testing", "suggestions"]
  },
  "technicalDetails": ["detailed", "explanations"],
  "businessContext": "why this change matters",
  "migrationNotes": ["migration", "steps", "if", "needed"]
}`;
  }

  private buildPRPrompt(context: CommitContext): string {
    // Create detailed change descriptions with actual diff content for analysis
    const detailedChanges = context.changes.map(change => {
      const fileSummary = `File: ${change.file} (${change.type}, +${change.insertions} -${change.deletions})`;
      
      if (change.hunks.length === 0) {
        return fileSummary;
      }
      
      // Include actual code changes for semantic analysis
      const significantHunks = change.hunks.slice(0, 3).map(hunk => {
        const contextLines = hunk.lines.slice(0, 20).map(line => {
          const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
          return `${prefix} ${line.content}`;
        }).join('\n');
        
        return `  ${hunk.header}\n${contextLines}${hunk.lines.length > 20 ? '\n  [...more lines]' : ''}`;
      }).join('\n');
      
      return `${fileSummary}\n${significantHunks}${change.hunks.length > 3 ? '\n  [...additional hunks]' : ''}`;
    }).join('\n\n');

    return `Create a comprehensive, contextually accurate PR description by analyzing the actual code changes below.

IMPORTANT: Analyze the actual diff content to understand:
- What functionality is being added, modified, or removed
- The technical approach and implementation details
- Potential impact on system behavior and architecture
- Breaking changes or API modifications
- Testing requirements based on the actual changes

Repository: ${context.repository.name} (${context.repository.language})
Branch: ${context.branch} → ${context.repository.patterns.commitStyle}
Files changed: ${context.metadata.fileCount}
Lines: +${context.metadata.totalInsertions} -${context.metadata.totalDeletions}

ACTUAL CODE CHANGES FOR ANALYSIS:
${detailedChanges}

Based on your analysis of the actual diffs above, create a PR description that:
1. Accurately describes what the code changes do (not just file names)
2. Explains the technical approach and reasoning
3. Identifies the business value or problem being solved
4. Lists relevant testing scenarios based on the changes
5. Highlights any breaking changes, API modifications, or migration needs
6. Considers architectural or performance implications

Respond with JSON in this format:
{
  "title": "Clear, specific PR title reflecting the actual changes",
  "description": "Detailed description based on diff analysis explaining what and why",
  "checklist": ["specific testing items relevant to the changes"],
  "testingInstructions": ["detailed test scenarios based on actual modifications"],
  "breakingChanges": ["specific breaking changes found in diffs, if any"],
  "dependencies": ["dependencies or prerequisites identified from changes"]
}`;
  }

  private buildReviewPrompt(context: CommitContext, persona: ReviewPersona): string {
    const changesStr = context.changes.map(change => 
      `File: ${change.file}\n${change.hunks.map(hunk => hunk.lines.map(l => l.content).join('\n')).join('\n')}`
    ).join('\n\n');

    return `Review this code as a ${persona.name} with ${persona.strictness} standards:

Focus areas: ${persona.focus.join(', ')}
Custom rules: ${persona.customRules.join(', ')}

Repository: ${context.repository.name} (${context.repository.language})
Changes:
${changesStr}

Provide:
1. Overall assessment and rating
2. Specific suggestions with file/line references
3. Security, performance, or maintainability issues
4. Compliments for good practices
5. Blocking issues that must be fixed

Respond with JSON in this format:
{
  "overall": {
    "rating": "excellent/good/needs-work/major-issues",
    "confidence": 0.9,
    "summary": "overall assessment"
  },
  "suggestions": [
    {
      "file": "filename",
      "line": 42,
      "type": "bug/performance/security/maintainability/style",
      "severity": "info/warning/error",
      "message": "description of issue",
      "suggestion": "how to fix it",
      "confidence": 0.8
    }
  ],
  "compliments": ["positive", "feedback"],
  "blockers": [
    {
      "file": "filename",
      "type": "bug",
      "severity": "error",
      "message": "blocking issue",
      "confidence": 0.95
    }
  ]
}`;
  }

  private buildRefinementPrompt(originalMessage: CommitMessage, refinementInstruction: string, context: CommitContext): string {
    const patterns = context.repository.patterns;
    
    return `Refine this commit message based on the specific user instruction:

Original Commit Message:
Title: ${originalMessage.title}
Body: ${originalMessage.body || 'None'}
Type: ${originalMessage.type}
Scope: ${originalMessage.scope || 'None'}
Confidence: ${originalMessage.confidence}
Reasoning: ${originalMessage.reasoning}

User Refinement Request: "${refinementInstruction}"

Context:
- Repository: ${context.repository.name} (${context.repository.language})
- Team commit style: ${patterns.commitStyle}
- Max length: ${patterns.maxLength} characters
- Common prefixes: ${patterns.prefixes.join(', ')}
- Files changed: ${context.changes.length}
- Total changes: +${context.metadata.totalInsertions} -${context.metadata.totalDeletions}

Files involved:
${context.changes.slice(0, 5).map(change => 
  `- ${change.file} (${change.type}, +${change.insertions} -${change.deletions})`
).join('\n')}

Please refine the commit message according to the user's instruction while:
1. Keeping it accurate to the actual code changes
2. Following the team's ${patterns.commitStyle} convention
3. Staying under ${patterns.maxLength} characters for the title
4. Maintaining or improving the technical quality
5. Preserving essential context and details

Respond with JSON in this format:
{
  "title": "refined commit message title",
  "body": "refined body (optional)",
  "type": "conventional commit type",
  "scope": "optional scope",
  "confidence": 0.95,
  "reasoning": "explanation of how the refinement addresses the user's request"
}`;
  }

  private buildDocumentationPrompt(type: string, context: any, config: any): string {
    const repository = context.repository;
    const projectStructure = context.projectStructure;
    const codeAnalysis = context.codeAnalysis;
    
    // Enhanced context with mastro flow information
    const baseContext = `Project: ${repository.name}
Language: ${repository.language}
Framework: ${repository.framework || 'None'}
Total Files: ${projectStructure.files.length}
Total Lines: ${codeAnalysis.complexity.metrics.totalLines.toLocaleString()}
Complexity: ${codeAnalysis.complexity.overall}

## Mastro CLI Context
This project includes the Mastro CLI system with the following key components:
- **mastro flow**: Complete workflow orchestration (Split → Review → Docs → Commit → PR → Analytics)
- **mastro review**: AI-powered code review with compliment validation improvements
- **mastro split**: Intelligent commit boundary analysis
- **mastro commit**: Enhanced commit message generation
- **mastro pr**: Pull request creation and management
- **Documentation System**: Multi-format documentation generation with Mermaid diagrams

## Recent Enhancements
- Fixed "[object Object]" display issue in review compliments
- Enhanced AI client validation for object-to-string conversion
- Improved workflow orchestration with checkpoint management
- Added comprehensive documentation generation capabilities

## Current Branch Context
${context.currentBranch ? `Branch: ${context.currentBranch}` : 'Branch: main'}
${context.recentCommits ? `Recent commits: ${context.recentCommits.slice(0, 3).map((c: any) => c.subject).join(', ')}` : ''}`;

    switch (type) {
      case 'api':
        return this.buildApiDocPrompt(baseContext, projectStructure, codeAnalysis);
      case 'architecture':
        return this.buildArchitectureDocPrompt(baseContext, projectStructure, codeAnalysis);
      case 'user-guide':
        return this.buildUserGuideDocPrompt(baseContext, projectStructure, codeAnalysis);
      case 'readme':
        return this.buildReadmeDocPrompt(baseContext, projectStructure, codeAnalysis);
      case 'workflow':
        return this.buildWorkflowDocPrompt(baseContext, projectStructure, codeAnalysis);
      case 'integration':
        return this.buildIntegrationDocPrompt(baseContext, projectStructure, codeAnalysis);
      default:
        return `Generate comprehensive ${type} documentation for this project:

${baseContext}

Focus on the Mastro CLI system and its workflow capabilities. Include practical examples of mastro flow usage, recent improvements, and best practices for development workflow automation.

Please create detailed, practical documentation that helps users understand and work with this project effectively.`;
    }
  }

  private buildApiDocPrompt(baseContext: string, projectStructure: any, codeAnalysis: any): string {
    const apiFiles = projectStructure.files.filter((f: any) => f.apis && f.apis.length > 0);
    const functionFiles = projectStructure.files.filter((f: any) => f.functions && f.functions.length > 0);
    
    let apiDetails = '';
    if (apiFiles.length > 0) {
      apiDetails = '\n\nAPI Endpoints Found:\n';
      for (const file of apiFiles.slice(0, 10)) {
        apiDetails += `File: ${file.path}\n`;
        for (const api of file.apis.slice(0, 5)) {
          apiDetails += `  ${api.method} ${api.path} - ${api.description || 'No description'}\n`;
          if (api.parameters && api.parameters.length > 0) {
            apiDetails += `    Parameters: ${api.parameters.map((p: any) => `${p.name}(${p.dataType})`).join(', ')}\n`;
          }
        }
      }
    }
    
    let functionDetails = '';
    if (functionFiles.length > 0) {
      functionDetails = '\n\nKey Functions Found:\n';
      for (const file of functionFiles.slice(0, 8)) {
        if (file.functions.length > 0) {
          functionDetails += `File: ${file.path}\n`;
          for (const func of file.functions.slice(0, 3)) {
            functionDetails += `  ${func.name}() - Complexity: ${func.complexity}, Async: ${func.isAsync}\n`;
            if (func.signature) {
              functionDetails += `    Signature: ${func.signature}\n`;
            }
          }
        }
      }
    }

    return `Generate comprehensive API documentation for this project:

${baseContext}${apiDetails}${functionDetails}

Create documentation that includes:
1. Overview of the API architecture and design principles
2. Authentication and authorization (if applicable)
3. Detailed endpoint documentation with examples
4. Request/response schemas
5. Error handling and status codes
6. Rate limiting and usage guidelines
7. SDK/client library information
8. Code examples in multiple languages where appropriate
9. Testing and development guidelines

Focus on practical examples and real-world usage scenarios. Make it easy for developers to integrate with this API.`;
  }

  private buildArchitectureDocPrompt(baseContext: string, projectStructure: any, codeAnalysis: any): string {
    let patternInfo = '';
    if (codeAnalysis.patterns && codeAnalysis.patterns.length > 0) {
      patternInfo = '\n\nArchitectural Patterns Detected:\n';
      for (const pattern of codeAnalysis.patterns) {
        patternInfo += `- ${pattern.name} (${pattern.type}) - Confidence: ${Math.round(pattern.confidence * 100)}%\n`;
        patternInfo += `  Evidence: ${pattern.evidence.join(', ')}\n`;
        patternInfo += `  Components: ${pattern.components.join(', ')}\n`;
      }
    }

    let depInfo = '';
    if (codeAnalysis.dependencies && codeAnalysis.dependencies.length > 0) {
      depInfo = '\n\nKey Dependencies:\n';
      const prodDeps = codeAnalysis.dependencies.filter((d: any) => d.type === 'production').slice(0, 10);
      for (const dep of prodDeps) {
        depInfo += `- ${dep.name} (${dep.version}) - ${dep.purpose}${dep.critical ? ' [CRITICAL]' : ''}\n`;
      }
    }

    return `Generate comprehensive architecture documentation for this project:

${baseContext}${patternInfo}${depInfo}

Directory Structure:
${projectStructure.directories.slice(0, 15).map((d: any) => `${d.path}${d.description ? ' - ' + d.description : ''}`).join('\n')}

Create documentation that includes:
1. High-level system architecture overview
2. Component relationships and data flow
3. Design patterns and architectural decisions
4. Technology stack and rationale
5. Directory structure and organization
6. Module dependencies and interfaces
7. Data models and storage architecture
8. Security architecture and considerations
9. Performance and scalability design
10. Deployment architecture
11. Mermaid diagrams for visual representation

Focus on helping both new team members and experienced developers understand the system design and make informed decisions about modifications or extensions.`;
  }

  private buildUserGuideDocPrompt(baseContext: string, projectStructure: any, codeAnalysis: any): string {
    let userFlowInfo = '';
    if (codeAnalysis.userFlows && codeAnalysis.userFlows.length > 0) {
      userFlowInfo = '\n\nUser Workflows Identified:\n';
      for (const flow of codeAnalysis.userFlows) {
        userFlowInfo += `- ${flow.name} (${flow.complexity} complexity)\n`;
        userFlowInfo += `  Steps: ${flow.steps.length}\n`;
      }
    }

    const configFiles = projectStructure.configFiles || [];
    const entryPoints = projectStructure.entryPoints || [];

    return `Generate a comprehensive user guide for this project:

${baseContext}${userFlowInfo}

Configuration Files: ${configFiles.join(', ')}
Entry Points: ${entryPoints.join(', ')}

Create user-focused documentation that includes:
1. Quick start guide with step-by-step setup
2. Installation and prerequisites
3. Basic usage and common workflows
4. Configuration options and customization
5. Troubleshooting common issues
6. Advanced features and use cases
7. Best practices and tips
8. FAQ section
9. Performance considerations for users
10. Integration examples

Write for users who want to accomplish tasks efficiently, not necessarily developers. Focus on practical outcomes and clear instructions.`;
  }

  private buildReadmeDocPrompt(baseContext: string, projectStructure: any, codeAnalysis: any): string {
    return `Generate a comprehensive README.md for this project:

${baseContext}

Key directories: ${projectStructure.directories.slice(0, 8).map((d: any) => d.path.split('/').pop()).join(', ')}
Entry points: ${projectStructure.entryPoints?.join(', ') || 'Not specified'}

Create a README that includes:
1. Clear project title and description
2. Key features and benefits
3. Quick start/installation instructions
4. Usage examples
5. Project structure overview
6. Development setup
7. Contributing guidelines
8. License information
9. Links to detailed documentation
10. Badges and status indicators

Make it compelling for both users and contributors. Focus on getting people excited about the project and helping them get started quickly.`;
  }

  private buildWorkflowDocPrompt(baseContext: string, projectStructure: any, codeAnalysis: any): string {
    return `Generate comprehensive workflow documentation for this project:

${baseContext}

## Mastro Flow Workflow System
This project implements an advanced workflow orchestration system with the following capabilities:
- **Complete Automation**: Split → Review → Docs → Commit → PR → Analytics
- **Intelligent Boundary Analysis**: Smart commit grouping and staging
- **AI-Powered Review**: Enhanced code review with validation improvements
- **Checkpoint Management**: Workflow recovery and continuation support
- **Multi-format Documentation**: Automated generation with Mermaid diagrams

## Recent Workflow Enhancements
- Fixed "[object Object]" display issue in review compliments
- Enhanced AI client validation for object-to-string conversion
- Improved workflow orchestration with checkpoint management
- Added comprehensive documentation generation capabilities

Create workflow documentation that includes:
1. **Getting Started**: Quick setup and first workflow execution
2. **Complete Workflow Guide**: Step-by-step mastro flow usage
3. **Command Reference**: All workflow-related commands and options
4. **Boundary Analysis**: How intelligent commit boundaries work
5. **Review Process**: AI-powered code review and validation
6. **Documentation Generation**: Multi-format docs with diagrams
7. **Error Recovery**: Checkpoint system and workflow continuation
8. **Advanced Usage**: Customization and workflow optimization
9. **Troubleshooting**: Common issues and solutions
10. **Best Practices**: Recommended workflows and patterns

Focus on practical examples and real-world scenarios. Include step-by-step guides for the complete mastro flow experience.`;
  }

  private buildIntegrationDocPrompt(baseContext: string, projectStructure: any, codeAnalysis: any): string {
    return `Generate comprehensive integration documentation for this project:

${baseContext}

## Integration Capabilities
This project provides extensive integration capabilities:
- **AI Provider Integration**: Anthropic Claude and OpenAI support
- **Git Integration**: Advanced git operations and analysis
- **Documentation Tools**: Multi-format generation and management
- **Development Workflow**: Complete CI/CD integration support

Create integration documentation that includes:
1. **API Integration**: How to integrate with external APIs
2. **AI Provider Setup**: Configuring Anthropic and OpenAI clients
3. **Git Integration**: Advanced git operations and hooks
4. **CI/CD Integration**: Workflow automation in pipelines
5. **IDE Integration**: Editor plugins and extensions
6. **Configuration Management**: Settings and customization
7. **Extension Development**: Building custom integrations
8. **Webhook Integration**: Real-time notifications and triggers
9. **Third-party Tools**: Integration with other development tools
10. **Troubleshooting**: Common integration issues and solutions

Focus on practical integration examples and real-world deployment scenarios.`;
  }

  private validateCommitMessage(message: CommitMessage): CommitMessage {
    if (!message.title || !message.type || !message.reasoning) {
      throw new Error('Invalid commit message format from AI');
    }
    
    if (message.confidence < 0 || message.confidence > 1) {
      message.confidence = 0.5;
    }
    
    // Check for generic/vague terms and reduce confidence if found
    const genericTerms = ['update', 'improve', 'enhance', 'modify', 'change', 'fix issue', 'add feature'];
    const titleLower = message.title.toLowerCase();
    
    let hasGenericTerms = false;
    for (const term of genericTerms) {
      if (titleLower.includes(term)) {
        hasGenericTerms = true;
        break;
      }
    }
    
    if (hasGenericTerms) {
      // Reduce confidence for generic messages
      message.confidence = Math.max(0.3, message.confidence - 0.2);
      
      // Add a note to reasoning about genericness
      message.reasoning += ' (Note: Contains generic terms - consider being more specific)';
    }
    
    // Check for sufficient detail (prefer messages with scope or specific technical terms)
    if (message.scope || this.hasSpecificTechnicalTerms(message.title)) {
      message.confidence = Math.min(1.0, message.confidence + 0.1);
    }
    
    return message;
  }

  private hasSpecificTechnicalTerms(title: string): boolean {
    const technicalTerms = [
      'authentication', 'authorization', 'validation', 'serialization', 'caching', 'optimization',
      'migration', 'integration', 'configuration', 'implementation', 'refactoring', 'algorithm',
      'database', 'api', 'endpoint', 'middleware', 'component', 'service', 'handler', 'controller',
      'model', 'schema', 'query', 'transaction', 'pipeline', 'workflow', 'parser', 'formatter',
      'encrypt', 'decrypt', 'hash', 'token', 'session', 'cookie', 'header', 'request', 'response',
      'timeout', 'retry', 'fallback', 'circuit breaker', 'load balancer', 'rate limit'
    ];
    
    const titleLower = title.toLowerCase();
    return technicalTerms.some(term => titleLower.includes(term));
  }

  private async validateCodeReview(review: CodeReview): Promise<CodeReview> {
    // Validate overall assessment
    if (!review.overall) {
      review.overall = {
        rating: 'good',
        confidence: 0.8,
        summary: 'Code review completed'
      };
    } else {
      review.overall.rating = review.overall.rating || 'good';
      review.overall.confidence = this.validateConfidence(review.overall.confidence);
      review.overall.summary = review.overall.summary || 'Code review completed';
    }

    // Validate suggestions array
    if (!Array.isArray(review.suggestions)) {
      review.suggestions = [];
    } else {
      review.suggestions = review.suggestions.map(suggestion => ({
        file: suggestion.file || '',
        line: suggestion.line || 0,
        type: suggestion.type || 'maintainability',
        severity: suggestion.severity || 'info',
        message: suggestion.message || 'Suggestion detected',
        suggestion: suggestion.suggestion || '',
        confidence: this.validateConfidence(suggestion.confidence)
      }));
    }

    // Validate blockers array
    if (!Array.isArray(review.blockers)) {
      review.blockers = [];
    } else {
      const fs = await import('fs').then(fs => fs.promises);
      const exists = async (p?: string) => !!p && await fs.access(p).then(() => true).catch(() => false);

      const processed = await Promise.all(review.blockers.map(async (blocker) => {
        let enhancedMessage = blocker.message || 'Issue detected';
        let enhancedSuggestion = blocker.suggestion || '';

        // If AI returned generic message, use fallback analysis
        if (!blocker.message || blocker.message === 'Issue detected' || blocker.message.trim().length < 10) {
          try {
            const analysis = await this.analyzeSpecificIssue(blocker.file, blocker.line, blocker.type);
            enhancedMessage = analysis.message;
            enhancedSuggestion = analysis.suggestion;
          } catch (error) {
            // If analysis fails, mark as generic for filtering
            enhancedMessage = 'Generic issue - analysis failed';
            enhancedSuggestion = 'Unable to provide specific analysis';
          }
        }

        return {
          file: blocker.file || '',
          line: blocker.line || 0,
          type: blocker.type || 'bug',
          severity: blocker.severity || 'error',
          message: enhancedMessage,
          suggestion: enhancedSuggestion,
          confidence: this.validateConfidence(blocker.confidence)
        };
      }));

      // Downgrade or discard phantom/generic blockers
      const validBlockers: typeof processed = [];
      for (const b of processed) {
        const fileMissing = !(await exists(b.file));
        const genericMessage = !b.message || 
          b.message === 'Issue detected' || 
          b.message.trim().length < 15 ||
          b.message.includes('Generic issue') ||
          b.message.includes('analysis failed') ||
          b.message === 'Code quality issue that needs attention before production deployment';
        if (fileMissing || genericMessage) {
          // Log the filtering for debugging
          console.log(`Filtering generic blocker: "${b.message}" (file: ${b.file}, line: ${b.line})`);
          
          // Downgrade to a non-blocking suggestion with explicit explanation
          review.suggestions = Array.isArray(review.suggestions) ? review.suggestions : [];
          review.suggestions.push({
            file: b.file,
            line: b.line,
            type: (b.type as any) || 'maintainability',
            severity: 'warning',
            message: fileMissing
              ? `AI flagged a potential issue in a non-existent file: ${b.file}. File may have been moved or deleted.`
              : `Code quality suggestion: Review this area for potential improvements (AI provided insufficient detail for blocking issue)`,
            suggestion: b.suggestion || 'Review the code carefully and consider refactoring if needed.',
            confidence: this.validateConfidence(b.confidence)
          });
          continue;
        }
        validBlockers.push(b);
      }
      review.blockers = validBlockers;
    }

    // Validate compliments array
    if (!Array.isArray(review.compliments)) {
      review.compliments = [];
    } else {
      review.compliments = review.compliments
        .map(compliment => {
          // Convert objects to strings if they have relevant properties
          if (typeof compliment === 'object' && compliment !== null) {
            const obj = compliment as any;
            if (obj.message || obj.text || obj.content) {
              return obj.message || obj.text || obj.content;
            }
            if (obj.toString && typeof obj.toString === 'function' && obj.toString() !== '[object Object]') {
              return obj.toString();
            }
            // If it's a plain object, try to extract a meaningful string
            const keys = Object.keys(obj);
            if (keys.length === 1 && typeof obj[keys[0]] === 'string') {
              return obj[keys[0]];
            }
            return null; // Will be filtered out
          }
          return compliment;
        })
        .filter(compliment => 
          compliment && typeof compliment === 'string' && compliment.trim().length > 0
        );
    }

    return review;
  }

  private validateConfidence(confidence: any): number {
    if (typeof confidence === 'number' && !isNaN(confidence) && confidence >= 0 && confidence <= 1) {
      return confidence;
    }
    return 0.8; // Default confidence level
  }

  private async analyzeSpecificIssue(file: string, line: number, type: string): Promise<{message: string, suggestion: string}> {
    try {
      // Try to read the specific file and analyze the issue
      const fs = await import('fs').then(fs => fs.promises);
      
      if (!file || !await fs.access(file).then(() => true).catch(() => false)) {
        return this.getGenericIssueAnalysis(type);
      }

      const fileContent = await fs.readFile(file, 'utf-8');
      const lines = fileContent.split('\n');
      
      // Get context around the problematic line
      const startLine = Math.max(0, line - 3);
      const endLine = Math.min(lines.length, line + 3);
      const contextLines = lines.slice(startLine, endLine);
      const problemLine = lines[line - 1]; // line is 1-indexed
      
      if (!problemLine) {
        return this.getGenericIssueAnalysis(type);
      }

      // Use AI to analyze the specific code context
      const analysisPrompt = `Analyze this specific code issue:

File: ${file}
Line ${line}: ${problemLine.trim()}

Context:
${contextLines.map((l, i) => `${startLine + i + 1}: ${l}`).join('\n')}

Issue Type: ${type}

Please provide:
1. A specific, detailed message explaining exactly what the issue is
2. Why this is problematic (potential consequences)
3. A concrete suggestion to fix it

Be specific and actionable. Focus on the exact problem in the code.`;

      const response = await this.client.responses.create({
        model: this.config.model,
        input: `Format: json\n${analysisPrompt}`,
        instructions: "You are a code analysis expert. Provide a detailed analysis of the specific code issue. Be precise, technical, and actionable. Respond in valid json format with 'message' and 'suggestion' fields only.",
        max_output_tokens: 300,
        temperature: 0.1,
        text: { format: { type: 'json_object' } }
      });

      const content = response.output_text || 
        (response.output?.[0]?.type === 'message' ? (response.output[0] as any).content?.[0]?.text : null);
        
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.message && parsed.suggestion) {
          return {
            message: parsed.message,
            suggestion: parsed.suggestion
          };
        }
      }
    } catch (error) {
      // Fall back to generic analysis if file reading or AI analysis fails
    }
    
    return this.getGenericIssueAnalysis(type);
  }

  private getGenericIssueAnalysis(type: string): {message: string, suggestion: string} {
    const issueAnalysis = {
      'bug': {
        message: 'Logic error or incorrect implementation that could cause runtime failures',
        suggestion: 'Review the code logic, add proper error handling, and ensure edge cases are covered'
      },
      'security': {
        message: 'Security vulnerability that could expose the application to attacks',
        suggestion: 'Implement proper input validation, sanitization, and security best practices'
      },
      'performance': {
        message: 'Performance bottleneck that could degrade application responsiveness',
        suggestion: 'Optimize algorithm complexity, reduce unnecessary computations, or implement caching'
      },
      'maintainability': {
        message: 'Code structure or pattern that makes maintenance difficult',
        suggestion: 'Refactor code to improve readability, reduce complexity, and follow established patterns'
      },
      'style': {
        message: 'Code style inconsistency that affects team collaboration',
        suggestion: 'Follow established coding standards and formatting guidelines'
      }
    };
    
    return issueAnalysis[type as keyof typeof issueAnalysis] || {
      message: 'Code quality issue that needs attention before production deployment',
      suggestion: 'Review the code carefully and address any potential problems'
    };
  }
}