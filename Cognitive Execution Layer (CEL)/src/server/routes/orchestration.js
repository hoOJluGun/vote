/**
 * Orchestration Routes - Handles goal and task orchestration
 * @module src/server/routes/orchestration
 */

/**
 * Create orchestration routes
 * @param {Object} app - Express app instance
 * @param {Object} deps - Dependencies
 * @param {Object} deps.orchestrationEngine - Orchestration engine instance
 * @param {Object} deps.formalSafetyModel - Safety model instance
 * @param {Object} deps.resourceGovernor - Resource governor instance
 */
export function orchestrationRoutes(app, deps) {
  const { orchestrationEngine, formalSafetyModel, resourceGovernor } = deps;

  /**
   * POST /v1/orchestrate-goal - Orchestrate goal execution
   */
  app.post('/v1/orchestrate-goal', async (req, res) => {
    try {
      const { query, context } = req.body;

      if (!query) {
        return res.status(400).json({
          error: {
            message: 'Goal query is required',
            type: 'invalid_request_error',
          },
        });
      }

      // Safety check
      const safetyCheck = formalSafetyModel.validateOperation({
        type: 'orchestrate_goal',
        payload: { query, context },
      });

      if (!safetyCheck.safe) {
        console.warn(`🚨 Safety violation in goal orchestration:`, safetyCheck.violations);
        return res.status(400).json({
          error: {
            message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
            type: 'invalid_request_error',
          },
        });
      }

      // Resource check
      const resourceCheck = resourceGovernor.checkResourceLimits({
        type: 'orchestrate_goal',
        complexity: context?.complexity || 'medium',
      });

      if (!resourceCheck.allowed) {
        console.warn(`📉 Resource limit exceeded:`, resourceCheck.reason);
        return res.status(429).json({
          error: {
            message: `Resource limit exceeded: ${resourceCheck.reason}`,
            type: 'invalid_request_error',
          },
        });
      }

      // Execute goal
      const result = await orchestrationEngine.executeGoal({
        query,
        context: context || {},
      });

      res.json(result);
    } catch (error) {
      console.error('❌ Error in /v1/orchestrate-goal:', error);
      res.status(500).json({
        error: {
          message: 'Failed to orchestrate goal execution',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/goals - Create a new goal
   */
  app.post('/v1/goals', async (req, res) => {
    try {
      const goal = await orchestrationEngine.createGoal(req.body);
      res.status(201).json(goal);
    } catch (error) {
      console.error('❌ Error creating goal:', error);
      res.status(500).json({
        error: {
          message: 'Failed to create goal',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * GET /v1/goals/:goalId - Get goal by ID
   */
  app.get('/v1/goals/:goalId', async (req, res) => {
    try {
      const goal = orchestrationEngine.getGoal(req.params.goalId);
      if (!goal) {
        return res.status(404).json({
          error: {
            message: 'Goal not found',
            type: 'not_found_error',
          },
        });
      }
      res.json(goal);
    } catch (error) {
      console.error('❌ Error getting goal:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get goal',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * DELETE /v1/goals/:goalId - Cancel a goal
   */
  app.delete('/v1/goals/:goalId', async (req, res) => {
    try {
      const cancelledGoal = orchestrationEngine.cancelGoal(req.params.goalId);
      if (!cancelledGoal) {
        return res.status(404).json({
          error: {
            message: 'Goal not found',
            type: 'not_found_error',
          },
        });
      }
      res.json(cancelledGoal);
    } catch (error) {
      console.error('❌ Error cancelling goal:', error);
      res.status(500).json({
        error: {
          message: 'Failed to cancel goal',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/tasks - Create a new task
   */
  app.post('/v1/tasks', async (req, res) => {
    try {
      const task = await orchestrationEngine.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      console.error('❌ Error creating task:', error);
      res.status(500).json({
        error: {
          message: 'Failed to create task',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * GET /v1/tasks/:taskId - Get task by ID
   */
  app.get('/v1/tasks/:taskId', async (req, res) => {
    try {
      const task = orchestrationEngine.getTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({
          error: {
            message: 'Task not found',
            type: 'not_found_error',
          },
        });
      }
      res.json(task);
    } catch (error) {
      console.error('❌ Error getting task:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get task',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/execute - Execute next task in queue
   */
  app.post('/v1/execute', async (req, res) => {
    try {
      const result = await orchestrationEngine.executeNext();
      if (!result) {
        return res.status(204).json({ message: 'No tasks to execute' });
      }
      res.json(result);
    } catch (error) {
      console.error('❌ Error executing task:', error);
      res.status(500).json({
        error: {
          message: 'Failed to execute task',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * GET /v1/orchestration/stats - Get orchestration statistics
   */
  app.get('/v1/orchestration/stats', async (req, res) => {
    try {
      const stats = orchestrationEngine.getStats();
      res.json(stats);
    } catch (error) {
      console.error('❌ Error getting orchestration stats:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get orchestration statistics',
          type: 'invalid_request_error',
        },
      });
    }
  });
}
