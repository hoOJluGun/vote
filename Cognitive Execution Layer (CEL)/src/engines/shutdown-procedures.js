/**
 * Graceful Shutdown Procedures for LLM Control Plane
 * Implements the decommissioning strategy with proper cleanup procedures
 */

export class ShutdownProcedures {
  constructor(systemComponents) {
    this.systemComponents = systemComponents || [];
    this.logger = console; // In production, this would be a proper logger
    this.shutdownInProgress = false;
    this.shutdownSteps = [];
  }

  /**
   * Perform graceful shutdown of the system
   */
  async performGracefulShutdown(signal = 'SIGTERM') {
    if (this.shutdownInProgress) {
      this.logger.warn('Shutdown already in progress, ignoring duplicate signal');
      return;
    }

    this.shutdownInProgress = true;
    this.logger.info(`🚨 Initiating graceful shutdown due to ${signal} signal...`);

    try {
      // Step 1: Stop accepting new requests
      await this.stopAcceptingNewRequests();
      
      // Step 2: Complete ongoing operations
      await this.completeOngoingOperations();
      
      // Step 3: Run pre-shutdown hooks
      await this.runPreShutdownHooks();
      
      // Step 4: Persist critical state
      await this.persistCriticalState();
      
      // Step 5: Archive logs and ledgers
      await this.archiveLogsAndLedgers();
      
      // Step 6: Stop all services in reverse dependency order
      await this.stopServicesInOrder();
      
      // Step 7: Final cleanup
      await this.finalCleanup();
      
      this.logger.info('✅ Graceful shutdown completed successfully');
      
      // Exit the process
      process.exit(0);
    } catch (error) {
      this.logger.error('💥 Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Stop accepting new requests
   */
  async stopAcceptingNewRequests() {
    this.logger.info('🔒 Stopping acceptance of new requests...');
    
    // In a real system, this would:
    // - Close server ports
    // - Stop load balancer connections
    // - Mark as unhealthy in service discovery
    // For now, we'll simulate with a timeout
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Complete ongoing operations
   */
  async completeOngoingOperations() {
    this.logger.info('🔄 Completing ongoing operations...');
    
    // In a real system, this would wait for current operations to finish
    // For now, we'll simulate waiting for operations to complete
    return new Promise(resolve => setTimeout(resolve, 200));
  }

  /**
   * Run pre-shutdown hooks
   */
  async runPreShutdownHooks() {
    this.logger.info('⚙️ Running pre-shutdown hooks...');
    
    // Execute any registered pre-shutdown hooks
    for (const component of this.systemComponents) {
      if (component.preShutdownHook) {
        try {
          await component.preShutdownHook();
          this.logger.debug(`✅ Pre-shutdown hook completed for ${component.name}`);
        } catch (error) {
          this.logger.error(`❌ Error in pre-shutdown hook for ${component.name}:`, error);
        }
      }
    }
  }

  /**
   * Persist critical state
   */
  async persistCriticalState() {
    this.logger.info('💾 Persisting critical system state...');
    
    // In a real system, this would:
    // - Save the current state of critical components
    // - Flush pending writes to storage
    // - Ensure consistency of state across components
    return new Promise(resolve => setTimeout(resolve, 150));
  }

  /**
   * Archive logs and ledgers
   */
  async archiveLogsAndLedgers() {
    this.logger.info('🗄️ Archiving logs and mutation ledgers...');
    
    // In a real system, this would:
    // - Compress and archive current logs
    // - Ensure mutation ledgers are safely stored
    // - Create final state snapshots
    return new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * Stop services in reverse dependency order
   */
  async stopServicesInOrder() {
    this.logger.info('🛑 Stopping services in reverse dependency order...');
    
    // Reverse the order to stop dependents before dependencies
    const reversedComponents = [...this.systemComponents].reverse();
    
    for (const component of reversedComponents) {
      if (component.shutdown) {
        try {
          await component.shutdown();
          this.logger.debug(`✅ Service stopped: ${component.name}`);
        } catch (error) {
          this.logger.error(`❌ Error stopping service ${component.name}:`, error);
        }
      }
    }
  }

  /**
   * Final cleanup
   */
  async finalCleanup() {
    this.logger.info('🧹 Performing final cleanup...');
    
    // In a real system, this would:
    // - Close database connections
    // - Release file handles
    // - Clean up temporary files
    // - Perform any other final cleanup tasks
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Emergency shutdown - faster shutdown for critical situations
   */
  async performEmergencyShutdown() {
    this.logger.warn('🚨 Initiating EMERGENCY shutdown...');
    
    try {
      // Immediately stop accepting requests
      await this.stopAcceptingNewRequests();
      
      // Skip ongoing operations completion (may lose data)
      // Run only critical pre-shutdown hooks
      await this.runCriticalPreShutdownHooks();
      
      // Persist only the most critical state
      await this.persistCriticalState();
      
      // Stop services quickly
      await this.quickStopServices();
      
      this.logger.warn('⚡ Emergency shutdown completed');
      
      // Exit immediately
      process.exit(2);
    } catch (error) {
      this.logger.error('💥 Error during emergency shutdown:', error);
      process.exit(3);
    }
  }

  /**
   * Run only critical pre-shutdown hooks
   */
  async runCriticalPreShutdownHooks() {
    this.logger.info('⚙️ Running critical pre-shutdown hooks only...');
    
    for (const component of this.systemComponents) {
      if (component.criticalPreShutdownHook) {
        try {
          await component.criticalPreShutdownHook();
          this.logger.debug(`✅ Critical pre-shutdown hook completed for ${component.name}`);
        } catch (error) {
          this.logger.error(`❌ Error in critical pre-shutdown hook for ${component.name}:`, error);
        }
      }
    }
  }

  /**
   * Quick stop services (skip detailed cleanup)
   */
  async quickStopServices() {
    this.logger.info('⚡ Quickly stopping services...');
    
    for (const component of this.systemComponents) {
      if (component.quickShutdown) {
        try {
          await component.quickShutdown();
          this.logger.debug(`⚡ Service quickly stopped: ${component.name}`);
        } catch (error) {
          this.logger.error(`❌ Error quick-stopping service ${component.name}:`, error);
        }
      }
    }
  }

  /**
   * Create a final system state snapshot
   */
  async createFinalSnapshot() {
    this.logger.info('📸 Creating final system state snapshot...');
    
    // In a real system, this would:
    // - Create a complete snapshot of the system state
    // - Include component states, queues, connections, etc.
    // - Sign the snapshot for integrity verification
    return {
      timestamp: Date.now(),
      components: this.systemComponents.map(c => ({
        name: c.name,
        state: c.getState ? c.getState() : 'unknown'
      })),
      signature: this.generateSnapshotSignature()
    };
  }

  /**
   * Generate a signature for the snapshot
   */
  generateSnapshotSignature() {
    // In a real system, this would generate a cryptographic signature
    // For now, we'll return a simulated signature
    return `SNAPSHOT_SIG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Register shutdown handlers for process signals
   */
  registerShutdownHandlers() {
    this.logger.info('📡 Registering shutdown handlers...');
    
    // Handle termination signals
    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM signal');
      this.performGracefulShutdown('SIGTERM');
    });
    
    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT signal');
      this.performGracefulShutdown('SIGINT');
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception:', error);
      this.performEmergencyShutdown();
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      this.performEmergencyShutdown();
    });
    
    this.logger.info('✅ Shutdown handlers registered');
  }
}

// Example usage:
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Shutdown procedures module loaded. Import and use the ShutdownProcedures class in your application.');
  
  // Example of how to use it:
  /*
  const shutdownManager = new ShutdownProcedures([
    { 
      name: 'web-server', 
      shutdown: () => { console.log('Shutting down web server...'); return Promise.resolve(); },
      getState: () => 'running'
    },
    { 
      name: 'database', 
      shutdown: () => { console.log('Shutting down database...'); return Promise.resolve(); },
      getState: () => 'connected'
    }
  ]);
  
  shutdownManager.registerShutdownHandlers();
  */
}