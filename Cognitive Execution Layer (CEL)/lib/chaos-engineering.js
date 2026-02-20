/**
 * Chaos Engineering Module
 * 
 * Контролируемый хаос для тестирования устойчивости системы
 */

export class ChaosEngineering {
  constructor(options = {}) {
    // Состояние хаос-движка
    this.isActive = false;
    
    // Настройки хаоса
    this.settings = {
      chaosLevel: options.chaosLevel || 0.1, // 0.0 to 1.0
      chaosSchedule: options.chaosSchedule || 'random',
      enabledAttacks: options.enabledAttacks || [
        'random_agent_kill',
        'latency_injection',
        'graph_corruption',
        'entropy_spike',
        'resource_starvation'
      ],
      attackIntensity: options.attackIntensity || 0.5, // 0.0 to 1.0
      recoveryTime: options.recoveryTime || 30000, // 30 seconds
      monitoringWindow: options.monitoringWindow || 60000 // 60 seconds
    };
    
    // Состояние агентов
    this.agentStates = new Map();
    
    // История хаос-событий
    this.chaosEvents = [];
    
    // Статистика устойчивости
    this.resilienceStats = {
      totalChaosEvents: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      avgRecoveryTime: 0,
      resilienceScore: 0
    };
    
    // Таймеры хаос-событий
    this.chaosTimers = [];
    
    // Функции мониторинга
    this.monitoringCallbacks = [];
    
    // Текущие атаки
    this.activeAttacks = new Set();
  }

  /**
   * Регистрация агента для мониторинга
   */
  registerAgent(agentId) {
    this.agentStates.set(agentId, {
      id: agentId,
      alive: true,
      lastHeartbeat: Date.now(),
      chaosSusceptibility: Math.random() // Случайная уязвимость для хаоса
    });
    
    console.log(`🧪 Registered agent for chaos testing: ${agentId}`);
  }

  /**
   * Активация режима хаоса
   */
  activateChaos(options = {}) {
    if (this.isActive) {
      console.warn('⚠️ Chaos mode already active');
      return;
    }
    
    // Обновляем настройки, если переданы
    if (Object.keys(options).length > 0) {
      this.settings = { ...this.settings, ...options };
    }
    
    this.isActive = true;
    console.log(`💥 Activated chaos mode with level: ${this.settings.chaosLevel}`);
    
    // Запускаем хаос-события в зависимости от расписания
    if (this.settings.chaosSchedule === 'random') {
      this._scheduleRandomChaos();
    } else if (this.settings.chaosSchedule === 'periodic') {
      this._schedulePeriodicChaos();
    }
  }

  /**
   * Деактивация режима хаоса
   */
  deactivateChaos() {
    if (!this.isActive) {
      console.warn('⚠️ Chaos mode already inactive');
      return;
    }
    
    // Очищаем таймеры
    this.chaosTimers.forEach(timer => clearTimeout(timer));
    this.chaosTimers = [];
    
    this.isActive = false;
    console.log('✅ Deactivated chaos mode');
  }

  /**
   * Планирование случайных хаос-событий
   */
  _scheduleRandomChaos() {
    if (!this.isActive) return;
    
    // Случайная задержка до следующего события
    const nextEventDelay = 2000 + Math.random() * 10000; // 2-12 секунд
    
    const timer = setTimeout(() => {
      this._triggerRandomChaosEvent();
      this._scheduleRandomChaos(); // Планируем следующее событие
    }, nextEventDelay);
    
    this.chaosTimers.push(timer);
  }

  /**
   * Планирование периодических хаос-событий
   */
  _schedulePeriodicChaos() {
    if (!this.isActive) return;
    
    const interval = 10000; // Каждые 10 секунд
    
    const timer = setInterval(() => {
      this._triggerRandomChaosEvent();
    }, interval);
    
    this.chaosTimers.push(timer);
  }

  /**
   * Вызов случайного хаос-события
   */
  _triggerRandomChaosEvent() {
    if (!this.isActive) return;
    
    // Выбираем случайный тип атаки из разрешенных
    const availableAttacks = this.settings.enabledAttacks;
    if (availableAttacks.length === 0) return;
    
    const attackType = availableAttacks[
      Math.floor(Math.random() * availableAttacks.length)
    ];
    
    // Применяем атаку с вероятностью в зависимости от уровня хаоса
    if (Math.random() < this.settings.chaosLevel) {
      this._executeChaosAttack(attackType);
    }
  }

  /**
   * Выполнение атаки хаоса
   */
  _executeChaosAttack(attackType) {
    console.log(`⚡ Executing chaos attack: ${attackType}`);
    
    const eventId = `chaos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.activeAttacks.add(eventId);
    
    let attackResult;
    
    switch (attackType) {
      case 'random_agent_kill':
        attackResult = this._randomAgentKill();
        break;
        
      case 'latency_injection':
        attackResult = this._latencyInjection();
        break;
        
      case 'graph_corruption':
        attackResult = this._graphCorruption();
        break;
        
      case 'entropy_spike':
        attackResult = this._entropySpike();
        break;
        
      case 'resource_starvation':
        attackResult = this._resourceStarvation();
        break;
        
      default:
        console.warn(`⚠️ Unknown attack type: ${attackType}`);
        return;
    }
    
    // Записываем событие хаоса
    const event = {
      id: eventId,
      type: attackType,
      result: attackResult,
      timestamp: Date.now(),
      intensity: this.settings.attackIntensity
    };
    
    this.chaosEvents.push(event);
    
    // Ограничиваем историю
    if (this.chaosEvents.length > 1000) {
      this.chaosEvents = this.chaosEvents.slice(-1000);
    }
    
    this.resilienceStats.totalChaosEvents++;
    
    // Запускаем мониторинг восстановления
    this._monitorRecovery(eventId, attackType);
    
    // Вызываем коллбэки мониторинга
    this.monitoringCallbacks.forEach(callback => {
      callback(event);
    });
  }

  /**
   * Убийство случайного агента
   */
  _randomAgentKill() {
    const aliveAgents = Array.from(this.agentStates.values())
      .filter(agent => agent.alive);
    
    if (aliveAgents.length === 0) {
      return { success: false, reason: 'no_alive_agents' };
    }
    
    // Выбираем случайного агента
    const agentToKill = aliveAgents[
      Math.floor(Math.random() * aliveAgents.length)
    ];
    
    // Помечаем агента как мертвого
    const agent = this.agentStates.get(agentToKill.id);
    agent.alive = false;
    agent.killTime = Date.now();
    
    console.log(`💀 Killed agent: ${agentToKill.id}`);
    
    return { success: true, target: agentToKill.id };
  }

  /**
   * Инъекция задержки в LLM
   */
  _latencyInjection() {
    // Симуляция увеличения задержки
    const latencyMs = 1000 + (this.settings.attackIntensity * 5000); // 1-6 секунд
    
    console.log(`⏱️ Injected ${latencyMs}ms latency`);
    
    // В реальной системе это повлияло бы на вызовы LLM
    
    return { success: true, latency: latencyMs };
  }

  /**
   * Коррупция графа зависимостей
   */
  _graphCorruption() {
    // В реальной системе это изменило бы граф зависимостей
    console.log('🔄 Corrupted dependency graph');
    
    return { success: true, corruptionType: 'dependency_graph' };
  }

  /**
   * Всплеск энтропии
   */
  _entropySpike() {
    // Симуляция всплеска архитектурной энтропии
    const entropyIncrease = this.settings.attackIntensity * 0.5; // до 0.5
    
    console.log(`🔥 Induced entropy spike: +${entropyIncrease.toFixed(2)}`);
    
    return { success: true, entropyIncrease };
  }

  /**
   * Голодание ресурсов
   */
  _resourceStarvation() {
    // Симуляция нехватки ресурсов
    const resourceReduction = this.settings.attackIntensity;
    
    console.log(`📉 Induced resource starvation: ${(resourceReduction * 100).toFixed(1)}% reduction`);
    
    return { success: true, resourceReduction };
  }

  /**
   * Мониторинг восстановления после атаки
   */
  _monitorRecovery(eventId, attackType) {
    setTimeout(() => {
      // Проверяем, восстановилась ли система
      const recoverySuccess = this._checkSystemRecovery();
      
      if (recoverySuccess) {
        this.resilienceStats.successfulRecoveries++;
        
        // Обновляем среднее время восстановления
        const event = this.chaosEvents.find(e => e.id === eventId);
        if (event) {
          const recoveryTime = Date.now() - event.timestamp;
          this.resilienceStats.avgRecoveryTime = 
            (this.resilienceStats.avgRecoveryTime + recoveryTime) / 2;
        }
      } else {
        this.resilienceStats.failedRecoveries++;
      }
      
      // Удаляем активную атаку
      this.activeAttacks.delete(eventId);
      
      console.log(`🔄 Recovery check for ${attackType}: ${recoverySuccess ? 'SUCCESS' : 'FAILED'}`);
    }, this.settings.recoveryTime);
  }

  /**
   * Проверка восстановления системы
   */
  _checkSystemRecovery() {
    // Простая проверка - живы ли агенты
    const aliveAgents = Array.from(this.agentStates.values())
      .filter(agent => agent.alive);
    
    // Если более 50% агентов живы, считаем, что система восстановилась
    const aliveRatio = aliveAgents.length / this.agentStates.size;
    
    return aliveRatio > 0.5;
  }

  /**
   * Восстановление случайного агента
   */
  reviveRandomAgent() {
    const deadAgents = Array.from(this.agentStates.values())
      .filter(agent => !agent.alive);
    
    if (deadAgents.length === 0) {
      return { success: false, reason: 'no_dead_agents' };
    }
    
    // Выбираем случайного мертвого агента
    const agentToRevive = deadAgents[
      Math.floor(Math.random() * deadAgents.length)
    ];
    
    // Помечаем агента как живого
    const agent = this.agentStates.get(agentToRevive.id);
    agent.alive = true;
    agent.reviveTime = Date.now();
    
    console.log(`❤️ Revived agent: ${agentToRevive.id}`);
    
    return { success: true, target: agentToRevive.id };
  }

  /**
   * Регистрация коллбэка мониторинга
   */
  onChaosEvent(callback) {
    this.monitoringCallbacks.push(callback);
  }

  /**
   * Получение статистики устойчивости
   */
  getResilienceStats() {
    return { ...this.resilienceStats };
  }

  /**
   * Получение истории хаос-событий
   */
  getChaosHistory(limit = 20) {
    return this.chaosEvents
      .slice(-limit)
      .reverse();
  }

  /**
   * Вычисление общего рейтинга устойчивости
   */
  calculateResilienceScore() {
    if (this.resilienceStats.totalChaosEvents === 0) {
      return 0;
    }
    
    const successRate = this.resilienceStats.successfulRecoveries / 
                       this.resilienceStats.totalChaosEvents;
    
    // Учитываем также среднее время восстановления (чем быстрее, тем лучше)
    const avgRecoveryTimeScore = this.resilienceStats.avgRecoveryTime > 0 ?
      Math.max(0, 1 - (this.resilienceStats.avgRecoveryTime / 60000)) : 1; // нормализуем к 1 минуте
    
    const resilienceScore = (successRate * 0.7) + (avgRecoveryTimeScore * 0.3);
    
    this.resilienceStats.resilienceScore = resilienceScore;
    
    return resilienceScore;
  }

  /**
   * Запуск сессии хаос-тестирования
   */
  async runChaosSession(durationMs = 300000) { // 5 минут по умолчанию
    console.log(`🚀 Starting chaos session for ${durationMs}ms`);
    
    this.activateChaos();
    
    await new Promise(resolve => setTimeout(resolve, durationMs));
    
    this.deactivateChaos();
    
    const score = this.calculateResilienceScore();
    console.log(`🎯 Chaos session completed. Resilience Score: ${score.toFixed(2)}`);
    
    return {
      resilienceScore: score,
      stats: this.getResilienceStats(),
      events: this.getChaosHistory(10)
    };
  }

  /**
   * Получение информации о хаос-движке
   */
  getChaosEngineInfo() {
    return {
      isActive: this.isActive,
      settings: { ...this.settings },
      totalAgents: this.agentStates.size,
      aliveAgents: Array.from(this.agentStates.values()).filter(a => a.alive).length,
      totalChaosEvents: this.chaosEvents.length,
      activeAttacks: this.activeAttacks.size
    };
  }
}