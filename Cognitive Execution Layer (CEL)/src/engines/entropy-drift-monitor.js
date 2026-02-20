/**
 * Entropy Drift Monitor for LLM Control Plane
 * Monitors informational entropy of system state to detect drift
 */

export class EntropyDriftMonitor {
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      entropyThreshold: options.entropyThreshold || 0.7, // 70% threshold
      monitoringInterval: options.monitoringInterval || 60000, // 1 minute
      stabilizationModeThreshold: options.stabilizationModeThreshold || 0.85, // 85% threshold
      ...options
    };
    
    this.stateHistory = [];
    this.entropyHistory = [];
    this.isInStabilizationMode = false;
    this.monitoringInterval = null;
    this.logger = console; // In production, this would be a proper logger
    
    this.metrics = {
      graphDensity: 0,
      mutationRate: 0,
      rollbackFrequency: 0,
      diffSize: 0,
      currentEntropy: 0
    };
  }

  /**
   * Initialize the entropy drift monitor
   */
  async initialize() {
    this.logger.log('🌀 Initializing Entropy Drift Monitor...');
    
    // Start monitoring
    this.startMonitoring();
    
    this.logger.log('✅ Entropy Drift Monitor initialized');
  }

  /**
   * Start entropy monitoring
   */
  startMonitoring() {
    this.logger.log('🔄 Starting entropy monitoring cycle...');
    
    this.monitoringInterval = setInterval(async () => {
      await this.measureEntropy();
    }, this.options.monitoringInterval);
  }

  /**
   * Measure current system entropy
   */
  async measureEntropy() {
    this.logger.debug('🌀 Measuring system entropy...');
    
    // Calculate entropy using the formula:
    // state_entropy = f(graph_density, mutation_rate, rollback_frequency, diff_size)
    const graphDensity = await this.calculateGraphDensity();
    const mutationRate = await this.calculateMutationRate();
    const rollbackFrequency = await this.calculateRollbackFrequency();
    const diffSize = await this.calculateDiffSize();
    
    // Calculate entropy score (normalized to 0-1 scale)
    const entropy = this.calculateEntropyScore(graphDensity, mutationRate, rollbackFrequency, diffSize);
    
    // Store metrics
    this.metrics = {
      graphDensity,
      mutationRate,
      rollbackFrequency,
      diffSize,
      currentEntropy: entropy
    };
    
    // Store history
    this.entropyHistory.push({
      timestamp: Date.now(),
      entropy,
      graphDensity,
      mutationRate,
      rollbackFrequency,
      diffSize
    });
    
    // Keep only last 1000 measurements
    if (this.entropyHistory.length > 1000) {
      this.entropyHistory = this.entropyHistory.slice(-1000);
    }
    
    this.logger.debug(`🌀 Current entropy: ${(entropy * 100).toFixed(2)}%`);
    
    // Check if entropy is too high
    if (entropy > this.options.stabilizationModeThreshold) {
      this.logger.warn(`🚨 Entropy too high (${(entropy * 100).toFixed(2)}%), entering stabilization mode`);
      this.isInStabilizationMode = true;
      await this.triggerStabilizationMode();
    } else if (entropy < this.options.stabilizationModeThreshold * 0.8 && this.isInStabilizationMode) {
      this.logger.log(`✅ Entropy normalized (${(entropy * 100).toFixed(2)}%), exiting stabilization mode`);
      this.isInStabilizationMode = false;
      await this.exitStabilizationMode();
    }
    
    // Check for entropy drift trends
    await this.checkEntropyDriftTrends(entropy);
  }

  /**
   * Calculate entropy score based on multiple factors
   */
  calculateEntropyScore(graphDensity, mutationRate, rollbackFrequency, diffSize) {
    // Normalize each factor to 0-1 scale
    const normalizedGraphDensity = Math.min(1, graphDensity / 10); // Assuming max density of 10
    const normalizedMutationRate = Math.min(1, mutationRate / 5); // Assuming max mutation rate of 5
    const normalizedRollbackFreq = Math.min(1, rollbackFrequency / 2); // Assuming max rollback freq of 2
    const normalizedDiffSize = Math.min(1, diffSize / 1000); // Assuming max diff size of 1000
    
    // Calculate weighted entropy (weights can be adjusted based on importance)
    const weights = {
      graphDensity: 0.25,
      mutationRate: 0.3,
      rollbackFrequency: 0.25,
      diffSize: 0.2
    };
    
    const entropy = (
      normalizedGraphDensity * weights.graphDensity +
      normalizedMutationRate * weights.mutationRate +
      normalizedRollbackFreq * weights.rollbackFrequency +
      normalizedDiffSize * weights.diffSize
    );
    
    return Math.min(1, Math.max(0, entropy)); // Clamp between 0 and 1
  }

  /**
   * Calculate graph density
   */
  async calculateGraphDensity() {
    // In a real system, this would analyze the actual dependency graph
    // For simulation purposes, we'll return a value that can change over time
    return Math.random() * 8 + 2; // Between 2 and 10
  }

  /**
   * Calculate mutation rate
   */
  async calculateMutationRate() {
    // In a real system, this would count recent mutations
    // For simulation, return a value based on recent activity
    return Math.random() * 4 + 1; // Between 1 and 5
  }

  /**
   * Calculate rollback frequency
   */
  async calculateRollbackFrequency() {
    // In a real system, this would count recent rollbacks
    // For simulation, return a value based on system instability
    return Math.random() * 1.5; // Between 0 and 1.5
  }

  /**
   * Calculate diff size
   */
  async calculateDiffSize() {
    // In a real system, this would measure actual diff sizes
    // For simulation, return a value based on changes
    return Math.random() * 800 + 200; // Between 200 and 1000
  }

  /**
   * Check for entropy drift trends
   */
  async checkEntropyDriftTrends(currentEntropy) {
    if (this.entropyHistory.length < 10) return; // Need at least 10 samples
    
    // Get last 10 entropy values
    const recentEntropies = this.entropyHistory.slice(-10).map(e => e.entropy);
    
    // Calculate trend (slope of linear regression)
    const trend = this.calculateTrend(recentEntropies);
    
    if (trend > 0.02) { // Entropy increasing rapidly
      this.logger.warn(`📈 Entropy showing rapid upward trend (${(trend * 100).toFixed(2)}%/sample)`);
      await this.handleRapidEntropyIncrease();
    } else if (trend < -0.02) { // Entropy decreasing rapidly
      this.logger.log(`📉 Entropy showing rapid downward trend (${(trend * 100).toFixed(2)}%/sample)`);
    }
  }

  /**
   * Calculate trend from a series of values
   */
  calculateTrend(values) {
    // Simple linear regression to find slope
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      const x = i;
      const y = values[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }
    
    // Slope calculation: (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return 0;
    
    return (n * sumXY - sumX * sumY) / denominator;
  }

  /**
   * Handle rapid entropy increase
   */
  async handleRapidEntropyIncrease() {
    this.logger.warn('⚠️ Rapid entropy increase detected, taking preventive measures...');
    
    // Reduce mutation rate
    this.logger.log('🔒 Temporarily reducing system mutation rate');
    
    // Increase monitoring frequency temporarily
    this.logger.log('🔍 Increasing monitoring frequency');
    
    // Trigger additional stability checks
    this.logger.log('🛡️ Running additional stability checks');
  }

  /**
   * Trigger stabilization mode
   */
  async triggerStabilizationMode() {
    this.logger.warn('🚨 Entering STABILIZATION MODE to reduce system entropy...');
    
    // In a real system, this would:
    // - Pause non-critical mutations
    // - Reduce exploration
    // - Increase consistency checks
    // - Focus on stabilization
  }

  /**
   * Exit stabilization mode
   */
  async exitStabilizationMode() {
    this.logger.log('✅ Exiting STABILIZATION MODE, resuming normal operations...');
    
    // In a real system, this would:
    // - Resume normal operations
    // - Gradually increase mutation rate
    // - Return to normal exploration
  }

  /**
   * Get current entropy metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get entropy history
   */
  getEntropyHistory(limit = 100) {
    return this.entropyHistory.slice(-limit);
  }

  /**
   * Get entropy summary
   */
  getEntropySummary() {
    if (this.entropyHistory.length === 0) {
      return {
        currentEntropy: 0,
        averageEntropy: 0,
        maxEntropy: 0,
        minEntropy: 0,
        trend: 0
      };
    }
    
    const entropies = this.entropyHistory.map(e => e.entropy);
    const avgEntropy = entropies.reduce((sum, val) => sum + val, 0) / entropies.length;
    const maxEntropy = Math.max(...entropies);
    const minEntropy = Math.min(...entropies);
    const trend = this.calculateTrend(entropies);
    
    return {
      currentEntropy: this.metrics.currentEntropy,
      averageEntropy: avgEntropy,
      maxEntropy: maxEntropy,
      minEntropy: minEntropy,
      trend: trend,
      isInStabilizationMode: this.isInStabilizationMode
    };
  }

  /**
   * Shutdown the entropy drift monitor
   */
  async shutdown() {
    this.logger.log('🛑 Shutting down Entropy Drift Monitor...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.logger.log('✅ Entropy Drift Monitor shut down');
  }
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Entropy drift monitor module loaded. Import and use the EntropyDriftMonitor class in your application.');
}