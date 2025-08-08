import NodeCache from 'node-cache';
import {createHash} from 'crypto';
import type {CacheEntry, CommitContext, CommitMessage, DiffExplanation, PRDescription, CodeReview} from '../types/index.js';

interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  maxSize: number;
}

interface CacheableItem {
  type: 'commit' | 'explanation' | 'pr' | 'review';
  data: CommitMessage | DiffExplanation | PRDescription | CodeReview;
}

export class CacheManager {
  private memoryCache: NodeCache;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    
    // Initialize memory cache
    this.memoryCache = new NodeCache({
      stdTTL: config.ttl,
      maxKeys: config.maxSize,
      useClones: false
    });
  }

  async get<T>(key: string, type: string): Promise<T | null> {
    if (!this.config.enabled) return null;

    // Try memory cache
    const memoryResult = this.memoryCache.get<T>(key);
    if (memoryResult) {
      return memoryResult;
    }

    return null;
  }

  async set<T>(key: string, value: T, type: string, context?: CommitContext): Promise<void> {
    if (!this.config.enabled) return;

    // Store in memory cache
    this.memoryCache.set(key, value);
  }

  async getCachedCommitMessage(context: CommitContext): Promise<CommitMessage | null> {
    const key = this.generateContextKey(context);
    return this.get<CommitMessage>(key, 'commit');
  }

  async setCachedCommitMessage(context: CommitContext, message: CommitMessage): Promise<void> {
    const key = this.generateContextKey(context);
    await this.set(key, message, 'commit', context);
  }

  async getCachedExplanation(context: CommitContext): Promise<DiffExplanation | null> {
    const key = this.generateContextKey(context);
    return this.get<DiffExplanation>(key, 'explanation');
  }

  async setCachedExplanation(context: CommitContext, explanation: DiffExplanation): Promise<void> {
    const key = this.generateContextKey(context);
    await this.set(key, explanation, 'explanation', context);
  }

  async getCachedPRDescription(context: CommitContext): Promise<PRDescription | null> {
    const key = this.generateContextKey(context);
    return this.get<PRDescription>(key, 'pr');
  }

  async setCachedPRDescription(context: CommitContext, pr: PRDescription): Promise<void> {
    const key = this.generateContextKey(context);
    await this.set(key, pr, 'pr', context);
  }

  async getCachedReview(context: CommitContext): Promise<CodeReview | null> {
    const key = this.generateContextKey(context);
    return this.get<CodeReview>(key, 'review');
  }

  async setCachedReview(context: CommitContext, review: CodeReview): Promise<void> {
    const key = this.generateContextKey(context);
    await this.set(key, review, 'review', context);
  }

  async clear(): Promise<void> {
    this.memoryCache.flushAll();
  }

  async getStats(): Promise<{memory: any}> {
    const memoryStats = this.memoryCache.getStats();

    return {
      memory: memoryStats
    };
  }

  close(): void {
    this.memoryCache.close();
  }

  private generateContextKey(context: CommitContext): string {
    // Create a hash based on the essential context information
    const keyData = {
      files: context.changes.map(c => ({ file: c.file, type: c.type, insertions: c.insertions, deletions: c.deletions })),
      branch: context.branch,
      repository: context.repository.name,
      staged: context.staged
    };

    const keyString = JSON.stringify(keyData, Object.keys(keyData).sort());
    return createHash('sha256').update(keyString).digest('hex');
  }
}