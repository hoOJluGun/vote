'use strict';

/**
 * Unit tests for Orchestration Engine
 */

import {
  OrchestrationEngine,
  GOAL_TYPES,
  EXECUTION_RESULTS,
  TASK_PRIORITIES,
  TASK_STATES,
  TASK_TYPES,
} from '../../src/engines/orchestration-engine.js';

describe('OrchestrationEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new OrchestrationEngine({
      maxConcurrentTasks: 5,
      taskTimeout: 1000,
      maxRetries: 2,
    });
  });

  afterEach(async () => {
    if (engine) {
      await engine.shutdown();
    }
  });

  describe('constructor', () => {
    test('should create engine with default options', () => {
      const defaultEngine = new OrchestrationEngine();
      expect(defaultEngine.maxConcurrentTasks).toBe(10);
      expect(defaultEngine.taskTimeout).toBe(60000);
    });

    test('should accept custom options', () => {
      expect(engine.maxConcurrentTasks).toBe(5);
      expect(engine.taskTimeout).toBe(1000);
      expect(engine.maxRetries).toBe(2);
    });

    test('should initialize collections', () => {
      expect(engine.tasks).toBeInstanceOf(Map);
      expect(engine.goals).toBeInstanceOf(Map);
      expect(engine.taskQueue).toBeInstanceOf(Array);
      expect(engine.taskHandlers).toBeInstanceOf(Map);
    });
  });

  describe('goal management', () => {
    test('should create a new goal', async () => {
      const goalData = {
        type: GOAL_TYPES.OPTIMIZATION,
        description: 'Optimize performance',
      };

      const goal = await engine.createGoal(goalData);

      expect(goal).toBeDefined();
      expect(goal.id).toMatch(/^goal-\d+-[a-z0-9]+$/);
      expect(goal.type).toBe(GOAL_TYPES.OPTIMIZATION);
      expect(goal.description).toBe('Optimize performance');
      expect(goal.status).toBe(EXECUTION_RESULTS.PENDING);
      expect(engine.goals.has(goal.id)).toBe(true);
    });

    test('should get goal by ID', () => {
      const goal = engine.getGoal('non-existent');
      expect(goal).toBeNull();
    });

    test('should update goal progress', async () => {
      // First create a goal
      const goalData = { type: GOAL_TYPES.FEATURE, description: 'Test goal' };
      const goal = await engine.createGoal(goalData);

      const updatedGoal = engine.updateGoalProgress(goal.id, 50, EXECUTION_RESULTS.PENDING);

      expect(updatedGoal).not.toBeNull();
      expect(updatedGoal.progress).toBe(50);
      // Status should remain PENDING since we passed PENDING
    });

    test('should cancel a goal', async () => {
      const goalData = { type: GOAL_TYPES.BUGFIX, description: 'Fix bug' };
      const goal = await engine.createGoal(goalData);

      const cancelledGoal = engine.cancelGoal(goal.id);

      expect(cancelledGoal).not.toBeNull();
      expect(cancelledGoal.status).toBe(EXECUTION_RESULTS.CANCELLED);
      expect(engine.taskQueue).toHaveLength(0);
    });
  });

  describe('task management', () => {
    test('should create a new task', async () => {
      const taskData = {
        type: TASK_TYPES.CODE_GENERATION,
        payload: { files: ['test.js'] },
      };

      const task = await engine.createTask(taskData);

      expect(task).toBeDefined();
      expect(task.id).toMatch(/^task-\d+-[a-z0-9]+$/);
      expect(task.type).toBe(TASK_TYPES.CODE_GENERATION);
      expect(task.payload.files).toEqual(['test.js']);
      expect(task.status).toBe(TASK_STATES.CREATED);
      expect(engine.tasks.has(task.id)).toBe(true);
      expect(engine.taskQueue).toContainEqual(expect.objectContaining({ id: task.id }));
    });

    test('should get task by ID', () => {
      const task = engine.getTask('non-existent');
      expect(task).toBeNull();
    });

    test('should associate task with goal', async () => {
      const goal = await engine.createGoal({
        type: GOAL_TYPES.FEATURE,
        description: 'Test feature',
      });

      const task = await engine.createTask({
        type: TASK_TYPES.CODE_GENERATION,
        goalId: goal.id,
      });

      const updatedGoal = engine.goals.get(goal.id);
      expect(updatedGoal.tasks).toContain(task.id);
    });

    test('should sort queue by priority', async () => {
      // Create tasks with different priorities
      await engine.createTask({ type: TASK_TYPES.CODE_GENERATION, priority: 3 });
      await engine.createTask({ type: TASK_TYPES.CODE_REVIEW, priority: 1 });
      await engine.createTask({ type: TASK_TYPES.ANALYSIS, priority: 2 });

      // Queue should be sorted by priority (lowest number = highest priority)
      expect(engine.taskQueue[0].priority).toBe(1);
      expect(engine.taskQueue[1].priority).toBe(2);
      expect(engine.taskQueue[2].priority).toBe(3);
    });
  });

  describe('task execution', () => {
    test('should execute next task in queue', async () => {
      const task = await engine.createTask({
        type: TASK_TYPES.CODE_GENERATION,
        payload: { requirement: 'test code' },
      });

      const executedTask = await engine.executeNext();

      expect(executedTask).toBeDefined();
      expect(executedTask.status).toBe(TASK_STATES.COMPLETED);
      expect(executedTask.result).toBeDefined();
    });

    test('should respect max concurrent tasks limit', async () => {
      // Fill up concurrent slots
      for (let i = 0; i < engine.maxConcurrentTasks; i++) {
        await engine.createTask({ type: TASK_TYPES.ANALYSIS });
        engine.activeTaskCount++; // Simulate active tasks
      }

      const result = await engine.executeNext();
      expect(result).toBeNull();
    });

    test('should handle task dependencies', async () => {
      const task1 = await engine.createTask({ type: TASK_TYPES.ANALYSIS });
      const task2 = await engine.createTask({
        type: TASK_TYPES.CODE_GENERATION,
        dependencies: [task1.id],
      });

      // task2 should not execute because task1 is not completed
      const result = await engine.executeNext();
      expect(result.id).toBe(task1.id); // Should execute task1 first

      // Complete task1 manually
      const t1 = engine.tasks.get(task1.id);
      t1.status = TASK_STATES.COMPLETED;

      // Now task2 should be executable
      const result2 = await engine.executeNext();
      expect(result2.id).toBe(task2.id);
    });

    test('should handle task timeouts', async () => {
      const slowHandler = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(() => resolve('slow'), 2000));
      });

      engine.registerTaskHandler('slow-task', slowHandler);

      const task = await engine.createTask({
        type: 'slow-task',
        timeout: 100,
      });

      // Manually set maxRetries to 0 to disable retries
      const taskInMap = engine.tasks.get(task.id);
      taskInMap.maxRetries = 0;

      const executedTask = await engine._executeTask(taskInMap);

      expect(executedTask.status).toBe(TASK_STATES.FAILED);
      expect(executedTask.error).toContain('timeout');
    });

    test('should retry failed tasks', async () => {
      const failingHandler = jest.fn().mockRejectedValue(new Error('Task failed'));
      engine.registerTaskHandler('failing-task', failingHandler);

      const task = await engine.createTask({
        type: 'failing-task',
        maxRetries: 2,
      });

      const taskInMap = engine.tasks.get(task.id);

      // Execute multiple times to simulate retries
      // First attempt
      await engine._executeTask(taskInMap);
      expect(taskInMap.retries).toBe(1);
      expect(taskInMap.status).toBe(TASK_STATES.RETRYING);

      // After retry delay, status changes to QUEUED
      // For testing, manually trigger retries
      taskInMap.status = TASK_STATES.QUEUED;
      await engine._executeTask(taskInMap);
      expect(taskInMap.retries).toBe(2);
      expect(taskInMap.status).toBe(TASK_STATES.RETRYING);

      // Final retry
      taskInMap.status = TASK_STATES.QUEUED;
      await engine._executeTask(taskInMap);
      expect(taskInMap.status).toBe(TASK_STATES.FAILED);

      expect(failingHandler).toHaveBeenCalledTimes(3); // Original + 2 retries
    });
  });

  describe('default task handlers', () => {
    test('should handle code generation', async () => {
      const payload = { files: ['app.js'], language: 'javascript' };
      const result = await engine._handleCodeGeneration(payload);

      expect(result.type).toBe('code_generation');
      expect(result.generated).toBe(true);
      expect(result.files).toEqual(['app.js']);
    });

    test('should handle code review', async () => {
      const payload = { code: 'console.log("test");' };
      const result = await engine._handleCodeReview(payload);

      expect(result.type).toBe('code_review');
      expect(result.reviewed).toBe(true);
    });

    test('should handle test execution', async () => {
      const result = await engine._handleTestExecution({});

      expect(result.type).toBe('test_execution');
      expect(result.total).toBe(0);
    });

    test('should handle analysis', async () => {
      const result = await engine._handleAnalysis({});

      expect(result.type).toBe('analysis');
      expect(result.results).toEqual({});
    });
  });

  describe('response generation', () => {
    test('should analyze query intent', () => {
      const intents = [
        { query: 'Create a new function', expected: 'generation' },
        { query: 'Fix this bug', expected: 'fix' },
        { query: 'Explain how this works', expected: 'explanation' },
        { query: 'Refactor this code', expected: 'refactoring' },
        { query: 'Run tests', expected: 'testing' },
      ];

      intents.forEach(({ query, expected }) => {
        const intent = engine._analyzeQueryIntent(query);
        expect(intent).toBe(expected);
      });
    });

    test('should generate response content', () => {
      const content = engine._buildResponseContent(
        'Test query',
        'generation',
        { test: 'context' },
        { nodes: 5 }
      );

      expect(content).toContain('Test query');
      expect(content).toContain('generation');
      expect(content).toContain('test'); // Context key
      expect(content).toContain('5 nodes');
    });

    test('should calculate response confidence', () => {
      const confidence = engine._calculateResponseConfidence(
        { context: 'data' },
        { project: 'info' }
      );

      expect(confidence).toBeGreaterThan(0.5);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    test('should generate response', async () => {
      const response = await engine.generateResponse(
        'Create a function',
        { context: 'test' },
        { project: 'data' }
      );

      expect(response.content).toBeDefined();
      expect(response.intent).toBe('generation');
      expect(response.confidence).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });
  });

  describe('utility methods', () => {
    test('should get last execution time', () => {
      expect(engine.getLastExecutionTime()).toBeNull();

      // Simulate execution
      engine.lastExecutionTime = new Date();
      expect(engine.getLastExecutionTime()).toBeInstanceOf(Date);
    });

    test('should get engine statistics', () => {
      const stats = engine.getStats();

      expect(stats.totalTasks).toBe(0);
      expect(stats.completedTasks).toBe(0);
      expect(stats.failedTasks).toBe(0);
      expect(stats.maxConcurrentTasks).toBe(5);
    });

    test('should get all goals', async () => {
      await engine.createGoal({ type: GOAL_TYPES.FEATURE, description: 'Goal 1' });
      await engine.createGoal({ type: GOAL_TYPES.BUGFIX, description: 'Goal 2' });

      const goals = engine.getAllGoals();
      expect(goals).toHaveLength(2);
    });

    test('should get all tasks with optional status filter', async () => {
      await engine.createTask({ type: TASK_TYPES.CODE_GENERATION });
      await engine.createTask({ type: TASK_TYPES.CODE_REVIEW });

      const allTasks = engine.getAllTasks();
      const createdTasks = engine.getAllTasks(TASK_STATES.CREATED);

      expect(allTasks).toHaveLength(2);
      expect(createdTasks).toHaveLength(2);
    });
  });

  describe('shutdown', () => {
    test('should shutdown gracefully', async () => {
      // Create some tasks
      await engine.createTask({ type: TASK_TYPES.ANALYSIS });
      engine.activeTaskCount = 1; // Simulate active task

      await engine.shutdown();

      expect(engine.isShuttingDown).toBe(true);
      expect(engine.taskQueue).toHaveLength(0);
    });
  });
});
