import fs from 'fs/promises';
import path from 'path';

/**
 * Расширенная система отслеживания использования и бюджетного контроля
 */
export class AdvancedUsageTracker {
  constructor(budgetLimit = null, logFilePath = './requests-log.json') {
    this.requestsLog = [];
    this.budgetLimit = budgetLimit; // в токенах
    this.currentTokensUsed = 0;
    this.logFilePath = logFilePath;
    this.initLogFile();
  }

  /**
   * Инициализирует файл лога
   */
  async initLogFile() {
    try {
      await fs.access(this.logFilePath);
    } catch (error) {
      // Файл не существует, создаем пустой массив
      await fs.writeFile(this.logFilePath, '[]', 'utf8');
    }
  }

  /**
   * Загружает существующие логи из файла
   */
  async loadLogs() {
    try {
      const content = await fs.readFile(this.logFilePath, 'utf8');
      this.requestsLog = JSON.parse(content);
      this.currentTokensUsed = this.requestsLog.reduce((sum, entry) => sum + (entry.tokensIn + entry.tokensOut), 0);
    } catch (error) {
      console.error('Error loading logs:', error);
      this.requestsLog = [];
      this.currentTokensUsed = 0;
    }
  }

  /**
   * Логирует новый запрос
   */
  async logRequest(requestInfo) {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      model: requestInfo.model,
      tokensIn: requestInfo.tokensIn || 0,
      tokensOut: requestInfo.tokensOut || 0,
      estimatedCost: requestInfo.estimatedCost || 0,
      duration: requestInfo.duration || 0,
      status: requestInfo.status || 200,
      taskType: requestInfo.taskType || 'general',
      userAgent: requestInfo.userAgent || 'unknown',
      ip: requestInfo.ip || 'unknown'
    };
    
    this.requestsLog.push(logEntry);
    
    // Обновляем количество использованных токенов
    this.currentTokensUsed += logEntry.tokensIn + logEntry.tokensOut;
    
    // Сохраняем лог в файл
    await this.saveToFile(logEntry);
    
    return logEntry;
  }

  /**
   * Сохраняет лог в файл
   */
  async saveToFile(logEntry) {
    try {
      // Читаем текущий файл
      const content = await fs.readFile(this.logFilePath, 'utf8');
      const logs = JSON.parse(content);
      
      // Добавляем новую запись
      logs.push(logEntry);
      
      // Сохраняем обратно в файл
      await fs.writeFile(this.logFilePath, JSON.stringify(logs, null, 2), 'utf8');
      
      // Также логируем в консоль
      console.log(`USAGE_LOG: ${logEntry.timestamp} | Model: ${logEntry.model} | Task: ${logEntry.taskType} | In: ${logEntry.tokensIn} | Out: ${logEntry.tokensOut} | Cost: ${logEntry.estimatedCost} | Duration: ${logEntry.duration}ms`);
    } catch (error) {
      console.error('Error saving log:', error);
    }
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
        successRate: 0,
        modelDistribution: {},
        taskTypeDistribution: {}
      };
    }

    const totalRequests = this.requestsLog.length;
    const totalTokensUsed = this.currentTokensUsed;
    const successfulRequests = this.requestsLog.filter(r => r.status < 400).length;
    const avgResponseTime = this.requestsLog.reduce((sum, r) => sum + r.duration, 0) / totalRequests;
    const successRate = (successfulRequests / totalRequests) * 100;
    
    // Распределение по моделям
    const modelDistribution = {};
    this.requestsLog.forEach(entry => {
      if (!modelDistribution[entry.model]) {
        modelDistribution[entry.model] = 0;
      }
      modelDistribution[entry.model]++;
    });
    
    // Распределение по типам задач
    const taskTypeDistribution = {};
    this.requestsLog.forEach(entry => {
      if (!taskTypeDistribution[entry.taskType]) {
        taskTypeDistribution[entry.taskType] = 0;
      }
      taskTypeDistribution[entry.taskType]++;
    });

    return {
      totalRequests,
      totalTokensUsed,
      avgResponseTime,
      successRate,
      modelDistribution,
      taskTypeDistribution
    };
  }

  /**
   * Получает исторические данные
   */
  getHistory(hoursBack = 24) {
    const timeThreshold = new Date(Date.now() - hoursBack * 60 * 60 * 1000).getTime();
    return this.requestsLog.filter(entry => new Date(entry.timestamp).getTime() > timeThreshold);
  }
  
  /**
   * Очищает старые записи из лога
   */
  async cleanupOldLogs(daysToKeep = 30) {
    const timeThreshold = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).getTime();
    this.requestsLog = this.requestsLog.filter(entry => new Date(entry.timestamp).getTime() > timeThreshold);
    
    // Перезаписываем файл с актуальными данными
    try {
      await fs.writeFile(this.logFilePath, JSON.stringify(this.requestsLog, null, 2), 'utf8');
    } catch (error) {
      console.error('Error cleaning up logs:', error);
    }
  }
}