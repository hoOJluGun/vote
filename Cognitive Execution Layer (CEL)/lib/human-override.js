/**
 * Human Override Architecture
 * 
 * Архитектура управления человеком с аварийным отключением
 */

export class HumanOverride {
  constructor(options = {}) {
    // Состояние аварийного отключения
    this.emergencyMode = false;
    
    // Время аварийного отключения
    this.emergencyStartTime = null;
    
    // Состояние заморозки архитектуры
    this.architectureFrozen = false;
    
    // Время заморозки
    this.freezeStartTime = null;
    
    // История вмешательства человека
    this.humanInterventionHistory = [];
    
    // Разрешенные действия при вмешательстве
    this.allowedEmergencyActions = new Set([
      'emergency_stop',
      'manual_rollback',
      'freeze_all_agents',
      'bypass_safety',
      'force_shutdown',
      'manual_override',
      'disable_autonomy',
      'enable_debug_mode'
    ]);
    
    // Список авторизованных операторов
    this.authorizedOperators = new Set(options.authorizedOperators || []);
    
    // Время действия заморозки
    this.freezeDuration = options.freezeDuration || 300000; // 5 минут
    
    // Таймер заморозки
    this.freezeTimer = null;
    
    // История команд
    this.commandHistory = [];
    
    // Счетчик вмешательств
    this.interventionCounter = {
      totalInterventions: 0,
      emergencyStops: 0,
      manualOverrides: 0,
      freezeActivations: 0,
      bypassSafety: 0
    };
    
    // Функция уведомления о вмешательстве
    this.onHumanIntervention = options.onHumanIntervention || (() => {});
  }

  /**
   * Добавление авторизованного оператора
   */
  addAuthorizedOperator(operatorId) {
    this.authorizedOperators.add(operatorId);
    console.log(`👤 Added authorized operator: ${operatorId}`);
  }

  /**
   * Удаление авторизованного оператора
   */
  removeAuthorizedOperator(operatorId) {
    this.authorizedOperators.delete(operatorId);
    console.log(`👤 Removed authorized operator: ${operatorId}`);
  }

  /**
   * Проверка авторизации оператора
   */
  isOperatorAuthorized(operatorId) {
    return this.authorizedOperators.has(operatorId);
  }

  /**
   * Аварийная остановка системы
   */
  emergencyStop(operatorId, reason = 'Unknown reason') {
    if (!this.isOperatorAuthorized(operatorId)) {
      throw new Error(`Unauthorized emergency stop attempt by operator: ${operatorId}`);
    }
    
    this.emergencyMode = true;
    this.emergencyStartTime = Date.now();
    
    const intervention = {
      id: `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'emergency_stop',
      operatorId,
      reason,
      timestamp: Date.now()
    };
    
    this.humanInterventionHistory.push(intervention);
    this.interventionCounter.totalInterventions++;
    this.interventionCounter.emergencyStops++;
    
    // Ограничиваем историю
    if (this.humanInterventionHistory.length > 1000) {
      this.humanInterventionHistory = this.humanInterventionHistory.slice(-1000);
    }
    
    console.log(`🚨 EMERGENCY STOP ACTIVATED by ${operatorId}: ${reason}`);
    
    // Вызываем коллбэк
    this.onHumanIntervention(intervention);
    
    return intervention.id;
  }

  /**
   * Отмена аварийной остановки
   */
  cancelEmergencyStop(operatorId) {
    if (!this.isOperatorAuthorized(operatorId)) {
      throw new Error(`Unauthorized emergency cancel attempt by operator: ${operatorId}`);
    }
    
    if (!this.emergencyMode) {
      throw new Error('Emergency mode is not active');
    }
    
    this.emergencyMode = false;
    const duration = Date.now() - this.emergencyStartTime;
    this.emergencyStartTime = null;
    
    const intervention = {
      id: `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'cancel_emergency_stop',
      operatorId,
      previousDuration: duration,
      timestamp: Date.now()
    };
    
    this.humanInterventionHistory.push(intervention);
    
    console.log(`✅ EMERGENCY STOP CANCELLED by ${operatorId} after ${duration}ms`);
    
    // Вызываем коллбэк
    this.onHumanIntervention(intervention);
    
    return intervention.id;
  }

  /**
   * Заморозка архитектуры
   */
  freezeArchitecture(operatorId, reason = 'Unknown reason', duration = null) {
    if (!this.isOperatorAuthorized(operatorId)) {
      throw new Error(`Unauthorized freeze attempt by operator: ${operatorId}`);
    }
    
    this.architectureFrozen = true;
    this.freezeStartTime = Date.now();
    
    // Устанавливаем таймер для автоматического размораживания
    const freezeDur = duration || this.freezeDuration;
    if (this.freezeTimer) {
      clearTimeout(this.freezeTimer);
    }
    
    this.freezeTimer = setTimeout(() => {
      this.unfreezeArchitecture('system', 'Automatic unfreeze after timeout');
    }, freezeDur);
    
    const intervention = {
      id: `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'freeze_architecture',
      operatorId,
      reason,
      duration: freezeDur,
      timestamp: Date.now()
    };
    
    this.humanInterventionHistory.push(intervention);
    this.interventionCounter.totalInterventions++;
    this.interventionCounter.freezeActivations++;
    
    console.log(`❄️ ARCHITECTURE FROZEN by ${operatorId} for ${freezeDur}ms: ${reason}`);
    
    // Вызываем коллбэк
    this.onHumanIntervention(intervention);
    
    return intervention.id;
  }

  /**
   * Разморозка архитектуры
   */
  unfreezeArchitecture(operatorId, reason = 'Unknown reason') {
    if (!this.isOperatorAuthorized(operatorId) && operatorId !== 'system') {
      throw new Error(`Unauthorized unfreeze attempt by operator: ${operatorId}`);
    }
    
    if (!this.architectureFrozen) {
      throw new Error('Architecture is not frozen');
    }
    
    // Очищаем таймер
    if (this.freezeTimer) {
      clearTimeout(this.freezeTimer);
      this.freezeTimer = null;
    }
    
    const duration = Date.now() - this.freezeStartTime;
    this.architectureFrozen = false;
    this.freezeStartTime = null;
    
    const intervention = {
      id: `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'unfreeze_architecture',
      operatorId,
      reason,
      duration,
      timestamp: Date.now()
    };
    
    this.humanInterventionHistory.push(intervention);
    
    console.log(`🔥 ARCHITECTURE UNFROZEN by ${operatorId} after ${duration}ms`);
    
    // Вызываем коллбэк
    this.onHumanIntervention(intervention);
    
    return intervention.id;
  }

  /**
   * Обход системы безопасности
   */
  bypassSafety(operatorId, reason = 'Unknown reason') {
    if (!this.isOperatorAuthorized(operatorId)) {
      throw new Error(`Unauthorized safety bypass attempt by operator: ${operatorId}`);
    }
    
    const intervention = {
      id: `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'bypass_safety',
      operatorId,
      reason,
      timestamp: Date.now()
    };
    
    this.humanInterventionHistory.push(intervention);
    this.interventionCounter.totalInterventions++;
    this.interventionCounter.bypassSafety++;
    
    console.log(`⚠️ SAFETY BYPASSED by ${operatorId}: ${reason}`);
    
    // Вызываем коллбэк
    this.onHumanIntervention(intervention);
    
    return intervention.id;
  }

  /**
   * Ручная блокировка инварианта
   */
  setManualInvariantLock(operatorId, invariantName, locked = true) {
    if (!this.isOperatorAuthorized(operatorId)) {
      throw new Error(`Unauthorized invariant lock attempt by operator: ${operatorId}`);
    }
    
    const intervention = {
      id: `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'manual_invariant_lock',
      operatorId,
      invariantName,
      locked,
      timestamp: Date.now()
    };
    
    this.humanInterventionHistory.push(intervention);
    this.interventionCounter.totalInterventions++;
    
    console.log(`🔒 INVAR${locked ? 'LOCKED' : 'UNLOCKED'} by ${operatorId}: ${invariantName}`);
    
    // Вызываем коллбэк
    this.onHumanIntervention(intervention);
    
    return intervention.id;
  }

  /**
   * Ручное вмешательство в выполнение
   */
  manualOverride(operatorId, action, target, reason = 'Unknown reason') {
    if (!this.isOperatorAuthorized(operatorId)) {
      throw new Error(`Unauthorized manual override attempt by operator: ${operatorId}`);
    }
    
    if (!this.allowedEmergencyActions.has(action)) {
      throw new Error(`Action not allowed in emergency: ${action}`);
    }
    
    const intervention = {
      id: `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'manual_override',
      operatorId,
      action,
      target,
      reason,
      timestamp: Date.now()
    };
    
    this.humanInterventionHistory.push(intervention);
    this.interventionCounter.totalInterventions++;
    this.interventionCounter.manualOverrides++;
    
    console.log(`🔧 MANUAL OVERRIDE by ${operatorId}: ${action} on ${target} - ${reason}`);
    
    // Вызываем коллбэк
    this.onHumanIntervention(intervention);
    
    return intervention.id;
  }

  /**
   * Получение состояния системы управления
   */
  getControlStatus() {
    return {
      emergencyMode: this.emergencyMode,
      emergencyStartTime: this.emergencyStartTime,
      architectureFrozen: this.architectureFrozen,
      freezeStartTime: this.freezeStartTime,
      authorizedOperators: Array.from(this.authorizedOperators),
      totalInterventions: this.humanInterventionHistory.length
    };
  }

  /**
   * Проверка, разрешено ли действие
   */
  isActionAllowed(action, context = {}) {
    // В аварийном режиме разрешены только определенные действия
    if (this.emergencyMode && !action.startsWith('cancel_')) {
      return {
        allowed: false,
        reason: 'System in emergency mode, most actions disabled',
        allowedActions: ['cancel_emergency_stop']
      };
    }
    
    // При заморозке архитектуры разрешены только действия по разморозке
    if (this.architectureFrozen && action !== 'unfreeze_architecture') {
      return {
        allowed: false,
        reason: 'Architecture frozen, only unfreeze allowed',
        allowedActions: ['unfreeze_architecture']
      };
    }
    
    // Если действие в списке разрешенных, разрешаем
    if (this.allowedEmergencyActions.has(action)) {
      return {
        allowed: true,
        reason: 'Action in allowed emergency actions list'
      };
    }
    
    // В остальных случаях разрешаем
    return {
      allowed: true,
      reason: 'Action permitted under current conditions'
    };
  }

  /**
   * Получение истории вмешательства
   */
  getInterventionHistory(limit = 20) {
    return this.humanInterventionHistory
      .slice(-limit)
      .reverse();
  }

  /**
   * Получение статистики вмешательства
   */
  getInterventionStats() {
    return { ...this.interventionCounter };
  }

  /**
   * Получение последнего вмешательства
   */
  getLastIntervention() {
    if (this.humanInterventionHistory.length === 0) {
      return null;
    }
    
    return this.humanInterventionHistory[this.humanInterventionHistory.length - 1];
  }

  /**
   * Логирование команды
   */
  logCommand(command, operatorId, result) {
    const commandRecord = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      command,
      operatorId,
      result,
      timestamp: Date.now()
    };
    
    this.commandHistory.push(commandRecord);
    
    // Ограничиваем историю
    if (this.commandHistory.length > 1000) {
      this.commandHistory = this.commandHistory.slice(-1000);
    }
    
    return commandRecord.id;
  }

  /**
   * Получение истории команд
   */
  getCommandHistory(limit = 20) {
    return this.commandHistory
      .slice(-limit)
      .reverse();
  }

  /**
   * Получение информации о системе управления человеком
   */
  getHumanOverrideInfo() {
    return {
      emergencyMode: this.emergencyMode,
      architectureFrozen: this.architectureFrozen,
      authorizedOperators: Array.from(this.authorizedOperators),
      totalInterventions: this.interventionCounter.totalInterventions,
      allowedEmergencyActions: Array.from(this.allowedEmergencyActions),
      freezeDuration: this.freezeDuration
    };
  }
}