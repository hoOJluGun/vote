/**
 * Resource Governor
 * 
 * Управляет ресурсами системы
 */

export class ResourceGovernor {
  constructor(options = {}) {
    this.maxParallelAgents = options.maxParallelAgents || 5;
    this.maxSimulationForks = options.maxSimulationForks || 3;
    this.maxTokenBudget = options.maxTokenBudget || 100000;
    this.maxExecutionTime = options.maxExecutionTime || 300000; // 5 минут
    this.currentUsage = {
      parallelAgents: 0,
      simulationForks: 0,
      tokensUsed: 0,
      executionTime: 0
    };
    this.budgetHistory = [];
    this.maxBudgetHistorySize = 100;
  }

  /**
   * Проверяет лимиты ресурсов
   */
  checkResourceLimits(resourceRequest) {
    const { type, tokens, fixCount, changeCount, complexity } = resourceRequest;

    switch (type) {
      case 'llm_request':
        return {
          allowed: this.currentUsage.tokensUsed + (tokens || 0) <= this.maxTokenBudget,
          reason: this.currentUsage.tokensUsed + (tokens || 0) > this.maxTokenBudget ? 'TOKEN_BUDGET_EXCEEDED' : 'OK'
        };

      case 'apply_fixes':
        return {
          allowed: this.currentUsage.parallelAgents + (fixCount || 1) <= this.maxParallelAgents,
          reason: this.currentUsage.parallelAgents + (fixCount || 1) > this.maxParallelAgents ? 'PARALLEL_AGENT_LIMIT_EXCEEDED' : 'OK'
        };

      case 'sandbox_test':
        return {
          allowed: this.currentUsage.simulationForks + (changeCount || 1) <= this.maxSimulationForks,
          reason: this.currentUsage.simulationForks + (changeCount || 1) > this.maxSimulationForks ? 'SIMULATION_FORK_LIMIT_EXCEEDED' : 'OK'
        };

      case 'orchestrate_goal':
        const complexityMultiplier = complexity === 'high' ? 2 : complexity === 'low' ? 0.5 : 1;
        return {
          allowed: this.currentUsage.parallelAgents + (1 * complexityMultiplier) <= this.maxParallelAgents &&
                   this.currentUsage.executionTime + 30000 <= this.maxExecutionTime, // 30 секунд на выполнение
          reason: this.currentUsage.parallelAgents + (1 * complexityMultiplier) > this.maxParallelAgents ? 'PARALLEL_AGENT_LIMIT_EXCEEDED' : 
                  this.currentUsage.executionTime + 30000 > this.maxExecutionTime ? 'EXECUTION_TIME_LIMIT_EXCEEDED' : 'OK'
        };

      default:
        return { allowed: true, reason: 'OK' };
    }
  }

  /**
   * Обновляет использование ресурсов
   */
  updateResourceUsage(resourceUsage) {
    const { type, tokens, fixCount, changeCount, duration } = resourceUsage;

    switch (type) {
      case 'llm_request':
        this.currentUsage.tokensUsed += tokens || 0;
        break;

      case 'apply_fixes':
        this.currentUsage.parallelAgents += fixCount || 1;
        break;

      case 'sandbox_test':
        this.currentUsage.simulationForks += changeCount || 1;
        break;

      case 'orchestrate_goal':
        this.currentUsage.parallelAgents += 1;
        this.currentUsage.executionTime += duration || 0;
        break;
    }

    // Убедимся, что значения не превышают лимиты
    this.currentUsage.parallelAgents = Math.min(this.currentUsage.parallelAgents, this.maxParallelAgents);
    this.currentUsage.simulationForks = Math.min(this.currentUsage.simulationForks, this.maxSimulationForks);
    this.currentUsage.tokensUsed = Math.min(this.currentUsage.tokensUsed, this.maxTokenBudget);
    this.currentUsage.executionTime = Math.min(this.currentUsage.executionTime, this.maxExecutionTime);
  }

  /**
   * Освобождает ресурсы после выполнения задачи
   */
  releaseResources(resourceType, amount = 1) {
    switch (resourceType) {
      case 'parallelAgents':
        this.currentUsage.parallelAgents = Math.max(0, this.currentUsage.parallelAgents - amount);
        break;
      case 'simulationForks':
        this.currentUsage.simulationForks = Math.max(0, this.currentUsage.simulationForks - amount);
        break;
    }
  }

  /**
   * Получает текущий статус ресурсов
   */
  getCurrentResourceStatus() {
    return {
      currentUsage: { ...this.currentUsage },
      limits: {
        maxParallelAgents: this.maxParallelAgents,
        maxSimulationForks: this.maxSimulationForks,
        maxTokenBudget: this.maxTokenBudget,
        maxExecutionTime: this.maxExecutionTime
      },
      utilization: {
        parallelAgents: this.currentUsage.parallelAgents / this.maxParallelAgents,
        simulationForks: this.currentUsage.simulationForks / this.maxSimulationForks,
        tokensUsed: this.currentUsage.tokensUsed / this.maxTokenBudget,
        executionTime: this.currentUsage.executionTime / this.maxExecutionTime
      }
    };
  }

  /**
   * Настраивает адаптивное масштабирование
   */
  configureAdaptiveScaling(successRate, stabilityImpact) {
    // Адаптивное изменение лимитов на основе successRate и stabilityImpact
    const adjustmentFactor = successRate > 0.8 && stabilityImpact < 0.3 ? 1.1 : 
                           successRate < 0.5 || stabilityImpact > 0.7 ? 0.9 : 1.0;

    this.maxParallelAgents = Math.round(this.maxParallelAgents * adjustmentFactor);
    this.maxSimulationForks = Math.round(this.maxSimulationForks * adjustmentFactor);
    
    // Убедимся, что лимиты в разумных пределах
    this.maxParallelAgents = Math.max(1, Math.min(20, this.maxParallelAgents));
    this.maxSimulationForks = Math.max(1, Math.min(10, this.maxSimulationForks));
  }

  /**
   * Сбрасывает использование ресурсов (например, в начале дня)
   */
  resetUsage() {
    this.currentUsage = {
      parallelAgents: 0,
      simulationForks: 0,
      tokensUsed: 0,
      executionTime: 0
    };
  }
}