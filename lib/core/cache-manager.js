import NodeCache from 'node-cache';
import { createHash } from 'crypto';
export class CacheManager {
    memoryCache;
    config;
    constructor(config) {
        this.config = config;
        // Initialize memory cache
        this.memoryCache = new NodeCache({
            stdTTL: config.ttl,
            maxKeys: config.maxSize,
            useClones: false
        });
    }
    async get(key, type) {
        if (!this.config.enabled)
            return null;
        // Try memory cache
        const memoryResult = this.memoryCache.get(key);
        if (memoryResult) {
            return memoryResult;
        }
        return null;
    }
    async set(key, value, type, context) {
        if (!this.config.enabled)
            return;
        // Store in memory cache
        this.memoryCache.set(key, value);
    }
    async getCachedCommitMessage(context) {
        const key = this.generateContextKey(context);
        return this.get(key, 'commit');
    }
    async setCachedCommitMessage(context, message) {
        const key = this.generateContextKey(context);
        await this.set(key, message, 'commit', context);
    }
    async getCachedExplanation(context) {
        const key = this.generateContextKey(context);
        return this.get(key, 'explanation');
    }
    async setCachedExplanation(context, explanation) {
        const key = this.generateContextKey(context);
        await this.set(key, explanation, 'explanation', context);
    }
    async getCachedPRDescription(context) {
        const key = this.generateContextKey(context);
        return this.get(key, 'pr');
    }
    async setCachedPRDescription(context, pr) {
        const key = this.generateContextKey(context);
        await this.set(key, pr, 'pr', context);
    }
    async getCachedReview(context) {
        const key = this.generateContextKey(context);
        return this.get(key, 'review');
    }
    async setCachedReview(context, review) {
        const key = this.generateContextKey(context);
        await this.set(key, review, 'review', context);
    }
    async clear() {
        this.memoryCache.flushAll();
    }
    async getStats() {
        const memoryStats = this.memoryCache.getStats();
        return {
            memory: memoryStats
        };
    }
    close() {
        this.memoryCache.close();
    }
    generateContextKey(context) {
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
//# sourceMappingURL=cache-manager.js.map