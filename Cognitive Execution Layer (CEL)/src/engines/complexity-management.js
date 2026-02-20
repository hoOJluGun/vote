/**
 * Complexity Management System for LLM Control Plane
 * Implements automatic removal of deprecated components and system metabolism
 */

export class ComplexityManagementSystem {
  constructor(options = {}) {
    this.options = {
      complexityThreshold: options.complexityThreshold || 75, // Percentage threshold
      cleanupInterval: options.cleanupInterval || 3600000, // 1 hour
      maxComponents: options.maxComponents || 100,
      deprecatedRetentionDays: options.deprecatedRetentionDays || 30,
      ...options
    };
    
    this.components = new Map(); // Track all system components
    this.complexityMetrics = {
      currentLevel: 0,
      peakLevel: 0,
      trend: 'stable', // 'increasing', 'decreasing', 'stable'
      lastUpdated: Date.now()
    };
    
    this.cleanupScheduler = null;
    this.logger = console; // In production, this would be a proper logger
    this.systemMetabolism = new SystemMetabolism(this);
  }

  /**
   * Register a component in the system
   */
  registerComponent(id, definition, metadata = {}) {
    if (this.components.has(id)) {
      this.logger.warn(`Component ${id} already registered, updating...`);
    }
    
    const component = {
      id,
      definition,
      metadata: {
        registeredAt: Date.now(),
        lastUsed: Date.now(),
        usageCount: 0,
        isActive: true,
        ...metadata
      }
    };
    
    this.components.set(id, component);
    this.logger.log(`🧩 Registered component: ${id}`);
    
    // Recalculate complexity after registration
    this.updateComplexityMetrics();
  }

  /**
   * Mark a component as deprecated
   */
  deprecateComponent(id, reason = '') {
    const component = this.components.get(id);
    if (!component) {
      throw new Error(`Component not found: ${id}`);
    }
    
    component.metadata.deprecatedAt = Date.now();
    component.metadata.deprecationReason = reason;
    component.metadata.isActive = false;
    
    this.logger.log(`🗑️ Marked component as deprecated: ${id} - ${reason}`);
  }

  /**
   * Unregister a component from the system
   */
  unregisterComponent(id) {
    if (!this.components.has(id)) {
      throw new Error(`Component not found: ${id}`);
    }
    
    this.components.delete(id);
    this.logger.log(`❌ Unregistered component: ${id}`);
    
    // Recalculate complexity after removal
    this.updateComplexityMetrics();
  }

  /**
   * Update component usage statistics
   */
  updateComponentUsage(id) {
    const component = this.components.get(id);
    if (!component) {
      throw new Error(`Component not found: ${id}`);
    }
    
    component.metadata.lastUsed = Date.now();
    component.metadata.usageCount++;
  }

  /**
   * Update complexity metrics based on current system state
   */
  updateComplexityMetrics() {
    const totalComponents = this.components.size;
    
    // Calculate complexity based on number of components, their interconnections, etc.
    // This is a simplified model - in reality, complexity calculation would be more sophisticated
    const complexityLevel = Math.min(
      100, 
      (totalComponents / this.options.maxComponents) * 100
    );
    
    // Update trend
    const previousLevel = this.complexityMetrics.currentLevel;
    if (complexityLevel > previousLevel) {
      this.complexityMetrics.trend = 'increasing';
    } else if (complexityLevel < previousLevel) {
      this.complexityMetrics.trend = 'decreasing';
    } else {
      this.complexityMetrics.trend = 'stable';
    }
    
    this.complexityMetrics.currentLevel = complexityLevel;
    this.complexityMetrics.peakLevel = Math.max(
      this.complexityMetrics.peakLevel,
      complexityLevel
    );
    this.complexityMetrics.lastUpdated = Date.now();
    
    // Check if complexity threshold is exceeded
    if (complexityLevel > this.options.complexityThreshold) {
      this.logger.warn(`🚨 Complexity threshold exceeded: ${complexityLevel}%`);
      this.triggerComplexityReduction();
    }
    
    this.logger.log(`📊 Complexity metrics updated: ${complexityLevel}%`);
  }

  /**
   * Trigger complexity reduction procedures
   */
  triggerComplexityReduction() {
    this.logger.log('🔄 Initiating complexity reduction procedures...');
    
    // 1. Remove deprecated components that have exceeded retention period
    this.removeExpiredDeprecatedComponents();
    
    // 2. Identify and remove unused components
    this.removeUnusedComponents();
    
    // 3. Consolidate similar components
    this.consolidateSimilarComponents();
    
    // 4. Update metrics after reduction
    this.updateComplexityMetrics();
  }

  /**
   * Remove deprecated components that have exceeded retention period
   */
  removeExpiredDeprecatedComponents() {
    const now = Date.now();
    const retentionPeriod = this.options.deprecatedRetentionDays * 24 * 60 * 60 * 1000;
    
    let removedCount = 0;
    
    for (const [id, component] of this.components) {
      if (component.metadata.deprecatedAt && 
          (now - component.metadata.deprecatedAt) > retentionPeriod) {
        this.components.delete(id);
        removedCount++;
        this.logger.log(`🗑️ Removed expired deprecated component: ${id}`);
      }
    }
    
    if (removedCount > 0) {
      this.logger.log(`✅ Removed ${removedCount} expired deprecated components`);
    }
  }

  /**
   * Remove components that haven't been used recently
   */
  removeUnusedComponents() {
    // Define "unused" as not used in the last 30 days
    const unusedThreshold = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let removedCount = 0;
    
    for (const [id, component] of this.components) {
      // Don't remove active components that have been used recently
      if (component.metadata.lastUsed < unusedThreshold && 
          component.metadata.isActive === false) {
        this.components.delete(id);
        removedCount++;
        this.logger.log(`🧹 Removed unused component: ${id}`);
      }
    }
    
    if (removedCount > 0) {
      this.logger.log(`✅ Removed ${removedCount} unused components`);
    }
  }

  /**
   * Consolidate similar components
   */
  consolidateSimilarComponents() {
    // Group components by type/functionality and look for duplicates
    const componentGroups = new Map();
    
    for (const [id, component] of this.components) {
      const type = component.metadata.type || 'general';
      if (!componentGroups.has(type)) {
        componentGroups.set(type, []);
      }
      componentGroups.get(type).push({ id, component });
    }
    
    let consolidatedCount = 0;
    
    // For each group, identify potentially redundant components
    for (const [type, components] of componentGroups) {
      if (components.length <= 1) continue; // Nothing to consolidate
      
      // In a real implementation, this would analyze functionality overlap
      // For now, we'll just log potential consolidation opportunities
      this.logger.log(`🔍 Found ${components.length} components of type '${type}' - potential consolidation opportunity`);
      
      // Example: identify components with very low usage
      const sortedByUsage = components.sort((a, b) => a.component.metadata.usageCount - b.component.metadata.usageCount);
      
      // Mark the least used ones as candidates for consolidation
      for (let i = 0; i < Math.floor(sortedByUsage.length / 2); i++) {
        const candidate = sortedByUsage[i];
        this.logger.log(`💡 Candidate for consolidation: ${candidate.id} (used ${candidate.component.metadata.usageCount} times)`);
      }
      
      consolidatedCount += Math.floor(components.length / 2);
    }
    
    if (consolidatedCount > 0) {
      this.logger.log(`✅ Identified ${consolidatedCount} components for potential consolidation`);
    }
  }

  /**
   * Start the cleanup scheduler
   */
  startCleanupScheduler() {
    this.logger.log('⏰ Starting complexity management scheduler...');
    
    this.cleanupScheduler = setInterval(() => {
      this.periodicCleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Stop the cleanup scheduler
   */
  stopCleanupScheduler() {
    this.logger.log('🛑 Stopping complexity management scheduler...');
    
    if (this.cleanupScheduler) {
      clearInterval(this.cleanupScheduler);
      this.cleanupScheduler = null;
    }
  }

  /**
   * Perform periodic cleanup operations
   */
  periodicCleanup() {
    this.logger.log('🔄 Performing periodic complexity management...');
    
    // Update complexity metrics
    this.updateComplexityMetrics();
    
    // Perform cleanup operations
    this.removeExpiredDeprecatedComponents();
    this.removeUnusedComponents();
    
    // Log current state
    this.logger.log(`📈 Current complexity: ${this.complexityMetrics.currentLevel}%, Components: ${this.components.size}`);
  }

  /**
   * Get current complexity metrics
   */
  getComplexityMetrics() {
    return { ...this.complexityMetrics };
  }

  /**
   * Get all registered components
   */
  getComponents() {
    return Array.from(this.components.values());
  }

  /**
   * Get component count by status
   */
  getComponentCounts() {
    let active = 0;
    let deprecated = 0;
    let unused = 0;
    
    const now = Date.now();
    const unusedThreshold = now - (30 * 24 * 60 * 60 * 1000);
    
    for (const component of this.components.values()) {
      if (component.metadata.deprecatedAt) {
        deprecated++;
      } else if (component.metadata.lastUsed < unusedThreshold) {
        unused++;
      } else {
        active++;
      }
    }
    
    return { active, deprecated, unused, total: this.components.size };
  }

  /**
   * Perform system metabolism - remove and replace components as needed
   */
  performMetabolism() {
    return this.systemMetabolism.performMetabolism();
  }

  /**
   * Shutdown the complexity management system
   */
  shutdown() {
    this.logger.log('🔌 Shutting down complexity management system...');
    this.stopCleanupScheduler();
  }
}

/**
 * System Metabolism - handles component lifecycle similar to biological metabolism
 */
class SystemMetabolism {
  constructor(parentSystem) {
    this.parentSystem = parentSystem;
    this.logger = parentSystem.logger;
  }

  /**
   * Perform system metabolism - clean up and refresh system components
   */
  async performMetabolism() {
    this.logger.log('🔄 Performing system metabolism...');
    
    // 1. Identify components that need renewal
    const candidates = this.identifyRenewalCandidates();
    
    // 2. Refresh or replace components as needed
    for (const candidate of candidates) {
      await this.renewComponent(candidate);
    }
    
    // 3. Clean up any remaining obsolete elements
    this.cleanupObsoletes();
    
    this.logger.log('✅ System metabolism completed');
  }

  /**
   * Identify components that need renewal
   */
  identifyRenewalCandidates() {
    const now = Date.now();
    const candidates = [];
    
    // Components that haven't been used in a long time
    const unusedThreshold = now - (60 * 24 * 60 * 60 * 1000); // 60 days
    
    for (const [id, component] of this.parentSystem.components) {
      if (component.metadata.lastUsed < unusedThreshold && 
          component.metadata.isActive) {
        candidates.push({
          id,
          component,
          reason: 'long-unused',
          age: now - component.metadata.registeredAt
        });
      }
    }
    
    return candidates;
  }

  /**
   * Renew a component (refresh, update, or replace)
   */
  async renewComponent(candidate) {
    // In a real system, this would either:
    // 1. Refresh the component's implementation
    // 2. Update its dependencies
    // 3. Replace it with a newer version
    // 4. Optimize its implementation
    
    this.logger.log(`🌱 Renewing component: ${candidate.id} (${candidate.reason})`);
    
    // For now, we'll just update the last used timestamp
    const component = this.parentSystem.components.get(candidate.id);
    if (component) {
      component.metadata.lastUsed = Date.now();
      component.metadata.renewedAt = Date.now();
    }
  }

  /**
   * Cleanup obsolete elements
   */
  cleanupObsoletes() {
    // Remove any temporary or obsolete elements
    // In a real system, this would clean up temporary files, cache entries, etc.
    
    this.logger.log('🧹 Cleaning up obsolete elements...');
  }
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Complexity management module loaded. Import and use the ComplexityManagementSystem class in your application.');
}