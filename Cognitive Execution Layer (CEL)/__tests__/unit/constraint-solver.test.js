'use strict';

/**
 * Unit tests for Constraint Solver
 */

import {
  ConstraintSolver,
  CONSTRAINT_TYPES,
  SOLUTION_STATUS,
} from '../../src/engines/constraint-solver.js';

describe('ConstraintSolver', () => {
  let solver;

  beforeEach(() => {
    solver = new ConstraintSolver({
      maxIterations: 1000,
      tolerance: 0.001,
      optimizeForSpeed: true,
    });
  });

  afterEach(async () => {
    if (solver && solver.shutdown) {
      await solver.shutdown();
    }
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const defaultSolver = new ConstraintSolver();
      expect(defaultSolver.maxIterations).toBe(10000);
      expect(defaultSolver.tolerance).toBe(0.001);
      expect(defaultSolver.optimizeForSpeed).toBe(true);
    });

    test('should initialize with custom options', () => {
      const customSolver = new ConstraintSolver({
        maxIterations: 5000,
        tolerance: 0.01,
        optimizeForSpeed: false,
      });

      expect(customSolver.maxIterations).toBe(5000);
      expect(customSolver.tolerance).toBe(0.01);
      expect(customSolver.optimizeForSpeed).toBe(false);
    });
  });

  describe('Constraint Management', () => {
    test('should add constraint successfully', () => {
      const constraint = {
        type: CONSTRAINT_TYPES.EQUALITY,
        name: 'test_constraint',
        variables: ['x', 'y'],
        predicate: (x, y) => x === y,
      };

      const result = solver.addConstraint(constraint);

      expect(result).toHaveProperty('id');
      expect(result.type).toBe(CONSTRAINT_TYPES.EQUALITY);
      expect(result.name).toBe('test_constraint');
      expect(result.variables).toEqual(['x', 'y']);
      expect(typeof result.predicate).toBe('function');
    });

    test('should register variables when adding constraints', () => {
      const constraint = {
        variables: ['a', 'b', 'c'],
        predicate: () => true,
      };

      solver.addConstraint(constraint);

      expect(solver.variables.has('a')).toBe(true);
      expect(solver.variables.has('b')).toBe(true);
      expect(solver.variables.has('c')).toBe(true);
    });

    test('should remove constraint by ID', () => {
      const constraint = solver.addConstraint({
        name: 'removable_constraint',
        predicate: () => true,
      });

      const removed = solver.removeConstraint(constraint.id);

      expect(removed).toBe(true);
      expect(solver.constraints.length).toBe(0);
    });

    test('should return false when removing non-existent constraint', () => {
      const removed = solver.removeConstraint('non-existent-id');
      expect(removed).toBe(false);
    });

    test('should set variable domain', () => {
      const domain = [1, 2, 3, 4, 5];
      solver.setVariableDomain('test_var', domain);

      expect(solver.domains.get('test_var')).toEqual(domain);
      expect(solver.variables.get('test_var')).toBeDefined();
      expect(solver.variables.get('test_var').domain).toEqual(domain);
    });

    test('should throw error for invalid domain', () => {
      expect(() => {
        solver.setVariableDomain('invalid_var', 'not-an-array');
      }).toThrow('Domain must be an array');
    });
  });

  describe('Solving', () => {
    test('should solve simple equality constraint', async () => {
      // Add constraint: x = 5
      solver.addConstraint({
        type: CONSTRAINT_TYPES.EQUALITY,
        variables: ['x'],
        predicate: (x) => x === 5,
      });

      solver.setVariableDomain('x', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const result = await solver.solve();

      expect(result.solved).toBe(true);
      expect(result.solution).toBeDefined();
      expect(result.solution.x).toBe(5);
      expect(result.status).toBe(SOLUTION_STATUS.OPTIMAL);
    });

    test('should solve inequality constraint', async () => {
      // Add constraint: x > 3
      solver.addConstraint({
        type: CONSTRAINT_TYPES.INEQUALITY,
        variables: ['x'],
        predicate: (x) => x > 3,
      });

      solver.setVariableDomain('x', [1, 2, 3, 4, 5]);

      const result = await solver.solve();

      expect(result.solved).toBe(true);
      expect(result.solution.x).toBeGreaterThan(3);
    });

    test('should handle multiple constraints', async () => {
      // Add constraints: x + y = 10 AND x > y
      solver.addConstraint({
        variables: ['x', 'y'],
        predicate: (x, y) => x + y === 10,
      });

      solver.addConstraint({
        variables: ['x', 'y'],
        predicate: (x, y) => x > y,
      });

      solver.setVariableDomain('x', [1, 2, 3, 4, 5, 6, 7, 8, 9]);
      solver.setVariableDomain('y', [1, 2, 3, 4, 5, 6, 7, 8, 9]);

      const result = await solver.solve();

      expect(result.solved).toBe(true);
      expect(result.solution.x + result.solution.y).toBe(10);
      expect(result.solution.x).toBeGreaterThan(result.solution.y);
    });

    test('should return unsolvable for impossible constraints', async () => {
      // Add contradictory constraints: x = 5 AND x = 3
      solver.addConstraint({
        variables: ['x'],
        predicate: (x) => x === 5,
      });

      solver.addConstraint({
        variables: ['x'],
        predicate: (x) => x === 3,
      });

      solver.setVariableDomain('x', [1, 2, 3, 4, 5]);

      const result = await solver.solve();

      expect(result.solved).toBe(false);
      expect(result.status).toBe(SOLUTION_STATUS.INFEASIBLE);
    });

    test('should respect iteration limits', async () => {
      const limitedSolver = new ConstraintSolver({ maxIterations: 10 });

      // Add complex constraint that requires many iterations
      limitedSolver.addConstraint({
        variables: ['x'],
        predicate: (x) => {
          // Complex predicate that forces many iterations
          for (let i = 0; i < 100; i++) {
            Math.sin(i * x);
          }
          return x === 7;
        },
      });

      limitedSolver.setVariableDomain('x', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const result = await limitedSolver.solve();

      expect(result.iterations).toBeLessThanOrEqual(10);
      await limitedSolver.shutdown();
    });
  });

  describe('Validation', () => {
    test('should validate solution against constraints', async () => {
      solver.addConstraint({
        variables: ['x'],
        predicate: (x) => x % 2 === 0, // x must be even
      });

      solver.setVariableDomain('x', [1, 2, 3, 4, 5, 6]);

      const result = await solver.solve();
      const validation = await solver.validate(result.solution);

      expect(validation.valid).toBe(true);
      expect(validation.satisfiedCount).toBe(1);
      expect(validation.totalConstraints).toBe(1);
      expect(validation.satisfactionRate).toBe(1);
    });

    test('should detect constraint violations', async () => {
      solver.addConstraint({
        name: 'even_constraint',
        variables: ['x'],
        predicate: (x) => x % 2 === 0,
      });

      const invalidSolution = { x: 3 }; // 3 is odd, violates constraint
      const validation = await solver.validate(invalidSolution);

      expect(validation.valid).toBe(false);
      expect(validation.violations).toHaveLength(1);
      expect(validation.violations[0].constraintName).toBe('even_constraint');
    });
  });

  describe('Utility Methods', () => {
    test('should provide solver statistics', async () => {
      // Add some constraints and solve
      solver.addConstraint({ variables: ['x'], predicate: (x) => x === 5 });
      solver.setVariableDomain('x', [1, 2, 3, 4, 5]);
      await solver.solve();

      const stats = solver.getStats();

      expect(stats.constraintCount).toBe(1);
      expect(stats.variableCount).toBe(1);
      expect(stats.problemsSolved).toBe(1);
      expect(stats.hasSolution).toBe(true);
    });

    test('should provide solver status', () => {
      expect(solver.getStatus()).toBe('not_initialized');
    });

    test('should clear all constraints and variables', () => {
      solver.addConstraint({ variables: ['test'], predicate: () => true });
      solver.setVariableDomain('test', [1, 2, 3]);

      expect(solver.constraints.length).toBe(1);
      expect(solver.variables.size).toBe(1);

      solver.clear();

      expect(solver.constraints.length).toBe(0);
      expect(solver.variables.size).toBe(0);
      expect(solver.domains.size).toBe(0);
    });
  });
});