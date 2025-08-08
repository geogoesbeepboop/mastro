import OpenAI from 'openai';
export class StreamingAIClient {
    client;
    config;
    constructor(config) {
        this.config = config;
        if (!config.apiKey) {
            throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable or configure it in mastro.config.json');
        }
        this.client = new OpenAI({
            apiKey: config.apiKey
        });
    }
    async *streamCommitMessage(context, options) {
        const prompt = this.buildCommitPrompt(context);
        try {
            const stream = await this.client.chat.completions.create({
                model: this.config.model,
                messages: [
                    {
                        role: 'system',
                        content: `You are a Principal Software Engineer with 15+ years of experience. Generate commit messages that reflect your senior-level understanding. Respond with valid JSON only.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature,
                response_format: { type: 'json_object' },
                stream: true
            });
            let fullContent = '';
            let chunkIndex = 0;
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content;
                if (delta) {
                    fullContent += delta;
                    chunkIndex++;
                    // Try to parse partial JSON for progress updates
                    try {
                        const partial = JSON.parse(fullContent);
                        yield {
                            id: `commit-${Date.now()}`,
                            type: 'chunk',
                            data: partial,
                            progress: Math.min((chunkIndex / 20) * 100, 90) // Estimate progress
                        };
                        if (options.chunkHandler) {
                            options.chunkHandler({
                                id: `commit-${Date.now()}`,
                                type: 'chunk',
                                data: partial
                            });
                        }
                    }
                    catch {
                        // JSON not complete yet, continue
                        yield {
                            id: `commit-${Date.now()}`,
                            type: 'chunk',
                            progress: Math.min((chunkIndex / 20) * 100, 90)
                        };
                    }
                }
            }
            // Final parse and validation
            const final = JSON.parse(fullContent);
            const validated = this.validateCommitMessage(final);
            yield {
                id: `commit-${Date.now()}`,
                type: 'complete',
                data: validated,
                progress: 100
            };
            if (options.chunkHandler) {
                options.chunkHandler({
                    id: `commit-${Date.now()}`,
                    type: 'complete',
                    data: validated
                });
            }
        }
        catch (error) {
            const errorMsg = `Failed to generate commit message: ${error instanceof Error ? error.message : 'Unknown error'}`;
            yield {
                id: `commit-error-${Date.now()}`,
                type: 'error',
                error: errorMsg
            };
            if (options.errorHandler) {
                options.errorHandler(errorMsg);
            }
        }
    }
    async *streamExplainChanges(context, options) {
        const prompt = this.buildExplanationPrompt(context);
        try {
            const stream = await this.client.chat.completions.create({
                model: this.config.model,
                messages: [
                    {
                        role: 'system',
                        content: `You are a Principal Software Engineer providing comprehensive technical analysis. Focus on system reliability, team productivity, and business success. Respond with valid JSON only.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature,
                response_format: { type: 'json_object' },
                stream: true
            });
            let fullContent = '';
            let chunkIndex = 0;
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content;
                if (delta) {
                    fullContent += delta;
                    chunkIndex++;
                    try {
                        const partial = JSON.parse(fullContent);
                        yield {
                            id: `explain-${Date.now()}`,
                            type: 'chunk',
                            data: partial,
                            progress: Math.min((chunkIndex / 30) * 100, 90)
                        };
                        if (options.chunkHandler) {
                            options.chunkHandler({
                                id: `explain-${Date.now()}`,
                                type: 'chunk',
                                data: partial
                            });
                        }
                    }
                    catch {
                        yield {
                            id: `explain-${Date.now()}`,
                            type: 'chunk',
                            progress: Math.min((chunkIndex / 30) * 100, 90)
                        };
                    }
                }
            }
            const final = JSON.parse(fullContent);
            yield {
                id: `explain-${Date.now()}`,
                type: 'complete',
                data: final,
                progress: 100
            };
            if (options.chunkHandler) {
                options.chunkHandler({
                    id: `explain-${Date.now()}`,
                    type: 'complete',
                    data: final
                });
            }
        }
        catch (error) {
            const errorMsg = `Failed to explain changes: ${error instanceof Error ? error.message : 'Unknown error'}`;
            yield {
                id: `explain-error-${Date.now()}`,
                type: 'error',
                error: errorMsg
            };
            if (options.errorHandler) {
                options.errorHandler(errorMsg);
            }
        }
    }
    async *streamSessionReview(session, persona, options) {
        const context = this.sessionToCommitContext(session);
        const prompt = this.buildReviewPrompt(context, persona);
        try {
            const stream = await this.client.chat.completions.create({
                model: this.config.model,
                messages: [
                    {
                        role: 'system',
                        content: this.buildReviewSystemPrompt(persona)
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature,
                response_format: { type: 'json_object' },
                stream: true
            });
            let fullContent = '';
            let chunkIndex = 0;
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content;
                if (delta) {
                    fullContent += delta;
                    chunkIndex++;
                    try {
                        const partial = JSON.parse(fullContent);
                        const sessionReview = {
                            ...partial,
                            sessionId: session.id,
                            scope: this.determineScope(session)
                        };
                        yield {
                            id: `review-${Date.now()}`,
                            type: 'chunk',
                            data: sessionReview,
                            progress: Math.min((chunkIndex / 40) * 100, 90)
                        };
                        if (options.chunkHandler) {
                            options.chunkHandler({
                                id: `review-${Date.now()}`,
                                type: 'chunk',
                                data: sessionReview
                            });
                        }
                    }
                    catch {
                        yield {
                            id: `review-${Date.now()}`,
                            type: 'chunk',
                            progress: Math.min((chunkIndex / 40) * 100, 90)
                        };
                        if (options.progressHandler) {
                            options.progressHandler(Math.min((chunkIndex / 40) * 100, 90));
                        }
                    }
                }
            }
            const baseReview = JSON.parse(fullContent);
            const final = {
                ...baseReview,
                sessionId: session.id,
                scope: this.determineScope(session),
                actionableItems: [],
                learningPoints: [],
                workflowSuggestions: []
            };
            yield {
                id: `review-${Date.now()}`,
                type: 'complete',
                data: final,
                progress: 100
            };
            if (options.chunkHandler) {
                options.chunkHandler({
                    id: `review-${Date.now()}`,
                    type: 'complete',
                    data: final
                });
            }
        }
        catch (error) {
            const errorMsg = `Failed to review session: ${error instanceof Error ? error.message : 'Unknown error'}`;
            yield {
                id: `review-error-${Date.now()}`,
                type: 'error',
                error: errorMsg
            };
            if (options.errorHandler) {
                options.errorHandler(errorMsg);
            }
        }
    }
    // Non-streaming fallback methods
    async generateCommitMessage(context) {
        for await (const chunk of this.streamCommitMessage(context, { enabled: true, chunkHandler: () => { } })) {
            if (chunk.type === 'complete' && chunk.data) {
                return chunk.data;
            }
            if (chunk.type === 'error') {
                throw new Error(chunk.error);
            }
        }
        throw new Error('Failed to generate commit message');
    }
    async explainChanges(context) {
        for await (const chunk of this.streamExplainChanges(context, { enabled: true, chunkHandler: () => { } })) {
            if (chunk.type === 'complete' && chunk.data) {
                return chunk.data;
            }
            if (chunk.type === 'error') {
                throw new Error(chunk.error);
            }
        }
        throw new Error('Failed to explain changes');
    }
    // Private helper methods
    buildCommitPrompt(context) {
        return `Analyze the following git changes and generate a commit message:

Branch: ${context.branch}
Files changed: ${context.changes.length}
Total insertions: ${context.metadata.totalInsertions}
Total deletions: ${context.metadata.totalDeletions}

Changes:
${context.changes.map(change => `
File: ${change.file} (${change.type})
+${change.insertions} -${change.deletions}
${change.hunks.slice(0, 3).map(hunk => hunk.lines.slice(0, 5).map(line => `${line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}${line.content}`).join('\n')).join('\n')}
`).join('\n')}

Generate a commit message with:
- title: concise summary (max 50 chars)
- body: detailed explanation (optional)
- type: conventional commit type
- scope: affected area (optional)
- confidence: 0-1 score
- reasoning: explanation of the commit message choice`;
    }
    buildExplanationPrompt(context) {
        return `Analyze and explain the following code changes:

Repository: ${context.repository.name}
Branch: ${context.branch}
Language: ${context.repository.language}
Framework: ${context.repository.framework || 'Not detected'}
Total changes: ${context.changes.length} files, +${context.metadata.totalInsertions}/-${context.metadata.totalDeletions} lines

Files changed:
${context.changes.map(change => `
${change.file} (${change.type}): +${change.insertions}/-${change.deletions}
${change.hunks.slice(0, 2).map(hunk => hunk.lines.slice(0, 10).map(line => `${line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}${line.content}`).join('\n')).join('\n')}
`).join('\n')}

Provide a comprehensive analysis including:
- summary: high-level overview
- impact: risk assessment and scope
- technicalDetails: implementation specifics
- recommendations: actionable suggestions`;
    }
    buildReviewPrompt(context, persona) {
        return `Perform a code review for the following changes:

Review Persona: ${persona.name}
Focus Areas: ${persona.focus.join(', ')}
Strictness: ${persona.strictness}
Custom Rules: ${persona.customRules.join(', ')}

Code Changes:
${context.changes.map(change => `
File: ${change.file} (${change.type})
Changes: +${change.insertions}/-${change.deletions}
${change.hunks.map(hunk => hunk.lines.map(line => `${line.lineNumber || ''}${line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}${line.content}`).join('\n')).join('\n')}
`).join('\n')}

Provide a comprehensive review including:
- overall: rating and summary
- suggestions: specific improvement recommendations with file/line references
- compliments: positive aspects of the code
- blockers: critical issues that must be addressed`;
    }
    buildReviewSystemPrompt(persona) {
        const focusAreas = {
            security: 'security vulnerabilities, input validation, authentication, authorization, and data protection',
            performance: 'algorithmic efficiency, resource usage, caching strategies, and scalability concerns',
            maintainability: 'code organization, readability, documentation, and long-term maintainability',
            testing: 'test coverage, test quality, edge cases, and testability of the code'
        };
        const focusDescriptions = persona.focus.map(area => focusAreas[area]).join(', ');
        return `You are a ${persona.name} conducting a code review with a focus on ${focusDescriptions}.
    
Your review approach:
- Strictness Level: ${persona.strictness} (lenient = constructive suggestions, moderate = balanced feedback, strict = rigorous standards)
- Focus Areas: Prioritize ${persona.focus.join(', ')} in your analysis
- Custom Rules: ${persona.customRules.length > 0 ? persona.customRules.join(', ') : 'Apply standard best practices'}

Provide actionable, constructive feedback that helps improve code quality while maintaining development velocity. Respond with valid JSON only.`;
    }
    validateCommitMessage(message) {
        if (!message.title || !message.type) {
            throw new Error('Invalid commit message: missing required fields');
        }
        if (message.title.length > 72) {
            message.title = message.title.substring(0, 69) + '...';
        }
        return message;
    }
    sessionToCommitContext(session) {
        const allChanges = [...session.workingChanges, ...session.stagedChanges];
        return {
            changes: allChanges,
            branch: session.baseBranch,
            repository: {
                name: 'current-session',
                root: process.cwd(),
                language: 'typescript', // Should be detected properly
                patterns: {
                    commitStyle: 'conventional',
                    prefixes: [],
                    maxLength: 72,
                    commonPhrases: [],
                    reviewPersona: {
                        name: 'Senior Engineer',
                        focus: ['maintainability'],
                        strictness: 'moderate',
                        customRules: []
                    }
                },
                recentCommits: []
            },
            staged: session.stagedChanges.length > 0,
            workingDir: process.cwd(),
            metadata: {
                totalInsertions: session.cumulativeStats.totalInsertions,
                totalDeletions: session.cumulativeStats.totalDeletions,
                fileCount: session.cumulativeStats.totalFiles,
                changeComplexity: session.cumulativeStats.complexity === 'critical' ? 'high' : session.cumulativeStats.complexity
            }
        };
    }
    determineScope(session) {
        if (session.stagedChanges.length > 0 && session.workingChanges.length > 0) {
            return 'session';
        }
        else if (session.stagedChanges.length > 0) {
            return 'staged';
        }
        else {
            return 'working';
        }
    }
}
//# sourceMappingURL=streaming-client.js.map