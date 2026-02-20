/**
 * Dependency Injection Container
 * Manages service instantiation and dependency resolution
 * @module src/server/container
 */

/**
 * Service lifecycle types
 */
export const Lifecycle = {
  SINGLETON: 'singleton',
  TRANSIENT: 'transient',
  SCOPED: 'scoped',
};

/**
 * DI Container class
 */
export class DIContainer {
  constructor() {
    this.registrations = new Map();
    this.instances = new Map();
    this.scopedInstances = new Map();
    this.resolving = new Set(); // For circular dependency detection
  }

  /**
   * Register a service
   * @param {string} name - Service name
   * @param {Function|any} factory - Factory function or value
   * @param {Object} options - Registration options
   * @param {string} options.lifecycle - Service lifecycle (singleton, transient, scoped)
   * @param {string[]} options.dependencies - Array of dependency names
   * @returns {DIContainer} This container for chaining
   */
  register(name, factory, options = {}) {
    const { lifecycle = Lifecycle.SINGLETON, dependencies = [] } = options;

    this.registrations.set(name, {
      factory,
      lifecycle,
      dependencies,
    });

    return this;
  }

  /**
   * Register a singleton service
   * @param {string} name - Service name
   * @param {Function|any} factory - Factory function or value
   * @param {string[]} dependencies - Array of dependency names
   * @returns {DIContainer} This container for chaining
   */
  singleton(name, factory, dependencies = []) {
    return this.register(name, factory, { lifecycle: Lifecycle.SINGLETON, dependencies });
  }

  /**
   * Register a transient service
   * @param {string} name - Service name
   * @param {Function|any} factory - Factory function or value
   * @param {string[]} dependencies - Array of dependency names
   * @returns {DIContainer} This container for chaining
   */
  transient(name, factory, dependencies = []) {
    return this.register(name, factory, { lifecycle: Lifecycle.TRANSIENT, dependencies });
  }

  /**
   * Register a scoped service
   * @param {string} name - Service name
   * @param {Function|any} factory - Factory function or value
   * @param {string[]} dependencies - Array of dependency names
   * @returns {DIContainer} This container for chaining
   */
  scoped(name, factory, dependencies = []) {
    return this.register(name, factory, { lifecycle: Lifecycle.SCOPED, dependencies });
  }

  /**
   * Register a constant value
   * @param {string} name - Service name
   * @param {any} value - Value to register
   * @returns {DIContainer} This container for chaining
   */
  constant(name, value) {
    this.instances.set(name, value);
    return this;
  }

  /**
   * Resolve a service
   * @param {string} name - Service name
   * @returns {any} Resolved service instance
   */
  resolve(name) {
    // Check if already instantiated (for singletons)
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    // Check if registered
    if (!this.registrations.has(name)) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Check for circular dependencies
    if (this.resolving.has(name)) {
      throw new Error(`Circular dependency detected while resolving '${name}'`);
    }

    const registration = this.registrations.get(name);

    // Handle non-function values
    if (typeof registration.factory !== 'function') {
      const instance = registration.factory;
      if (registration.lifecycle === Lifecycle.SINGLETON) {
        this.instances.set(name, instance);
      }
      return instance;
    }

    // Mark as resolving
    this.resolving.add(name);

    try {
      // Resolve dependencies
      const deps = {};
      for (const depName of registration.dependencies) {
        deps[depName] = this.resolve(depName);
      }

      // Create instance
      const instance = registration.factory(deps);

      // Store singleton instances
      if (registration.lifecycle === Lifecycle.SINGLETON) {
        this.instances.set(name, instance);
      }

      return instance;
    } finally {
      this.resolving.delete(name);
    }
  }

  /**
   * Resolve a scoped service
   * @param {string} name - Service name
   * @param {string} scopeId - Scope identifier
   * @returns {any} Resolved service instance
   */
  resolveScoped(name, scopeId) {
    // Check if registered
    if (!this.registrations.has(name)) {
      throw new Error(`Service '${name}' is not registered`);
    }

    const registration = this.registrations.get(name);

    // For scoped services, check scope-specific instances
    if (registration.lifecycle === Lifecycle.SCOPED) {
      if (!this.scopedInstances.has(scopeId)) {
        this.scopedInstances.set(scopeId, new Map());
      }

      const scopeInstances = this.scopedInstances.get(scopeId);
      if (scopeInstances.has(name)) {
        return scopeInstances.get(name);
      }

      // Create new instance for this scope
      const deps = {};
      for (const depName of registration.dependencies) {
        deps[depName] = this.resolve(depName);
      }

      const instance = registration.factory(deps);
      scopeInstances.set(name, instance);
      return instance;
    }

    // For non-scoped services, use regular resolve
    return this.resolve(name);
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean} True if registered
   */
  has(name) {
    return this.registrations.has(name) || this.instances.has(name);
  }

  /**
   * Unregister a service
   * @param {string} name - Service name
   * @returns {boolean} True if unregistered
   */
  unregister(name) {
    this.registrations.delete(name);
    this.instances.delete(name);
    return true;
  }

  /**
   * Clear all registrations and instances
   */
  clear() {
    this.registrations.clear();
    this.instances.clear();
    this.scopedInstances.clear();
    this.resolving.clear();
  }

  /**
   * Clear a specific scope
   * @param {string} scopeId - Scope identifier
   */
  clearScope(scopeId) {
    this.scopedInstances.delete(scopeId);
  }

  /**
   * Get all registered service names
   * @returns {string[]} Array of service names
   */
  getRegisteredServices() {
    return Array.from(this.registrations.keys());
  }

  /**
   * Create a child container
   * @returns {DIContainer} Child container
   */
  createChildContainer() {
    const child = new DIContainer();

    // Copy registrations to child
    for (const [name, registration] of this.registrations) {
      child.registrations.set(name, registration);
    }

    // Share singleton instances with child
    for (const [name, instance] of this.instances) {
      child.instances.set(name, instance);
    }

    return child;
  }
}

/**
 * Create and configure the main application container
 * @param {Object} config - Application configuration
 * @returns {DIContainer} Configured container
 */
export function createAppContainer(config) {
  const container = new DIContainer();

  // Register configuration
  container.constant('config', config);

  // Register core services (these will be lazy-loaded)
  container.singleton('usageTracker', (deps) => {
    const { UsageTracker } = require('../../utils/usage-tracker.js');
    return new UsageTracker();
  });

  container.singleton('costOptimizer', (deps) => {
    const { CostOptimizer } = require('../../engines/cost-optimizer.js');
    return new CostOptimizer(deps.config.FALLBACK_MODELS);
  });

  container.singleton('formalSafetyModel', (deps) => {
    const { FormalSafetyModel } = require('../../engines/formal-safety-model.js');
    return new FormalSafetyModel();
  });

  container.singleton('resourceGovernor', (deps) => {
    const { ResourceGovernor } = require('../../engines/resource-governor.js');
    return new ResourceGovernor();
  });

  container.singleton('stabilityEngine', (deps) => {
    const { StabilityEngine } = require('../../engines/stability-engine.js');
    return new StabilityEngine();
  });

  container.singleton('evolutionEngine', (deps) => {
    const { EvolutionEngine } = require('../../engines/evolution-engine.js');
    return new EvolutionEngine();
  });

  container.singleton('constraintSolver', (deps) => {
    const { ConstraintSolver } = require('../../engines/constraint-solver.js');
    return new ConstraintSolver();
  });

  container.singleton('orchestrationEngine', (deps) => {
    const { OrchestrationEngine } = require('../../engines/orchestration-engine.js');
    return new OrchestrationEngine();
  });

  container.singleton('cognitiveWorkspaceCore', (deps) => {
    const { CognitiveWorkspaceCore } = require('../../engines/cognitive-workspace-core.js');
    return new CognitiveWorkspaceCore();
  });

  container.singleton('solutionEvaluationModel', (deps) => {
    const { SolutionEvaluationModel } = require('../../engines/solution-evaluation-model.js');
    return new SolutionEvaluationModel();
  });

  container.singleton('securityFramework', (deps) => {
    const { SecurityFramework } = require('../../security/security-framework.js');
    return new SecurityFramework({
      encryptionKey: deps.config.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY,
    });
  });

  container.singleton('inputValidator', (deps) => {
    const { InputValidator } = require('../../lib/input-validator.js');
    return new InputValidator();
  });

  container.singleton('metaGovernor', (deps) => {
    const { MetaGovernor } = require('../../lib/meta-governor.js');
    return new MetaGovernor();
  });

  container.singleton('selfHealingLayer', (deps) => {
    const { SelfHealingLayer } = require('../../lib/self-healing-layer.js');
    return new SelfHealingLayer();
  });

  container.singleton('humanOverride', (deps) => {
    const { HumanOverride } = require('../../lib/human-override.js');
    return new HumanOverride();
  });

  container.singleton('explainabilityLayer', (deps) => {
    const { ExplainabilityLayer } = require('../../lib/explainability-layer.js');
    return new ExplainabilityLayer();
  });

  container.singleton('chaosEngineering', (deps) => {
    const { ChaosEngineering } = require('../../lib/chaos-engineering.js');
    return new ChaosEngineering();
  });

  container.singleton('byzantineTolerance', (deps) => {
    const { ByzantineTolerance } = require('../../lib/byzantine-tolerance.js');
    return new ByzantineTolerance();
  });

  container.singleton('catastrophicRollback', (deps) => {
    const { CatastrophicRollback } = require('../../lib/catastrophic-rollback.js');
    return new CatastrophicRollback();
  });

  container.singleton('safePatchGenerator', (deps) => {
    const { SafePatchGenerator } = require('../../lib/safe-patch-generator.js');
    return new SafePatchGenerator();
  });

  container.singleton('goalIntegrityLedger', (deps) => {
    const { GoalIntegrityLedger } = require('../../engines/goal-integrity-ledger.js');
    return new GoalIntegrityLedger();
  });

  container.singleton('antiStagnationEngine', (deps) => {
    const { AntiStagnationEngine } = require('../../engines/anti-stagnation-engine.js');
    return new AntiStagnationEngine();
  });

  container.singleton('entropyDriftMonitor', (deps) => {
    const { EntropyDriftMonitor } = require('../../engines/entropy-drift-monitor.js');
    return new EntropyDriftMonitor();
  });

  container.singleton('observabilityStack', (deps) => {
    const { ObservabilityStack } = require('../../engines/observability-stack.js');
    return new ObservabilityStack();
  });

  container.singleton('agentProtocol', (deps) => {
    const { AgentProtocol } = require('../../engines/agent-protocol.js');
    return new AgentProtocol();
  });

  container.singleton('fileAgentManager', (deps) => {
    const { FileAgentManager } = require('../../engines/file-agent-manager.js');
    return new FileAgentManager(process.cwd());
  });

  container.singleton('projectKnowledgeGraph', (deps) => {
    const { ProjectKnowledgeGraph } = require('../../engines/project-knowledge-graph.js');
    return new ProjectKnowledgeGraph();
  });

  container.singleton('bootRecovery', (deps) => {
    const { BootRecovery } = require('../../engines/boot-recovery.js');
    return new BootRecovery();
  });

  container.singleton('shutdownProcedures', (deps) => {
    const { ShutdownProcedures } = require('../../engines/shutdown-procedures.js');
    return new ShutdownProcedures();
  });

  container.singleton('controlHierarchy', (deps) => {
    const { ControlHierarchy } = require('../../engines/control-hierarchy.js');
    return new ControlHierarchy();
  });

  container.singleton('complexityManagement', (deps) => {
    const { ComplexityManagement } = require('../../engines/complexity-management.js');
    return new ComplexityManagement();
  });

  container.singleton('shadowExecutionLayer', (deps) => {
    const { ShadowExecutionLayer } = require('../../engines/shadow-execution-layer.js');
    return new ShadowExecutionLayer();
  });

  container.singleton('deterministicExecutionLayer', (deps) => {
    const { DeterministicExecutionLayer } = require('../../engines/deterministic-execution-layer.js');
    return new DeterministicExecutionLayer();
  });

  container.singleton('temporalSimulator', (deps) => {
    const { TemporalSimulator } = require('../../engines/temporal-simulator.js');
    return new TemporalSimulator();
  });

  container.singleton('economicResilience', (deps) => {
    const { EconomicResilience } = require('../../engines/economic-resilience.js');
    return new EconomicResilience();
  });

  container.singleton('formalResilienceModel', (deps) => {
    const { FormalResilienceModel } = require('../../engines/formal-resilience-model.js');
    return new FormalResilienceModel();
  });

  container.singleton('advancedUsageTracker', (deps) => {
    const { AdvancedUsageTracker } = require('../../engines/advanced-usage-tracker.js');
    return new AdvancedUsageTracker();
  });

  return container;
}

// Export singleton instance for convenience
let _globalContainer = null;

export function getGlobalContainer() {
  if (!_globalContainer) {
    throw new Error('Global container not initialized. Call initializeGlobalContainer(config) first.');
  }
  return _globalContainer;
}

export function initializeGlobalContainer(config) {
  if (_globalContainer) {
    console.warn('⚠️ Global container already initialized, reinitializing...');
  }
  _globalContainer = createAppContainer(config);
  return _globalContainer;
}

export default DIContainer;
