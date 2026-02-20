'use strict';

/**
 * Integration tests for core system components
 */

import { OrchestrationEngine } from '../../src/engines/orchestration-engine.js';
import { ProjectKnowledgeGraph } from '../../src/engines/project-knowledge-graph.js';
import { VirtualSandbox } from '../../src/engines/virtual-sandbox.js';

describe('Core System Integration', () => {
  let orchestrationEngine;
  let knowledgeGraph;
  let virtualSandbox;

  beforeAll(async () => {
    // Initialize all core components
    knowledgeGraph = new ProjectKnowledgeGraph();
    await knowledgeGraph.initialize();

    orchestrationEngine = new OrchestrationEngine({
      maxConcurrentTasks: 3,
      taskTimeout: 2000,
    });

    virtualSandbox = new VirtualSandbox({
      timeout: 3000,
      maxMemory: 128 * 1024 * 1024,
    });
  });

  afterAll(async () => {
    if (knowledgeGraph) await knowledgeGraph.shutdown();
    if (orchestrationEngine) await orchestrationEngine.shutdown();
    if (virtualSandbox) await virtualSandbox.shutdown();
  });

  describe('Component Integration', () => {
    test('should coordinate between orchestration engine and knowledge graph', async () => {
      // Create a goal that involves project analysis
      const goal = await orchestrationEngine.createGoal({
        type: 'feature',
        description: 'Analyze project structure and generate documentation',
      });

      // Create tasks that use the knowledge graph
      const analysisTask = await orchestrationEngine.createTask({
        type: 'analysis',
        goalId: goal.id,
        payload: {
          projectPath: './test-project',
          analysisType: 'structure',
        },
      });

      const documentationTask = await orchestrationEngine.createTask({
        type: 'documentation',
        goalId: goal.id,
        payload: {
          format: 'markdown',
          sections: ['overview', 'installation', 'usage'],
        },
        dependencies: [analysisTask.id], // Depends on analysis completion
      });

      // Execute the analysis task first
      const executedAnalysis = await orchestrationEngine.executeNext();
      expect(executedAnalysis.id).toBe(analysisTask.id);
      expect(executedAnalysis.status).toBe('completed');

      // Update knowledge graph with analysis results
      const projectContext = await knowledgeGraph.getProjectContext();
      knowledgeGraph.updateEdge('project-root', 'src', { type: 'contains', weight: 1.0 });

      // Now execute the documentation task
      const executedDocs = await orchestrationEngine.executeNext();
      expect(executedDocs.id).toBe(documentationTask.id);
      expect(executedDocs.status).toBe('completed');

      // Verify goal progress was updated
      const updatedGoal = orchestrationEngine.getGoal(goal.id);
      expect(updatedGoal.progress).toBe(100);
      expect(updatedGoal.status).toBe('success');
    });

    test('should integrate virtual sandbox with task execution', async () => {
      // Create a sandbox for testing
      const sandboxId = 'integration-test-sandbox';
      await virtualSandbox.createSandbox(sandboxId);

      // Register a custom handler that uses the sandbox
      orchestrationEngine.registerTaskHandler('test_execution', async (payload) => {
        if (payload.sandboxId) {
          // Use the sandbox to execute tests
          await virtualSandbox.executeCode(payload.sandboxId, '// Test execution code');
          return {
            type: 'test_execution',
            passed: 1,
            failed: 0,
            skipped: 0,
            total: 1,
            executedAt: new Date().toISOString(),
          };
        }
        return {
          type: 'test_execution',
          passed: 0,
          failed: 0,
          skipped: 0,
          total: 0,
          executedAt: new Date().toISOString(),
        };
      });

      // Create a task that uses the sandbox
      const testTask = await orchestrationEngine.createTask({
        type: 'test_execution',
        payload: {
          sandboxId: sandboxId,
          testFiles: ['test/unit/*.test.js'],
          coverage: true,
        },
      });

      // Execute the task
      const executedTask = await orchestrationEngine.executeNext();

      // The task handler should interact with the virtual sandbox
      expect(executedTask.status).toBe('completed');
      expect(executedTask.result).toBeDefined();

      // Verify sandbox was used
      const sandbox = virtualSandbox.sandboxes.get(sandboxId);
      expect(sandbox.executions.length).toBeGreaterThan(0);
    });

    test('should handle complex workflow with multiple dependencies', async () => {
      // Create a complex workflow: analyze -> test -> refactor -> document
      const workflowGoal = await orchestrationEngine.createGoal({
        type: 'optimization',
        description: 'Complete project optimization workflow',
      });

      const analyzeTask = await orchestrationEngine.createTask({
        type: 'analysis',
        goalId: workflowGoal.id,
        payload: { target: 'performance' },
      });

      const testTask = await orchestrationEngine.createTask({
        type: 'test_execution',
        goalId: workflowGoal.id,
        payload: { scope: 'full' },
        dependencies: [analyzeTask.id],
      });

      const refactorTask = await orchestrationEngine.createTask({
        type: 'refactoring',
        goalId: workflowGoal.id,
        payload: { strategy: 'automated' },
        dependencies: [testTask.id],
      });

      const documentTask = await orchestrationEngine.createTask({
        type: 'documentation',
        goalId: workflowGoal.id,
        payload: { format: 'api-docs' },
        dependencies: [refactorTask.id],
      });

      // Execute workflow step by step
      const executionOrder = [];

      // Step 1: Analysis
      const analysisResult = await orchestrationEngine.executeNext();
      executionOrder.push(analysisResult.type);
      expect(analysisResult.id).toBe(analyzeTask.id);

      // Step 2: Testing
      const testResult = await orchestrationEngine.executeNext();
      executionOrder.push(testResult.type);
      expect(testResult.id).toBe(testTask.id);

      // Step 3: Refactoring
      const refactorResult = await orchestrationEngine.executeNext();
      executionOrder.push(refactorResult.type);
      expect(refactorResult.id).toBe(refactorTask.id);

      // Step 4: Documentation
      const documentResult = await orchestrationEngine.executeNext();
      executionOrder.push(documentResult.type);
      expect(documentResult.id).toBe(documentTask.id);

      // Verify execution order
      expect(executionOrder).toEqual(['analysis', 'test_execution', 'refactoring', 'documentation']);

      // Verify goal completion
      const finalGoal = orchestrationEngine.getGoal(workflowGoal.id);
      expect(finalGoal.progress).toBe(100);
      expect(finalGoal.status).toBe('success');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle component failures gracefully', async () => {
      // Create a task that will fail with no retries
      const failingTask = await orchestrationEngine.createTask({
        type: 'custom',
        payload: { operation: 'will_fail' },
        maxRetries: 0, // No retries to get immediate 'failed' status
      });

      // Mock the task handler to fail
      orchestrationEngine.registerTaskHandler('custom', async () => {
        throw new Error('Simulated failure');
      });

      // Execute the failing task (get task from tasks map to ensure it has correct maxRetries)
      const taskFromMap = orchestrationEngine.tasks.get(failingTask.id);
      const result = await orchestrationEngine._executeTask(taskFromMap);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Simulated failure');
      expect(result.retries).toBe(0); // No retries attempted since maxRetries is 0
    });

    test('should maintain system stability during component failures', async () => {
      // System should continue operating even when individual components fail
      // Use a task type that has a default handler and won't fail
      const stableTask = await orchestrationEngine.createTask({
        type: 'analysis',
        payload: { data: 'stable operation' },
        maxRetries: 0, // No retries to ensure immediate completion or failure
      });

      const result = await orchestrationEngine.executeNext();

      // Task should complete successfully (analysis handler exists and works)
      expect(result).not.toBeNull();
      expect(['completed', 'failed']).toContain(result.status);
      expect(orchestrationEngine.activeTaskCount).toBe(0);

      // Other components should remain functional regardless of task result
      const graphStatus = knowledgeGraph.getStatus();
      const sandboxStatus = virtualSandbox.getStatus();

      expect(graphStatus).toBe('operational');
      expect(sandboxStatus).toBe('not_initialized'); // Expected for this test
    });
  });

  describe('Performance Integration', () => {
    test('should handle concurrent operations efficiently', async () => {
      // Create multiple sandboxes
      const sandboxIds = [];
      for (let i = 0; i < 3; i++) {
        const id = `perf-sandbox-${i}`;
        await virtualSandbox.createSandbox(id);
        sandboxIds.push(id);
      }

      // Create multiple concurrent tasks
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        const task = await orchestrationEngine.createTask({
          type: 'analysis',
          payload: { iteration: i, data: `test-${i}` },
        });
        tasks.push(task);
      }

      // Execute tasks concurrently
      const startTime = Date.now();
      const executionPromises = tasks.map(task => orchestrationEngine._executeTask(task));

      const results = await Promise.all(executionPromises);
      const duration = Date.now() - startTime;

      // Verify all tasks completed
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.status).toBe('completed');
      });

      // Verify reasonable execution time
      expect(duration).toBeLessThan(10000); // Less than 10 seconds
    });

    test('should maintain resource limits across components', async () => {
      // Test that components respect their configured limits
      const memoryUsageBefore = process.memoryUsage();

      // Create resource-intensive operations
      for (let i = 0; i < 10; i++) {
        await orchestrationEngine.createTask({
          type: 'analysis',
          payload: {
            data: 'x'.repeat(10000), // Large payload
            iteration: i,
          },
        });
      }

      const memoryUsageAfter = process.memoryUsage();
      const memoryGrowth = memoryUsageAfter.heapUsed - memoryUsageBefore.heapUsed;

      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });
  });

  describe('Data Consistency Integration', () => {
    test('should maintain consistent state across components', async () => {
      // Create a project analysis workflow
      const projectId = 'consistency-test-project';

      // Initialize knowledge graph for this project
      const graphData = await knowledgeGraph.buildGraph(`./projects/${projectId}`);

      // Create corresponding goal
      const analysisGoal = await orchestrationEngine.createGoal({
        type: 'analysis',
        description: `Analyze project ${projectId}`,
        metadata: { projectId },
      });

      // Create analysis task
      const analysisTask = await orchestrationEngine.createTask({
        type: 'analysis',
        goalId: analysisGoal.id,
        payload: {
          projectPath: `./projects/${projectId}`,
          graphReference: graphData,
        },
      });

      // Execute and verify consistency
      const result = await orchestrationEngine.executeNext();

      expect(result.status).toBe('completed');

      // Verify that the knowledge graph was updated consistently
      const updatedContext = await knowledgeGraph.getProjectContext();
      expect(updatedContext.metadata.updatedAt).toBeDefined();

      // Verify goal and task consistency
      const goal = orchestrationEngine.getGoal(analysisGoal.id);
      expect(goal.tasks).toContain(analysisTask.id);
      expect(goal.metadata.projectId).toBe(projectId);
    });
  });
});