/**
 * Goal Integrity Ledger for LLM Control Plane
 * Maintains immutable ledger of goals and tracks semantic drift
 */

export class GoalIntegrityLedger {
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      driftThreshold: options.driftThreshold || 0.3, // 30% semantic drift threshold
      retentionPeriod: options.retentionPeriod || 30 * 24 * 60 * 60 * 1000, // 30 days
      ...options
    };
    
    this.goals = new Map(); // Map of goalId -> goal object
    this.goalTransformations = new Map(); // Map of goalId -> transformations array
    this.semanticScores = new Map(); // Map of transformationId -> semantic similarity score
    this.logger = console; // In production, this would be a proper logger
  }

  /**
   * Initialize the goal integrity ledger
   */
  async initialize() {
    this.logger.log('🎯 Initializing Goal Integrity Ledger...');
    
    // Load any persisted goals
    await this.loadPersistedGoals();
    
    this.logger.log('✅ Goal Integrity Ledger initialized');
  }

  /**
   * Register a new goal in the ledger
   */
  async registerGoal(goalId, goalDescription, context = {}) {
    if (this.goals.has(goalId)) {
      throw new Error(`Goal already registered with ID: ${goalId}`);
    }
    
    const goal = {
      id: goalId,
      originalDescription: goalDescription,
      registeredAt: Date.now(),
      context: context,
      status: 'active',
      transformations: [],
      driftScore: 0,
      integrityHash: this.calculateIntegrityHash(goalDescription)
    };
    
    this.goals.set(goalId, goal);
    
    this.logger.log(`🎯 Registered new goal: ${goalId} - "${goalDescription.substring(0, 50)}..."`);
    
    return goal;
  }

  /**
   * Transform a goal (when system modifies or refines it)
   */
  async transformGoal(goalId, newDescription, transformationReason = '', metadata = {}) {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error(`Goal not found with ID: ${goalId}`);
    }
    
    // Calculate semantic similarity between original and new description
    const semanticSimilarity = await this.calculateSemanticSimilarity(
      goal.originalDescription, 
      newDescription
    );
    
    // Calculate drift score (how much the goal has changed from original)
    const driftScore = 1 - semanticSimilarity;
    
    // Create transformation record
    const transformation = {
      id: this.generateTransformationId(),
      goalId: goalId,
      originalDescription: goal.originalDescription,
      newDescription: newDescription,
      transformationReason: transformationReason,
      semanticSimilarity: semanticSimilarity,
      driftScore: driftScore,
      transformedAt: Date.now(),
      metadata: metadata
    };
    
    // Add transformation to goal's history
    goal.transformations.push(transformation);
    goal.driftScore = Math.max(goal.driftScore, driftScore); // Track maximum drift
    
    // Store transformation separately
    if (!this.goalTransformations.has(goalId)) {
      this.goalTransformations.set(goalId, []);
    }
    this.goalTransformations.get(goalId).push(transformation);
    
    // Store semantic score
    this.semanticScores.set(transformation.id, semanticSimilarity);
    
    this.logger.log(`🔄 Transformed goal ${goalId}: drift=${(driftScore * 100).toFixed(2)}% - "${newDescription.substring(0, 50)}..."`);
    
    // Check if drift exceeds threshold
    if (driftScore > this.options.driftThreshold) {
      this.logger.warn(`🚨 GOAL DRIFT EXCEEDED THRESHOLD for ${goalId}: ${driftScore.toFixed(3)} > ${this.options.driftThreshold}`);
      await this.handleGoalDrift(goal, transformation);
    }
    
    return transformation;
  }

  /**
   * Calculate semantic similarity between two goal descriptions
   */
  async calculateSemanticSimilarity(original, modified) {
    // In a real system, this would use a semantic similarity model
    // For simulation, we'll use a simple algorithm based on common words
    
    // Convert to lowercase and split into words
    const origWords = original.toLowerCase().split(/\W+/);
    const modWords = modified.toLowerCase().split(/\W+/);
    
    // Calculate intersection and union of word sets
    const origSet = new Set(origWords);
    const modSet = new Set(modWords);
    
    // Find common words
    const commonWords = [...origSet].filter(word => modSet.has(word));
    
    // Calculate Jaccard similarity coefficient
    const intersection = commonWords.length;
    const union = origSet.size + modSet.size - intersection;
    
    // Return similarity score (0-1)
    const jaccardSimilarity = union === 0 ? 1 : intersection / union;
    
    // Also consider length similarity
    const lengthRatio = Math.min(origWords.length, modWords.length) / 
                       Math.max(origWords.length, modWords.length);
    
    // Combine both metrics (weighted)
    const combinedSimilarity = (jaccardSimilarity * 0.7) + (lengthRatio * 0.3);
    
    return combinedSimilarity;
  }

  /**
   * Calculate integrity hash for a goal
   */
  calculateIntegrityHash(description) {
    // In a real system, this would use a proper cryptographic hash
    // For simulation, we'll create a simple hash
    let hash = 0;
    for (let i = 0; i < description.length; i++) {
      const char = description.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `HASH_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Generate a unique transformation ID
   */
  generateTransformationId() {
    return `TRANSFORM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle goal drift when it exceeds threshold
   */
  async handleGoalDrift(goal, transformation) {
    this.logger.warn(`🚨 Goal drift detected for ${goal.id}: ${transformation.driftScore.toFixed(3)}`);
    
    // In a real system, this might:
    // - Alert human operators
    // - Trigger goal validation
    // - Pause autonomous execution
    // - Request clarification
    
    // For now, log the drift
    this.logger.log(`📋 Original: "${goal.originalDescription}"`);
    this.logger.log(`📋 Transformed: "${transformation.newDescription}"`);
    this.logger.log(`📋 Reason: ${transformation.transformationReason}`);
  }

  /**
   * Get a goal by ID
   */
  getGoal(goalId) {
    return this.goals.get(goalId);
  }

  /**
   * Get all goals
   */
  getAllGoals() {
    return Array.from(this.goals.values());
  }

  /**
   * Get transformations for a specific goal
   */
  getGoalTransformations(goalId) {
    return this.goalTransformations.get(goalId) || [];
  }

  /**
   * Get goal drift summary
   */
  getGoalDriftSummary(goalId) {
    const goal = this.goals.get(goalId);
    if (!goal) return null;
    
    const transformations = this.getGoalTransformations(goalId);
    const latestTransformation = transformations.length > 0 ? 
      transformations[transformations.length - 1] : null;
    
    return {
      goalId: goal.id,
      originalDescription: goal.originalDescription,
      currentDriftScore: goal.driftScore,
      maxAllowedDrift: this.options.driftThreshold,
      transformationCount: transformations.length,
      latestTransformation: latestTransformation,
      isWithinBounds: goal.driftScore <= this.options.driftThreshold
    };
  }

  /**
   * Get all goal summaries
   */
  getAllGoalSummaries() {
    const summaries = [];
    
    for (const [goalId] of this.goals) {
      summaries.push(this.getGoalDriftSummary(goalId));
    }
    
    return summaries;
  }

  /**
   * Validate if a goal is still within acceptable drift bounds
   */
  isGoalValid(goalId) {
    const goal = this.goals.get(goalId);
    if (!goal) return false;
    
    return goal.driftScore <= this.options.driftThreshold;
  }

  /**
   * Get goals with drift exceeding threshold
   */
  getDriftedGoals() {
    return Array.from(this.goals.values())
      .filter(goal => goal.driftScore > this.options.driftThreshold);
  }

  /**
   * Load persisted goals (placeholder for persistence)
   */
  async loadPersistedGoals() {
    // In a real system, this would load goals from persistent storage
    // For now, we'll just log that this would happen
    this.logger.log('📚 Loading persisted goals (simulation)...');
  }

  /**
   * Persist goals (placeholder for persistence)
   */
  async persistGoals() {
    // In a real system, this would save goals to persistent storage
    // For now, we'll just log that this would happen
    this.logger.log('💾 Persisting goals (simulation)...');
  }

  /**
   * Clean up old entries beyond retention period
   */
  async cleanupOldEntries() {
    const cutoffTime = Date.now() - this.options.retentionPeriod;
    
    // Remove old transformations
    for (const [goalId, transformations] of this.goalTransformations) {
      const filtered = transformations.filter(t => t.transformedAt > cutoffTime);
      this.goalTransformations.set(goalId, filtered);
    }
    
    this.logger.log(`🧹 Cleaned up entries older than ${this.options.retentionPeriod / (1000 * 60 * 60 * 24)} days`);
  }

  /**
   * Shutdown the goal integrity ledger
   */
  async shutdown() {
    this.logger.log('🛑 Shutting down Goal Integrity Ledger...');
    
    // Persist current state
    await this.persistGoals();
    
    this.logger.log('✅ Goal Integrity Ledger shut down');
  }
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Goal integrity ledger module loaded. Import and use the GoalIntegrityLedger class in your application.');
}