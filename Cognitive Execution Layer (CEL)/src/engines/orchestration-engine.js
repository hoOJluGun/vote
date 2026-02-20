'use strict';

/**
 * Orchestration Engine
 * Central coordination for task execution and goal management
 *
 * @module src/engines/orchestration-engine
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Goal types supported by the orchestration engine
 * @enum {string}
 */
const GOAL_TYPES = {
  OPTIMIZATION: 'optimization',
  REFACTORING: 'refactoring',
  FEATURE: 'feature',
  BUGFIX: 'bugfix',
  DOCUMENTATION: 'documentation',
  TESTING: 'testing',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
};

/**
 * Execution result statuses
 * @enum {string}
 */
const EXECUTION_RESULTS = {
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILED: 'failed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout',
};

/**
 * Task priorities
 * @enum {number}
 */
const TASK_PRIORITIES = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
  BACKGROUND: 5,
};

/**
 * Task states
 * @enum {string}
 */
const TASK_STATES = {
  CREATED: 'created',
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  RETRYING: 'retrying',
};

/**
 * Task types
 * @enum {string}
 */
const TASK_TYPES = {
  CODE_GENERATION: 'code_generation',
  CODE_REVIEW: 'code_review',
  TEST_EXECUTION: 'test_execution',
  ANALYSIS: 'analysis',
  REFACTORING: 'refactoring',
  DOCUMENTATION: 'documentation',
  DEPLOYMENT: 'deployment',
  CUSTOM: 'custom',
};

// ============================================================================
// ORCHESTRATION ENGINE CLASS
// ============================================================================

/**
 * Orchestration Engine
 * Manages task execution, goal tracking, and resource coordination
 * @class
 */
class OrchestrationEngine {
  /**
   * Create an OrchestrationEngine instance
   * @param {Object} options - Configuration options
   * @param {number} [options.maxConcurrentTasks=10] - Maximum concurrent tasks
   * @param {number} [options.taskTimeout=60000] - Default task timeout in ms
   * @param {number} [options.maxRetries=3] - Maximum retry attempts
   * @param {number} [options.retryDelay=1000] - Delay between retries in ms
   */
  constructor(options = {}) {
    this.maxConcurrentTasks = options.maxConcurrentTasks || 10;
    this.taskTimeout = options.taskTimeout || 60000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;

    /** @type {Map<string, Object>} */
    this.tasks = new Map();

    /** @type {Map<string, Object>} */
    this.goals = new Map();

    /** @type {Array<Object>} */
    this.taskQueue = [];

    /** @type {Map<string, Function>} */
    this.taskHandlers = new Map();

    /** @type {number} */
    this.activeTaskCount = 0;

    /** @type {Date|null} */
    this.lastExecutionTime = null;

    /** @type {boolean} */
    this.isShuttingDown = false;

    /** @type {Object} */
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      retriedTasks: 0,
      averageExecutionTime: 0,
    };

    // Register default task handlers
    this._registerDefaultHandlers();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Register default task handlers
   * @private
   */
  _registerDefaultHandlers() {
    this.registerTaskHandler(TASK_TYPES.CODE_GENERATION, this._handleCodeGeneration.bind(this));
    this.registerTaskHandler(TASK_TYPES.CODE_REVIEW, this._handleCodeReview.bind(this));
    this.registerTaskHandler(TASK_TYPES.TEST_EXECUTION, this._handleTestExecution.bind(this));
    this.registerTaskHandler(TASK_TYPES.ANALYSIS, this._handleAnalysis.bind(this));
    this.registerTaskHandler(TASK_TYPES.REFACTORING, this._handleRefactoring.bind(this));
    this.registerTaskHandler(TASK_TYPES.DOCUMENTATION, this._handleDocumentation.bind(this));
    this.registerTaskHandler(TASK_TYPES.CUSTOM, this._handleCustomTask.bind(this));
  }

  /**
   * Register a custom task handler
   * @param {string} taskType - Task type
   * @param {Function} handler - Handler function
   */
  registerTaskHandler(taskType, handler) {
    this.taskHandlers.set(taskType, handler);
  }

  // ==========================================================================
  // GOAL MANAGEMENT
  // ==========================================================================

  /**
   * Create a new goal
   * @param {Object} goalData - Goal configuration
   * @param {string} goalData.type - Goal type from GOAL_TYPES
   * @param {string} goalData.description - Goal description
   * @param {Object} [goalData.constraints] - Goal constraints
   * @param {Object} [goalData.metadata] - Additional metadata
   * @returns {Promise<Object>} Created goal
   */
  async createGoal(goalData) {
    const goalId = `goal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const goal = {
      id: goalId,
      type: goalData.type,
      description: goalData.description,
      constraints: goalData.constraints || {},
      metadata: goalData.metadata || {},
      status: EXECUTION_RESULTS.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasks: [],
      progress: 0,
      priority: goalData.priority || TASK_PRIORITIES.MEDIUM,
      deadline: goalData.deadline || null,
      dependencies: goalData.dependencies || [],
    };

    this.goals.set(goalId, goal);

    console.log(`[OrchestrationEngine] Created goal: ${goalId} (${goal.type})`);

    return goal;
  }

  /**
   * Get goal by ID
   * @param {string} goalId - Goal identifier
   * @returns {Object|null} Goal object or null
   */
  getGoal(goalId) {
    return this.goals.get(goalId) || null;
  }

  /**
   * Update goal progress
   * @param {string} goalId - Goal identifier
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} [status] - Optional status update
   * @returns {Object|null} Updated goal
   */
  updateGoalProgress(goalId, progress, status) {
    const goal = this.goals.get(goalId);
    if (!goal) {
      return null;
    }

    goal.progress = Math.min(100, Math.max(0, progress));
    if (status && Object.values(EXECUTION_RESULTS).includes(status)) {
      goal.status = status;
    }
    goal.updatedAt = new Date().toISOString();

    return goal;
  }

  /**
   * Cancel a goal and its tasks
   * @param {string} goalId - Goal identifier
   * @returns {Object|null} Cancelled goal
   */
  cancelGoal(goalId) {
    const goal = this.goals.get(goalId);
    if (!goal) {
      return null;
    }

    // Cancel all associated tasks
    for (const taskId of goal.tasks) {
      const task = this.tasks.get(taskId);
      if (task && [TASK_STATES.CREATED, TASK_STATES.QUEUED, TASK_STATES.RUNNING].includes(task.status)) {
        task.status = TASK_STATES.CANCELLED;
        task.cancelledAt = new Date().toISOString();
      }
    }

    goal.status = EXECUTION_RESULTS.CANCELLED;
    goal.updatedAt = new Date().toISOString();

    // Remove from queue
    this.taskQueue = this.taskQueue.filter(t => t.goalId !== goalId);

    return goal;
  }

  // ==========================================================================
  // TASK MANAGEMENT
  // ==========================================================================

  /**
   * Create and queue a new task
   * @param {Object} taskData - Task configuration
   * @param {string} taskData.type - Task type
   * @param {string} [taskData.goalId] - Associated goal ID
   * @param {number} [taskData.priority=3] - Task priority
   * @param {Object} [taskData.payload] - Task payload
   * @param {number} [taskData.timeout] - Task timeout
   * @param {number} [taskData.maxRetries] - Max retries for this task
   * @returns {Promise<Object>} Created task
   */
  async createTask(taskData) {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const task = {
      id: taskId,
      type: taskData.type,
      goalId: taskData.goalId || null,
      priority: taskData.priority || TASK_PRIORITIES.MEDIUM,
      payload: taskData.payload || {},
      status: TASK_STATES.CREATED,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      timeout: taskData.timeout || this.taskTimeout,
      retries: 0,
      maxRetries: taskData.maxRetries !== undefined ? taskData.maxRetries : this.maxRetries,
      dependencies: taskData.dependencies || [],
      metadata: taskData.metadata || {},
    };

    this.tasks.set(taskId, task);
    this.stats.totalTasks++;

    // Add to queue
    this.taskQueue.push(task);
    this._sortQueue();

    // Associate with goal if provided
    if (task.goalId) {
      const goal = this.goals.get(task.goalId);
      if (goal) {
        goal.tasks.push(taskId);
      }
    }

    console.log(`[OrchestrationEngine] Created task: ${taskId} (${task.type})`);

    return task;
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task identifier
   * @returns {Object|null} Task object or null
   */
  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Execute the next task in queue
   * @returns {Promise<Object|null>} Executed task or null if queue empty
   */
  async executeNext() {
    if (this.isShuttingDown) {
      return null;
    }

    if (this.activeTaskCount >= this.maxConcurrentTasks) {
      return null;
    }

    // Find next executable task (dependencies satisfied)
    const taskIndex = this.taskQueue.findIndex(t => this._areDependenciesSatisfied(t));
    if (taskIndex === -1) {
      return null;
    }

    const task = this.taskQueue.splice(taskIndex, 1)[0];
    if (!task) {
      return null;
    }

    return this._executeTask(task);
  }

  /**
   * Execute all pending tasks
   * @returns {Promise<Array<Object>>} All executed tasks
   */
  async executeAll() {
    const results = [];

    while (this.taskQueue.length > 0 || this.activeTaskCount > 0) {
      if (this.activeTaskCount < this.maxConcurrentTasks && this.taskQueue.length > 0) {
        const result = await this.executeNext();
        if (result) {
          results.push(result);
        }
      } else {
        // Wait for active tasks
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Execute a specific task
   * @private
   * @param {Object} task - Task to execute
   * @returns {Promise<Object>} Execution result
   */
  async _executeTask(task) {
    this.activeTaskCount++;
    task.status = TASK_STATES.RUNNING;
    task.startedAt = new Date().toISOString();

    const startTime = Date.now();

    try {
      // Get handler for task type
      const handler = this.taskHandlers.get(task.type);
      if (!handler) {
        throw new Error(`No handler registered for task type: ${task.type}`);
      }

      // Execute with timeout
      const result = await this._executeWithTimeout(handler, task.payload, task.timeout);

      task.status = TASK_STATES.COMPLETED;
      task.result = result;
      task.completedAt = new Date().toISOString();
      this.stats.completedTasks++;

      // Update goal progress if associated
      if (task.goalId) {
        this._updateGoalFromTask(task.goalId, task);
      }

    } catch (error) {
      task.error = error.message;

      // Check if should retry (only if maxRetries > 0 and retries < maxRetries)
      if (task.maxRetries > 0 && task.retries < task.maxRetries) {
        task.retries++;
        task.status = TASK_STATES.RETRYING;
        this.stats.retriedTasks++;

        // Re-queue with delay
        setTimeout(() => {
          task.status = TASK_STATES.QUEUED;
          this.taskQueue.push(task);
          this._sortQueue();
        }, this.retryDelay * task.retries);

      } else {
        task.status = TASK_STATES.FAILED;
        task.completedAt = new Date().toISOString();
        this.stats.failedTasks++;
      }
    } finally {
      this.activeTaskCount--;
      this.lastExecutionTime = new Date();

      // Update average execution time
      const executionTime = Date.now() - startTime;
      this.stats.averageExecutionTime =
        (this.stats.averageExecutionTime * (this.stats.completedTasks - 1) + executionTime) /
        this.stats.completedTasks;
    }

    return task;
  }

  /**
   * Execute handler with timeout
   * @private
   */
  async _executeWithTimeout(handler, payload, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Task timeout after ${timeout}ms`));
      }, timeout);

      Promise.resolve(handler(payload))
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Check if task dependencies are satisfied
   * @private
   */
  _areDependenciesSatisfied(task) {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every(depId => {
      const depTask = this.tasks.get(depId);
      return depTask && depTask.status === TASK_STATES.COMPLETED;
    });
  }

  /**
   * Process task based on type
   * @private
   * @param {Object} task - Task to process
   * @returns {Promise<Object>} Processing result
   */
  async _processTask(task) {
    const handler = this.taskHandlers.get(task.type);
    if (!handler) {
      throw new Error(`No handler for task type: ${task.type}`);
    }
    return handler(task.payload);
  }

  /**
   * Update goal progress based on task completion
   * @private
   * @param {string} goalId - Goal identifier
   * @param {Object} task - Completed task
   */
  _updateGoalFromTask(goalId, task) {
    const goal = this.goals.get(goalId);
    if (!goal) {
      return;
    }

    const completedTasks = goal.tasks.filter(tId => {
      const t = this.tasks.get(tId);
      return t && t.status === TASK_STATES.COMPLETED;
    }).length;

    const progress = (completedTasks / goal.tasks.length) * 100;
    this.updateGoalProgress(goalId, progress);

    // Check if goal is complete
    if (completedTasks === goal.tasks.length) {
      this.updateGoalProgress(goalId, 100, EXECUTION_RESULTS.SUCCESS);
    }
  }

  /**
   * Sort task queue by priority
   * @private
   */
  _sortQueue() {
    this.taskQueue.sort((a, b) => a.priority - b.priority);
  }

  // ==========================================================================
  // DEFAULT TASK HANDLERS
  // ==========================================================================

  /**
   * Handle code generation task
   * @private
   */
  async _handleCodeGeneration(payload) {
    return {
      type: 'code_generation',
      generated: true,
      files: payload.files || [],
      language: payload.language || 'javascript',
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Handle code review task
   * @private
   */
  async _handleCodeReview(payload) {
    return {
      type: 'code_review',
      reviewed: true,
      issues: [],
      suggestions: [],
      reviewedAt: new Date().toISOString(),
    };
  }

  /**
   * Handle test execution task
   * @private
   */
  async _handleTestExecution(payload) {
    return {
      type: 'test_execution',
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      executedAt: new Date().toISOString(),
    };
  }

  /**
   * Handle analysis task
   * @private
   */
  async _handleAnalysis(payload) {
    return {
      type: 'analysis',
      results: {},
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Handle refactoring task
   * @private
   */
  async _handleRefactoring(payload) {
    return {
      type: 'refactoring',
      refactored: true,
      changes: [],
      refactoredAt: new Date().toISOString(),
    };
  }

  /**
   * Handle documentation task
   * @private
   */
  async _handleDocumentation(payload) {
    return {
      type: 'documentation',
      generated: true,
      documents: [],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Handle custom task
   * @private
   */
  async _handleCustomTask(payload) {
    return {
      type: 'custom',
      executed: true,
      result: payload.result || null,
      executedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // RESPONSE GENERATION
  // ==========================================================================

  /**
   * Generate a response for a query
   * @param {string} query - User query
   * @param {Object} context - Cognitive context
   * @param {Object} projectContext - Project context
   * @returns {Promise<Object>} Generated response
   */
  async generateResponse(query, context, projectContext) {
    this.lastExecutionTime = new Date();

    // Analyze query to determine intent
    const intent = this._analyzeQueryIntent(query);

    // Build response based on context and intent
    const response = {
      content: this._buildResponseContent(query, intent, context, projectContext),
      intent,
      context: context,
      projectContext: projectContext,
      confidence: this._calculateResponseConfidence(context, projectContext),
      timestamp: new Date().toISOString(),
    };

    return response;
  }

  /**
   * Analyze query intent
   * @private
   */
  _analyzeQueryIntent(query) {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('create') || lowerQuery.includes('generate') || lowerQuery.includes('write')) {
      return 'generation';
    }
    if (lowerQuery.includes('fix') || lowerQuery.includes('solve') || lowerQuery.includes('resolve')) {
      return 'fix';
    }
    if (lowerQuery.includes('explain') || lowerQuery.includes('what') || lowerQuery.includes('why')) {
      return 'explanation';
    }
    if (lowerQuery.includes('refactor') || lowerQuery.includes('improve') || lowerQuery.includes('optimize')) {
      return 'refactoring';
    }
    if (lowerQuery.includes('test') || lowerQuery.includes('verify')) {
      return 'testing';
    }

    return 'general';
  }

  /**
   * Build response content
   * @private
   */
  _buildResponseContent(query, intent, context, projectContext) {
    const parts = [];

    parts.push(`Processed query: "${query}"`);
    parts.push(`Intent: ${intent}`);

    if (context && Object.keys(context).length > 0) {
      parts.push(`Context available: ${Object.keys(context).join(', ')}`);
    }

    if (projectContext && Object.keys(projectContext).length > 0) {
      parts.push(`Project context: ${projectContext.nodes || 0} nodes`);
    }

    return parts.join('\n');
  }

  /**
   * Calculate response confidence
   * @private
   */
  _calculateResponseConfidence(context, projectContext) {
    let confidence = 0.5;

    if (context && Object.keys(context).length > 0) {
      confidence += 0.2;
    }

    if (projectContext && Object.keys(projectContext).length > 0) {
      confidence += 0.2;
    }

    if (this.stats.completedTasks > 10) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate code from a requirement
   * @param {string} requirement - Code requirement
   * @param {Object} context - Generation context
   * @returns {Promise<Object>} Generated code
   */
  async generateCodeFromRequirement(requirement, context) {
    // Create a code generation task
    const task = await this.createTask({
      type: TASK_TYPES.CODE_GENERATION,
      payload: {
        requirement,
        language: context?.language || 'javascript',
        files: context?.files || [],
        style: context?.style || 'clean',
      },
      priority: TASK_PRIORITIES.HIGH,
    });

    // Execute the task
    const result = await this._executeTask(this.tasks.get(task.id));

    return {
      code: result.result?.code || `// Generated code for: ${requirement}`,
      language: context?.language || 'javascript',
      taskId: task.id,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate fix suggestion
   * @param {string} problemDescription - Problem description
   * @param {Object} context - Fix context
   * @returns {Promise<Object>} Fix suggestion
   */
  async generateFixSuggestion(problemDescription, context) {
    // Analyze the problem
    const analysis = this._analyzeProblem(problemDescription, context);

    // Generate suggestions based on analysis
    const suggestions = this._generateFixSuggestions(analysis, context);

    return {
      problem: problemDescription,
      analysis,
      suggestions,
      confidence: analysis.confidence,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Analyze problem
   * @private
   */
  _analyzeProblem(description, context) {
    const keywords = description.toLowerCase().split(/\s+/);
    const errorPatterns = ['error', 'exception', 'fail', 'bug', 'issue', 'crash'];

    const hasErrorPattern = keywords.some(k => errorPatterns.includes(k));

    return {
      type: hasErrorPattern ? 'error' : 'general',
      keywords,
      context: context || {},
      confidence: hasErrorPattern ? 0.85 : 0.7,
    };
  }

  /**
   * Generate fix suggestions
   * @private
   */
  _generateFixSuggestions(analysis, context) {
    const suggestions = [];

    if (analysis.type === 'error') {
      suggestions.push({
        priority: 'high',
        description: 'Check error logs for detailed stack trace',
        action: 'analyze_logs',
      });
      suggestions.push({
        priority: 'high',
        description: 'Verify input parameters and data types',
        action: 'validate_inputs',
      });
    }

    suggestions.push({
      priority: 'medium',
      description: 'Review recent code changes',
      action: 'review_changes',
    });

    return suggestions;
  }

  /**
   * Generate a report
   * @param {string} reportType - Type of report
   * @param {Object} parameters - Report parameters
   * @returns {Promise<Object>} Generated report
   */
  async generateReport(reportType, parameters) {
    const report = {
      type: reportType,
      generatedAt: new Date().toISOString(),
      parameters,
      data: {},
    };

    switch (reportType) {
      case 'tasks':
        report.data = {
          total: this.stats.totalTasks,
          completed: this.stats.completedTasks,
          failed: this.stats.failedTasks,
          active: this.activeTaskCount,
          queued: this.taskQueue.length,
        };
        break;

      case 'goals':
        report.data = {
          total: this.goals.size,
          active: Array.from(this.goals.values()).filter(g => g.status === EXECUTION_RESULTS.PENDING).length,
          completed: Array.from(this.goals.values()).filter(g => g.status === EXECUTION_RESULTS.SUCCESS).length,
        };
        break;

      case 'performance':
        report.data = {
          averageExecutionTime: this.stats.averageExecutionTime,
          retriedTasks: this.stats.retriedTasks,
          successRate: this.stats.totalTasks > 0
            ? (this.stats.completedTasks / this.stats.totalTasks) * 100
            : 0,
        };
        break;

      default:
        report.data = {
          tasks: this.stats,
          goals: {
            total: this.goals.size,
          },
        };
    }

    return report;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get last execution time
   * @returns {Date|null} Last execution time
   */
  getLastExecutionTime() {
    return this.lastExecutionTime;
  }

  /**
   * Get engine statistics
   * @returns {Object} Engine statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalTasks: this.tasks.size,
      totalGoals: this.goals.size,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTaskCount,
      maxConcurrentTasks: this.maxConcurrentTasks,
    };
  }

  /**
   * Get all goals
   * @returns {Array<Object>} All goals
   */
  getAllGoals() {
    return Array.from(this.goals.values());
  }

  /**
   * Get all tasks
   * @param {string} [status] - Filter by status
   * @returns {Array<Object>} All tasks
   */
  getAllTasks(status) {
    let tasks = Array.from(this.tasks.values());
    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }
    return tasks;
  }

  /**
   * Shutdown the engine
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.isShuttingDown = true;

    // Wait for active tasks to complete (with timeout)
    const shutdownTimeout = 5000;
    const startTime = Date.now();

    while (this.activeTaskCount > 0 && (Date.now() - startTime) < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Cancel remaining queued tasks
    for (const task of this.taskQueue) {
      task.status = TASK_STATES.CANCELLED;
      task.cancelledAt = new Date().toISOString();
    }

    // Clear queues
    this.taskQueue = [];

    console.log('[OrchestrationEngine] Shutdown complete');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  GOAL_TYPES,
  EXECUTION_RESULTS,
  TASK_PRIORITIES,
  TASK_STATES,
  TASK_TYPES,
  OrchestrationEngine,
};
