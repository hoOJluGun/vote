/**
 * Xcode Routes - Handles Xcode integration endpoints
 * @module src/server/routes/xcode
 */

import path from 'path';

/**
 * Create Xcode routes
 * @param {Object} app - Express app instance
 * @param {Object} deps - Dependencies
 * @param {Object} deps.formalSafetyModel - Safety model instance
 * @param {Object} deps.resourceGovernor - Resource governor instance
 */
export function xcodeRoutes(app, deps) {
  const { formalSafetyModel, resourceGovernor } = deps;

  /**
   * POST /v1/xcode/chat-completion - OpenAI-compatible chat for Xcode
   */
  app.post('/v1/xcode/chat-completion', async (req, res) => {
    try {
      // This is a wrapper around the main chat completion
      // with Xcode-specific context handling
      console.log(`📱 Xcode chat completion requested`);

      // Forward to main chat completions endpoint
      // The main endpoint will handle all the logic
      const chatHandler = app._router.stack.find(
        (layer) => layer.route && layer.route.path === '/v1/chat/completions' && layer.route.methods.post
      );

      if (chatHandler) {
        // Add Xcode-specific headers
        req.headers['x-client'] = 'xcode';
        return chatHandler.handle(req, res);
      }

      res.status(503).json({
        error: {
          message: 'Chat completion handler not available',
          type: 'service_unavailable',
        },
      });
    } catch (error) {
      console.error('❌ Error in /v1/xcode/chat-completion:', error);
      res.status(500).json({
        error: {
          message: 'Failed to process Xcode chat completion',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/xcode/integration - Xcode integration commands
   */
  app.post('/v1/xcode/integration', async (req, res) => {
    try {
      const { command, params } = req.body;

      if (!command) {
        return res.status(400).json({
          error: {
            message: 'Command is required',
            type: 'invalid_request_error',
          },
        });
      }

      // Safety check
      const safetyCheck = formalSafetyModel.validateOperation({
        type: 'xcode_integration',
        payload: { command, params },
      });

      if (!safetyCheck.safe) {
        console.warn(`🚨 Safety violation in Xcode integration:`, safetyCheck.violations);
        return res.status(400).json({
          error: {
            message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
            type: 'invalid_request_error',
          },
        });
      }

      // Handle different commands
      let result;
      switch (command) {
        case 'get_context':
          result = await handleGetContext(params);
          break;
        case 'analyze_file':
          result = await handleAnalyzeFile(params);
          break;
        case 'suggest_fix':
          result = await handleSuggestFix(params);
          break;
        default:
          return res.status(400).json({
            error: {
              message: `Unknown command: ${command}`,
              type: 'invalid_request_error',
            },
          });
      }

      res.json({
        success: true,
        command,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/xcode/integration:', error);
      res.status(500).json({
        error: {
          message: 'Failed to process Xcode integration command',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * GET /v1/xcode/dashboard - Get Xcode dashboard data
   */
  app.get('/v1/xcode/dashboard', async (req, res) => {
    try {
      const dashboardData = {
        status: 'connected',
        features: {
          codeCompletion: true,
          codeAnalysis: true,
          refactoring: true,
          documentation: true,
          testing: true,
        },
        recentActivity: [],
        statistics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
        },
        timestamp: new Date().toISOString(),
      };

      res.json(dashboardData);
    } catch (error) {
      console.error('❌ Error in /v1/xcode/dashboard:', error);
      res.status(500).json({
        error: {
          message: 'Failed to get Xcode dashboard data',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * GET /v1/xcode/health - Xcode health check
   */
  app.get('/v1/xcode/health', async (req, res) => {
    try {
      res.json({
        status: 'ok',
        integration: 'active',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in /v1/xcode/health:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check Xcode health',
      });
    }
  });

  /**
   * GET /v1/project-context/* - Get project context for a file
   */
  app.get('/v1/project-context/*', async (req, res) => {
    try {
      const filePath = decodeURIComponent(req.params[0]);

      if (!filePath) {
        return res.status(400).json({
          error: {
            message: 'File path is required',
            type: 'invalid_request_error',
          },
        });
      }

      // Dynamic import to avoid circular dependencies
      const { ProjectContextAnalyzer } = await import('../../engines/project-context-analyzer.js');

      const context = await ProjectContextAnalyzer.getFullProjectContext(filePath);

      try {
        context.dependencies = await ProjectContextAnalyzer.getDependencies(context.projectRoot);
      } catch (depError) {
        console.warn('Could not retrieve dependencies:', depError.message);
        context.dependencies = {};
      }

      res.json(context);
    } catch (error) {
      console.error('❌ Error in /v1/project-context:', error);
      res.status(500).json({
        error: {
          message: 'Failed to fetch project context',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/run-tests - Run tests for a file
   */
  app.post('/v1/run-tests', async (req, res) => {
    try {
      const { filePath } = req.body;

      if (!filePath) {
        return res.status(400).json({
          error: {
            message: 'File path is required',
            type: 'invalid_request_error',
          },
        });
      }

      // Safety check
      const safetyCheck = formalSafetyModel.validateOperation({
        type: 'run_tests',
        payload: { filePath },
      });

      if (!safetyCheck.safe) {
        console.warn(`🚨 Safety violation in test run:`, safetyCheck.violations);
        return res.status(400).json({
          error: {
            message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
            type: 'invalid_request_error',
          },
        });
      }

      const { CodeTesterLinter } = await import('../../engines/code-tester-linter.js');
      const testResults = await CodeTesterLinter.runTestsForFile(filePath);

      res.json(testResults);
    } catch (error) {
      console.error('❌ Error in /v1/run-tests:', error);
      res.status(500).json({
        error: {
          message: 'Failed to run tests',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/lint-code - Lint code for a file
   */
  app.post('/v1/lint-code', async (req, res) => {
    try {
      const { filePath } = req.body;

      if (!filePath) {
        return res.status(400).json({
          error: {
            message: 'File path is required',
            type: 'invalid_request_error',
          },
        });
      }

      // Safety check
      const safetyCheck = formalSafetyModel.validateOperation({
        type: 'run_linter',
        payload: { filePath },
      });

      if (!safetyCheck.safe) {
        console.warn(`🚨 Safety violation in lint run:`, safetyCheck.violations);
        return res.status(400).json({
          error: {
            message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
            type: 'invalid_request_error',
          },
        });
      }

      const { CodeTesterLinter } = await import('../../engines/code-tester-linter.js');
      const lintResults = await CodeTesterLinter.runLintForFile(filePath);

      res.json(lintResults);
    } catch (error) {
      console.error('❌ Error in /v1/lint-code:', error);
      res.status(500).json({
        error: {
          message: 'Failed to lint code',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/code-quality-report - Generate code quality report
   */
  app.post('/v1/code-quality-report', async (req, res) => {
    try {
      const { filePath, testResults, lintResults } = req.body;

      if (!filePath) {
        return res.status(400).json({
          error: {
            message: 'File path is required',
            type: 'invalid_request_error',
          },
        });
      }

      // Safety check
      const safetyCheck = formalSafetyModel.validateOperation({
        type: 'code_quality_report',
        payload: { filePath },
      });

      if (!safetyCheck.safe) {
        console.warn(`🚨 Safety violation in code quality report:`, safetyCheck.violations);
        return res.status(400).json({
          error: {
            message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
            type: 'invalid_request_error',
          },
        });
      }

      const { CodeTesterLinter, CodeAnalysis } = await import('../../engines/code-tester-linter.js');

      let finalTestResults = testResults;
      let finalLintResults = lintResults;

      if (!finalTestResults) {
        finalTestResults = await CodeTesterLinter.runTestsForFile(filePath);
      }

      if (!finalLintResults) {
        finalLintResults = await CodeTesterLinter.runLintForFile(filePath);
      }

      const analyzedTestResults = CodeAnalysis.analyzeTestResults(
        finalTestResults.results || finalTestResults
      );
      const analyzedLintResults = CodeAnalysis.analyzeLintResults(
        finalLintResults.results || finalLintResults
      );

      const report = CodeAnalysis.generateCodeQualityReport(analyzedTestResults, analyzedLintResults);

      res.json(report);
    } catch (error) {
      console.error('❌ Error in /v1/code-quality-report:', error);
      res.status(500).json({
        error: {
          message: 'Failed to generate code quality report',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/apply-fixes - Apply fixes to code
   */
  app.post('/v1/apply-fixes', async (req, res) => {
    try {
      const { filePath, fixes } = req.body;

      if (!filePath) {
        return res.status(400).json({
          error: {
            message: 'File path is required',
            type: 'invalid_request_error',
          },
        });
      }

      if (!Array.isArray(fixes) || fixes.length === 0) {
        return res.status(400).json({
          error: {
            message: 'Array of fixes is required',
            type: 'invalid_request_error',
          },
        });
      }

      // Safety check
      const safetyCheck = formalSafetyModel.validateOperation({
        type: 'apply_fixes',
        payload: { filePath, fixes },
      });

      if (!safetyCheck.safe) {
        console.warn(`🚨 Safety violation in apply fixes:`, safetyCheck.violations);
        return res.status(400).json({
          error: {
            message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
            type: 'invalid_request_error',
          },
        });
      }

      // Resource check
      const resourceCheck = resourceGovernor.checkResourceLimits({
        type: 'apply_fixes',
        fixCount: fixes.length,
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

      const { CodeApplier } = await import('../../engines/code-applier.js');
      const result = await CodeApplier.applyFixesWithValidation(filePath, fixes);

      res.json(result);
    } catch (error) {
      console.error('❌ Error in /v1/apply-fixes:', error);
      res.status(500).json({
        error: {
          message: 'Failed to apply fixes',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/sandbox-test - Test changes in sandbox
   */
  app.post('/v1/sandbox-test', async (req, res) => {
    try {
      const { changes, testConfig } = req.body;

      if (!Array.isArray(changes) || changes.length === 0) {
        return res.status(400).json({
          error: {
            message: 'Array of changes is required',
            type: 'invalid_request_error',
          },
        });
      }

      // Safety check
      const safetyCheck = formalSafetyModel.validateOperation({
        type: 'sandbox_test',
        payload: { changes },
      });

      if (!safetyCheck.safe) {
        console.warn(`🚨 Safety violation in sandbox test:`, safetyCheck.violations);
        return res.status(400).json({
          error: {
            message: `Safety check failed: ${safetyCheck.violations.join(', ')}`,
            type: 'invalid_request_error',
          },
        });
      }

      // Resource check
      const resourceCheck = resourceGovernor.checkResourceLimits({
        type: 'sandbox_test',
        changeCount: changes.length,
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

      const { VirtualSandbox } = await import('../../engines/virtual-sandbox.js');
      const sandbox = new VirtualSandbox(process.cwd());

      const createResult = await sandbox.createSandbox();

      if (!createResult.success) {
        return res.status(500).json({
          error: {
            message: `Failed to create sandbox: ${createResult.error}`,
            type: 'invalid_request_error',
          },
        });
      }

      const applyResult = await sandbox.applyChangesToSandbox(changes);

      if (!applyResult.success) {
        await sandbox.destroySandbox();
        return res.status(500).json({
          error: {
            message: `Failed to apply changes to sandbox: ${applyResult.error}`,
            type: 'invalid_request_error',
          },
        });
      }

      const testResults = await sandbox.runTestsInSandbox(testConfig || {});

      await sandbox.destroySandbox();

      res.json({
        success: true,
        testResults,
        appliedChanges: applyResult.appliedChanges,
      });
    } catch (error) {
      console.error('❌ Error in /v1/sandbox-test:', error);
      res.status(500).json({
        error: {
          message: 'Failed to run sandbox test',
          type: 'invalid_request_error',
        },
      });
    }
  });

  /**
   * POST /v1/file-agents/:action - Manage file agents
   */
  app.post('/v1/file-agents/:action', async (req, res) => {
    try {
      const { action } = req.params;
      const { filePath } = req.body;

      const { FileAgentManager } = await import('../../engines/file-agent-manager.js');
      let fileAgentManager = new FileAgentManager(process.cwd());

      let result;

      switch (action) {
        case 'add':
          if (!filePath) {
            return res.status(400).json({
              error: {
                message: 'File path is required',
                type: 'invalid_request_error',
              },
            });
          }
          result = await fileAgentManager.addFileToMonitoring(filePath);
          break;

        case 'remove':
          if (!filePath) {
            return res.status(400).json({
              error: {
                message: 'File path is required',
                type: 'invalid_request_error',
              },
            });
          }
          fileAgentManager.removeFileFromMonitoring(filePath);
          result = { success: true, message: `File ${filePath} removed from monitoring` };
          break;

        case 'analyze-current':
          result = await fileAgentManager.monitorAllActiveFiles();
          break;

        case 'suggest-all':
          result = await fileAgentManager.generateAllSuggestions();
          break;

        case 'full-analysis':
          result = await fileAgentManager.fullProjectAnalysis();
          break;

        default:
          return res.status(400).json({
            error: {
              message: 'Invalid action. Use add, remove, analyze-current, suggest-all, or full-analysis',
              type: 'invalid_request_error',
            },
          });
      }

      res.json(result);
    } catch (error) {
      console.error('❌ Error in /v1/file-agents:', error);
      res.status(500).json({
        error: {
          message: 'Failed to manage file agents',
          type: 'invalid_request_error',
        },
      });
    }
  });
}

// Helper functions
async function handleGetContext(params) {
  const { filePath } = params;
  const { ProjectContextAnalyzer } = await import('../../engines/project-context-analyzer.js');
  return await ProjectContextAnalyzer.getFullProjectContext(filePath);
}

async function handleAnalyzeFile(params) {
  const { filePath, content } = params;
  const { CodeAnalysis } = await import('../../engines/code-analysis.js');
  return await CodeAnalysis.analyzeFile(filePath, content);
}

async function handleSuggestFix(params) {
  const { filePath, issue } = params;
  const { CodeAnalysis } = await import('../../engines/code-analysis.js');
  return await CodeAnalysis.suggestFix(filePath, issue);
}
