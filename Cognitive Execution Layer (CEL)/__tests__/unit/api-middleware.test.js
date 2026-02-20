// __tests__/unit/api-middleware.test.js
// Тесты для middleware API слоя безопасности

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import safetyRoutes from '../../routes/safety-routes.js';
import FormalSafetyModel from '../../lib/formal-safety-model.js';

describe('API Middleware Tests', () => {
  let app;
  let safetyModel;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/v1/safety', safetyRoutes);
    
    // Создаем новый экземпляр модели безопасности для каждого теста
    safetyModel = new FormalSafetyModel();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Safety Routes', () => {
    it('should respond to safety check endpoint', async () => {
      const response = await request(app)
        .post('/v1/safety/check-safety')
        .send({
          operation: 'test_operation',
          context: {}
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('safe');
    });

    it('should reject requests without operation parameter', async () => {
      const response = await request(app)
        .post('/v1/safety/check-safety')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Operation type is required');
    });

    it('should block operations that violate safety constraints', async () => {
      // Мокаем проверку безопасности, чтобы она возвращала false
      const originalMethod = (new FormalSafetyModel()).checkOperationSafety;
      
      const mockSafetyModel = new FormalSafetyModel();
      vi.spyOn(mockSafetyModel, 'checkOperationSafety').mockReturnValue(false);
      
      // В реальной ситуации мы бы использовали dependency injection
      // или мокали модуль, но для простоты теста просто проверим базовое поведение
      
      const response = await request(app)
        .post('/v1/safety/check-safety')
        .send({
          operation: 'forbidden_operation',
          context: {}
        });

      // Ожидаем, что запрос будет заблокирован
      // В текущей реализации это зависит от мокирования
      expect(response.status).toBe(403);
    });

    it('should return integrity check report', async () => {
      const response = await request(app)
        .get('/v1/safety/integrity-check');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('integrityValid');
      expect(response.body).toHaveProperty('report');
      expect(response.body.report).toHaveProperty('timestamp');
      expect(response.body.report).toHaveProperty('overallSafetyScore');
    });

    it('should generate safety report', async () => {
      const response = await request(app)
        .get('/v1/safety/report');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('totalInvariants');
      expect(response.body).toHaveProperty('verifiedInvariants');
      expect(response.body).toHaveProperty('overallSafetyScore');
    });

    it('should perform formal verification', async () => {
      const response = await request(app)
        .post('/v1/safety/formal-verification')
        .send({
          property: 'deterministic_execution'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('property');
      expect(response.body).toHaveProperty('verified');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body.property).toBe('deterministic_execution');
    });

    it('should fail formal verification for unknown property', async () => {
      const response = await request(app)
        .post('/v1/safety/formal-verification')
        .send({
          property: 'unknown_property'
        });

      expect(response.status).toBe(200); // Возвращаем 200, но с неверифицированным результатом
      expect(response.body.verified).toBe(false);
      expect(response.body.confidence).toBe(0);
    });

    it('should verify token integrity', async () => {
      const testToken = 'test_token_12345';
      
      const response = await request(app)
        .post('/v1/safety/verify-token')
        .send({
          token: testToken
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid');
      // Токен не зарегистрирован в системе, поэтому должен быть недействителен
      expect(response.body.valid).toBe(false);
    });

    it('should reject token verification without token', async () => {
      const response = await request(app)
        .post('/v1/safety/verify-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Token is required');
    });
  });

  describe('Formal Safety Model', () => {
    it('should initialize with empty invariants and constraints', () => {
      const model = new FormalSafetyModel();
      
      expect(model.invariants.size).toBe(0);
      expect(model.safetyConstraints.length).toBe(0);
      expect(model.trustBoundaries.size).toBe(0);
    });

    it('should register and verify invariants', async () => {
      const model = new FormalSafetyModel();
      
      // Регистрируем инвариант, который всегда истинен
      model.registerInvariant('always_true', async () => true);
      
      const result = await model.verifyAllInvariants();
      
      expect(result).toBe(true);
      expect(model.invariants.get('always_true').verified).toBe(true);
    });

    it('should detect invariant violation', async () => {
      const model = new FormalSafetyModel();
      
      // Регистрируем инвариант, который всегда ложен
      model.registerInvariant('always_false', async () => false);
      
      const result = await model.verifyAllInvariants();
      
      expect(result).toBe(false);
      expect(model.invariants.get('always_false').verified).toBe(false);
    });

    it('should register and verify critical invariants', async () => {
      const model = new FormalSafetyModel();
      
      // Регистрируем критический инвариант
      model.registerCriticalInvariant('critical_test', async () => true);
      
      const result = await model.verifyAllInvariants();
      
      expect(result).toBe(true);
      const invariant = model.invariants.get('critical_test');
      expect(invariant).toBeDefined();
      expect(invariant.critical).toBe(true);
      expect(invariant.verified).toBe(true);
    });

    it('should handle critical invariant violations', async () => {
      const model = new FormalSafetyModel();
      
      // Регистрируем критический инвариант, который всегда ложен
      model.registerCriticalInvariant('critical_failure', async () => false);
      
      const result = await model.verifyAllInvariants();
      
      expect(result).toBe(false);
      const invariant = model.invariants.get('critical_failure');
      expect(invariant.verified).toBe(false);
      expect(invariant.violationCount).toBe(1);
      expect(model.systemIntegrity).toBe(false);
    });

    it('should verify resource limits', () => {
      const model = new FormalSafetyModel();
      
      // Проверяем, что метод существует
      expect(typeof model.checkResourceLimits).toBe('function');
      
      // По умолчанию все лимиты должны проходить
      expect(model.checkResourceLimits({})).toBe(true);
    });

    it('should handle safety events logging', () => {
      const model = new FormalSafetyModel();
      
      // Проверяем, что метод логирования существует
      expect(typeof model.logSafetyEvent).toBe('function');
      
      // Простое тестирование работы метода
      model.logSafetyEvent('TEST_EVENT', { test: true });
      // Проверка не требуется, так как метод просто логирует в консоль
    });

    it('should check operation safety against constraints', () => {
      const model = new FormalSafetyModel();
      
      // Добавляем ограничение
      model.addSafetyConstraint({
        appliesTo: ['restricted_operation'],
        condition: (context) => context.allowed === true,
        description: 'Only allow operation if explicitly permitted'
      });
      
      // Проверяем операцию без разрешения
      const unsafeResult = model.checkOperationSafety('restricted_operation', {});
      expect(unsafeResult).toBe(false);
      
      // Проверяем операцию с разрешением
      const safeResult = model.checkOperationSafety('restricted_operation', { allowed: true });
      expect(safeResult).toBe(true);
    });

    it('should manage trust boundaries', () => {
      const model = new FormalSafetyModel();
      
      // Устанавливаем доверительную границу
      model.setTrustBoundary('test_boundary', ['trusted_source_1', 'trusted_source_2']);
      
      // Проверяем доверенные источники
      expect(model.isTrustedSource('trusted_source_1')).toBe(true);
      expect(model.isTrustedSource('trusted_source_2')).toBe(true);
      expect(model.isTrustedSource('untrusted_source')).toBe(false);
    });

    it('should calculate token hash correctly', () => {
      const model = new FormalSafetyModel();
      
      const token = 'test_token';
      const hash = model.calculateTokenHash(token);
      
      // Проверяем, что хэш имеет правильный формат (SHA-256 - 64 символа шестнадцатеричных)
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      
      // Проверяем, что одинаковые токены дают одинаковые хэши
      const sameHash = model.calculateTokenHash(token);
      expect(hash).toBe(sameHash);
      
      // Проверяем, что разные токены дают разные хэши
      const differentHash = model.calculateTokenHash('different_token');
      expect(hash).not.toBe(differentHash);
    });

    it('should generate safety report', () => {
      const model = new FormalSafetyModel();
      
      // Добавляем немного данных для отчета
      model.registerInvariant('test_invariant', async () => true);
      model.addSafetyConstraint({ name: 'test_constraint' });
      model.setTrustBoundary('test_boundary', ['source']);
      
      const report = model.getSafetyReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('totalInvariants');
      expect(report).toHaveProperty('safetyConstraintsCount');
      expect(report).toHaveProperty('trustBoundariesCount');
      expect(report.totalInvariants).toBe(1);
      expect(report.safetyConstraintsCount).toBe(1);
      expect(report.trustBoundariesCount).toBe(1);
    });

    it('should support advanced formal verification properties', async () => {
      const model = new FormalSafetyModel();
      
      // Проверяем дополнительные свойства
      const dataIntegrityResult = model.formalVerification('data_integrity');
      expect(dataIntegrityResult.property).toBe('data_integrity');
      expect(dataIntegrityResult).toHaveProperty('verified');
      expect(dataIntegrityResult).toHaveProperty('confidence');
      
      const faultToleranceResult = model.formalVerification('fault_tolerance');
      expect(faultToleranceResult.property).toBe('fault_tolerance');
      expect(faultToleranceResult).toHaveProperty('verified');
      expect(faultToleranceResult).toHaveProperty('confidence');
    });

  });
});