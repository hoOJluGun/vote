/**
 * Математическая модель оценки решений
 */

/**
 * Модель оценки решения
 */
export class SolutionEvaluationModel {
  constructor() {
    // Весовые коэффициенты (в сумме должны равняться 1)
    this.weights = {
      correctness: 0.30,    // корректность
      quality: 0.20,        // качество (читаемость, структура, стиль)
      timeEfficiency: 0.15, // эффективность по времени
      effectiveness: 0.20,  // эффективность (производительность, ресурсы)
      security: 0.15        // безопасность
    };
    
    // Исторические данные
    this.historicalData = [];
    
    // Параметры для адаптивных весов
    this.learningRate = 0.01;
  }

  /**
   * Оценить решение
   */
  evaluateSolution(solution) {
    const {
      correctness,
      quality,
      timeTaken, // в миллисекундах
      effectiveness,
      security
    } = solution;
    
    // Нормализуем время (меньше время - выше оценка)
    const timeScore = this.normalizeTimeScore(timeTaken);
    
    // Вычисляем итоговую оценку
    const score = (
      this.weights.correctness * this.normalizeScore(correctness) +
      this.weights.quality * this.normalizeScore(quality) +
      this.weights.timeEfficiency * timeScore +
      this.weights.effectiveness * this.normalizeScore(effectiveness) +
      this.weights.security * this.normalizeScore(security)
    );
    
    return {
      score,
      breakdown: {
        correctness: this.normalizeScore(correctness),
        quality: this.normalizeScore(quality),
        timeEfficiency: timeScore,
        effectiveness: this.normalizeScore(effectiveness),
        security: this.normalizeScore(security)
      }
    };
  }

  /**
   * Нормализовать оценку к диапазону [0, 1]
   */
  normalizeScore(score) {
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Нормализовать временную оценку (меньше время - выше оценка)
   */
  normalizeTimeScore(timeTaken) {
    // Используем экспоненциальное затухание: чем меньше время, тем выше оценка
    // Базовое время: 1 секунда = 0.5 балла
    const baseTime = 1000; // 1 секунда
    const normalized = Math.exp(-timeTaken / baseTime);
    return this.normalizeScore(normalized);
  }

  /**
   * Оценить корректность решения
   */
  evaluateCorrectness(solution) {
    const { testSuccess, modelValidation, requirementAdherence } = solution;
    
    // Усредняем три компонента корректности
    const correctness = (
      (testSuccess || 0) +
      (modelValidation || 0) +
      (requirementAdherence || 0)
    ) / 3;
    
    return correctness;
  }

  /**
   * Оценить качество решения
   */
  evaluateQuality(solution) {
    const { readability, solidPrinciples, documentation, codingStyle } = solution;
    
    // Усредняем четыре компонента качества
    const quality = (
      (readability || 0) +
      (solidPrinciples || 0) +
      (documentation || 0) +
      (codingStyle || 0)
    ) / 4;
    
    return quality;
  }

  /**
   * Оценить эффективность решения
   */
  evaluateEffectiveness(solution) {
    const { performance, memoryUsage, resourceUtilization } = solution;
    
    // Усредняем три компонента эффективности
    const effectiveness = (
      (performance || 0) +
      (memoryUsage ? 1 - memoryUsage : 0.5) + // чем меньше использование памяти, тем лучше
      (resourceUtilization || 0)
    ) / 3;
    
    return effectiveness;
  }

  /**
   * Оценить безопасность решения
   */
  evaluateSecurity(solution) {
    const { vulnerabilityCount, maxVulnerabilityCount = 10 } = solution;
    
    // Безопасность = 1 - (кол-во уязвимостей / макс. возможное кол-во)
    const security = 1 - (vulnerabilityCount || 0) / maxVulnerabilityCount;
    
    return Math.max(0, security); // не ниже 0
  }

  /**
   * Оценить архитектурную согласованность
   */
  evaluateArchitecturalConsistency(solution) {
    const { architectureAdherence, cohesion, decoupling } = solution;
    
    const consistency = (
      (architectureAdherence || 0) +
      (cohesion || 0) +
      (decoupling || 0)
    ) / 3;
    
    return consistency;
  }

  /**
   * Оценить влияние на систему
   */
  evaluateSystemImpact(solution) {
    const { affectedComponents, totalComponents } = solution;
    
    // Влияние = 1 - (затронутые компоненты / всего компонентов)
    const impact = 1 - (affectedComponents || 0) / (totalComponents || 1);
    
    return Math.max(0, impact); // не ниже 0
  }

  /**
   * Сравнить два решения
   */
  compareSolutions(solution1, solution2) {
    const score1 = this.evaluateSolution(solution1);
    const score2 = this.evaluateSolution(solution2);
    
    return {
      winner: score1.score >= score2.score ? 'solution1' : 'solution2',
      score1: score1.score,
      score2: score2.score,
      difference: Math.abs(score1.score - score2.score),
      breakdown1: score1.breakdown,
      breakdown2: score2.breakdown
    };
  }

  /**
   * Ранжировать решения
   */
  rankSolutions(solutions) {
    return solutions
      .map((solution, index) => ({
        solution,
        index,
        score: this.evaluateSolution(solution).score
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Обновить веса на основе исторических данных
   */
  updateWeights(feedback) {
    // feedback: { solution, actualOutcome, expectedOutcome, successIndicator }
    
    // Добавляем в исторические данные
    this.historicalData.push(feedback);
    
    // Ограничиваем размер истории (последние 100 записей)
    if (this.historicalData.length > 100) {
      this.historicalData = this.historicalData.slice(-100);
    }
    
    // Простая адаптация весов на основе ошибок прогноза
    if (this.historicalData.length >= 10) {
      this.adaptWeights();
    }
  }

  /**
   * Адаптировать веса на основе исторических данных
   */
  adaptWeights() {
    // Вычисляем ошибки для каждого веса
    const weightErrors = {
      correctness: 0,
      quality: 0,
      timeEfficiency: 0,
      effectiveness: 0,
      security: 0
    };
    
    let totalSamples = 0;
    
    for (const record of this.historicalData) {
      const predictedScore = this.evaluateSolution(record.solution).score;
      const actualOutcome = record.successIndicator || 0;
      
      // Ошибка прогноза
      const error = Math.abs(predictedScore - actualOutcome);
      
      // Вычисляем вклад каждого веса в ошибку
      const breakdown = this.evaluateSolution(record.solution).breakdown;
      
      weightErrors.correctness += error * breakdown.correctness;
      weightErrors.quality += error * breakdown.quality;
      weightErrors.timeEfficiency += error * breakdown.timeEfficiency;
      weightErrors.effectiveness += error * breakdown.effectiveness;
      weightErrors.security += error * breakdown.security;
      
      totalSamples++;
    }
    
    if (totalSamples > 0) {
      // Нормализуем ошибки
      for (const key in weightErrors) {
        weightErrors[key] /= totalSamples;
      }
      
      // Обновляем веса пропорционально ошибкам
      const totalError = Object.values(weightErrors).reduce((sum, err) => sum + err, 0);
      
      if (totalError > 0) {
        // Уменьшаем вес для компонентов с высокой ошибкой
        for (const key in this.weights) {
          const errorRatio = weightErrors[key] / totalError;
          this.weights[key] -= this.learningRate * errorRatio;
        }
        
        // Нормализуем веса обратно к сумме 1
        this.normalizeWeights();
      }
    }
  }

  /**
   * Нормализовать веса к сумме 1
   */
  normalizeWeights() {
    const totalWeight = Object.values(this.weights).reduce((sum, w) => sum + w, 0);
    
    for (const key in this.weights) {
      this.weights[key] /= totalWeight;
    }
  }

  /**
   * Предсказать вероятность успеха
   */
  predictSuccessProbability(goal, model, strategy) {
    // На основе исторических данных
    const relevantHistory = this.historicalData.filter(h => 
      h.goal === goal && h.model === model && h.strategy === strategy
    );
    
    if (relevantHistory.length === 0) {
      // Если нет исторических данных, возвращаем среднюю вероятность
      return 0.5;
    }
    
    // Вычисляем среднюю успешность для этой триады
    const successRate = relevantHistory.reduce((sum, h) => sum + (h.successIndicator || 0), 0) / 
                       relevantHistory.length;
    
    // Взвешиваем с недавними результатами (экспоненциальное сглаживание)
    const recentResults = relevantHistory.slice(-5); // последние 5 результатов
    const recentAverage = recentResults.reduce((sum, h) => sum + (h.successIndicator || 0), 0) / 
                         Math.max(1, recentResults.length);
    
    // Комбинируем общую и недавнюю статистику (0.7 к общей, 0.3 к недавней)
    return 0.7 * successRate + 0.3 * recentAverage;
  }

  /**
   * Получить текущие веса
   */
  getCurrentWeights() {
    return { ...this.weights };
  }

  /**
   * Установить новые веса
   */
  setWeights(newWeights) {
    const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    
    if (Math.abs(total - 1.0) > 0.001) {
      throw new Error(`Weights must sum to 1.0, got ${total}`);
    }
    
    this.weights = { ...newWeights };
  }
}