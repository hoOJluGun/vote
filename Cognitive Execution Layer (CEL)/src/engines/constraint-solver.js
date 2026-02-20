'use strict';

/**
 * Constraint Solver Engine
 * Solves constraint satisfaction problems using backtracking and optimization
 *
 * @module src/engines/constraint-solver
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Constraint types
 * @enum {string}
 */
const CONSTRAINT_TYPES = {
  EQUALITY: 'equality',
  INEQUALITY: 'inequality',
  BOUNDARY: 'boundary',
  RELATIONAL: 'relational',
  CUSTOM: 'custom',
};

/**
 * Solution statuses
 * @enum {string}
 */
const SOLUTION_STATUS = {
  OPTIMAL: 'optimal',
  FEASIBLE: 'feasible',
  INFEASIBLE: 'infeasible',
  UNKNOWN: 'unknown',
};

// ============================================================================
// CONSTRAINT SOLVER CLASS
// ============================================================================

/**
 * Constraint Solver
 * Solves optimization and constraint satisfaction problems
 * @class
 */
class ConstraintSolver {
  /**
   * Create a ConstraintSolver instance
   * @param {Object} options - Configuration options
   * @param {number} [options.maxIterations=10000] - Maximum iterations
   * @param {number} [options.tolerance=0.001] - Solution tolerance
   * @param {boolean} [options.optimizeForSpeed=true] - Prioritize speed over optimality
   */
  constructor(options = {}) {
    /** @type {number} */
    this.maxIterations = options.maxIterations || 10000;

    /** @type {number} */
    this.tolerance = options.tolerance || 0.001;

    /** @type {boolean} */
    this.optimizeForSpeed = options.optimizeForSpeed !== false;

    /** @type {Array<Object>} */
    this.constraints = [];

    /** @type {Map<string, Object>} */
    this.variables = new Map();

    /** @type {Map<string, Object>} */
    this.domains = new Map();

    /** @type {Object} */
    this.solution = null;

    /** @type {boolean} */
    this.initialized = false;

    /** @type {Object} */
    this.stats = {
      problemsSolved: 0,
      totalIterations: 0,
      averageSolveTime: 0,
    };
  }

  // ==========================================================================
  // CONSTRAINT MANAGEMENT
  // ==========================================================================

  /**
   * Add a constraint to the solver
   * @param {Object} constraint - Constraint to add
   * @param {string} constraint.type - Constraint type from CONSTRAINT_TYPES
   * @param {string} constraint.name - Constraint name
   * @param {Array<string>} constraint.variables - Variables involved
   * @param {Function} constraint.predicate - Predicate function
   * @param {Object} [constraint.params] - Additional parameters
   */
  addConstraint(constraint) {
    const normalizedConstraint = {
      id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: constraint.type || CONSTRAINT_TYPES.CUSTOM,
      name: constraint.name || `constraint_${this.constraints.length}`,
      variables: constraint.variables || [],
      predicate: constraint.predicate || (() => true),
      params: constraint.params || {},
      weight: constraint.weight || 1,
      addedAt: new Date().toISOString(),
    };

    this.constraints.push(normalizedConstraint);

    // Register variables
    for (const varName of normalizedConstraint.variables) {
      if (!this.variables.has(varName)) {
        this.variables.set(varName, {
          name: varName,
          domain: null,
          value: null,
        });
      }
    }

    return normalizedConstraint;
  }

  /**
   * Remove a constraint by ID
   * @param {string} constraintId - Constraint ID to remove
   * @returns {boolean} True if removed
   */
  removeConstraint(constraintId) {
    const index = this.constraints.findIndex(c => c.id === constraintId);
    if (index >= 0) {
      this.constraints.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Set variable domain
   * @param {string} varName - Variable name
   * @param {Array} domain - Possible values
   */
  setVariableDomain(varName, domain) {
    if (!Array.isArray(domain)) {
      throw new Error('Domain must be an array');
    }

    const variable = this.variables.get(varName);
    if (variable) {
      variable.domain = domain;
    } else {
      this.variables.set(varName, {
        name: varName,
        domain,
        value: null,
      });
    }

    this.domains.set(varName, domain);
  }

  // ==========================================================================
  // SOLVING
  // ==========================================================================

  /**
   * Solve constraint satisfaction problem
   * @param {Object} problem - Problem definition
   * @param {Object} [problem.variables] - Variable definitions
   * @param {Array<Object>} [problem.constraints] - Additional constraints
   * @param {Object} [problem.objective] - Optimization objective
   * @returns {Promise<Object>} Solution
   */
  async solve(problem = {}) {
    const startTime = Date.now();
    let iterations = 0;

    // Apply problem-specific variables and constraints
    if (problem.variables) {
      for (const [name, domain] of Object.entries(problem.variables)) {
        this.setVariableDomain(name, domain);
      }
    }

    if (problem.constraints) {
      for (const constraint of problem.constraints) {
        this.addConstraint(constraint);
      }
    }

    // Initialize solution
    const assignment = new Map();
    const varNames = Array.from(this.variables.keys());

    // Use backtracking with constraint propagation
    const result = this.backtrack(assignment, varNames, 0, (iter) => {
      iterations = iter;
    });

    const solveTime = Date.now() - startTime;

    // Update stats
    this.stats.problemsSolved++;
    this.stats.totalIterations += iterations;
    this.stats.averageSolveTime =
      (this.stats.averageSolveTime * (this.stats.problemsSolved - 1) + solveTime) /
      this.stats.problemsSolved;

    if (result) {
      this.solution = {
        assignment: Object.fromEntries(result),
        status: this.evaluateSolutionQuality(result),
        iterations,
        solveTime,
        solvedAt: new Date().toISOString(),
      };

      return {
        solved: true,
        solution: this.solution.assignment,
        status: this.solution.status,
        score: this.calculateSolutionScore(result),
        iterations,
        solveTime,
        solvedAt: new Date().toISOString(),
      };
    }

    return {
      solved: false,
      solution: null,
      status: SOLUTION_STATUS.INFEASIBLE,
      score: 0,
      iterations,
      solveTime,
      solvedAt: new Date().toISOString(),
    };
  }

  /**
   * Backtracking algorithm with constraint propagation
   * @private
   * @param {Map} assignment - Current variable assignment
   * @param {Array<string>} varNames - Variable names to assign
   * @param {number} index - Current variable index
   * @param {Function} iterationCallback - Callback for iteration count
   * @param {number} [iterCount=0] - Current iteration count
   * @returns {Map|null} Solution assignment or null
   */
  backtrack(assignment, varNames, index, iterationCallback, iterCount = 0) {
    if (iterCount > this.maxIterations) {
      iterationCallback(iterCount);
      return null;
    }

    // All variables assigned
    if (index === varNames.length) {
      iterationCallback(iterCount);
      return assignment;
    }

    const varName = varNames[index];
    const domain = this.domains.get(varName) || [true, false, 0, 1];

    for (const value of domain) {
      iterCount++;

      // Try assignment
      assignment.set(varName, value);

      // Check constraints
      if (this.isConsistent(varName, assignment)) {
        // Forward checking - prune domains
        const prunedDomains = this.forwardCheck(varName, value, assignment);

        // Recurse
        const result = this.backtrack(assignment, varNames, index + 1, iterationCallback, iterCount);
        if (result) {
          return result;
        }

        // Restore pruned domains
        this.restoreDomains(prunedDomains);
      }

      // Undo assignment
      assignment.delete(varName);
    }

    iterationCallback(iterCount);
    return null;
  }

  /**
   * Check if assignment is consistent with constraints
   * @private
   * @param {string} varName - Variable being assigned
   * @param {Map} assignment - Current assignment
   * @returns {boolean} True if consistent
   */
  isConsistent(varName, assignment) {
    for (const constraint of this.constraints) {
      // Only check constraints involving this variable
      if (!constraint.variables.includes(varName)) {
        continue;
      }

      // Check if all variables in constraint are assigned
      const allAssigned = constraint.variables.every(v => assignment.has(v));
      if (!allAssigned) {
        continue;
      }

      // Evaluate constraint
      try {
        const values = constraint.variables.map(v => assignment.get(v));
        const satisfied = constraint.predicate(...values);

        if (!satisfied) {
          return false;
        }
      } catch (error) {
        // Constraint evaluation failed
        return false;
      }
    }

    return true;
  }

  /**
   * Forward checking - prune inconsistent domain values
   * @private
   * @param {string} varName - Assigned variable
   * @param {*} value - Assigned value
   * @param {Map} assignment - Current assignment
   * @returns {Map} Pruned values to restore later
   */
  forwardCheck(varName, value, assignment) {
    const pruned = new Map();

    for (const constraint of this.constraints) {
      if (!constraint.variables.includes(varName)) {
        continue;
      }

      for (const otherVar of constraint.variables) {
        if (otherVar === varName || assignment.has(otherVar)) {
          continue;
        }

        const domain = this.domains.get(otherVar);
        if (!domain) {
          continue;
        }

        const toRemove = [];

        for (const domainValue of domain) {
          // Check if this value is consistent
          const testAssignment = new Map(assignment);
          testAssignment.set(otherVar, domainValue);

          if (!this.isConsistent(otherVar, testAssignment)) {
            toRemove.push(domainValue);
          }
        }

        if (toRemove.length > 0) {
          pruned.set(otherVar, toRemove);
          this.domains.set(otherVar, domain.filter(v => !toRemove.includes(v)));
        }
      }
    }

    return pruned;
  }

  /**
   * Restore pruned domains
   * @private
   * @param {Map} pruned - Pruned values to restore
   */
  restoreDomains(pruned) {
    for (const [varName, values] of pruned) {
      const domain = this.domains.get(varName) || [];
      this.domains.set(varName, [...domain, ...values]);
    }
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Validate a solution against constraints
   * @param {Object} solution - Solution to validate
   * @param {Array<Object>} [constraints] - Constraints to check (uses solver's if not provided)
   * @returns {Promise<Object>} Validation result
   */
  async validate(solution, constraints = null) {
    const constraintsToCheck = constraints || this.constraints;
    const violations = [];
    let satisfiedCount = 0;

    for (const constraint of constraintsToCheck) {
      try {
        const values = constraint.variables.map(v => solution[v]);
        const satisfied = constraint.predicate(...values);

        if (satisfied) {
          satisfiedCount++;
        } else {
          violations.push({
            constraintId: constraint.id,
            constraintName: constraint.name,
            type: constraint.type,
            variables: constraint.variables,
            message: `Constraint '${constraint.name}' violated`,
          });
        }
      } catch (error) {
        violations.push({
          constraintId: constraint.id,
          constraintName: constraint.name,
          type: constraint.type,
          error: error.message,
          message: `Constraint '${constraint.name}' evaluation failed: ${error.message}`,
        });
      }
    }

    const totalConstraints = constraintsToCheck.length;
    const satisfactionRate = totalConstraints > 0 ? satisfiedCount / totalConstraints : 1;

    return {
      valid: violations.length === 0,
      satisfiedCount,
      totalConstraints,
      satisfactionRate,
      violations,
      validatedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Evaluate solution quality
   * @private
   * @param {Map} assignment - Variable assignment
   * @returns {string} Solution status
   */
  evaluateSolutionQuality(assignment) {
    // Check if all constraints are satisfied
    const violations = [];

    for (const constraint of this.constraints) {
      try {
        const values = constraint.variables.map(v => assignment.get(v));
        if (!constraint.predicate(...values)) {
          violations.push(constraint);
        }
      } catch (error) {
        violations.push(constraint);
      }
    }

    if (violations.length === 0) {
      return SOLUTION_STATUS.OPTIMAL;
    }
    if (violations.length < this.constraints.length / 2) {
      return SOLUTION_STATUS.FEASIBLE;
    }
    return SOLUTION_STATUS.INFEASIBLE;
  }

  /**
   * Calculate solution score (0-1)
   * @private
   * @param {Map} assignment - Variable assignment
   * @returns {number} Score between 0 and 1
   */
  calculateSolutionScore(assignment) {
    if (!assignment || assignment.size === 0) {
      return 0;
    }

    let totalWeight = 0;
    let satisfiedWeight = 0;

    for (const constraint of this.constraints) {
      totalWeight += constraint.weight;

      try {
        const values = constraint.variables.map(v => assignment.get(v));
        if (constraint.predicate(...values)) {
          satisfiedWeight += constraint.weight;
        }
      } catch (error) {
        // Constraint not satisfied
      }
    }

    return totalWeight > 0 ? satisfiedWeight / totalWeight : 1;
  }

  /**
   * Get solver statistics
   * @returns {Object} Solver statistics
   */
  getStats() {
    return {
      ...this.stats,
      constraintCount: this.constraints.length,
      variableCount: this.variables.size,
      hasSolution: this.solution !== null,
    };
  }

  /**
   * Get solver status
   * @returns {string} Status string
   */
  getStatus() {
    return this.initialized ? 'operational' : 'not_initialized';
  }

  /**
   * Clear all constraints and variables
   */
  clear() {
    this.constraints = [];
    this.variables.clear();
    this.domains.clear();
    this.solution = null;
  }

  /**
   * Shutdown the solver
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.clear();
    this.initialized = false;
    console.log('[ConstraintSolver] Shutdown complete');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ConstraintSolver,
  CONSTRAINT_TYPES,
  SOLUTION_STATUS,
};
