import { extname, basename } from 'path';
export class SemanticChangeRanker {
    static CRITICAL_PATTERNS = [
        // Breaking changes
        /export\s+(interface|type|class|function)\s+\w+/,
        /public\s+(class|interface|function)/,
        /module\.exports\s*=/,
        // API changes
        /@api/i,
        /@endpoint/i,
        /app\.(get|post|put|delete|patch)\s*\(/,
        /router\.(get|post|put|delete|patch)\s*\(/,
        // Database schema
        /CREATE\s+TABLE/i,
        /ALTER\s+TABLE/i,
        /migration/i,
        /@Entity/,
        /@Table/,
        // Security patterns
        /auth|security|permission|role/i,
        /jwt|token|session/i,
        /password|secret|key/i,
        // Configuration
        /config|env|environment/i,
    ];
    static HIGH_PATTERNS = [
        // Core business logic
        /class\s+\w+/,
        /function\s+\w+/,
        /const\s+\w+\s*=\s*\(/,
        // Error handling
        /try\s*\{|catch\s*\(/,
        /throw\s+/,
        /error|exception/i,
        // Data processing
        /map\s*\(|filter\s*\(|reduce\s*\(/,
        /async|await/,
        /Promise/,
        // Types and interfaces
        /interface\s+\w+/,
        /type\s+\w+/,
        // Imports of external dependencies
        /from\s+['"][^./]/,
    ];
    static FILE_IMPORTANCE = {
        // Critical files
        'package.json': 0.95,
        'tsconfig.json': 0.9,
        'webpack.config.js': 0.9,
        'vite.config.ts': 0.9,
        '.env': 0.95,
        'docker-compose.yml': 0.85,
        'Dockerfile': 0.8,
        // High importance extensions
        '.ts': 0.8,
        '.tsx': 0.8,
        '.js': 0.75,
        '.jsx': 0.75,
        '.py': 0.75,
        '.java': 0.7,
        '.go': 0.7,
        '.rs': 0.7,
        // Medium importance
        '.css': 0.5,
        '.scss': 0.5,
        '.html': 0.6,
        '.sql': 0.7,
        '.yaml': 0.6,
        '.yml': 0.6,
        // Low importance
        '.md': 0.3,
        '.txt': 0.2,
        '.json': 0.4,
        '.lock': 0.1,
        '.log': 0.1,
    };
    rankChanges(changes) {
        const rankedChanges = changes.map(change => ({
            ...change,
            importance: this.analyzeChangeImportance(change)
        }));
        // Sort by importance score (descending)
        rankedChanges.sort((a, b) => b.importance.score - a.importance.score);
        const totalTokens = rankedChanges.reduce((sum, change) => sum + change.importance.tokens, 0);
        const breakdown = {
            critical: rankedChanges.filter(c => c.importance.category === 'critical').length,
            high: rankedChanges.filter(c => c.importance.category === 'high').length,
            medium: rankedChanges.filter(c => c.importance.category === 'medium').length,
            low: rankedChanges.filter(c => c.importance.category === 'low').length,
        };
        return {
            rankedChanges,
            totalTokens,
            breakdown
        };
    }
    analyzeChangeImportance(change) {
        let score = 0;
        const reasons = [];
        // Base score from file type and name
        const fileScore = this.getFileImportanceScore(change.file);
        score += fileScore * 0.3;
        if (fileScore > 0.8) {
            reasons.push(`Critical file: ${basename(change.file)}`);
        }
        // Change type scoring
        const changeTypeScore = this.getChangeTypeScore(change);
        score += changeTypeScore * 0.2;
        // Content analysis scoring
        const contentScore = this.analyzeContentImportance(change);
        score += contentScore.score * 0.4;
        reasons.push(...contentScore.reasons);
        // Size impact scoring
        const sizeScore = this.getSizeImportanceScore(change);
        score += sizeScore * 0.1;
        // Normalize score to 0-1
        score = Math.min(score, 1);
        const category = this.categorizeScore(score);
        const tokens = this.estimateTokenCount(change);
        return {
            score,
            category,
            reasons,
            tokens
        };
    }
    getFileImportanceScore(filePath) {
        const fileName = basename(filePath);
        const ext = extname(filePath);
        // Check specific file names first
        if (fileName in SemanticChangeRanker.FILE_IMPORTANCE) {
            return SemanticChangeRanker.FILE_IMPORTANCE[fileName];
        }
        // Check by extension
        if (ext in SemanticChangeRanker.FILE_IMPORTANCE) {
            return SemanticChangeRanker.FILE_IMPORTANCE[ext];
        }
        // Special path patterns
        if (filePath.includes('src/'))
            return 0.8;
        if (filePath.includes('lib/'))
            return 0.7;
        if (filePath.includes('test/') || filePath.includes('spec/'))
            return 0.4;
        if (filePath.includes('docs/'))
            return 0.3;
        if (filePath.includes('examples/'))
            return 0.2;
        return 0.5; // Default
    }
    getChangeTypeScore(change) {
        switch (change.type) {
            case 'deleted':
                return 0.9; // Deletions are potentially breaking
            case 'renamed':
                return 0.8; // Renames can break imports
            case 'modified':
                return 0.7; // Modifications need analysis
            case 'added':
                return 0.6; // Additions are generally safer
            default:
                return 0.5;
        }
    }
    analyzeContentImportance(change) {
        let score = 0;
        const reasons = [];
        for (const hunk of change.hunks) {
            const analysis = this.analyzeHunkImportance(hunk);
            score += analysis.score;
            reasons.push(...analysis.reasons);
        }
        // Average across hunks, but cap at 1.0
        score = Math.min(score / Math.max(change.hunks.length, 1), 1.0);
        return { score, reasons };
    }
    analyzeHunkImportance(hunk) {
        let score = 0;
        const reasons = [];
        const addedLines = hunk.lines.filter(line => line.type === 'added');
        const removedLines = hunk.lines.filter(line => line.type === 'removed');
        // Analyze added lines
        for (const line of addedLines) {
            const lineAnalysis = this.analyzeLineImportance(line, 'added');
            score += lineAnalysis.score;
            if (lineAnalysis.reason) {
                reasons.push(`+${lineAnalysis.reason}`);
            }
        }
        // Analyze removed lines (higher weight as potentially breaking)
        for (const line of removedLines) {
            const lineAnalysis = this.analyzeLineImportance(line, 'removed');
            score += lineAnalysis.score * 1.2; // Higher weight for removals
            if (lineAnalysis.reason) {
                reasons.push(`-${lineAnalysis.reason}`);
            }
        }
        return { score, reasons };
    }
    analyzeLineImportance(line, changeType) {
        const content = line.content.trim();
        if (!content || content.startsWith('//') || content.startsWith('/*')) {
            return { score: 0.1 }; // Comments are low importance
        }
        // Check critical patterns
        for (const pattern of SemanticChangeRanker.CRITICAL_PATTERNS) {
            if (pattern.test(content)) {
                return {
                    score: 0.9,
                    reason: `Critical pattern: ${content.substring(0, 50)}...`
                };
            }
        }
        // Check high importance patterns
        for (const pattern of SemanticChangeRanker.HIGH_PATTERNS) {
            if (pattern.test(content)) {
                return {
                    score: 0.7,
                    reason: `High importance: ${content.substring(0, 50)}...`
                };
            }
        }
        // Medium importance for other code
        if (content.length > 10 && !content.startsWith(' ') && content.includes('(')) {
            return { score: 0.5, reason: 'Code statement' };
        }
        // Low importance for everything else
        return { score: 0.2 };
    }
    getSizeImportanceScore(change) {
        const totalLines = change.insertions + change.deletions;
        // Larger changes get slightly higher importance for context
        if (totalLines > 200)
            return 0.8;
        if (totalLines > 50)
            return 0.6;
        if (totalLines > 10)
            return 0.4;
        return 0.2;
    }
    categorizeScore(score) {
        if (score >= 0.8)
            return 'critical';
        if (score >= 0.6)
            return 'high';
        if (score >= 0.4)
            return 'medium';
        return 'low';
    }
    estimateTokenCount(change) {
        // Rough estimation: 4 characters per token average
        let totalChars = 0;
        for (const hunk of change.hunks) {
            totalChars += hunk.header.length;
            for (const line of hunk.lines) {
                totalChars += line.content.length + 10; // +10 for formatting
            }
        }
        // Add metadata
        totalChars += change.file.length + 50; // filename + metadata
        return Math.ceil(totalChars / 4);
    }
    /**
     * Get the top N most important changes within a token budget
     */
    selectOptimalChanges(ranking, tokenBudget) {
        const selected = [];
        let usedTokens = 0;
        // Always include critical changes if possible
        for (const change of ranking.rankedChanges) {
            if (change.importance.category === 'critical') {
                if (usedTokens + change.importance.tokens <= tokenBudget) {
                    selected.push(change);
                    usedTokens += change.importance.tokens;
                }
            }
        }
        // Add high importance changes
        for (const change of ranking.rankedChanges) {
            if (change.importance.category === 'high' && !selected.includes(change)) {
                if (usedTokens + change.importance.tokens <= tokenBudget) {
                    selected.push(change);
                    usedTokens += change.importance.tokens;
                }
            }
        }
        // Fill remaining budget with medium/low importance
        for (const change of ranking.rankedChanges) {
            if ((change.importance.category === 'medium' || change.importance.category === 'low')
                && !selected.includes(change)) {
                if (usedTokens + change.importance.tokens <= tokenBudget) {
                    selected.push(change);
                    usedTokens += change.importance.tokens;
                }
            }
        }
        return selected;
    }
}
//# sourceMappingURL=semantic-change-ranker.js.map