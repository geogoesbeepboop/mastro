import {simpleGit, SimpleGit, DiffResult} from 'simple-git';
import {readFileSync} from 'fs';
import {join} from 'path';
import type {
  GitChange,
  GitHunk,
  GitLine,
  CommitContext,
  RepoContext,
  CommitHistory,
  TeamPatterns,
  ReviewPersona
} from '../types/index.js';

export class GitAnalyzer {
  private git: SimpleGit;
  private repoRoot?: string;

  constructor() {
    this.git = simpleGit();
  }

  async isRepository(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  async getRepoRoot(): Promise<string> {
    if (!this.repoRoot) {
      this.repoRoot = await this.git.revparse(['--show-toplevel']);
    }
    return this.repoRoot;
  }

  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current || 'main';
  }

  async getCurrentCommit(): Promise<string> {
    const log = await this.git.log(['-1']);
    return log.latest?.hash || '';
  }

  async getStagedChanges(): Promise<GitChange[]> {
    const diff = await this.git.diff(['--staged', '--numstat']);
    if (!diff) return [];

    const changes: GitChange[] = [];
    const lines = diff.trim().split('\n');

    for (const line of lines) {
      const [insertions, deletions, file] = line.split('\t');
      if (!file) continue;

      const change: GitChange = {
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

  async getWorkingChanges(): Promise<GitChange[]> {
    const diff = await this.git.diff(['--numstat']);
    if (!diff) return [];

    const changes: GitChange[] = [];
    const lines = diff.trim().split('\n');

    for (const line of lines) {
      const [insertions, deletions, file] = line.split('\t');
      if (!file) continue;

      const change: GitChange = {
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

  async getBranchChanges(branch: string, baseBranch = 'main'): Promise<GitChange[]> {
    try {
      const diff = await this.git.diff([`${baseBranch}...${branch}`, '--numstat']);
      if (!diff) return [];

      const changes: GitChange[] = [];
      const lines = diff.trim().split('\n');

      for (const line of lines) {
        const [insertions, deletions, file] = line.split('\t');
        if (!file) continue;

        const change: GitChange = {
          file,
          type: await this.getChangeType(file, `${baseBranch}...${branch}`),
          insertions: insertions === '-' ? 0 : parseInt(insertions, 10),
          deletions: deletions === '-' ? 0 : parseInt(deletions, 10),
          hunks: await this.getHunks(file, false, `${baseBranch}...${branch}`)
        };

        changes.push(change);
      }

      return changes;
    } catch (error) {
      throw new Error(`Failed to get branch changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRecentCommits(limit = 10): Promise<CommitHistory[]> {
    const log = await this.git.log(['--oneline', `-${limit}`, '--pretty=format:%H|%s|%an|%ad|%D', '--date=iso']);
    
    return log.all.map(commit => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name || 'Unknown',
      date: new Date(commit.date || new Date()),
      files: [] as string[] // Would need additional call to get files
    }));
  }

  async buildCommitContext(staged = true): Promise<CommitContext> {
    const changes = staged ? await this.getStagedChanges() : await this.getWorkingChanges();
    const branch = await this.getCurrentBranch();
    const repository = await this.buildRepoContext();
    const repoRoot = await this.getRepoRoot();

    const totalInsertions = changes.reduce((sum, change) => sum + change.insertions, 0);
    const totalDeletions = changes.reduce((sum, change) => sum + change.deletions, 0);
    const fileCount = changes.length;

    // Determine complexity based on changes
    let changeComplexity: 'low' | 'medium' | 'high' = 'low';
    if (fileCount > 10 || totalInsertions + totalDeletions > 500) {
      changeComplexity = 'high';
    } else if (fileCount > 3 || totalInsertions + totalDeletions > 100) {
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

  private async buildRepoContext(): Promise<RepoContext> {
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

  private async detectLanguage(): Promise<string> {
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
        } catch {
          // File doesn't exist, continue
        }
      }
    }

    return 'unknown';
  }

  private async detectFramework(language: string): Promise<string | undefined> {
    const repoRoot = await this.getRepoRoot();

    try {
      switch (language) {
        case 'javascript':
        case 'typescript': {
          const packageJsonPath = join(repoRoot, 'package.json');
          const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          
          if (deps.react) return 'react';
          if (deps.vue) return 'vue';
          if (deps.angular) return 'angular';
          if (deps.express) return 'express';
          if (deps.next) return 'nextjs';
          break;
        }
        case 'python': {
          const requirementsPath = join(repoRoot, 'requirements.txt');
          try {
            const requirements = readFileSync(requirementsPath, 'utf-8');
            if (requirements.includes('django')) return 'django';
            if (requirements.includes('flask')) return 'flask';
            if (requirements.includes('fastapi')) return 'fastapi';
          } catch {
            // requirements.txt doesn't exist
          }
          break;
        }
      }
    } catch {
      // Error reading files
    }

    return undefined;
  }

  private async analyzeTeamPatterns(): Promise<TeamPatterns> {
    const commits = await this.getRecentCommits(50);
    const messages = commits.map(c => c.message);

    // Analyze commit message patterns
    const conventionalRegex = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/;
    const isConventional = messages.filter(msg => conventionalRegex.test(msg)).length > messages.length * 0.6;

    const prefixes = this.extractCommonPrefixes(messages);
    const maxLength = Math.max(...messages.map(msg => msg.length));
    const commonPhrases = this.extractCommonPhrases(messages);

    // Default review persona
    const reviewPersona: ReviewPersona = {
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

  private extractCommonPrefixes(messages: string[]): string[] {
    const prefixCounts = new Map<string, number>();
    
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

  private extractCommonPhrases(messages: string[]): string[] {
    const phrases = new Map<string, number>();
    
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

  private async getChangeType(file: string, revision?: string): Promise<GitChange['type']> {
    try {
      const args = revision ? [revision] : ['--staged'];
      const status = await this.git.diff(['--name-status', ...args, file]);
      
      if (!status) return 'modified';
      
      const statusCode = status.trim().split('\t')[0];
      switch (statusCode.charAt(0)) {
        case 'A': return 'added';
        case 'D': return 'deleted';
        case 'R': return 'renamed';
        case 'M': return 'modified';
        default: return 'modified';
      }
    } catch {
      return 'modified';
    }
  }

  private async getHunks(file: string, staged: boolean, revision?: string): Promise<GitHunk[]> {
    try {
      let args: string[];
      if (revision) {
        args = [revision, '--', file];
      } else {
        args = staged ? ['--staged', '--', file] : ['--', file];
      }
      
      const diff = await this.git.diff(args);
      if (!diff) return [];

      return this.parseDiffHunks(diff);
    } catch {
      return [];
    }
  }

  private parseDiffHunks(diff: string): GitHunk[] {
    const hunks: GitHunk[] = [];
    const lines = diff.split('\n');
    let currentHunk: GitHunk | null = null;

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
      } else if (currentHunk && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
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

  parseDiffForFile(diff: string, file: string, type: GitChange['type']): GitChange {
    const hunks = this.parseDiffHunks(diff);
    
    // Calculate insertions and deletions from hunks
    let insertions = 0;
    let deletions = 0;
    
    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'added') {
          insertions++;
        } else if (line.type === 'removed') {
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
}