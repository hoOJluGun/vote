/**
 * Simplified Control Hierarchy for LLM Control Plane
 * Reduces complexity in control layer interactions
 */

export class SimplifiedControlHierarchy {
  constructor() {
    this.layers = new Map();
    this.priorityOrder = [
      'human-override',
      'system-integrity',
      'formal-safety',
      'deterministic',
      'meta-governor',
      'shvl',
      'stability',
      'economic',
      'anti-stagnation',
      'evolution'
    ];
    
    this.conflictResolvers = new Map();
    this.logger = console; // In production, this would be a proper logger
  }

  /**
   * Register a control layer with the hierarchy
   */
  registerLayer(layerId, layerImplementation) {
    if (!this.isValidLayerId(layerId)) {
      throw new Error(`Invalid layer ID: ${layerId}. Must be one of: ${this.priorityOrder.join(', ')}`);
    }
    
    this.layers.set(layerId, {
      id: layerId,
      implementation: layerImplementation,
      priority: this.priorityOrder.indexOf(layerId),
      enabled: true
    });
    
    this.logger.log(`✅ Registered control layer: ${layerId}`);
  }

  /**
   * Validate if a layer ID is valid
   */
  isValidLayerId(layerId) {
    return this.priorityOrder.includes(layerId);
  }

  /**
   * Process a request through the control hierarchy
   */
  async processRequest(request, context = {}) {
    this.logger.log(`🔄 Processing request through control hierarchy:`, request.action);
    
    // Sort layers by priority (higher number = higher priority)
    const orderedLayers = Array.from(this.layers.values())
      .filter(layer => layer.enabled)
      .sort((a, b) => b.priority - a.priority);
    
    let processedRequest = { ...request };
    let processingContext = { ...context, conflicts: [] };
    
    for (const layer of orderedLayers) {
      try {
        this.logger.log(`   → Processing by layer: ${layer.id} (priority: ${layer.priority})`);
        
        // Allow the layer to modify the request or context
        const result = await layer.implementation.process(processedRequest, processingContext);
        
        if (result) {
          if (result.modifiedRequest) {
            processedRequest = { ...processedRequest, ...result.modifiedRequest };
          }
          
          if (result.modifiedContext) {
            processingContext = { ...processingContext, ...result.modifiedContext };
          }
          
          if (result.conflictDetected) {
            processingContext.conflicts.push({
              layerId: layer.id,
              conflict: result.conflictDetails,
              timestamp: Date.now()
            });
            
            // Resolve conflict if resolver exists
            const resolved = await this.resolveConflict(layer.id, result.conflictDetails, processingContext);
            if (resolved) {
              processingContext = { ...processingContext, ...resolved };
            }
          }
          
          // If a layer indicates to halt processing, do so
          if (result.haltProcessing) {
            this.logger.log(`   ⏹️ Layer ${layer.id} halted processing`);
            break;
          }
        }
      } catch (error) {
        this.logger.error(`❌ Error in layer ${layer.id}:`, error.message);
        
        // Decide whether to continue or halt based on layer priority
        if (layer.priority >= this.priorityOrder.indexOf('system-integrity')) {
          // Critical layer failed, halt processing
          throw new Error(`Critical layer ${layer.id} failed: ${error.message}`);
        } else {
          // Non-critical layer failed, continue but log
          this.logger.warn(`   ⚠️ Continuing after non-critical layer ${layer.id} failure`);
        }
      }
    }
    
    return {
      finalRequest: processedRequest,
      finalContext: processingContext,
      processedBy: orderedLayers.map(l => l.id)
    };
  }

  /**
   * Resolve conflicts between control layers
   */
  async resolveConflict(layerId, conflictDetails, context) {
    const resolver = this.conflictResolvers.get(layerId);
    if (resolver) {
      try {
        this.logger.log(`⚖️ Resolving conflict for layer: ${layerId}`);
        return await resolver(conflictDetails, context);
      } catch (error) {
        this.logger.error(`❌ Conflict resolution failed for ${layerId}:`, error.message);
        return null;
      }
    }
    
    // Default conflict resolution based on priority
    return this.defaultConflictResolution(layerId, conflictDetails, context);
  }

  /**
   * Default conflict resolution based on priority
   */
  defaultConflictResolution(layerId, conflictDetails, context) {
    // For now, just log the conflict and allow the higher priority layer to take effect
    this.logger.warn(`📋 Default conflict resolution for ${layerId}:`, conflictDetails);
    return null; // No specific resolution
  }

  /**
   * Register a conflict resolver for a specific layer
   */
  registerConflictResolver(layerId, resolverFn) {
    if (typeof resolverFn !== 'function') {
      throw new Error('Resolver must be a function');
    }
    
    this.conflictResolvers.set(layerId, resolverFn);
    this.logger.log(`🤝 Registered conflict resolver for: ${layerId}`);
  }

  /**
   * Temporarily disable a layer (for testing or maintenance)
   */
  disableLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.enabled = false;
      this.logger.log(`⏸️ Disabled control layer: ${layerId}`);
    } else {
      throw new Error(`Layer not found: ${layerId}`);
    }
  }

  /**
   * Re-enable a disabled layer
   */
  enableLayer(layerId) {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.enabled = true;
      this.logger.log(`▶️ Enabled control layer: ${layerId}`);
    } else {
      throw new Error(`Layer not found: ${layerId}`);
    }
  }

  /**
   * Get current hierarchy status
   */
  getStatus() {
    const layersStatus = {};
    
    for (const [id, layer] of this.layers) {
      layersStatus[id] = {
        priority: layer.priority,
        enabled: layer.enabled,
        registered: true
      };
    }
    
    return {
      totalLayers: this.layers.size,
      enabledLayers: Array.from(this.layers.values()).filter(l => l.enabled).length,
      layers: layersStatus,
      priorityOrder: this.priorityOrder
    };
  }

  /**
   * Simplify the hierarchy by merging overlapping functionalities
   */
  simplifyHierarchy() {
    this.logger.log('🔧 Simplifying control hierarchy...');
    
    // Identify and merge layers with overlapping responsibilities
    const overlaps = this.findOverlappingLayers();
    
    if (overlaps.length > 0) {
      this.logger.log(`📋 Found ${overlaps.length} overlapping layer pairs to consider merging:`);
      for (const overlap of overlaps) {
        this.logger.log(`   • ${overlap.layer1} ↔ ${overlap.layer2}: ${overlap.reason}`);
      }
      
      // For now, we'll just log the overlaps; in a real system, we'd have specific merge strategies
    } else {
      this.logger.log('✅ No significant overlaps detected in control layers');
    }
  }

  /**
   * Find potential overlapping layers
   */
  findOverlappingLayers() {
    // In a real implementation, this would analyze actual layer responsibilities
    // For now, we'll return some example overlaps based on common patterns
    
    const potentialOverlaps = [];
    
    // Example: Stability and Economic layers might both manage resource usage
    if (this.layers.has('stability') && this.layers.has('economic')) {
      potentialOverlaps.push({
        layer1: 'stability',
        layer2: 'economic',
        reason: 'Both manage resource utilization, potential for conflicting resource management'
      });
    }
    
    // Example: Evolution and Anti-Stagnation layers might both push for change
    if (this.layers.has('evolution') && this.layers.has('anti-stagnation')) {
      potentialOverlaps.push({
        layer1: 'evolution',
        layer2: 'anti-stagnation',
        reason: 'Both promote change, potential for excessive modification activity'
      });
    }
    
    return potentialOverlaps;
  }

  /**
   * Optimize the hierarchy based on usage patterns
   */
  optimizeHierarchy(usagePatterns) {
    this.logger.log('⚡ Optimizing control hierarchy based on usage patterns...');
    
    // In a real implementation, this would adjust the hierarchy
    // based on observed usage patterns and performance data
    
    // For example, if certain layers are rarely triggered, 
    // they might be combined or made conditional
    
    // Log the optimization
    this.logger.log('✅ Hierarchy optimization completed');
  }
}

// Example implementations of control layers
export const ControlLayerImplementations = {
  // Human Override Layer
  humanOverride: {
    process: async (request, context) => {
      // In a real implementation, this would check for human override signals
      if (context.humanOverrideActive) {
        return {
          modifiedRequest: { ...request, priority: 'highest' },
          haltProcessing: true
        };
      }
      return null;
    }
  },

  // System Integrity Layer
  systemIntegrity: {
    process: async (request, context) => {
      // In a real implementation, this would verify system integrity
      if (request.target && request.target.startsWith('critical-system/')) {
        return {
          modifiedRequest: { 
            ...request, 
            requiresIntegrityCheck: true 
          }
        };
      }
      return null;
    }
  },

  // Formal Safety Layer
  formalSafety: {
    process: async (request, context) => {
      // In a real implementation, this would apply safety checks
      return {
        modifiedRequest: { 
          ...request,
          safetyVerified: false  // Will be set to true after verification
        }
      };
    }
  },

  // SHVL (Self-Healing Validation Layer)
  shvl: {
    process: async (request, context) => {
      // In a real implementation, this would initiate healing if needed
      if (request.requiresHealing) {
        return {
          modifiedRequest: { 
            ...request,
            healingApplied: true
          }
        };
      }
      return null;
    }
  }
};

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Control hierarchy module loaded. Import and use the SimplifiedControlHierarchy class in your application.');
}