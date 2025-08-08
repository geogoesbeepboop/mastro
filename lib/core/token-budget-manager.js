export class TokenBudgetManager {
    static MODEL_LIMITS = {
        'gpt-4o-mini': 128000,
        'gpt-4': 8192,
        'gpt-4-turbo': 128000,
        'gpt-3.5-turbo': 16384,
    };
    static COMPRESSION_LEVELS = [
        {
            name: 'full',
            tokenLimit: 5000,
            strategies: []
        },
        {
            name: 'moderate',
            tokenLimit: 15000,
            strategies: [
                {
                    name: 'test_file_summarization',
                    description: 'Summarize test files instead of showing full content',
                    apply: (changes) => changes.map(change => {
                        if (change.file.includes('test') || change.file.includes('spec')) {
                            return {
                                ...change,
                                hunks: [{
                                        header: `@@ Test file summary: +${change.insertions} -${change.deletions} @@`,
                                        startLine: 1,
                                        endLine: 1,
                                        lines: [{
                                                type: 'context',
                                                content: `[Test file with ${change.hunks.length} changes - summarized]`,
                                                lineNumber: 1
                                            }]
                                    }]
                            };
                        }
                        return change;
                    })
                }
            ]
        },
        {
            name: 'aggressive',
            tokenLimit: 50000,
            strategies: [
                {
                    name: 'function_signature_only',
                    description: 'Show only function signatures for large files',
                    apply: (changes) => changes.map(change => {
                        if (change.importance.tokens > 1000) {
                            const signatureLines = change.hunks.flatMap(hunk => hunk.lines.filter(line => /function\s+\w+|class\s+\w+|interface\s+\w+|export\s+/.test(line.content))).slice(0, 5);
                            if (signatureLines.length > 0) {
                                return {
                                    ...change,
                                    hunks: [{
                                            header: `@@ Signatures only: ${change.file} @@`,
                                            startLine: 1,
                                            endLine: signatureLines.length + 1,
                                            lines: [
                                                ...signatureLines,
                                                {
                                                    type: 'context',
                                                    content: `[... ${change.hunks.reduce((sum, h) => sum + h.lines.length, 0) - signatureLines.length} more lines truncated]`,
                                                    lineNumber: 0
                                                }
                                            ]
                                        }]
                                };
                            }
                        }
                        return change;
                    })
                },
                {
                    name: 'documentation_compression',
                    description: 'Heavily compress documentation and markdown files',
                    apply: (changes) => changes.map(change => {
                        if (change.file.endsWith('.md') || change.file.includes('doc')) {
                            return {
                                ...change,
                                hunks: [{
                                        header: `@@ Documentation change: ${change.file} @@`,
                                        startLine: 1,
                                        endLine: 1,
                                        lines: [{
                                                type: 'context',
                                                content: `[Documentation file: +${change.insertions} -${change.deletions} lines]`,
                                                lineNumber: 1
                                            }]
                                    }]
                            };
                        }
                        return change;
                    })
                }
            ]
        },
        {
            name: 'minimal',
            tokenLimit: Infinity,
            strategies: [
                {
                    name: 'file_summary_only',
                    description: 'Show only file-level summaries with change statistics',
                    apply: (changes) => changes.map(change => ({
                        ...change,
                        hunks: [{
                                header: `@@ ${change.file} (${change.type}) @@`,
                                startLine: 1,
                                endLine: 2,
                                lines: [{
                                        type: 'context',
                                        content: `[${change.importance.category.toUpperCase()}: +${change.insertions} -${change.deletions}, Score: ${change.importance.score.toFixed(2)}]`,
                                        lineNumber: 1
                                    }, {
                                        type: 'context',
                                        content: `Reasons: ${change.importance.reasons.join(', ')}`,
                                        lineNumber: 2
                                    }]
                            }]
                    }))
                }
            ]
        }
    ];
    calculateBudget(modelName, promptType) {
        const totalLimit = TokenBudgetManager.MODEL_LIMITS[modelName] || 4000;
        // Estimate system prompt size based on type
        const systemPromptSizes = {
            commit: 500,
            explain: 600,
            pr: 550,
            review: 700
        };
        const systemPrompt = systemPromptSizes[promptType];
        const reserved = Math.max(1000, totalLimit * 0.1); // Reserve 10% or 1000 tokens for response
        const userPrompt = 200; // Base user prompt overhead
        const available = totalLimit - systemPrompt - userPrompt - reserved;
        return {
            total: totalLimit,
            systemPrompt,
            userPrompt,
            available,
            reserved
        };
    }
    allocateTokens(rankingResult, budget, prioritizeQuality = true) {
        // Determine compression level needed
        const level = this.selectCompressionLevel(rankingResult.totalTokens, budget.available);
        const warnings = [];
        // Apply compression strategies
        let processedChanges = [...rankingResult.rankedChanges];
        for (const strategy of level.strategies) {
            processedChanges = strategy.apply(processedChanges);
        }
        // Recalculate token usage after compression
        const compressedTokens = this.estimateTokenUsage(processedChanges);
        // Select optimal changes within budget
        let selectedChanges = [];
        if (compressedTokens <= budget.available) {
            selectedChanges = processedChanges;
        }
        else {
            selectedChanges = this.selectChangesByImportance(processedChanges, budget.available, prioritizeQuality);
            const droppedChanges = rankingResult.rankedChanges.length - selectedChanges.length;
            if (droppedChanges > 0) {
                warnings.push(`${droppedChanges} changes excluded due to token limits`);
            }
        }
        const finalTokenUsage = this.estimateTokenUsage(selectedChanges);
        // Calculate efficiency (how much important content we preserved)
        const totalImportanceScore = rankingResult.rankedChanges.reduce((sum, c) => sum + c.importance.score, 0);
        const preservedImportanceScore = selectedChanges.reduce((sum, c) => sum + c.importance.score, 0);
        const efficiency = totalImportanceScore > 0 ? (preservedImportanceScore / totalImportanceScore) * 100 : 100;
        // Add warnings based on compression level
        if (level.name === 'aggressive') {
            warnings.push('Heavy compression applied - some context may be lost');
        }
        else if (level.name === 'minimal') {
            warnings.push('Minimal context mode - only file summaries available');
        }
        // Add warning for low efficiency
        if (efficiency < 70) {
            warnings.push(`Only ${efficiency.toFixed(0)}% of important content preserved`);
        }
        const compressionSummary = this.generateCompressionSummary(level, rankingResult, selectedChanges);
        return {
            level,
            selectedChanges,
            compressionSummary,
            tokenUsage: {
                used: finalTokenUsage,
                available: budget.available,
                efficiency
            },
            warnings
        };
    }
    selectCompressionLevel(estimatedTokens, availableTokens) {
        // If we fit in budget with full context, use full
        if (estimatedTokens <= availableTokens * 0.8) {
            return TokenBudgetManager.COMPRESSION_LEVELS[0]; // full
        }
        // If we need moderate compression
        if (estimatedTokens <= availableTokens * 1.5) {
            return TokenBudgetManager.COMPRESSION_LEVELS[1]; // moderate
        }
        // If we need aggressive compression
        if (estimatedTokens <= availableTokens * 3) {
            return TokenBudgetManager.COMPRESSION_LEVELS[2]; // aggressive
        }
        // For very large changesets, use minimal
        return TokenBudgetManager.COMPRESSION_LEVELS[3]; // minimal
    }
    selectChangesByImportance(changes, tokenBudget, prioritizeQuality) {
        const selected = [];
        let usedTokens = 0;
        // Sort by importance score if not already sorted
        const sortedChanges = [...changes].sort((a, b) => b.importance.score - a.importance.score);
        if (prioritizeQuality) {
            // Prioritize critical changes first, then high, etc.
            const priorities = ['critical', 'high', 'medium', 'low'];
            for (const priority of priorities) {
                const priorityChanges = sortedChanges.filter(c => c.importance.category === priority);
                for (const change of priorityChanges) {
                    const estimatedTokens = this.estimateChangeTokens(change);
                    if (usedTokens + estimatedTokens <= tokenBudget) {
                        selected.push(change);
                        usedTokens += estimatedTokens;
                    }
                }
            }
        }
        else {
            // Simple greedy selection by score
            for (const change of sortedChanges) {
                const estimatedTokens = this.estimateChangeTokens(change);
                if (usedTokens + estimatedTokens <= tokenBudget) {
                    selected.push(change);
                    usedTokens += estimatedTokens;
                }
            }
        }
        return selected;
    }
    estimateTokenUsage(changes) {
        return changes.reduce((sum, change) => sum + this.estimateChangeTokens(change), 0);
    }
    estimateChangeTokens(change) {
        // More accurate token estimation
        let tokens = 0;
        // File path and metadata
        tokens += Math.ceil(change.file.length / 4) + 20;
        // Hunks
        for (const hunk of change.hunks) {
            tokens += Math.ceil(hunk.header.length / 4);
            for (const line of hunk.lines) {
                tokens += Math.ceil(line.content.length / 4) + 5; // +5 for formatting
            }
        }
        return tokens;
    }
    generateCompressionSummary(level, original, selected) {
        const parts = [];
        parts.push(`Compression level: ${level.name}`);
        parts.push(`Files: ${selected.length}/${original.rankedChanges.length}`);
        const selectedByCategory = {
            critical: selected.filter(c => c.importance.category === 'critical').length,
            high: selected.filter(c => c.importance.category === 'high').length,
            medium: selected.filter(c => c.importance.category === 'medium').length,
            low: selected.filter(c => c.importance.category === 'low').length,
        };
        parts.push(`Breakdown: ${selectedByCategory.critical}C ${selectedByCategory.high}H ${selectedByCategory.medium}M ${selectedByCategory.low}L`);
        if (level.strategies.length > 0) {
            parts.push(`Strategies: ${level.strategies.map(s => s.name).join(', ')}`);
        }
        return parts.join(' | ');
    }
    /**
     * Analyze if the user should consider breaking their changes into smaller commits
     */
    analyzeCommitSizeRecommendation(rankingResult, budget) {
        const totalTokens = rankingResult.totalTokens;
        const criticalCount = rankingResult.breakdown.critical;
        const totalFiles = rankingResult.rankedChanges.length;
        let shouldSplit = false;
        let recommendation = '';
        const suggestedBreakdown = [];
        // Large number of files
        if (totalFiles > 20) {
            shouldSplit = true;
            recommendation = `Large changeset (${totalFiles} files) detected. Consider splitting into smaller, focused commits.`;
            // Group by importance and file type
            const criticalFiles = rankingResult.rankedChanges.filter(c => c.importance.category === 'critical');
            const featureFiles = rankingResult.rankedChanges.filter(c => !c.file.includes('test') && c.importance.category === 'high');
            const testFiles = rankingResult.rankedChanges.filter(c => c.file.includes('test') || c.file.includes('spec'));
            if (criticalFiles.length > 0) {
                suggestedBreakdown.push(`1. Critical changes (${criticalFiles.length} files)`);
            }
            if (featureFiles.length > 0) {
                suggestedBreakdown.push(`2. Feature implementation (${featureFiles.length} files)`);
            }
            if (testFiles.length > 0) {
                suggestedBreakdown.push(`3. Tests and specs (${testFiles.length} files)`);
            }
        }
        // Token budget exceeded significantly
        if (totalTokens > budget.available * 2) {
            shouldSplit = true;
            if (!recommendation) {
                recommendation = `Changes are very large (${Math.ceil(totalTokens / 1000)}k tokens). AI analysis will be limited.`;
            }
        }
        // High number of critical changes
        if (criticalCount > 5) {
            shouldSplit = true;
            if (!recommendation) {
                recommendation = `Multiple critical changes detected (${criticalCount}). Consider separate commits for better review.`;
            }
        }
        if (!shouldSplit) {
            recommendation = 'Change size is optimal for AI analysis.';
        }
        return {
            shouldSplit,
            recommendation,
            suggestedBreakdown
        };
    }
}
//# sourceMappingURL=token-budget-manager.js.map