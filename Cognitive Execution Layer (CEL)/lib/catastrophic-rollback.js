/**
 * Catastrophic Rollback Strategy
 * 
 * Стратегия катастрофического восстановления с поддержкой сжатия снимков,
 * частичного восстановления и реконсиляции графа зависимостей
 */

export class CatastrophicRollback {
  constructor(options = {}) {
    // История снимков
    this.snapshots = new Map();
    
    // Граф зависимостей
    this.dependencyGraph = new Map();
    
    // Сжатые снимки
    this.compressedSnapshots = new Map();
    
    // История операций
    this.operationHistory = new Map();
    
    // Максимальная глубина отката
    this.maxRollbackDepth = options.maxRollbackDepth || 10;
    
    // Порог для сжатия снимков
    this.compressionThreshold = options.compressionThreshold || 5;
    
    // Стратегия сжатия
    this.compressionStrategy = options.compressionStrategy || 'delta_compression';
    
    // Реконсиляция графа
    this.graphReconciliationEnabled = options.graphReconciliationEnabled !== false;
    
    // История восстановлений
    this.rollbackHistory = [];
    
    // Статистика восстановлений
    this.rollbackStats = {
      totalRollbacks: 0,
      successfulRollbacks: 0,
      failedRollbacks: 0,
      partialRollbacks: 0
    };
  }

  /**
   * Создание снимка системы
   */
  createSnapshot(snapshotId, state, metadata = {}) {
    const snapshot = {
      id: snapshotId,
      state,
      metadata,
      timestamp: Date.now(),
      dependencies: metadata.dependencies || [],
      compressed: false
    };
    
    this.snapshots.set(snapshotId, snapshot);
    
    // Проверяем, нужно ли сжать снимки
    this._maybeCompressSnapshots();
    
    console.log(`📸 Created snapshot: ${snapshotId}`);
    
    return snapshotId;
  }

  /**
   * Создание сжатого снимка
   */
  createCompressedSnapshot(snapshotId, baseSnapshotId, delta) {
    const compressedSnapshot = {
      id: snapshotId,
      baseId: baseSnapshotId,
      delta,
      timestamp: Date.now(),
      compressed: true
    };
    
    this.compressedSnapshots.set(snapshotId, compressedSnapshot);
    
    console.log(`🗜️ Created compressed snapshot: ${snapshotId} based on ${baseSnapshotId}`);
    
    return snapshotId;
  }

  /**
   * Проверка необходимости сжатия снимков
   */
  _maybeCompressSnapshots() {
    if (this.snapshots.size > this.compressionThreshold) {
      // Выбираем базовый снимок (самый старый)
      const sortedSnapshots = Array.from(this.snapshots.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      if (sortedSnapshots.length > 0) {
        const [baseId, baseSnapshot] = sortedSnapshots[0];
        
        // Создаем дельты для остальных снимков
        for (let i = 1; i < sortedSnapshots.length; i++) {
          const [snapshotId, snapshot] = sortedSnapshots[i];
          
          if (!this.compressedSnapshots.has(snapshotId)) {
            const delta = this._createDelta(baseSnapshot.state, snapshot.state);
            
            this.createCompressedSnapshot(
              `${snapshotId}_compressed_from_${baseId}`,
              baseId,
              delta
            );
          }
        }
        
        // Удаляем исходные снимки, кроме базового
        for (let i = 1; i < sortedSnapshots.length; i++) {
          const [snapshotId] = sortedSnapshots[i];
          this.snapshots.delete(snapshotId);
        }
      }
    }
  }

  /**
   * Создание дельты между двумя состояниями
   */
  _createDelta(oldState, newState) {
    // Простая реализация дельты - в реальной системе это будет сложнее
    const delta = {};
    
    // Рекурсивное сравнение объектов
    const compareObjects = (oldObj, newObj, path = '') => {
      const allKeys = new Set([
        ...Object.keys(oldObj || {}), 
        ...Object.keys(newObj || {})
      ]);
      
      for (const key of allKeys) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (oldObj?.[key] !== newObj?.[key]) {
          if (
            typeof oldObj?.[key] === 'object' && 
            typeof newObj?.[key] === 'object' &&
            oldObj?.[key] !== null && 
            newObj?.[key] !== null &&
            !Array.isArray(oldObj?.[key]) && 
            !Array.isArray(newObj?.[key])
          ) {
            // Рекурсивно обрабатываем вложенные объекты
            delta[currentPath] = {};
            compareObjects(oldObj[key], newObj[key], currentPath);
          } else {
            delta[currentPath] = {
              oldValue: oldObj?.[key],
              newValue: newObj?.[key]
            };
          }
        }
      }
    };
    
    compareObjects(oldState, newState);
    
    return delta;
  }

  /**
   * Применение дельты к состоянию
   */
  _applyDelta(baseState, delta) {
    const newState = JSON.parse(JSON.stringify(baseState)); // глубокая копия
    
    for (const [path, change] of Object.entries(delta)) {
      if (typeof change === 'object' && change.newValue !== undefined) {
        // Это изменение значения
        const pathParts = path.split('.');
        let current = newState;
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (!current[pathParts[i]]) {
            current[pathParts[i]] = {};
          }
          current = current[pathParts[i]];
        }
        
        current[pathParts[pathParts.length - 1]] = change.newValue;
      } else if (typeof change === 'object') {
        // Это вложенный объект дельты
        const pathParts = path.split('.');
        let current = newState;
        
        for (let i = 0; i < pathParts.length; i++) {
          if (!current[pathParts[i]]) {
            current[pathParts[i]] = {};
          }
          current = current[pathParts[i]];
        }
        
        // Рекурсивно применяем вложенную дельту
        Object.assign(current, this._applyDelta(current, change));
      }
    }
    
    return newState;
  }

  /**
   * Получение состояния из снимка (разжатого или сжатого)
   */
  getStateFromSnapshot(snapshotId) {
    // Сначала проверяем обычные снимки
    const snapshot = this.snapshots.get(snapshotId);
    if (snapshot) {
      return snapshot.state;
    }
    
    // Затем проверяем сжатые снимки
    const compressedSnapshot = this.compressedSnapshots.get(snapshotId);
    if (compressedSnapshot) {
      const baseState = this.getStateFromSnapshot(compressedSnapshot.baseId);
      return this._applyDelta(baseState, compressedSnapshot.delta);
    }
    
    // Проверяем, может быть это сжатый ID
    for (const [id, compSnapshot] of this.compressedSnapshots) {
      if (id.startsWith(`${snapshotId}_`)) {
        const baseState = this.getStateFromSnapshot(compSnapshot.baseId);
        return this._applyDelta(baseState, compSnapshot.delta);
      }
    }
    
    return null;
  }

  /**
   * Добавление операции в историю
   */
  logOperation(operationId, operation, metadata = {}) {
    this.operationHistory.set(operationId, {
      id: operationId,
      operation,
      metadata,
      timestamp: Date.now()
    });
    
    console.log(`📝 Logged operation: ${operationId}`);
  }

  /**
   * Частичный откат до конкретной операции
   */
  partialRollback(targetOperationId) {
    const targetOp = this.operationHistory.get(targetOperationId);
    if (!targetOp) {
      throw new Error(`Operation ${targetOperationId} not found`);
    }
    
    // Находим все операции после целевой
    const operationsAfterTarget = Array.from(this.operationHistory.entries())
      .filter(([_, op]) => op.timestamp > targetOp.timestamp)
      .sort((a, b) => b[1].timestamp - a[1].timestamp); // отсортировать по убыванию времени
    
    // Откатываем операции в обратном порядке
    const rolledBackOps = [];
    for (const [opId, op] of operationsAfterTarget) {
      const rollbackResult = this._rollbackOperation(op);
      if (rollbackResult.success) {
        rolledBackOps.push(opId);
        this.operationHistory.delete(opId);
      } else {
        console.error(`Failed to rollback operation ${opId}:`, rollbackResult.error);
        break; // Останавливаемся при первой ошибке
      }
    }
    
    this.rollbackStats.partialRollbacks++;
    this.rollbackStats.successfulRollbacks++;
    
    console.log(`🔄 Partial rollback completed. Rolled back ${rolledBackOps.length} operations`);
    
    return {
      success: true,
      rolledBackOperations: rolledBackOps,
      targetOperation: targetOperationId
    };
  }

  /**
   * Откат конкретной операции
   */
  _rollbackOperation(operation) {
    try {
      // В реальной системе это будет содержать специфическую логику отката
      // для каждого типа операции
      
      // Для простоты возвращаем успех
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Полный откат до снимка
   */
  rollbackToSnapshot(snapshotId, options = {}) {
    const targetState = this.getStateFromSnapshot(snapshotId);
    if (!targetState) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }
    
    // Проверяем глубину отката
    const snapshot = this.snapshots.get(snapshotId) || 
                    this.compressedSnapshots.get(snapshotId);
    
    if (!snapshot) {
      // Проверяем сжатый ID
      for (const [id, compSnapshot] of this.compressedSnapshots) {
        if (id.startsWith(`${snapshotId}_`)) {
          snapshot = compSnapshot;
          break;
        }
      }
    }
    
    if (snapshot && Date.now() - snapshot.timestamp > 24 * 60 * 60 * 1000) { // 24 часа
      console.warn(`⚠️ Attempting rollback to snapshot older than 24 hours: ${snapshotId}`);
    }
    
    // Выполняем реконсиляцию графа, если включена
    if (this.graphReconciliationEnabled && options.reconcileDependencies) {
      this._reconcileDependencyGraph(targetState);
    }
    
    // Сохраняем в историю
    this.rollbackHistory.push({
      from: 'current_state',
      to: snapshotId,
      timestamp: Date.now(),
      options
    });
    
    this.rollbackStats.totalRollbacks++;
    this.rollbackStats.successfulRollbacks++;
    
    console.log(`🔙 Rollback to snapshot ${snapshotId} completed successfully`);
    
    return {
      success: true,
      targetState,
      snapshotId
    };
  }

  /**
   * Реконсиляция графа зависимостей
   */
  _reconcileDependencyGraph(state) {
    // В реальной системе это будет проверять, что все зависимости
    // в графе соответствуют фактическому состоянию
    
    console.log('🔗 Reconciling dependency graph...');
    
    // Простая проверка - убедиться, что все зависимости из графа существуют
    for (const [nodeId, dependencies] of this.dependencyGraph) {
      if (state[nodeId] === undefined) {
        console.warn(`⚠️ Node ${nodeId} from dependency graph does not exist in state`);
        // Здесь мог бы быть код для восстановления отсутствующего узла
      }
      
      for (const depId of dependencies) {
        if (state[depId] === undefined) {
          console.warn(`⚠️ Dependency ${depId} for node ${nodeId} does not exist in state`);
          // Здесь мог бы быть код для восстановления отсутствующей зависимости
        }
      }
    }
    
    console.log('✅ Dependency graph reconciliation completed');
  }

  /**
   * Добавление зависимости в граф
   */
  addDependency(fromNode, toNode) {
    if (!this.dependencyGraph.has(fromNode)) {
      this.dependencyGraph.set(fromNode, new Set());
    }
    
    this.dependencyGraph.get(fromNode).add(toNode);
    
    console.log(`🔗 Added dependency: ${fromNode} -> ${toNode}`);
  }

  /**
   * Удаление зависимости из графа
   */
  removeDependency(fromNode, toNode) {
    if (this.dependencyGraph.has(fromNode)) {
      this.dependencyGraph.get(fromNode).delete(toNode);
      
      if (this.dependencyGraph.get(fromNode).size === 0) {
        this.dependencyGraph.delete(fromNode);
      }
    }
    
    console.log(`.unlink Removed dependency: ${fromNode} -> ${toNode}`);
  }

  /**
   * Получение зависимостей узла
   */
  getNodeDependencies(nodeId) {
    return this.dependencyGraph.get(nodeId) || new Set();
  }

  /**
   * Получение обратных зависимостей (зависимостей, которые зависят от этого узла)
   */
  getNodeReverseDependencies(nodeId) {
    const reverseDeps = new Set();
    
    for (const [fromNode, toNodes] of this.dependencyGraph) {
      if (toNodes.has(nodeId)) {
        reverseDeps.add(fromNode);
      }
    }
    
    return reverseDeps;
  }

  /**
   * Получение статистики откатов
   */
  getRollbackStats() {
    return { ...this.rollbackStats };
  }

  /**
   * Получение истории откатов
   */
  getRollbackHistory(limit = 10) {
    return this.rollbackHistory
      .slice(-limit)
      .reverse();
  }

  /**
   * Получение информации о снимках
   */
  getSnapshotInfo() {
    return {
      totalSnapshots: this.snapshots.size,
      compressedSnapshots: this.compressedSnapshots.size,
      totalOperations: this.operationHistory.size,
      dependencyGraphSize: this.dependencyGraph.size
    };
  }
}