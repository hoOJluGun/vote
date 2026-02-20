/**
 * Система оптимизации затрат и прогнозирования нагрузки
 */
export class CostOptimizer {
  constructor() {
    // Цены моделей за 1M токенов (в долларах)
    this.modelPricing = {
      'deepseek/deepseek-chat': { input: 0.005, output: 0.01 }, // $0.5/1M input, $1/1M output
      'mistralai/mistral-7b-instruct': { input: 0.01, output: 0.02 }, // $1/1M input, $2/1M output
      'meta-llama/llama-3-8b-instruct': { input: 0.02, output: 0.04 } // $2/1M input, $4/1M output
    };

    // История производительности моделей (время ответа в мс)
    this.modelPerformance = {
      'deepseek/deepseek-chat': { avgResponseTime: 2000, successRate: 0.95 },
      'mistralai/mistral-7b-instruct': { avgResponseTime: 2500, successRate: 0.92 },
      'meta-llama/llama-3-8b-instruct': { avgResponseTime: 3000, successRate: 0.90 }
    };

    // История использования
    this.usageHistory = [];
  }

  /**
   * Обновляет статистику резервных моделей
   */
  updateFallbackStats(success) {
    // Простая реализация - можно расширить для более сложной логики
    if (!this.fallbackStats) {
      this.fallbackStats = {
        totalAttempts: 0,
        successfulAttempts: 0,
        successRate: 0
      };
    }
    
    this.fallbackStats.totalAttempts++;
    if (success) {
      this.fallbackStats.successfulAttempts++;
    }
    this.fallbackStats.successRate = 
      this.fallbackStats.successfulAttempts / this.fallbackStats.totalAttempts;
  }

  /**
   * Получает статистику использования
   */
  getUsageStats(hoursBack = 24) {
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    const recentUsage = this.usageHistory.filter(entry => entry.timestamp > cutoffTime);
    
    const totalCost = recentUsage.reduce((sum, entry) => sum + (entry.cost || 0), 0);
    const totalRequests = recentUsage.length;
    const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;
    
    return {
      totalCost,
      totalRequests,
      avgCostPerRequest,
      periodHours: hoursBack,
      usageHistory: recentUsage
    };
  }

  /**
   * Получает здоровье конкретной модели
   */
  getModelHealth(modelName) {
    const performance = this.modelPerformance[modelName];
    if (!performance) {
      return {
        healthy: false,
        reason: 'Model not found in performance data'
      };
    }
    
    const isHealthy = performance.successRate >= 0.85 && performance.avgResponseTime <= 5000;
    
    return {
      healthy: isHealthy,
      successRate: performance.successRate,
      avgResponseTime: performance.avgResponseTime,
      reason: isHealthy ? 'Model is healthy' : 'Model performance below threshold'
    };
  }

  /**
   * Обновляет производительность модели
   */
  updateModelPerformance(modelName, responseTime, success, errorCode = 0) {
    if (!this.modelPerformance[modelName]) {
      this.modelPerformance[modelName] = {
        avgResponseTime: responseTime,
        successRate: success ? 1 : 0,
        totalRequests: 1,
        successfulRequests: success ? 1 : 0
      };
    } else {
      const current = this.modelPerformance[modelName];
      const newTotal = current.totalRequests + 1;
      const newSuccessful = current.successfulRequests + (success ? 1 : 0);
      
      current.avgResponseTime = 
        (current.avgResponseTime * current.totalRequests + responseTime) / newTotal;
      current.successRate = newSuccessful / newTotal;
      current.totalRequests = newTotal;
      current.successfulRequests = newSuccessful;
    }
  }

  /**
   * Получает статистику резервных моделей
   */
  getFallbackStats() {
    const healthyModels = this.getHealthyModels();
    const allModels = Object.keys(this.modelPricing);
    
    return {
      totalModels: allModels.length,
      healthyModels: healthyModels.length,
      fallbackModels: allModels.length - healthyModels.length,
      healthPercentage: (healthyModels.length / allModels.length) * 100,
      avgSuccessRate: healthyModels.length > 0 
        ? healthyModels.reduce((sum, model) => sum + model.successRate, 0) / healthyModels.length
        : 0,
      avgResponseTime: healthyModels.length > 0
        ? healthyModels.reduce((sum, model) => sum + model.avgResponseTime, 0) / healthyModels.length
        : 0
    };
  }

  /**
   * Получает список здоровых моделей
   */
  getHealthyModels() {
    const healthyModels = [];
    
    for (const [modelName, performance] of Object.entries(this.modelPerformance)) {
      // Модель считается здоровой если:
      // 1. Успех выше 85%
      // 2. Время ответа ниже 5000 мс
      if (performance.successRate >= 0.85 && performance.avgResponseTime <= 5000) {
        healthyModels.push({
          name: modelName,
          successRate: performance.successRate,
          avgResponseTime: performance.avgResponseTime,
          pricing: this.modelPricing[modelName] || { input: 0, output: 0 }
        });
      }
    }
    
    // Сортируем по успешности (от лучшей к худшей)
    return healthyModels.sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Рассчитывает стоимость запроса
   */
  calculateCost(model, tokensIn, tokensOut) {
    const pricing = this.modelPricing[model];
    if (!pricing) {
      return { cost: 0, currency: 'USD' };
    }

    const inputCost = (tokensIn / 1000000) * pricing.input;
    const outputCost = (tokensOut / 1000000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      cost: totalCost,
      breakdown: {
        input: inputCost,
        output: outputCost
      },
      currency: 'USD'
    };
  }

  /**
   * Прогнозирует стоимость на основе истории
   */
  predictCostForPrompt(model, estimatedTokens) {
    const pricing = this.modelPricing[model];
    if (!pricing) {
      return { predictedCost: 0 };
    }

    // Грубая оценка: предполагаем, что output будет примерно равен input
    const estimatedOutputTokens = estimatedTokens;
    const inputCost = (estimatedTokens / 1000000) * pricing.input;
    const outputCost = (estimatedOutputTokens / 1000000) * pricing.output;
    const predictedCost = inputCost + outputCost;

    return {
      predictedCost,
      estimatedInputTokens: estimatedTokens,
      estimatedOutputTokens
    };
  }

  /**
   * Рекомендует модель на основе бюджета и производительности
   */
  recommendModel(taskType, estimatedTokens, budgetRemaining = Infinity) {
    // Определяем доступные модели в зависимости от типа задачи
    let candidateModels = Object.keys(this.modelPricing);

    // Для рефакторинга и сложных задач предпочитаем более способные модели
    if (taskType === 'refactoring' || taskType === 'complex-analysis') {
      candidateModels = ['meta-llama/llama-3-8b-instruct', 'mistralai/mistral-7b-instruct'];
    }
    // Для коротких запросов предпочитаем дешевые модели
    else if (estimatedTokens < 100) {
      candidateModels = ['deepseek/deepseek-chat'];
    }

    // Рассчитываем эффективность для каждой кандидатской модели
    const modelScores = candidateModels.map(model => {
      const performance = this.modelPerformance[model];
      const prediction = this.predictCostForPrompt(model, estimatedTokens);

      // Оцениваем модель по нескольким критериям
      const costScore = 1 / (prediction.predictedCost + 0.0001); // чем дешевле, тем выше счет
      const speedScore = 1 / (performance.avgResponseTime / 1000 + 0.1); // чем быстрее, тем выше счет
      const reliabilityScore = performance.successRate; // чем надежнее, тем выше счет

      // Взвешиваем критерии (можно настраивать)
      const score = (costScore * 0.5) + (speedScore * 0.3) + (reliabilityScore * 0.2);

      return {
        model,
        score,
        prediction,
        performance
      };
    });

    // Сортируем по оценке
    modelScores.sort((a, b) => b.score - a.score);

    // Проверяем, укладывается ли рекомендуемая модель в бюджет
    const recommended = modelScores[0];
    if (recommended && recommended.prediction.predictedCost <= budgetRemaining) {
      return recommended;
    } else {
      // Если не укладываемся в бюджет, возвращаем самую дешевую подходящую модель
      for (const modelScore of modelScores) {
        if (modelScore.prediction.predictedCost <= budgetRemaining) {
          return modelScore;
        }
      }
      // Если ни одна модель не укладывается в бюджет, возвращаем null
      return null;
    }
  }

  /**
   * Обновляет историю использования
   */
  updateUsageHistory(requestInfo) {
    this.usageHistory.push({
      timestamp: Date.now(),
      model: requestInfo.model,
      tokensIn: requestInfo.tokensIn,
      tokensOut: requestInfo.tokensOut,
      cost: requestInfo.estimatedCost,
      duration: requestInfo.duration,
      status: requestInfo.status
    });

    // Ограничиваем размер истории
    if (this.usageHistory.length > 1000) {
      this.usageHistory.shift();
    }
  }

  /**
   * Получает статистику использования за период
   */
  getUsageStats(hoursBack = 24) {
    const timeThreshold = Date.now() - (hoursBack * 60 * 60 * 1000);
    const relevantHistory = this.usageHistory.filter(item => item.timestamp >= timeThreshold);

    if (relevantHistory.length === 0) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        avgResponseTime: 0
      };
    }

    const totalRequests = relevantHistory.length;
    const totalTokens = relevantHistory.reduce((sum, item) => sum + item.tokensIn + item.tokensOut, 0);
    const totalCost = relevantHistory.reduce((sum, item) => sum + item.cost, 0);
    const avgResponseTime = relevantHistory.reduce((sum, item) => sum + item.duration, 0) / totalRequests;

    // Распределение по моделям
    const modelDistribution = {};
    relevantHistory.forEach(item => {
      if (!modelDistribution[item.model]) {
        modelDistribution[item.model] = { count: 0, tokens: 0, cost: 0 };
      }
      modelDistribution[item.model].count++;
      modelDistribution[item.model].tokens += item.tokensIn + item.tokensOut;
      modelDistribution[item.model].cost += item.cost;
    });

    return {
      totalRequests,
      totalTokens,
      totalCost,
      avgResponseTime,
      modelDistribution
    };
  }
}