'use strict';

/**
 * Evolution Engine
 * Manages system evolution through genetic algorithms and performance optimization
 *
 * @module src/engines/evolution-engine
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Selection methods for evolution
 * @enum {string}
 */
const SELECTION_METHODS = {
  TOURNAMENT: 'tournament',
  ROULETTE: 'roulette',
  RANK: 'rank',
  ELITISM: 'elitism',
};

/**
 * Mutation strategies
 * @enum {string}
 */
const MUTATION_STRATEGIES = {
  RANDOM: 'random',
  GAUSSIAN: 'gaussian',
  SWAP: 'swap',
  SCRAMBLE: 'scramble',
  INVERSION: 'inversion',
};

/**
 * Crossover strategies
 * @enum {string}
 */
const CROSSOVER_STRATEGIES = {
  SINGLE_POINT: 'single_point',
  TWO_POINT: 'two_point',
  UNIFORM: 'uniform',
  ARITHMETIC: 'arithmetic',
};

// ============================================================================
// EVOLUTION ENGINE CLASS
// ============================================================================

/**
 * Evolution Engine
 * Handles system evolution, mutation, and fitness evaluation using genetic algorithms
 * @class
 */
class EvolutionEngine {
  /**
   * Create an EvolutionEngine instance
   * @param {Object} options - Configuration options
   * @param {number} [options.populationSize=50] - Population size
   * @param {number} [options.mutationRate=0.1] - Mutation rate (0-1)
   * @param {number} [options.crossoverRate=0.7] - Crossover rate (0-1)
   * @param {number} [options.elitismCount=2] - Number of elite individuals to preserve
   * @param {string} [options.selectionMethod='tournament'] - Selection method
   */
  constructor(options = {}) {
    /** @type {number} */
    this.populationSize = options.populationSize || 50;

    /** @type {number} */
    this.mutationRate = options.mutationRate || 0.1;

    /** @type {number} */
    this.crossoverRate = options.crossoverRate || 0.7;

    /** @type {number} */
    this.elitismCount = options.elitismCount || 2;

    /** @type {string} */
    this.selectionMethod = options.selectionMethod || SELECTION_METHODS.TOURNAMENT;

    /** @type {Array<Object>} */
    this.population = [];

    /** @type {number} */
    this.generation = 0;

    /** @type {Object|null} */
    this.bestSolution = null;

    /** @type {Array<Object>} */
    this.evolutionHistory = [];

    /** @type {Function|null} */
    this.fitnessFunction = null;

    /** @type {boolean} */
    this.initialized = false;

    /** @type {Object} */
    this.stats = {
      totalEvolutions: 0,
      averageFitness: 0,
      bestFitnessEver: 0,
      stagnationCount: 0,
    };
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize population with random individuals
   * @param {Function} generator - Function to generate random individual
   * @param {Function} fitnessFn - Fitness evaluation function
   */
  initializePopulation(generator, fitnessFn) {
    this.fitnessFunction = fitnessFn;
    this.population = [];

    for (let i = 0; i < this.populationSize; i++) {
      const individual = generator();
      this.population.push({
        id: `ind-${i}`,
        genes: individual,
        fitness: null,
        generation: 0,
      });
    }

    // Evaluate initial fitness
    this.evaluatePopulation();
    this.initialized = true;
    this.generation = 0;

    console.log('[EvolutionEngine] Population initialized with', this.populationSize, 'individuals');
  }

  // ==========================================================================
  // EVOLUTION OPERATIONS
  // ==========================================================================

  /**
   * Evolve the population to next generation
   * @param {Function} fitnessFunction - Fitness evaluation function (optional if already set)
   * @returns {Promise<Object>} Evolution result
   */
  async evolve(fitnessFunction) {
    if (fitnessFunction) {
      this.fitnessFunction = fitnessFunction;
    }

    if (!this.fitnessFunction || this.population.length === 0) {
      throw new Error('Population not initialized. Call initializePopulation first.');
    }

    const startTime = Date.now();
    this.generation++;

    // Store previous best for stagnation detection
    const previousBestFitness = this.bestSolution?.fitness || 0;

    // Create new generation
    const newPopulation = [];

    // Elitism: preserve best individuals
    const sortedPopulation = this.sortByFitness(this.population);
    for (let i = 0; i < this.elitismCount && i < sortedPopulation.length; i++) {
      newPopulation.push({
        ...sortedPopulation[i],
        generation: this.generation,
      });
    }

    // Generate rest of population through selection and crossover
    while (newPopulation.length < this.populationSize) {
      // Selection
      const parent1 = this.select();
      const parent2 = this.select();

      // Crossover
      if (Math.random() < this.crossoverRate) {
        const [child1, child2] = this.crossover(parent1, parent2);
        newPopulation.push(child1);
        if (newPopulation.length < this.populationSize) {
          newPopulation.push(child2);
        }
      } else {
        newPopulation.push({ ...parent1, id: `ind-${Date.now()}-${Math.random()}` });
        if (newPopulation.length < this.populationSize) {
          newPopulation.push({ ...parent2, id: `ind-${Date.now()}-${Math.random()}` });
        }
      }
    }

    // Mutation
    for (let i = this.elitismCount; i < newPopulation.length; i++) {
      if (Math.random() < this.mutationRate) {
        newPopulation[i] = await this.mutate(newPopulation[i]);
      }
    }

    // Replace population
    this.population = newPopulation;

    // Evaluate new population
    this.evaluatePopulation();

    // Update best solution
    this.updateBestSolution();

    // Update statistics
    const evolutionTime = Date.now() - startTime;
    this.updateStats(previousBestFitness);

    // Record in history
    const evolutionResult = {
      generation: this.generation,
      populationSize: this.population.length,
      bestFitness: this.bestSolution?.fitness || 0,
      averageFitness: this.calculateAverageFitness(),
      worstFitness: this.getWorstFitness(),
      diversity: this.calculateDiversity(),
      evolutionTime,
      evolvedAt: new Date().toISOString(),
    };

    this.evolutionHistory.push(evolutionResult);
    if (this.evolutionHistory.length > 100) {
      this.evolutionHistory.shift();
    }

    return evolutionResult;
  }

  /**
   * Mutate a solution
   * @param {Object} solution - Solution to mutate
   * @param {Object} options - Mutation options
   * @param {string} [options.strategy='random'] - Mutation strategy
   * @param {number} [options.intensity=0.1] - Mutation intensity
   * @returns {Promise<Object>} Mutated solution
   */
  async mutate(solution, options = {}) {
    const strategy = options.strategy || MUTATION_STRATEGIES.RANDOM;
    const intensity = options.intensity || 0.1;

    const mutatedGenes = this.applyMutation(solution.genes, strategy, intensity);

    return {
      ...solution,
      id: `ind-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      genes: mutatedGenes,
      fitness: null,
      mutated: true,
      mutatedAt: new Date().toISOString(),
    };
  }

  /**
   * Apply mutation based on strategy
   * @private
   * @param {*} genes - Genes to mutate
   * @param {string} strategy - Mutation strategy
   * @param {number} intensity - Mutation intensity
   * @returns {*} Mutated genes
   */
  applyMutation(genes, strategy, intensity) {
    // Handle array genes
    if (Array.isArray(genes)) {
      return this.mutateArray(genes, strategy, intensity);
    }

    // Handle object genes
    if (typeof genes === 'object' && genes !== null) {
      return this.mutateObject(genes, strategy, intensity);
    }

    // Handle numeric genes
    if (typeof genes === 'number') {
      return this.mutateNumber(genes, intensity);
    }

    // Default: return as is
    return genes;
  }

  /**
   * Mutate array genes
   * @private
   */
  mutateArray(genes, strategy, intensity) {
    const result = [...genes];

    switch (strategy) {
      case MUTATION_STRATEGIES.SWAP:
        // Swap two random elements
        if (result.length >= 2) {
          const i = Math.floor(Math.random() * result.length);
          const j = Math.floor(Math.random() * result.length);
          [result[i], result[j]] = [result[j], result[i]];
        }
        break;

      case MUTATION_STRATEGIES.SCRAMBLE:
        // Scramble a subset of elements
        if (result.length >= 2) {
          const start = Math.floor(Math.random() * result.length);
          const end = Math.min(start + Math.ceil(result.length * intensity), result.length);
          const subset = result.slice(start, end);
          for (let i = subset.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [subset[i], subset[j]] = [subset[j], subset[i]];
          }
          result.splice(start, end - start, ...subset);
        }
        break;

      case MUTATION_STRATEGIES.INVERSION:
        // Invert a subset of elements
        if (result.length >= 2) {
          const start = Math.floor(Math.random() * result.length);
          const end = Math.min(start + Math.ceil(result.length * intensity), result.length);
          const subset = result.slice(start, end).reverse();
          result.splice(start, end - start, ...subset);
        }
        break;

      default:
        // Random mutation
        for (let i = 0; i < result.length; i++) {
          if (Math.random() < intensity) {
            if (typeof result[i] === 'number') {
              result[i] = this.mutateNumber(result[i], intensity);
            }
          }
        }
    }

    return result;
  }

  /**
   * Mutate object genes
   * @private
   */
  mutateObject(genes, strategy, intensity) {
    const result = { ...genes };

    for (const key of Object.keys(result)) {
      if (Math.random() < intensity) {
        if (typeof result[key] === 'number') {
          result[key] = this.mutateNumber(result[key], intensity);
        } else if (Array.isArray(result[key])) {
          result[key] = this.mutateArray(result[key], strategy, intensity);
        }
      }
    }

    return result;
  }

  /**
   * Mutate a number
   * @private
   */
  mutateNumber(value, intensity) {
    // Gaussian mutation
    const mutation = (Math.random() - 0.5) * 2 * intensity * Math.abs(value || 1);
    return value + mutation;
  }

  /**
   * Evaluate fitness of a solution
   * @param {Object} solution - Solution to evaluate
   * @returns {Promise<number>} Fitness score
   */
  async evaluate(solution) {
    if (!this.fitnessFunction) {
      throw new Error('Fitness function not set');
    }

    try {
      const fitness = await Promise.resolve(this.fitnessFunction(solution.genes || solution));
      return typeof fitness === 'number' ? fitness : 0;
    } catch (error) {
      console.error('[EvolutionEngine] Fitness evaluation error:', error.message);
      return 0;
    }
  }

  // ==========================================================================
  // SELECTION
  // ==========================================================================

  /**
   * Select an individual for reproduction
   * @returns {Object} Selected individual
   */
  select() {
    switch (this.selectionMethod) {
      case SELECTION_METHODS.TOURNAMENT:
        return this.tournamentSelection();

      case SELECTION_METHODS.ROULETTE:
        return this.rouletteSelection();

      case SELECTION_METHODS.RANK:
        return this.rankSelection();

      default:
        return this.tournamentSelection();
    }
  }

  /**
   * Tournament selection
   * @private
   * @param {number} [tournamentSize=3] - Tournament size
   * @returns {Object} Selected individual
   */
  tournamentSelection(tournamentSize = 3) {
    let best = null;

    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * this.population.length);
      const individual = this.population[idx];

      if (!best || individual.fitness > best.fitness) {
        best = individual;
      }
    }

    return best;
  }

  /**
   * Roulette wheel selection
   * @private
   * @returns {Object} Selected individual
   */
  rouletteSelection() {
    const totalFitness = this.population.reduce((sum, ind) => sum + (ind.fitness || 0), 0);

    if (totalFitness <= 0) {
      return this.population[Math.floor(Math.random() * this.population.length)];
    }

    let random = Math.random() * totalFitness;

    for (const individual of this.population) {
      random -= individual.fitness || 0;
      if (random <= 0) {
        return individual;
      }
    }

    return this.population[this.population.length - 1];
  }

  /**
   * Rank selection
   * @private
   * @returns {Object} Selected individual
   */
  rankSelection() {
    const sorted = this.sortByFitness([...this.population]);
    const totalRank = (sorted.length * (sorted.length + 1)) / 2;
    let random = Math.random() * totalRank;

    for (let i = 0; i < sorted.length; i++) {
      random -= (i + 1);
      if (random <= 0) {
        return sorted[i];
      }
    }

    return sorted[sorted.length - 1];
  }

  // ==========================================================================
  // CROSSOVER
  // ==========================================================================

  /**
   * Perform crossover between two parents
   * @private
   * @param {Object} parent1 - First parent
   * @param {Object} parent2 - Second parent
   * @returns {Array<Object>} Two children
   */
  crossover(parent1, parent2) {
    const genes1 = parent1.genes;
    const genes2 = parent2.genes;

    if (Array.isArray(genes1) && Array.isArray(genes2)) {
      return this.arrayCrossover(genes1, genes2, parent1, parent2);
    }

    if (typeof genes1 === 'object' && typeof genes2 === 'object') {
      return this.objectCrossover(genes1, genes2, parent1, parent2);
    }

    // Default: return copies of parents
    return [
      { ...parent1, id: `ind-${Date.now()}-1`, fitness: null },
      { ...parent2, id: `ind-${Date.now()}-2`, fitness: null },
    ];
  }

  /**
   * Array crossover
   * @private
   */
  arrayCrossover(genes1, genes2, parent1, parent2) {
    const minLen = Math.min(genes1.length, genes2.length);
    const crossPoint = Math.floor(Math.random() * minLen);

    const child1Genes = [...genes1.slice(0, crossPoint), ...genes2.slice(crossPoint)];
    const child2Genes = [...genes2.slice(0, crossPoint), ...genes1.slice(crossPoint)];

    return [
      { id: `ind-${Date.now()}-1`, genes: child1Genes, fitness: null, generation: this.generation },
      { id: `ind-${Date.now()}-2`, genes: child2Genes, fitness: null, generation: this.generation },
    ];
  }

  /**
   * Object crossover (uniform)
   * @private
   */
  objectCrossover(genes1, genes2, parent1, parent2) {
    const child1Genes = {};
    const child2Genes = {};

    const allKeys = new Set([...Object.keys(genes1), ...Object.keys(genes2)]);

    for (const key of allKeys) {
      if (Math.random() < 0.5) {
        child1Genes[key] = genes1[key];
        child2Genes[key] = genes2[key];
      } else {
        child1Genes[key] = genes2[key];
        child2Genes[key] = genes1[key];
      }
    }

    return [
      { id: `ind-${Date.now()}-1`, genes: child1Genes, fitness: null, generation: this.generation },
      { id: `ind-${Date.now()}-2`, genes: child2Genes, fitness: null, generation: this.generation },
    ];
  }

  // ==========================================================================
  // EVALUATION
  // ==========================================================================

  /**
   * Evaluate fitness for entire population
   * @private
   */
  evaluatePopulation() {
    for (const individual of this.population) {
      if (individual.fitness === null) {
        const fitness = this.fitnessFunction(individual.genes);
        individual.fitness = typeof fitness === 'number' ? fitness : 0;
      }
    }
  }

  /**
   * Update best solution
   * @private
   */
  updateBestSolution() {
    for (const individual of this.population) {
      if (!this.bestSolution || individual.fitness > this.bestSolution.fitness) {
        this.bestSolution = {
          ...individual,
          foundAt: new Date().toISOString(),
          foundInGeneration: this.generation,
        };
      }
    }
  }

  /**
   * Update statistics
   * @private
   */
  updateStats(previousBestFitness) {
    this.stats.totalEvolutions++;
    this.stats.averageFitness = this.calculateAverageFitness();

    if (this.bestSolution && this.bestSolution.fitness > this.stats.bestFitnessEver) {
      this.stats.bestFitnessEver = this.bestSolution.fitness;
      this.stats.stagnationCount = 0;
    } else {
      this.stats.stagnationCount++;
    }
  }

  /**
   * Sort population by fitness (descending)
   * @private
   */
  sortByFitness(population) {
    return population.sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
  }

  /**
   * Calculate average fitness
   * @private
   */
  calculateAverageFitness() {
    if (this.population.length === 0) {
      return 0;
    }
    const sum = this.population.reduce((acc, ind) => acc + (ind.fitness || 0), 0);
    return sum / this.population.length;
  }

  /**
   * Get worst fitness in population
   * @private
   */
  getWorstFitness() {
    if (this.population.length === 0) {
      return 0;
    }
    return Math.min(...this.population.map(ind => ind.fitness || 0));
  }

  /**
   * Calculate population diversity
   * @private
   */
  calculateDiversity() {
    if (this.population.length < 2) {
      return 0;
    }

    // Simple diversity measure based on fitness variance
    const avgFitness = this.calculateAverageFitness();
    const variance = this.population.reduce((sum, ind) => {
      return sum + Math.pow((ind.fitness || 0) - avgFitness, 2);
    }, 0) / this.population.length;

    return Math.sqrt(variance);
  }

  // ==========================================================================
  // PERFORMANCE OPTIMIZATION
  // ==========================================================================

  /**
   * Suggest performance improvements
   * @param {string} targetPath - Path to analyze
   * @returns {Promise<Object>} Improvement suggestions
   */
  async suggestPerformanceImprovements(targetPath) {
    const suggestions = [];

    // Analyze evolution history for patterns
    if (this.evolutionHistory.length >= 10) {
      const recentHistory = this.evolutionHistory.slice(-10);
      const avgDiversity = recentHistory.reduce((sum, h) => sum + h.diversity, 0) / recentHistory.length;

      if (avgDiversity < 0.1) {
        suggestions.push({
          type: 'diversity',
          priority: 'high',
          message: 'Low population diversity detected. Consider increasing mutation rate.',
          currentValue: this.mutationRate,
          suggestedValue: Math.min(this.mutationRate * 1.5, 0.5),
        });
      }

      const stagnationTrend = recentHistory.filter(h => h.bestFitness === recentHistory[0].bestFitness).length;
      if (stagnationTrend > 5) {
        suggestions.push({
          type: 'stagnation',
          priority: 'medium',
          message: 'Evolution stagnating. Consider increasing population size or crossover rate.',
          currentGeneration: this.generation,
        });
      }
    }

    // Analyze current parameters
    if (this.populationSize < 30) {
      suggestions.push({
        type: 'population',
        priority: 'low',
        message: 'Small population size may limit exploration.',
        currentValue: this.populationSize,
        suggestedValue: 50,
      });
    }

    return {
      targetPath,
      suggestions,
      potentialGain: suggestions.length * 0.1,
      currentStats: this.stats,
      analyzedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get engine status
   * @returns {string} Status string
   */
  getStatus() {
    if (!this.initialized) {
      return 'not_initialized';
    }
    if (this.population.length === 0) {
      return 'empty';
    }
    return 'operational';
  }

  /**
   * Get evolution history
   * @param {number} [limit=10] - Max entries to return
   * @returns {Array<Object>} Evolution history
   */
  getHistory(limit = 10) {
    return this.evolutionHistory.slice(-limit);
  }

  /**
   * Get current population
   * @returns {Array<Object>} Population
   */
  getPopulation() {
    return this.population.map(ind => ({
      id: ind.id,
      fitness: ind.fitness,
      generation: ind.generation,
    }));
  }

  /**
   * Get best solution
   * @returns {Object|null} Best solution
   */
  getBestSolution() {
    return this.bestSolution;
  }

  /**
   * Shutdown the engine
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.population = [];
    this.evolutionHistory = [];
    this.bestSolution = null;
    this.fitnessFunction = null;
    this.initialized = false;
    console.log('[EvolutionEngine] Shutdown complete');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  EvolutionEngine,
  SELECTION_METHODS,
  MUTATION_STRATEGIES,
  CROSSOVER_STRATEGIES,
};
