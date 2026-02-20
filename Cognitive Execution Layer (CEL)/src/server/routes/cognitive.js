/**
 * Cognitive Routes - Handles cognitive workspace and solution evaluation
 * @module src/server/routes/cognitive
 */

/**
 * Create cognitive routes
 * @param {Object} app - Express app instance
 * @param {Object} deps - Dependencies
 * @param {Object} deps.cognitiveWorkspace - Cognitive workspace instance
 * @param {Object} deps.solutionEvaluationModel - Solution evaluation model instance
 * @param {Object} deps.deterministicExecutionLayer - Deterministic execution layer instance
 */
export function cognitiveRoutes(app, deps) {
  const { cognitiveWorkspace, solutionEvaluationModel, deterministicExecutionLayer } = deps;

  /**
   * GET /v1/cognitive-view - Get cognitive representation of project
   */
  app.get('/v1/cognitive-view', async (req, res) => {
    try {
      if (!cognitiveWorkspace) {
        return res.status(503).json({
          error: {
            message: 'Cognitive workspace not initialized',
            type: 'service_unavailable',
          },
        });
      }

      const cognitiveModel = await cognitiveWorkspace.buildConceptualModel();
      const cognitiveView = cognitiveWorkspace.getCognitiveViewForLLM();

      res.json({
        success: true,
        cognitiveModel,
        cognitiveView,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/cognitive-view:', error);
      res.status(500).json({
        error: {
          message: 'Failed to generate cognitive view of the project',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * GET /v1/cognitive-state - Get current cognitive state
   */
  app.get('/v1/cognitive-state', async (req, res) => {
    try {
      if (!cognitiveWorkspace) {
        return res.status(503).json({
          error: {
            message: 'Cognitive workspace not initialized',
            type: 'service_unavailable',
          },
        });
      }

      const state = cognitiveWorkspace.getCurrentCognitiveState();

      res.json({
        state: state,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/cognitive-state:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get cognitive state',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/evaluate-solution - Evaluate a solution
   */
  app.post('/v1/evaluate-solution', async (req, res) => {
    try {
      const { solution } = req.body;

      if (!solution) {
        return res.status(400).json({
          error: {
            message: 'Solution object is required',
            type: 'invalid_request_error',
          },
        });
      }

      if (!solutionEvaluationModel) {
        return res.status(503).json({
          error: {
            message: 'Solution evaluation model not initialized',
            type: 'service_unavailable',
          },
        });
      }

      const evaluation = solutionEvaluationModel.evaluateSolution(solution);

      res.json({
        success: true,
        evaluation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/evaluate-solution:', error);
      res.status(500).json({
        error: {
          message: 'Failed to evaluate solution',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * GET /v1/deterministic-state - Get deterministic execution state
   */
  app.get('/v1/deterministic-state', async (req, res) => {
    try {
      if (!deterministicExecutionLayer) {
        return res.status(503).json({
          error: {
            message: 'Deterministic execution layer not initialized',
            type: 'service_unavailable',
          },
        });
      }

      const state = deterministicExecutionLayer.getCurrentExecutionState();

      res.json({
        state: state,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/deterministic-state:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get deterministic execution state',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * GET /v1/deterministic-history - Get execution history
   */
  app.get('/v1/deterministic-history', async (req, res) => {
    try {
      if (!deterministicExecutionLayer) {
        return res.status(503).json({
          error: {
            message: 'Deterministic execution layer not initialized',
            type: 'service_unavailable',
          },
        });
      }

      const history = deterministicExecutionLayer.getExecutionHistory();

      res.json({
        history: history,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/deterministic-history:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get deterministic execution history',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * GET /v1/get-execution-snapshot/:id - Get execution snapshot by ID
   */
  app.get('/v1/get-execution-snapshot/:id', async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: {
            message: 'Snapshot ID is required',
            type: 'invalid_request_error',
          },
        });
      }

      if (!deterministicExecutionLayer) {
        return res.status(503).json({
          error: {
            message: 'Deterministic execution layer not initialized',
            type: 'service_unavailable',
          },
        });
      }

      const snapshot = deterministicExecutionLayer.getSnapshotById(id);

      if (!snapshot) {
        return res.status(404).json({
          error: {
            message: 'Snapshot not found',
            type: 'not_found_error',
          },
        });
      }

      res.json({
        snapshot: snapshot,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/get-execution-snapshot:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get execution snapshot',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/replay-execution/:snapshotId - Replay execution from snapshot
   */
  app.post('/v1/replay-execution/:snapshotId', async (req, res) => {
    try {
      const { snapshotId } = req.params;

      if (!snapshotId) {
        return res.status(400).json({
          error: {
            message: 'Snapshot ID is required',
            type: 'invalid_request_error',
          },
        });
      }

      if (!deterministicExecutionLayer) {
        return res.status(503).json({
          error: {
            message: 'Deterministic execution layer not initialized',
            type: 'service_unavailable',
          },
        });
      }

      const replayResult = await deterministicExecutionLayer.replayExecution(snapshotId);

      res.json({
        success: replayResult.success,
        result: replayResult.result,
        differences: replayResult.differences,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/replay-execution:', error);
      res.status(500).json({
        error: {
          message: 'Failed to replay execution',
          type: 'invalid_request_error',
        },
      });
    }
  });
}
