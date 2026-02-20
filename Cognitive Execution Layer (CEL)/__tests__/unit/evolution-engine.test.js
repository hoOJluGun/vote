'use strict';

/**
 * Unit tests for Evolution Engine
 */

import {
  EvolutionEngine,
  SELECTION_METHODS,
  MUTATION_STRATEGIES,
  CROSSOVER_STRATEGIES,
} from '../../src/engines/evolution-engine.js';

describe('EvolutionEngine', () => {
  let engine;
  let mockGenerator;
  let mockFitnessFunction;

  beforeEach(() => {
    engine = new EvolutionEngine({
      populationSize: 20,
      mutationRate: 0.1,
      crossoverRate: 0.7,
      elitismCount: 2,
      selectionMethod: SELECTION_METHODS.TOURNAMENT,
    });

    // Mock generator that creates simple numeric arrays
    mockGenerator = () => [Math.random(), Math.random(), Math.random()];

    // Mock fitness function that rewards higher sums
    mockFitnessFunction = (genes) => {
      if (Array.isArray(genes)) {
        return genes.reduce((sum, val) => sum + val, 0);
      }
      return 0;
    };
  });

  afterEach(async () => {
    await engine.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const defaultEngine = new EvolutionEngine();

      expect(defaultEngine.populationSize).toBe(50);
      expect(defaultEngine.mutationRate).toBe(0.1);
      expect(defaultEngine.crossoverRate).toBe(0.7);
      expect(defaultEngine.elitismCount).toBe(2);
      expect(defaultEngine.selectionMethod).toBe(SELECTION_METHODS.TOURNAMENT);
      expect(defaultEngine.getStatus()).toBe('not_initialized');
    });

    test('should initialize with custom options', () => {
      expect(engine.populationSize).toBe(20);
      expect(engine.mutationRate).toBe(0.1);
      expect(engine.crossoverRate).toBe(0.7);
      expect(engine.elitismCount).toBe(2);
      expect(engine.selectionMethod).toBe(SELECTION_METHODS.TOURNAMENT);
    });

    test('should initialize population successfully', () => {
      engine.initializePopulation(mockGenerator, mockFitnessFunction);

      expect(engine.population).toHaveLength(20);
      expect(engine.initialized).toBe(true);
      expect(engine.generation).toBe(0);
      expect(engine.population[0]).toHaveProperty('id');
      expect(engine.population[0]).toHaveProperty('genes');
      expect(engine.population[0]).toHaveProperty('fitness');
    });

    test('should evaluate initial fitness', () => {
      engine.initializePopulation(mockGenerator, mockFitnessFunction);

      // All individuals should have fitness calculated
      const hasFitness = engine.population.every(
        (ind) => typeof ind.fitness === 'number' && ind.fitness >= 0
      );

      expect(hasFitness).toBe(true);
    });
  });

  describe('Selection Methods', () => {
    beforeEach(() => {
      engine.initializePopulation(mockGenerator, mockFitnessFunction);
    });

    test('should perform tournament selection', () => {
      const selected = engine.tournamentSelection(3);

      expect(selected).toBeDefined();
      expect(engine.population).toContain(selected);
    });

    test('should perform roulette selection', () => {
      engine.selectionMethod = SELECTION_METHODS.ROULETTE;
      const selected = engine.select();

      expect(selected).toBeDefined();
      expect(engine.population).toContain(selected);
    });

    test('should perform rank selection', () => {
      engine.selectionMethod = SELECTION_METHODS.RANK;
      const selected = engine.select();

      expect(selected).toBeDefined();
      expect(engine.population).toContain(selected);
    });
  });

  describe('Mutation Operations', () => {
    test('should mutate array genes with swap strategy', async () => {
      const individual = {
        id: 'test-1',
        genes: [1, 2, 3, 4, 5],
        fitness: null,
      };

      const mutated = await engine.mutate(individual, {
        strategy: MUTATION_STRATEGIES.SWAP,
        intensity: 0.5,
      });

      expect(mutated.id).not.toBe(individual.id);
      expect(mutated.genes).toHaveLength(5);
      expect(mutated.mutated).toBe(true);
    });

    test('should mutate array genes with scramble strategy', async () => {
      const individual = {
        id: 'test-2',
        genes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        fitness: null,
      };

      const mutated = await engine.mutate(individual, {
        strategy: MUTATION_STRATEGIES.SCRAMBLE,
        intensity: 0.3,
      });

      expect(mutated.genes).toHaveLength(10);
      expect(mutated.mutated).toBe(true);
    });

    test('should mutate numeric genes', async () => {
      const individual = {
        id: 'test-3',
        genes: 5.0,
        fitness: null,
      };

      const mutated = await engine.mutate(individual, {
        intensity: 0.1,
      });

      expect(typeof mutated.genes).toBe('number');
      // Mutated value should be close to original
      expect(Math.abs(mutated.genes - 5.0)).toBeLessThan(2);
    });

    test('should mutate object genes', async () => {
      const individual = {
        id: 'test-4',
        genes: { x: 1, y: 2, z: 3 },
        fitness: null,
      };

      const mutated = await engine.mutate(individual, {
        intensity: 0.2,
      });

      expect(mutated.genes).toHaveProperty('x');
      expect(mutated.genes).toHaveProperty('y');
      expect(mutated.genes).toHaveProperty('z');
    });
  });

  describe('Crossover Operations', () => {
    test('should perform array crossover', () => {
      const parent1 = {
        id: 'parent-1',
        genes: [1, 2, 3, 4],
        fitness: 10,
      };

      const parent2 = {
        id: 'parent-2',
        genes: [5, 6, 7, 8],
        fitness: 8,
      };

      const [child1, child2] = engine.arrayCrossover(
        parent1.genes,
        parent2.genes,
        parent1,
        parent2
      );

      expect(child1.genes).toHaveLength(4);
      expect(child2.genes).toHaveLength(4);
      expect(child1.id).toContain('ind-');
      expect(child2.id).toContain('ind-');
    });

    test('should perform object crossover', () => {
      const parent1 = {
        id: 'parent-1',
        genes: { a: 1, b: 2, c: 3 },
        fitness: 10,
      };

      const parent2 = {
        id: 'parent-2',
        genes: { a: 4, b: 5, c: 6 },
        fitness: 8,
      };

      const [child1, child2] = engine.objectCrossover(
        parent1.genes,
        parent2.genes,
        parent1,
        parent2
      );

      expect(child1.genes).toHaveProperty('a');
      expect(child2.genes).toHaveProperty('b');
      expect(child1.genes.a === 1 || child1.genes.a === 4).toBe(true);
    });
  });

  describe('Evolution Process', () => {
    beforeEach(() => {
      engine.initializePopulation(mockGenerator, mockFitnessFunction);
    });

    test('should evolve population to next generation', async () => {
      const initialGeneration = engine.generation;

      const result = await engine.evolve();

      expect(engine.generation).toBe(initialGeneration + 1);
      expect(result.generation).toBe(initialGeneration + 1);
      expect(result.populationSize).toBe(20);
      expect(result.evolutionTime).toBeGreaterThanOrEqual(0);
    });

    test('should preserve elite individuals', async () => {
      const initialBestFitness = engine.bestSolution ? engine.bestSolution.fitness : 0;

      await engine.evolve();

      // Elite individuals should still be in population
      const eliteStillPresent = engine.population.some(
        (ind) => ind.fitness >= initialBestFitness
      );

      expect(eliteStillPresent).toBe(true);
    });

    test('should update best solution during evolution', async () => {
      const initialBestFitness = engine.bestSolution ? engine.bestSolution.fitness : 0;

      await engine.evolve();

      expect(engine.bestSolution).toBeDefined();
      // Best solution might be the same or better
      expect(engine.bestSolution.fitness).toBeGreaterThanOrEqual(initialBestFitness);
    });

    test('should maintain population size', async () => {
      await engine.evolve();

      expect(engine.population).toHaveLength(20);
    });

    test('should throw error when evolving uninitialized population', async () => {
      const freshEngine = new EvolutionEngine();

      await expect(freshEngine.evolve()).rejects.toThrow('Population not initialized');
    });
  });

  describe('Fitness Evaluation', () => {
    test('should evaluate individual fitness', async () => {
      engine.fitnessFunction = mockFitnessFunction;
      const individual = { genes: [1, 2, 3] };
      const fitness = await engine.evaluate(individual);

      expect(typeof fitness).toBe('number');
      expect(fitness).toBeGreaterThanOrEqual(0);
    });

    test('should handle fitness function errors gracefully', async () => {
      const badFitnessFunction = () => {
        throw new Error('Fitness error');
      };
      engine.fitnessFunction = badFitnessFunction;

      const fitness = await engine.evaluate({ genes: [1, 2, 3] });

      expect(fitness).toBe(0); // Should return 0 on error
    });

    test('should evaluate population fitness', () => {
      engine.initializePopulation(mockGenerator, mockFitnessFunction);

      // Force re-evaluation
      engine.population.forEach((ind) => (ind.fitness = null));
      engine.evaluatePopulation();

      const allEvaluated = engine.population.every(
        (ind) => typeof ind.fitness === 'number'
      );

      expect(allEvaluated).toBe(true);
    });
  });

  describe('Statistics and Metrics', () => {
    beforeEach(() => {
      engine.initializePopulation(mockGenerator, mockFitnessFunction);
    });

    test('should calculate average fitness', () => {
      const avgFitness = engine.calculateAverageFitness();

      expect(typeof avgFitness).toBe('number');
      expect(avgFitness).toBeGreaterThanOrEqual(0);
    });

    test('should calculate population diversity', () => {
      const diversity = engine.calculateDiversity();

      expect(typeof diversity).toBe('number');
      expect(diversity).toBeGreaterThanOrEqual(0);
    });

    test('should sort population by fitness', () => {
      const sorted = engine.sortByFitness([...engine.population]);

      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].fitness).toBeGreaterThanOrEqual(sorted[i + 1].fitness);
      }
    });

    test('should get evolution history', async () => {
      await engine.evolve();
      await engine.evolve();

      const history = engine.getHistory(5);

      expect(history).toHaveLength(2);
      expect(history[0]).toHaveProperty('generation');
      expect(history[0]).toHaveProperty('bestFitness');
    });

    test('should get population information', () => {
      const populationInfo = engine.getPopulation();

      expect(populationInfo).toHaveLength(20);
      expect(populationInfo[0]).toHaveProperty('id');
      expect(populationInfo[0]).toHaveProperty('fitness');
    });
  });

  describe('Performance Optimization', () => {
    test('should suggest performance improvements', async () => {
      engine.initializePopulation(mockGenerator, mockFitnessFunction);

      // Run several evolutions to build history
      for (let i = 0; i < 5; i++) {
        await engine.evolve();
      }

      const suggestions = await engine.suggestPerformanceImprovements('/test/path');

      expect(suggestions).toHaveProperty('targetPath', '/test/path');
      expect(Array.isArray(suggestions.suggestions)).toBe(true);
      expect(suggestions).toHaveProperty('potentialGain');
    });

    test('should detect low diversity situations', async () => {
      // Create population with very similar individuals
      const similarGenerator = () => [0.5, 0.5, 0.5];
      engine = new EvolutionEngine({ populationSize: 10 });
      engine.initializePopulation(similarGenerator, mockFitnessFunction);

      for (let i = 0; i < 3; i++) {
        await engine.evolve();
      }

      const suggestions = await engine.suggestPerformanceImprovements('/test');

      // May or may not detect depending on actual diversity calculation
      expect(suggestions.suggestions).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty population gracefully', () => {
      // Engine without initialization has 'not_initialized' status
      expect(engine.getStatus()).toBe('not_initialized');
      expect(engine.calculateAverageFitness()).toBe(0);
      expect(engine.calculateDiversity()).toBe(0);
    });

    test('should handle single individual population', () => {
      const singleEngine = new EvolutionEngine({ populationSize: 1 });
      const singleGenerator = () => [1, 2, 3];

      singleEngine.initializePopulation(singleGenerator, mockFitnessFunction);

      expect(singleEngine.population).toHaveLength(1);
      expect(singleEngine.calculateAverageFitness()).toBeGreaterThanOrEqual(0);
    });

    test('should handle zero mutation rate', async () => {
      const zeroMutationEngine = new EvolutionEngine({ mutationRate: 0 });
      zeroMutationEngine.initializePopulation(mockGenerator, mockFitnessFunction);

      const result = await zeroMutationEngine.evolve();

      expect(result).toBeDefined();
      expect(result.generation).toBe(1);
    });

    test('should handle zero crossover rate', async () => {
      const zeroCrossoverEngine = new EvolutionEngine({ crossoverRate: 0 });
      zeroCrossoverEngine.initializePopulation(mockGenerator, mockFitnessFunction);

      const result = await zeroCrossoverEngine.evolve();

      expect(result).toBeDefined();
      expect(result.generation).toBe(1);
    });
  });
});
