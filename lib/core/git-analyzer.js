import { simpleGit } from 'simple-git';
import { readFileSync } from 'fs';
import { join } from 'path';
export class GitAnalyzer {
    git;
    repoRoot;
    constructor() {
        this.git = simpleGit();
    }
    async isRepository() {
        try {
            await this.git.status();
            return true;
        }
        catch {
            return false;
        }
    }
    async getRepoRoot() {
        if (!this.repoRoot) {
            this.repoRoot = await this.git.revparse(['--show-toplevel']);
        }
        return this.repoRoot;
    }
    async getCurrentBranch() {
        const status = await this.git.status();
        return status.current || 'main';
    }
    async getCurrentCommit() {
        const log = await this.git.log(['-1']);
        return log.latest?.hash || '';
    }
    async getStagedChanges() {
        const diff = await this.git.diff(['--staged', '--numstat']);
        if (!diff)
            return [];
        const changes = [];
        const lines = diff.trim().split('\n');
        for (const line of lines) {
            const [insertions, deletions, file] = line.split('\t');
            if (!file)
                continue;
            const change = {
                file,
                type: await this.getChangeType(file),
                insertions: insertions === '-' ? 0 : parseInt(insertions, 10),
                deletions: deletions === '-' ? 0 : parseInt(deletions, 10),
                hunks: await this.getHunks(file, true)
            };
            changes.push(change);
        }
        return changes;
    }
    async getWorkingChanges() {
        const diff = await this.git.diff(['--numstat']);
        if (!diff)
            return [];
        const changes = [];
        const lines = diff.trim().split('\n');
        for (const line of lines) {
            const [insertions, deletions, file] = line.split('\t');
            if (!file)
                continue;
            const change = {
                file,
                type: await this.getChangeType(file),
                insertions: insertions === '-' ? 0 : parseInt(insertions, 10),
                deletions: deletions === '-' ? 0 : parseInt(deletions, 10),
                hunks: await this.getHunks(file, false)
            };
            changes.push(change);
        }
        return changes;
    }
    async getBranchChanges(branch, baseBranch = 'main') {
        try {
            const diff = await this.git.diff([`${baseBranch}...${branch}`, '--numstat']);
            if (!diff)
                return [];
            const changes = [];
            const lines = diff.trim().split('\n');
            for (const line of lines) {
                const [insertions, deletions, file] = line.split('\t');
                if (!file)
                    continue;
                const change = {
                    file,
                    type: await this.getChangeType(file, `${baseBranch}...${branch}`),
                    insertions: insertions === '-' ? 0 : parseInt(insertions, 10),
                    deletions: deletions === '-' ? 0 : parseInt(deletions, 10),
                    hunks: await this.getHunks(file, false, `${baseBranch}...${branch}`)
                };
                changes.push(change);
            }
            return changes;
        }
        catch (error) {
            throw new Error(`Failed to get branch changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getRecentCommits(limit = 10) {
        const log = await this.git.log(['--oneline', `-${limit}`, '--pretty=format:%H|%s|%an|%ad|%D', '--date=iso']);
        return log.all.map(commit => ({
            hash: commit.hash,
            message: commit.message,
            author: commit.author_name || 'Unknown',
            date: new Date(commit.date || new Date()),
            files: [] // Would need additional call to get files
        }));
    }
    async buildCommitContext(staged = true) {
        const changes = staged ? await this.getStagedChanges() : await this.getWorkingChanges();
        const branch = await this.getCurrentBranch();
        const repository = await this.buildRepoContext();
        const repoRoot = await this.getRepoRoot();
        const totalInsertions = changes.reduce((sum, change) => sum + change.insertions, 0);
        const totalDeletions = changes.reduce((sum, change) => sum + change.deletions, 0);
        const fileCount = changes.length;
        // Determine complexity based on changes
        let changeComplexity = 'low';
        if (fileCount > 10 || totalInsertions + totalDeletions > 500) {
            changeComplexity = 'high';
        }
        else if (fileCount > 3 || totalInsertions + totalDeletions > 100) {
            changeComplexity = 'medium';
        }
        return {
            changes,
            branch,
            repository,
            staged,
            workingDir: repoRoot,
            metadata: {
                totalInsertions,
                totalDeletions,
                fileCount,
                changeComplexity
            }
        };
    }
    async buildRepoContext() {
        const repoRoot = await this.getRepoRoot();
        const repoName = repoRoot.split('/').pop() || 'unknown';
        const language = await this.detectLanguage();
        const framework = await this.detectFramework(language);
        const patterns = await this.analyzeTeamPatterns();
        const recentCommits = await this.getRecentCommits(20);
        return {
            name: repoName,
            root: repoRoot,
            language,
            framework,
            patterns,
            recentCommits
        };
    }
    async detectLanguage() {
        const repoRoot = await this.getRepoRoot();
        // Check for common language indicators
        const indicators = [
            { files: ['package.json'], language: 'javascript' },
            { files: ['tsconfig.json'], language: 'typescript' },
            { files: ['Cargo.toml'], language: 'rust' },
            { files: ['go.mod'], language: 'go' },
            { files: ['pom.xml', 'build.gradle'], language: 'java' },
            { files: ['requirements.txt', 'pyproject.toml'], language: 'python' },
            { files: ['Gemfile'], language: 'ruby' }
        ];
        for (const indicator of indicators) {
            for (const file of indicator.files) {
                try {
                    readFileSync(join(repoRoot, file));
                    return indicator.language;
                }
                catch {
                    // File doesn't exist, continue
                }
            }
        }
        return 'unknown';
    }
    async detectFramework(language) {
        const repoRoot = await this.getRepoRoot();
        try {
            switch (language) {
                case 'javascript':
                case 'typescript': {
                    const packageJsonPath = join(repoRoot, 'package.json');
                    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
                    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                    if (deps.react)
                        return 'react';
                    if (deps.vue)
                        return 'vue';
                    if (deps.angular)
                        return 'angular';
                    if (deps.express)
                        return 'express';
                    if (deps.next)
                        return 'nextjs';
                    break;
                }
                case 'python': {
                    const requirementsPath = join(repoRoot, 'requirements.txt');
                    try {
                        const requirements = readFileSync(requirementsPath, 'utf-8');
                        if (requirements.includes('django'))
                            return 'django';
                        if (requirements.includes('flask'))
                            return 'flask';
                        if (requirements.includes('fastapi'))
                            return 'fastapi';
                    }
                    catch {
                        // requirements.txt doesn't exist
                    }
                    break;
                }
            }
        }
        catch {
            // Error reading files
        }
        return undefined;
    }
    async analyzeTeamPatterns() {
        const commits = await this.getRecentCommits(50);
        const messages = commits.map(c => c.message);
        // Analyze commit message patterns
        const conventionalRegex = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/;
        const isConventional = messages.filter(msg => conventionalRegex.test(msg)).length > messages.length * 0.6;
        const prefixes = this.extractCommonPrefixes(messages);
        const maxLength = Math.max(...messages.map(msg => msg.length));
        const commonPhrases = this.extractCommonPhrases(messages);
        // Default review persona
        const reviewPersona = {
            name: 'Senior Engineer',
            focus: ['maintainability', 'performance'],
            strictness: 'moderate',
            customRules: []
        };
        return {
            commitStyle: isConventional ? 'conventional' : 'custom',
            prefixes,
            maxLength: Math.min(maxLength, 100),
            commonPhrases,
            reviewPersona
        };
    }
    extractCommonPrefixes(messages) {
        const prefixCounts = new Map();
        for (const message of messages) {
            const match = message.match(/^([a-zA-Z]+)[\s:]/);
            if (match) {
                const prefix = match[1].toLowerCase();
                prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
            }
        }
        return Array.from(prefixCounts.entries())
            .filter(([_, count]) => count > 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([prefix]) => prefix);
    }
    extractCommonPhrases(messages) {
        const phrases = new Map();
        for (const message of messages) {
            const words = message.toLowerCase().split(/\s+/);
            for (let i = 0; i < words.length - 1; i++) {
                const phrase = `${words[i]} ${words[i + 1]}`;
                if (phrase.length > 5) { // Only meaningful phrases
                    phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
                }
            }
        }
        return Array.from(phrases.entries())
            .filter(([_, count]) => count > 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([phrase]) => phrase);
    }
    async getChangeType(file, revision) {
        try {
            const args = revision ? [revision] : ['--staged'];
            const status = await this.git.diff(['--name-status', ...args, file]);
            if (!status)
                return 'modified';
            const statusCode = status.trim().split('\t')[0];
            switch (statusCode.charAt(0)) {
                case 'A': return 'added';
                case 'D': return 'deleted';
                case 'R': return 'renamed';
                case 'M': return 'modified';
                default: return 'modified';
            }
        }
        catch {
            return 'modified';
        }
    }
    async getHunks(file, staged, revision) {
        try {
            let args;
            if (revision) {
                args = [revision, '--', file];
            }
            else {
                args = staged ? ['--staged', '--', file] : ['--', file];
            }
            const diff = await this.git.diff(args);
            if (!diff)
                return [];
            return this.parseDiffHunks(diff);
        }
        catch {
            return [];
        }
    }
    parseDiffHunks(diff) {
        const hunks = [];
        const lines = diff.split('\n');
        let currentHunk = null;
        for (const line of lines) {
            if (line.startsWith('@@')) {
                if (currentHunk) {
                    hunks.push(currentHunk);
                }
                const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
                const startLine = match ? parseInt(match[2], 10) : 0;
                currentHunk = {
                    header: line,
                    lines: [],
                    startLine,
                    endLine: startLine
                };
            }
            else if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
                const type = line.startsWith('+') ? 'added' :
                    line.startsWith('-') ? 'removed' : 'context';
                currentHunk.lines.push({
                    content: line.substring(1),
                    type,
                    lineNumber: type === 'added' ? currentHunk.endLine++ : undefined
                });
            }
        }
        if (currentHunk) {
            hunks.push(currentHunk);
        }
        return hunks;
    }
    parseDiffForFile(diff, file, type) {
        const hunks = this.parseDiffHunks(diff);
        // Calculate insertions and deletions from hunks
        let insertions = 0;
        let deletions = 0;
        for (const hunk of hunks) {
            for (const line of hunk.lines) {
                if (line.type === 'added') {
                    insertions++;
                }
                else if (line.type === 'removed') {
                    deletions++;
                }
            }
        }
        return {
            file,
            type,
            insertions,
            deletions,
            hunks
        };
    }
    /**
     * Parse git diff output and return array of GitChange objects
     */
    parseDiffOutput(diffOutput) {
        const changes = [];
        if (!diffOutput.trim()) {
            return changes;
        }
        // Split diff output by file
        const fileBlocks = diffOutput.split(/^diff --git/m).filter(block => block.trim());
        for (let block of fileBlocks) {
            // Add back the diff header if it was stripped
            if (!block.startsWith('diff --git')) {
                block = 'diff --git' + block;
            }
            // Extract file path from the diff header
            const fileMatch = block.match(/^diff --git a\/(.+?) b\/(.+?)$/m);
            if (!fileMatch)
                continue;
            const filePath = fileMatch[1];
            // Determine change type
            let changeType = 'modified';
            if (block.includes('new file mode')) {
                changeType = 'added';
            }
            else if (block.includes('deleted file mode')) {
                changeType = 'deleted';
            }
            // Parse the file diff
            try {
                const change = this.parseDiffForFile(block, filePath, changeType);
                changes.push(change);
            }
            catch (error) {
                // Skip files that can't be parsed
                console.warn(`Could not parse diff for file ${filePath}:`, error);
            }
        }
        return changes;
    }
}
//# sourceMappingURL=git-analyzer.js.map