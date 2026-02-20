/**
 * RAG (Retrieval Augmented Generation) Engine for Cognitive Execution Layer
 * Implements context optimization through semantic search
 */

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

export class RAGEngine {
  constructor(options = {}) {
    this.contextWindowSize = options.contextWindowSize || 3072;
    this.chunkSize = options.chunkSize || 512;
    this.overlap = options.overlap || 50;
    this.topK = options.topK || 5;
    this.storageDir = options.storageDir || './rag-storage';
    
    this.documents = new Map();
    this.embeddings = new Map();
    
    // Initialize storage directory
    this.initStorageDir();
  }

  async initStorageDir() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await this.loadFromStorage();
    } catch (error) {
      console.error('Failed to initialize RAG storage directory:', error);
    }
  }

  async loadFromStorage() {
    try {
      const indexPath = path.join(this.storageDir, 'index.json');
      const data = await fs.readFile(indexPath, 'utf8');
      const parsed = JSON.parse(data);
      
      this.documents = new Map(parsed.documents || []);
      this.embeddings = new Map(parsed.embeddings || []);
    } catch (error) {
      // If file doesn't exist, that's fine - we'll start fresh
      if (error.code !== 'ENOENT') {
        console.error('Failed to load RAG index from storage:', error);
      }
    }
  }

  async saveToStorage() {
    try {
      const indexPath = path.join(this.storageDir, 'index.json');
      const data = {
        documents: Array.from(this.documents.entries()),
        embeddings: Array.from(this.embeddings.entries())
      };
      
      await fs.writeFile(indexPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save RAG index to storage:', error);
    }
  }

  async loadProjectDocuments(projectPath) {
    if (!projectPath) {
      console.warn('No project path provided to RAG engine');
      return;
    }
    
    try {
      const stats = await fs.stat(projectPath);
      
      if (stats.isDirectory()) {
        await this.processDirectory(projectPath);
      } else {
        await this.processFile(projectPath);
      }
      
      // Save after loading
      await this.saveToStorage();
    } catch (error) {
      console.error('Failed to load project documents for RAG:', error);
    }
  }

  async processDirectory(dirPath) {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          // Skip node_modules and other non-source directories
          if (item !== 'node_modules' && !item.startsWith('.')) {
            await this.processDirectory(fullPath);
          }
        } else if (this.isSupportedFile(item)) {
          await this.processFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${dirPath}:`, error);
    }
  }

  async processFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Chunk the content
      const chunks = this.chunkText(content, filePath);
      
      // Process each chunk
      for (const chunk of chunks) {
        const chunkId = this.generateChunkId(filePath, chunk.index);
        
        // Store the chunk
        this.documents.set(chunkId, {
          id: chunkId,
          content: chunk.text,
          filePath,
          index: chunk.index,
          metadata: {
            filePath,
            mimeType: this.getMimeType(filePath)
          }
        });
        
        // Create embedding for the chunk
        const embedding = await this.createEmbedding(chunk.text);
        this.embeddings.set(chunkId, embedding);
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }

  isSupportedFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    const supportedExts = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.h', '.cs', '.go', '.rb', '.php', '.html', '.css', '.md', '.json', '.yaml', '.yml', '.xml'];
    return supportedExts.includes(ext);
  }

  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.jsx': 'application/javascript',
      '.tsx': 'application/typescript',
      '.py': 'text/x-python',
      '.java': 'text/x-java-source',
      '.cpp': 'text/x-c++',
      '.h': 'text/x-chdr',
      '.cs': 'text/x-csharp',
      '.go': 'text/x-go',
      '.rb': 'text/x-ruby',
      '.php': 'text/x-php',
      '.html': 'text/html',
      '.css': 'text/css',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.yaml': 'text/yaml',
      '.yml': 'text/yaml',
      '.xml': 'application/xml'
    };
    
    return mimeTypes[ext] || 'text/plain';
  }

  chunkText(text, filePath) {
    const chunks = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      // If adding this sentence would exceed chunk size
      if (currentChunk.length + sentence.length > this.chunkSize && currentChunk) {
        // Add the current chunk
        chunks.push({
          text: currentChunk.trim(),
          filePath,
          index: chunkIndex++
        });
        
        // Start a new chunk with overlap
        const overlapChars = Math.min(this.overlap, currentChunk.length);
        currentChunk = currentChunk.slice(-overlapChars) + ' ' + sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
      
      // If the current chunk is getting large, break it
      if (currentChunk.length > this.chunkSize) {
        // Find a good breaking point (near the limit)
        const breakPoint = this.findBreakPoint(currentChunk, this.chunkSize);
        const chunkText = currentChunk.substring(0, breakPoint).trim();
        
        chunks.push({
          text: chunkText,
          filePath,
          index: chunkIndex++
        });
        
        currentChunk = currentChunk.substring(breakPoint).trim();
      }
    }
    
    // Add the remaining chunk if it has content
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        filePath,
        index: chunkIndex
      });
    }
    
    return chunks;
  }

  findBreakPoint(text, maxLength) {
    // Find a space near the maxLength to break the text
    if (text.length <= maxLength) return text.length;
    
    let breakPoint = maxLength;
    while (breakPoint > maxLength - 50 && breakPoint > 0 && text[breakPoint] !== ' ') {
      breakPoint--;
    }
    
    // If we couldn't find a space, look for other good breaking points
    if (breakPoint === maxLength - 51) {
      breakPoint = maxLength;
      while (breakPoint > maxLength - 50 && breakPoint > 0 && !['.', ';', ','].includes(text[breakPoint])) {
        breakPoint--;
      }
    }
    
    return breakPoint > 0 ? breakPoint : maxLength;
  }

  generateChunkId(filePath, index) {
    const hash = createHash('md5')
      .update(`${filePath}-${index}`)
      .digest('hex');
    return `${hash.substring(0, 8)}-${index}`;
  }

  // Simplified embedding creation - in reality, you'd use a proper embedding model
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

  async findRelevantChunks(query, context) {
    // Create embedding for the query
    const queryEmbedding = await this.createEmbedding(query);
    
    // Calculate similarities with all stored embeddings
    const similarities = [];
    
    for (const [chunkId, embedding] of this.embeddings) {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      similarities.push({ chunkId, similarity });
    }
    
    // Sort by similarity and take top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topChunks = similarities.slice(0, this.topK);
    
    // Retrieve the actual content for the top chunks
    const relevantChunks = [];
    
    for (const { chunkId, similarity } of topChunks) {
      if (similarity > 0.1) { // Only include chunks with some relevance
        const chunk = this.documents.get(chunkId);
        if (chunk) {
          relevantChunks.push({
            ...chunk,
            similarity
          });
        }
      }
    }
    
    return relevantChunks;
  }

  async optimizeContext(query, additionalContext = {}) {
    try {
      // Find relevant chunks based on the query
      const relevantChunks = await this.findRelevantChunks(query, additionalContext);
      
      // Combine the relevant chunks into a context
      let combinedContext = '';
      let totalLength = 0;
      
      for (const chunk of relevantChunks) {
        const chunkText = `--- From ${chunk.filePath} ---\n${chunk.content}\n\n`;
        
        if (totalLength + chunkText.length > this.contextWindowSize) {
          break; // Don't exceed context window
        }
        
        combinedContext += chunkText;
        totalLength += chunkText.length;
      }
      
      return {
        relevantInfo: combinedContext || null,
        totalChunks: this.embeddings.size,
        totalDocs: new Set([...this.documents.values()].map(doc => doc.filePath)).size,
        sources: [...new Set(relevantChunks.map(c => c.filePath))]
      };
    } catch (error) {
      console.error('Error optimizing context with RAG:', error);
      return {
        relevantInfo: null,
        totalChunks: this.embeddings.size,
        totalDocs: new Set([...this.documents.values()].map(doc => doc.filePath)).size,
        sources: [],
        error: error.message
      };
    }
  }

  getStats() {
    return {
      totalChunks: this.embeddings.size,
      totalDocs: new Set([...this.documents.values()].map(doc => doc.filePath)).size,
      contextWindowSize: this.contextWindowSize,
      chunkSize: this.chunkSize
    };
  }

  clear() {
    this.documents.clear();
    this.embeddings.clear();
  }
}

// Export a function to get a configured instance
export const getRAGEngine = async (options = {}) => {
  return new RAGEngine(options);
};