import OpenAI from 'openai';
import type {
  AIProvider,
  MastroConfig,
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

export class AIClient {
  private provider: AIProvider;

  constructor(config: AIConfig) {
    switch (config.provider) {
      case 'openai':
        this.provider = new OpenAIProvider(config);
        break;
      case 'anthropic':
        throw new Error('Anthropic provider not yet implemented');
      case 'local':
        throw new Error('Local provider not yet implemented');
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }

  async generateCommitMessage(context: CommitContext): Promise<CommitMessage> {
    return this.provider.generateCommitMessage(context);
  }

  async refineCommitMessage(originalMessage: CommitMessage, refinementInstruction: string, context: CommitContext): Promise<CommitMessage> {
    return this.provider.refineCommitMessage(originalMessage, refinementInstruction, context);
  }

  async explainChanges(context: CommitContext): Promise<DiffExplanation> {
    return this.provider.explainChanges(context);
  }

  async createPRDescription(context: CommitContext): Promise<PRDescription> {
    return this.provider.createPRDescription(context);
  }

  async reviewCode(context: CommitContext, persona: ReviewPersona): Promise<CodeReview> {
    return this.provider.reviewCode(context, persona);
  }
}

class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
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
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: `You are a Principal Software Engineer with 15+ years of experience leading engineering teams at top-tier technology companies. Your responsibility is to ensure the highest standards of code quality, maintainability, and engineering best practices across the entire codebase.

As the technical authority, you:
- Enforce conventional commit standards and semantic versioning principles
- Ensure commit messages provide clear context for future developers and maintainers
- Identify potential architectural issues and breaking changes
- Maintain consistency with established team patterns and coding standards
- Consider the broader impact of changes on system reliability and performance

Generate commit messages that reflect your senior-level understanding of software engineering principles. Focus on clarity, precision, and long-term maintainability. Respond with valid JSON only.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
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
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: `You are a Principal Software Engineer with 15+ years of experience. Your task is to refine commit messages based on specific instructions while maintaining technical accuracy and team conventions.

Your refinement responsibilities:
- Apply the specific refinement instruction precisely while maintaining message quality
- Ensure the refined message still accurately describes the code changes
- Preserve important technical details and context
- Maintain adherence to team conventions and commit standards
- Keep the message clear, concise, and professional

Provide a refined commit message that addresses the user's specific request while improving the overall quality. Respond with valid JSON only.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
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
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: `You are a Principal Software Engineer and Technical Lead responsible for code quality and system architecture. Your deep expertise spans multiple domains: system design, performance optimization, security, scalability, and team leadership.

Your analysis responsibilities:
- Provide comprehensive technical analysis that considers both immediate and long-term implications
- Identify potential risks, performance impacts, and architectural concerns
- Explain changes in context of the broader system architecture
- Consider maintainability, scalability, and operational impact
- Highlight security implications and best practice adherence
- Assess the quality of the implementation approach

Deliver insights that demonstrate your principal-level understanding of software engineering. Focus on what matters most for system reliability, team productivity, and business success. Respond with valid JSON only.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
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
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: `You are a Principal Software Engineer and Technical Lead responsible for maintaining the highest standards of code delivery and team collaboration. You have extensive experience with code reviews, release management, and cross-functional team coordination.

Your PR description responsibilities:
- Create comprehensive, professional PR descriptions that facilitate effective code reviews
- Ensure proper documentation of changes, rationale, and testing approach
- Identify and communicate potential risks, breaking changes, and deployment considerations
- Provide clear testing instructions that enable thorough validation
- Consider the impact on different stakeholders: developers, QA, operations, and business teams
- Establish clear acceptance criteria and success metrics

Craft PR descriptions that reflect your senior leadership perspective and commitment to engineering excellence. Focus on clarity, completeness, and enabling successful collaboration. Respond with valid JSON only.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
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
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: `You are a Principal Software Engineer acting as a ${persona.name} conducting a ${persona.strictness} code review. You have the authority and responsibility to ensure this code meets production standards and company engineering guidelines.

As a technical leader with deep domain expertise, you focus on: ${persona.focus.join(', ')}
Custom review criteria: ${persona.customRules.join(', ')}

Your review standards:
- Code must be production-ready, maintainable, and aligned with architectural principles
- Security vulnerabilities and performance issues are non-negotiable blockers
- Ensure proper error handling, logging, and observability
- Validate adherence to team coding standards and best practices
- Consider long-term maintainability and technical debt implications
- Provide constructive, actionable feedback that helps developers grow

Conduct this review with the rigor and insight expected from a principal-level engineer. Be thorough, authoritative, and focused on system reliability and team success. Respond with valid JSON only.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content) as CodeReview;
    } catch (error) {
      throw new Error(`Failed to review code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildCommitPrompt(context: CommitContext): string {
    const changesStr = context.changes.map(change => 
      `File: ${change.file} (${change.type}, +${change.insertions} -${change.deletions})`
    ).join('\n');

    const patterns = context.repository.patterns;
    
    return `Analyze these git changes and generate a commit message:

Repository: ${context.repository.name} (${context.repository.language}${context.repository.framework ? `, ${context.repository.framework}` : ''})
Branch: ${context.branch}
Changes (${context.metadata.fileCount} files, +${context.metadata.totalInsertions} -${context.metadata.totalDeletions}):

${changesStr}

Team Patterns:
- Style: ${patterns.commitStyle}
- Common prefixes: ${patterns.prefixes.join(', ')}
- Max length: ${patterns.maxLength}
- Common phrases: ${patterns.commonPhrases.join(', ')}

Recent commits for context:
${context.repository.recentCommits.slice(0, 5).map(c => `- ${c.message}`).join('\n')}

Generate a commit message that:
1. Follows the team's ${patterns.commitStyle} style
2. Is under ${patterns.maxLength} characters
3. Clearly describes what was changed and why
4. Uses appropriate conventional commit type (feat, fix, docs, etc.)

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
    const changesStr = context.changes.map(change => 
      `- ${change.file} (${change.type}, +${change.insertions} -${change.deletions})`
    ).join('\n');

    return `Create a comprehensive PR description for these changes:

Repository: ${context.repository.name} (${context.repository.language})
Branch: ${context.branch} → ${context.repository.patterns.commitStyle}
Files changed: ${context.metadata.fileCount}
Lines: +${context.metadata.totalInsertions} -${context.metadata.totalDeletions}

Changes:
${changesStr}

Create a PR description with:
1. Clear title and description
2. What was done and why
3. Testing checklist
4. Any breaking changes
5. Dependencies or migration steps

Respond with JSON in this format:
{
  "title": "PR title",
  "description": "detailed description",
  "checklist": ["testing", "items"],
  "testingInstructions": ["how", "to", "test"],
  "breakingChanges": ["breaking", "changes", "if", "any"],
  "dependencies": ["dependencies", "if", "any"]
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

  private validateCommitMessage(message: CommitMessage): CommitMessage {
    if (!message.title || !message.type || !message.reasoning) {
      throw new Error('Invalid commit message format from AI');
    }
    
    if (message.confidence < 0 || message.confidence > 1) {
      message.confidence = 0.5;
    }
    
    return message;
  }
  
  private buildOptimizedCommitPrompt(context: CommitContext, allocation: any, complexityAnalysis: any): string {
    const selectedChanges = allocation.selectedChanges;
    const patterns = context.repository.patterns;
    
    // Build change descriptions with importance context
    const changesStr = selectedChanges.map((change: any) => {
      const importance = change.importance.category.toUpperCase();
      const reasons = change.importance.reasons.length > 0 ? ` (${change.importance.reasons[0]})` : '';
      return `[${importance}] ${change.file} (${change.type}, +${change.insertions} -${change.deletions})${reasons}`;
    }).join('\n');
    
    // Add complexity context
    const complexityInfo = complexityAnalysis.category !== 'simple' 
      ? `\n\nComplexity Analysis: ${complexityAnalysis.category.toUpperCase()} (score: ${complexityAnalysis.score})\nKey metrics: ${complexityAnalysis.metrics.fileCount} files, ${complexityAnalysis.metrics.totalLines} lines, ${complexityAnalysis.metrics.criticalChanges} critical changes`
      : '';
    
    // Add warnings if any
    const warningsStr = complexityAnalysis.warnings.length > 0 
      ? `\n\nWarnings:\n${complexityAnalysis.warnings.map((w: any) => `- ${w.title}: ${w.message}`).join('\n')}`
      : '';
    
    return `Analyze these git changes and generate a commit message:

Repository: ${context.repository.name} (${context.repository.language}${context.repository.framework ? `, ${context.repository.framework}` : ''})
Branch: ${context.branch}
Token Usage: ${allocation.tokenUsage.used}/${allocation.tokenUsage.available} tokens (${allocation.tokenUsage.efficiency.toFixed(0)}% efficiency)

Prioritized Changes (${selectedChanges.length}/${context.changes.length} files):
${changesStr}${complexityInfo}${warningsStr}

Team Patterns:
- Style: ${patterns.commitStyle}
- Common prefixes: ${patterns.prefixes.join(', ')}
- Max length: ${patterns.maxLength}
- Common phrases: ${patterns.commonPhrases.join(', ')}

Recent commits for context:
${context.repository.recentCommits.slice(0, 5).map(c => `- ${c.message}`).join('\n')}

Generate a commit message that:
1. Follows the team's ${patterns.commitStyle} style
2. Is under ${patterns.maxLength} characters
3. Focuses on the most important changes (critical and high priority)
4. Uses appropriate conventional commit type (feat, fix, docs, etc.)
5. Reflects the complexity and scope of the changes

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
  
  private buildOptimizedExplanationPrompt(context: CommitContext, allocation: any, complexityAnalysis: any): string {
    const selectedChanges = allocation.selectedChanges;
    
    // Build intelligent change descriptions based on importance
    const changesStr = selectedChanges.map((change: any) => {
      const importance = change.importance.category;
      const summary = `[${importance.toUpperCase()}] ${change.file} (${change.type}, +${change.insertions} -${change.deletions})`;
      
      if (importance === 'critical' || importance === 'high') {
        // Show full context for important changes
        const detailedHunks = change.hunks.slice(0, 3).map((hunk: any) => {
          const contextLines = hunk.lines.slice(0, 15).map((l: any) => 
            `    ${l.type}: ${l.content.substring(0, 120)}`
          ).join('\n');
          return `  ${hunk.header}\n${contextLines}${hunk.lines.length > 15 ? '\n    [... more lines]' : ''}`;
        }).join('\n');
        
        return `${summary}\nReasons: ${change.importance.reasons.join(', ')}\n${detailedHunks}${change.hunks.length > 3 ? '\n  [... additional hunks]' : ''}`;
      } else {
        // Show summary for lower priority changes
        return `${summary}\n  [${change.importance.reasons[0] || 'Standard change'}]`;
      }
    }).join('\n\n');
    
    // Complexity and efficiency context
    const analysisContext = `
Intelligent Analysis:
- Complexity: ${complexityAnalysis.category} (score: ${complexityAnalysis.score}/100)
- Token efficiency: ${allocation.tokenUsage.efficiency.toFixed(0)}% of important content preserved
- Compression: ${allocation.compressionSummary}
- Files analyzed: ${selectedChanges.length}/${context.changes.length} (prioritized by importance)`;
    
    // Add warnings context
    const warningsContext = complexityAnalysis.warnings.length > 0 
      ? `\n\nComplexity Warnings:\n${complexityAnalysis.warnings.map((w: any) => 
          `- ${w.level.toUpperCase()}: ${w.title} - ${w.message}`
        ).join('\n')}`
      : '';
    
    return `Explain these prioritized code changes in detail:

Repository: ${context.repository.name} (${context.repository.language}${context.repository.framework ? `, ${context.repository.framework}` : ''})
Branch: ${context.branch}${analysisContext}${warningsContext}

Prioritized Changes:
${changesStr}

Provide a comprehensive explanation including:
1. What was changed (focus on critical and high importance changes)
2. Why it was likely changed (business/technical intent)
3. Potential impact on the system (consider complexity analysis)
4. Any risks or considerations (especially from warnings above)
5. Testing recommendations (based on change importance)
6. Long-term architectural implications

Respond with JSON in this format:
{
  "summary": "executive summary focusing on most important changes",
  "impact": {
    "risk": "low/medium/high/critical",
    "scope": "local/module/system",
    "affectedComponents": ["components", "affected"],
    "potentialIssues": ["issues", "based", "on", "analysis"],
    "testingRecommendations": ["testing", "suggestions"]
  },
  "technicalDetails": ["detailed", "technical", "explanations"],
  "businessContext": "why this change matters from business perspective",
  "migrationNotes": ["migration", "steps", "if", "needed"],
  "architecturalConsiderations": ["long-term", "architectural", "impacts"]
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
}