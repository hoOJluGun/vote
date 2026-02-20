/**
 * Semantic Cache - Caches semantically similar requests to optimize token usage
 * @module src/engines/semantic-cache
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'fileURLtoPath';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SemanticCache {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || path.join(__dirname, '../../../cache');
    this.maxSize = options.maxSize || 1000; // Max number of cached entries
    this.ttl = options.ttl || 24 * 60 * 60 * 1000; // Time to live in ms (default 24 hours)
    this.similarityThreshold = options.similarityThreshold || 0.85; // 85% similarity threshold
    this.entries = new Map();
    this.embeddings = []; // Store embeddings for similarity comparison
  }

  /**
   * Initialize cache from persistent storage
   */
  async initialize() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      // Load existing cache entries
      const cacheFile = path.join(this.cacheDir, 'semantic-cache.json');
      try {
        const data = await fs.readFile(cacheFile, 'utf8');
        const cacheData = JSON.parse(data);
        
        // Load entries and filter by TTL
        const now = Date.now();
        for (const [key, entry] of Object.entries(cacheData)) {
          if (now - entry.timestamp < this.ttl) {
            this.entries.set(key, entry);
            this.embeddings.push({
              key,
              embedding: entry.embedding,
              timestamp: entry.timestamp
            });
          }
        }
      } catch (error) {
        // File doesn't exist yet, that's ok
        console.log('No existing cache found, starting fresh');
      }
    } catch (error) {
      console.error('Error initializing semantic cache:', error);
    }
  }

  /**
   * Generate embedding for text using a simple approach
   * In a real implementation, this would use a proper embedding model
   * @param {string} text - Text to embed
   * @returns {Array<number>} Embedding vector
   */
  async generateEmbedding(text) {
    // Simple approach: normalize and hash the text to create a pseudo-embedding
    // In production, replace with actual embedding model (e.g., OpenAI embeddings)
    const normalized = text.toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 100); // Limit to first 100 words
    
    // Create a 16-dimensional vector based on word hashes
    const vector = new Array(16).fill(0);
    
    for (let i = 0; i < normalized.length; i++) {
      const word = normalized[i];
      const hash = this.simpleHash(word);
      
      for (let j = 0; j < 16; j++) {
        vector[j] = (vector[j] + ((hash >> j) & 1)) % 2 === 0 ? 
          Math.min(vector[j] + 0.1, 1) : 
          Math.max(vector[j] - 0.1, -1);
      }
    }
    
    return vector;
  }

  /**
   * Simple hash function for word hashing
   * @param {string} str - String to hash
   * @returns {number} Hash value
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array<number>} vecA - First vector
   * @param {Array<number>} vecB - Second vector
   * @returns {number} Cosine similarity (0-1)
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += Math.pow(vecA[i], 2);
      normB += Math.pow(vecB[i], 2);
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find semantically similar entry in cache
   * @param {string} text - Query text
   * @returns {Object|null} Cached entry or null if not found
   */
  async findSimilarEntry(text) {
    const queryEmbedding = await this.generateEmbedding(text);
    
    // Find the most similar entry
    let bestMatch = null;
    let bestSimilarity = 0;
    
    for (const item of this.embeddings) {
      const similarity = this.cosineSimilarity(queryEmbedding, item.embedding);
      
      if (similarity > bestSimilarity && similarity >= this.similarityThreshold) {
        bestSimilarity = similarity;
        const cachedEntry = this.entries.get(item.key);
        
        // Check if entry is still valid (not expired)
        if (Date.now() - cachedEntry.timestamp < this.ttl) {
          bestMatch = {
            ...cachedEntry.data,
            similarity: bestSimilarity
          };
        }
      }
    }
    
    return bestMatch;
  }

  /**
   * Add entry to cache
   * @param {string} key - Cache key
   * @param {string} text - Original text for embedding
   * @param {any} data - Data to cache
   */
  async addToCache(key, text, data) {
    const embedding = await this.generateEmbedding(text);
    
    const entry = {
      key,
      data,
      embedding,
      timestamp: Date.now()
    };
    
    // Remove oldest entries if cache is full
    if (this.entries.size >= this.maxSize) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.entries.delete(oldestKey);
        this.embeddings = this.embeddings.filter(item => item.key !== oldestKey);
      }
    }
    
    this.entries.set(key, entry);
    this.embeddings.push({
      key,
      embedding,
      timestamp: entry.timestamp
    });
    
    // Persist cache
    await this.persist();
  }

  /**
   * Find oldest entry in cache
   * @returns {string|null} Oldest key or null if none
   */
  findOldestEntry() {
    let oldestKey = null;
    let oldestTime = Number.MAX_SAFE_INTEGER;
    
    for (const [key, entry] of this.entries.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  /**
   * Persist cache to disk
   */
  async persist() {
    try {
      const cacheData = {};
      for (const [key, entry] of this.entries.entries()) {
        // Don't store the embedding in persistent storage to save space
        // We'll regenerate embeddings when loading
        cacheData[key] = {
          data: entry.data,
          timestamp: entry.timestamp
        };
      }
      
      const cacheFile = path.join(this.cacheDir, 'semantic-cache.json');
      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      console.error('Error persisting cache:', error);
    }
  }

  /**
   * Get response from cache or add new response
   * @param {string} prompt - Input prompt
   * @param {Function} generatorFn - Async function to generate response if not in cache
   * @returns {any} Cached or generated response
   */
  async getCachedOrGenerate(prompt, generatorFn) {
    // Try to find similar entry
    const similarEntry = await this.findSimilarEntry(prompt);
    
    if (similarEntry) {
      console.log(`🎯 Found similar entry in cache (similarity: ${(similarEntry.similarity * 100).toFixed(2)}%)`);
      return similarEntry;
    }
    
    // Generate new response
    console.log('🔄 Generating new response (not found in cache)');
    const response = await generatorFn();
    
    // Add to cache
    const cacheKey = this.generateCacheKey(prompt);
    await this.addToCache(cacheKey, prompt, response);
    
    return response;
  }

  /**
   * Generate cache key from prompt
   * @param {string} prompt - Input prompt
   * @returns {string} Cache key
   */
  generateCacheKey(prompt) {
    // Create a unique key based on the prompt content
    return `cache_${this.simpleHash(prompt).toString(36)}`;
  }

  /**
   * Clear expired entries
   */
  async cleanup() {
    const now = Date.now();
    const keysToRemove = [];
    
    for (const [key, entry] of this.entries.entries()) {
      if (now - entry.timestamp >= this.ttl) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      this.entries.delete(key);
      this.embeddings = this.embeddings.filter(item => item.key !== key);
    }
    
    if (keysToRemove.length > 0) {
      console.log(`🧹 Cleaned up ${keysToRemove.length} expired cache entries`);
      await this.persist();
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      size: this.entries.size,
      maxSize: this.maxSize,
      utilization: this.entries.size / this.maxSize,
      entries: Array.from(this.entries.keys()),
      ttl: this.ttl
    };
  }
}

// Export a singleton instance
let cacheInstance = null;

export async function getSemanticCache(options = {}) {
  if (!cacheInstance) {
    cacheInstance = new SemanticCache(options);
    await cacheInstance.initialize();
  }
  return cacheInstance;
}

export default SemanticCache;