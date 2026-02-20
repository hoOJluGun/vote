/**
 * Система отслеживания использования и бюджетного контроля
 */
export class UsageTracker {
  constructor(budgetLimit = null) {
    this.requestsLog = [];
    this.budgetLimit = budgetLimit; // в токенах
    this.currentTokensUsed = 0;
  }

  /**
   * Логирует новый запрос
   */
  logRequest(requestInfo) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      model: requestInfo.model,
      tokensIn: requestInfo.tokensIn || 0,
      tokensOut: requestInfo.tokensOut || 0,
      estimatedCost: requestInfo.estimatedCost || 0,
      duration: requestInfo.duration || 0,
      status: requestInfo.status || 200
    };
    
    this.requestsLog.push(logEntry);
    
    // Обновляем количество использованных токенов
    this.currentTokensUsed += logEntry.tokensIn + logEntry.tokensOut;
    
    // Сохраняем лог в файл
    this.saveToFile(logEntry);
    
    return logEntry;
  }

  /**
   * Проверяет, не превышает ли использование лимит
   */
  isWithinBudget() {
    if (!this.budgetLimit) return true;
    return this.currentTokensUsed < this.budgetLimit;
  }

  /**
   * Определяет, нужно ли отключить прокси из-за превышения бюджета
   */
  shouldDisableProxy() {
    return this.budgetLimit && this.currentTokensUsed >= this.budgetLimit;
  }

  /**
   * Возвращает статистику использования
   */
  getUsageStats() {
    if (this.requestsLog.length === 0) {
      return {
        totalRequests: 0,
        totalTokensUsed: 0,
        avgResponseTime: 0,
        successRate: 0
      };
    }

    const totalRequests = this.requestsLog.length;
    const totalTokensUsed = this.currentTokensUsed;
    const successfulRequests = this.requestsLog.filter(r => r.status < 400).length;
    const avgResponseTime = this.requestsLog.reduce((sum, r) => sum + r.duration, 0) / totalRequests;
    const successRate = (successfulRequests / totalRequests) * 100;

    return {
      totalRequests,
      totalTokensUsed,
      avgResponseTime,
      successRate
    };
  }

  /**
   * Сохраняет лог в файл
   */
  saveToFile(logEntry) {
    // В реальной реализации это будет запись в файл или базу данных
    // Здесь мы просто эмулируем эту логику
    
    // Для демонстрации просто логируем в консоль
    console.log(`USAGE_LOG: ${logEntry.timestamp} | Model: ${logEntry.model} | In: ${logEntry.tokensIn} | Out: ${logEntry.tokensOut} | Cost: ${logEntry.estimatedCost} | Duration: ${logEntry.duration}ms`);
  }

  /**
   * Получает исторические данные
   */
  getHistory(hoursBack = 24) {
    const timeThreshold = new Date(Date.now() - hoursBack * 60 * 60 * 1000).getTime();
    return this.requestsLog.filter(entry => new Date(entry.timestamp).getTime() > timeThreshold);
  }
}