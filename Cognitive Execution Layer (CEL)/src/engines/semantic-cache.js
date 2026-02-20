/**
 * Semantic Caching Engine for Cognitive Execution Layer
 * Implements semantic similarity caching to reduce token costs
 */

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

export class SemanticCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || 24 * 60 * 60 * 1000; // 24 hours
    this.similarityThreshold = options.similarityThreshold || 0.85;
    this.cacheDir = options.cacheDir || './cache';
    this.entries = new Map();
    
    // Initialize cache directory
    this.initCacheDir();
  }

  async initCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await this.loadFromDisk();
    } catch (error) {
      console.error('Failed to initialize cache directory:', error);
    }
  }

  async loadFromDisk() {
    try {
      const cacheFilePath = path.join(this.cacheDir, 'semantic-cache.json');
      const data = await fs.readFile(cacheFilePath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Load entries maintaining TTL
      for (const [key, entry] of Object.entries(parsed)) {
        // Check if entry is still valid
        if (Date.now() - entry.timestamp < entry.ttl) {
          this.entries.set(key, entry);
        }
      }
    } catch (error) {
      // If file doesn't exist, that's fine - we'll start fresh
      if (error.code !== 'ENOENT') {
        console.error('Failed to load cache from disk:', error);
      }
    }
  }

  async saveToDisk() {
    try {
      const cacheFilePath = path.join(this.cacheDir, 'semantic-cache.json');
      const serialized = {};
      
      for (const [key, entry] of this.entries) {
        serialized[key] = entry;
      }
      
      await fs.writeFile(cacheFilePath, JSON.stringify(serialized, null, 2));
    } catch (error) {
      console.error('Failed to save cache to disk:', error);
    }
  }

  // Simple embedding simulation - in reality, you'd use a proper embedding model
  async createEmbedding(text) {
    // This is a simplified approach - in production, use a proper embedding model
    const encoder = new TextEncoder();
    const data = encoder.encode(text.toLowerCase());
    const hash = createHash('sha256').update(data).digest('hex');
    
    // Convert hex hash to a vector-like representation
    const vector = [];
    for (let i = 0; i < hash.length; i += 2) {
      vector.push(parseInt(hash.substr(i, 2), 16) / 255);
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magA += Math.pow(vecA[i], 2);
      magB += Math.pow(vecB[i], 2);
    }
    
    if (magA === 0 || magB === 0) return 0;
    
    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  async getCachedOrGenerate(query, generatorFn) {
    // Create embedding for the query
    const queryEmbedding = await this.createEmbedding(query);
    
    // Find the most similar cached query
    let bestMatch = null;
    let bestSimilarity = 0;
    
    for (const [key, entry] of this.entries) {
      // Check if entry is expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.entries.delete(key);
        continue;
      }
      
      const cachedEmbedding = entry.embedding;
      const similarity = this.cosineSimilarity(queryEmbedding, cachedEmbedding);
      
      if (similarity > bestSimilarity && similarity >= this.similarityThreshold) {
        bestMatch = entry;
        bestSimilarity = similarity;
      }
    }
    
    // If we found a good match, return it
    if (bestMatch) {
      console.log(`🎯 Semantic cache hit with ${Math.round(bestSimilarity * 100)}% similarity`);
      return {
        ...bestMatch.data,
        similarity: bestSimilarity,
        cached: true
      };
    }
    
    // Otherwise generate new response and cache it
    console.log('🧩 Generating new response (no suitable cache)');
    const result = await generatorFn();
    
    // Create a cache entry
    const cacheEntry = {
      embedding: queryEmbedding,
      data: result,
      timestamp: Date.now(),
      ttl: this.ttl
    };
    
    // Add to cache
    const queryHash = createHash('md5').update(query).digest('hex');
    this.entries.set(queryHash, cacheEntry);
    
    // Enforce max size
    if (this.entries.size > this.maxSize) {
      // Remove oldest entries
      const sortedEntries = [...this.entries.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const excessCount = this.entries.size - this.maxSize;
      for (let i = 0; i < excessCount; i++) {
        this.entries.delete(sortedEntries[i][0]);
      }
    }
    
    // Save to disk periodically
    if (this.entries.size % 10 === 0) {
      this.saveToDisk();
    }
    
    return {
      ...result,
      similarity: null,
      cached: false
    };
  }

  getStats() {
    return {
      size: this.entries.size,
      maxSize: this.maxSize,
      utilization: (this.entries.size / this.maxSize) * 100
    };
  }

  clear() {
    this.entries.clear();
  }
}

// Export a function to get a configured instance
export const getSemanticCache = async (options = {}) => {
  return new SemanticCache(options);
};