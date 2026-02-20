/**
 * RAG Engine - Retrieval Augmented Generation for context optimization
 * @module src/engines/rag-engine
 */

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

export class RAGEngine {
  constructor(options = {}) {
    this.vectorDB = new Map(); // In-memory vector store simulation
    this.contextWindowSize = options.contextWindowSize || 3072; // Max tokens to keep
    this.chunkSize = options.chunkSize || 512; // Size of text chunks
    this.overlap = options.overlap || 50; // Overlap between chunks
    this.topK = options.topK || 5; // Top K similar chunks to retrieve
    this.storagePath = options.storagePath || './storage/rag-storage.json';
  }

  /**
   * Split text into overlapping chunks
   * @param {string} text - Text to split
   * @returns {Array<string>} Chunks of text
   */
  chunkText(text) {
    const words = text.split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += (this.chunkSize - this.overlap)) {
      const chunk = words.slice(i, i + this.chunkSize).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }

  /**
   * Simple embedding using TF-IDF approach
   * @param {string} text - Text to embed
   * @returns {Object} Term frequency vector
   */
  createEmbedding(text) {
    const terms = text.toLowerCase()
      .replace(/[^\w\s]/gi, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2);
    
    const vector = {};
    const totalTerms = terms.length;
    
    // Calculate term frequencies
    for (const term of terms) {
      vector[term] = (vector[term] || 0) + 1;
    }
    
    // Normalize frequencies
    for (const term in vector) {
      vector[term] = vector[term] / totalTerms;
    }
    
    return vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Object} vecA - First vector
   * @param {Object} vecB - Second vector
   * @returns {number} Similarity score (0-1)
   */
  cosineSimilarity(vecA, vecB) {
    const termsA = Object.keys(vecA);
    const termsB = Object.keys(vecB);
    
    // Get all unique terms
    const allTerms = new Set([...termsA, ...termsB]);
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (const term of allTerms) {
      const valA = vecA[term] || 0;
      const valB = vecB[term] || 0;
      
      dotProduct += valA * valB;
      normA += Math.pow(valA, 2);
      normB += Math.pow(valB, 2);
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Add document to the knowledge base
   * @param {string} docId - Document identifier
   * @param {string} content - Document content
   * @param {Object} metadata - Additional metadata
   */
  async addDocument(docId, content, metadata = {}) {
    const chunks = this.chunkText(content);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${docId}-${i}`;
      const embedding = this.createEmbedding(chunks[i]);
      
      this.vectorDB.set(chunkId, {
        docId,
        content: chunks[i],
        embedding,
        metadata: { ...metadata, chunkIndex: i }
      });
    }
    
    console.log(`📄 Added document ${docId} with ${chunks.length} chunks to RAG engine`);
  }

  /**
   * Retrieve relevant chunks based on query
   * @param {string} query - Query text
   * @returns {Array<Object>} Relevant chunks with similarity scores
   */
  async retrieveRelevantChunks(query) {
    const queryEmbedding = this.createEmbedding(query);
    const similarities = [];
    
    for (const [chunkId, chunkData] of this.vectorDB.entries()) {
      const similarity = this.cosineSimilarity(queryEmbedding, chunkData.embedding);
      similarities.push({
        chunkId,
        ...chunkData,
        similarity
      });
    }
    
    // Sort by similarity and return top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, this.topK);
  }

  /**
   * Optimize context by retrieving relevant information
   * @param {string} query - User query
   * @param {Object} context - Additional context
   * @returns {Object} Optimized context with relevant information
   */
  async optimizeContext(query, context = {}) {
    // Retrieve relevant chunks based on the query
    const relevantChunks = await this.retrieveRelevantChunks(query);
    
    // Combine relevant chunks into a context summary
    let optimizedContext = {
      originalQuery: query,
      retrievedChunks: relevantChunks.map(chunk => ({
        content: chunk.content,
        similarity: chunk.similarity,
        metadata: chunk.metadata
      })),
      relevantInfo: '',
      tokensSaved: 0
    };
    
    // Create a summary of relevant information
    const relevantTexts = relevantChunks.map(chunk => chunk.content);
    optimizedContext.relevantInfo = relevantTexts.join('\n...\n');
    
    // If there's additional context, we can incorporate it selectively
    if (context.projectStructure) {
      optimizedContext.projectStructure = context.projectStructure;
    }
    
    if (context.fileContext) {
      optimizedContext.fileContext = context.fileContext;
    }
    
    // Estimate tokens saved by using RAG instead of full context
    const fullContextSize = JSON.stringify(context).length;
    const ragContextSize = JSON.stringify(optimizedContext).length;
    optimizedContext.tokensSaved = Math.max(0, fullContextSize - ragContextSize);
    
    return optimizedContext;
  }

  /**
   * Load documents from a project directory
   * @param {string} projectPath - Path to the project
   */
  async loadProjectDocuments(projectPath) {
    try {
      const stats = await fs.stat(projectPath);
      
      if (stats.isDirectory()) {
        const files = await fs.readdir(projectPath);
        
        for (const file of files) {
          const filePath = path.join(projectPath, file);
          const fileStats = await fs.stat(filePath);
          
          if (fileStats.isDirectory()) {
            // Recursively process subdirectories
            await this.loadProjectDocuments(filePath);
          } else if (this.isCodeFile(file)) {
            // Process code files
            const content = await fs.readFile(filePath, 'utf8');
            const docId = filePath.replace(/\//g, '_').replace(/\./g, '_');
            
            await this.addDocument(docId, content, {
              filePath,
              fileType: path.extname(file),
              size: fileStats.size
            });
          }
        }
      } else if (this.isCodeFile(projectPath)) {
        // Process single file
        const content = await fs.readFile(projectPath, 'utf8');
        const docId = projectPath.replace(/\//g, '_').replace(/\./g, '_');
        
        await this.addDocument(docId, content, {
          filePath: projectPath,
          fileType: path.extname(projectPath),
          size: stats.size
        });
      }
    } catch (error) {
      console.error(`Error loading project documents from ${projectPath}:`, error);
    }
  }

  /**
   * Check if a file is a code file
   * @param {string} filename - Name of the file
   * @returns {boolean} True if it's a code file
   */
  isCodeFile(filename) {
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.h', '.cs', '.swift', '.go', '.rs', '.vue', '.svelte', '.html', '.css', '.scss', '.json', '.yaml', '.md'];
    const ext = path.extname(filename).toLowerCase();
    return codeExtensions.includes(ext);
  }

  /**
   * Search for relevant information in the knowledge base
   * @param {string} query - Search query
   * @param {number} limit - Maximum number of results
   * @returns {Array<Object>} Search results
   */
  async search(query, limit = this.topK) {
    const relevantChunks = await this.retrieveRelevantChunks(query);
    return relevantChunks.slice(0, limit).map(chunk => ({
      id: chunk.chunkId,
      content: chunk.content,
      similarity: chunk.similarity,
      metadata: chunk.metadata
    }));
  }

  /**
   * Save the vector database to persistent storage
   */
  async saveToStorage() {
    try {
      // Prepare data for serialization (remove embeddings which can be regenerated)
      const serializableData = {};
      
      for (const [chunkId, chunkData] of this.vectorDB.entries()) {
        serializableData[chunkId] = {
          docId: chunkData.docId,
          content: chunkData.content,
          metadata: chunkData.metadata
        };
      }
      
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      await fs.writeFile(this.storagePath, JSON.stringify(serializableData, null, 2));
      console.log(`💾 RAG engine state saved to ${this.storagePath}`);
    } catch (error) {
      console.error('Error saving RAG engine state:', error);
    }
  }

  /**
   * Load the vector database from persistent storage
   */
  async loadFromStorage() {
    try {
      const data = await fs.readFile(this.storagePath, 'utf8');
      const loadedData = JSON.parse(data);
      
      for (const [chunkId, chunkData] of Object.entries(loadedData)) {
        // Regenerate embeddings
        const embedding = this.createEmbedding(chunkData.content);
        
        this.vectorDB.set(chunkId, {
          ...chunkData,
          embedding
        });
      }
      
      console.log(`📂 RAG engine state loaded from ${this.storagePath}, ${this.vectorDB.size} chunks`);
    } catch (error) {
      console.log(`No existing RAG storage found at ${this.storagePath}, starting fresh`);
    }
  }

  /**
   * Get statistics about the RAG engine
   * @returns {Object} Statistics
   */
  getStats() {
    const docs = new Set();
    for (const chunk of this.vectorDB.values()) {
      docs.add(chunk.docId);
    }
    
    return {
      totalChunks: this.vectorDB.size,
      totalDocs: docs.size,
      chunkSize: this.chunkSize,
      topK: this.topK,
      contextWindowSize: this.contextWindowSize
    };
  }
}

// Singleton instance
let ragEngine = null;

export async function getRAGEngine(options = {}) {
  if (!ragEngine) {
    ragEngine = new RAGEngine(options);
    await ragEngine.loadFromStorage();
  }
  return ragEngine;
}

export default RAGEngine;