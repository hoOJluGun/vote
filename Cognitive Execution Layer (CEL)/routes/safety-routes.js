// routes/safety-routes.js
// Маршруты для проверки безопасности и ограничений

const express = require('express');
const router = express.Router();
const FormalSafetyModel = require('../lib/formal-safety-model');

// Создание экземпляра формальной модели безопасности
const safetyModel = new FormalSafetyModel();

// Регистрация базовых инвариантов безопасности
safetyModel.registerInvariant('no_unauthorized_file_access', async () => {
  // Проверка, что нет попыток доступа к защищенным файлам системы
  return true; // Заглушка для демонстрации
});

safetyModel.registerInvariant('resource_limit_not_exceeded', async () => {
  // Проверка, что лимиты ресурсов не превышены
  return true; // Заглушка для демонстрации
});

safetyModel.registerInvariant('model_whitelist_enforcement', async () => {
  // Проверка, что используются только разрешенные модели
  return true; // Заглушка для демонстрации
});

// Установка доверительных границ
safetyModel.setTrustBoundary('api_access', ['xcode_integration', 'internal_service', 'authenticated_user']);
safetyModel.setTrustBoundary('file_operations', ['internal_agents', 'system_process']);

// Ограничения безопасности
safetyModel.addSafetyConstraint({
  name: 'file_system_sandbox',
  appliesTo: ['file_write', 'file_read', 'file_delete'],
  condition: (context) => {
    // Проверка, что операции происходят только в разрешенных директориях
    const allowedPaths = ['/tmp/', './workspace/', './output/'];
    return allowedPaths.some(path => context.filePath?.startsWith(path));
  },
  description: 'Ограничение операций с файлами до безопасных директорий'
});

safetyModel.addSafetyConstraint({
  name: 'model_access_control',
  appliesTo: ['llm_request', 'model_call'],
  condition: (context) => {
    // Проверка, что используется только разрешенный список моделей
    const allowedModels = [
      'openai/gpt-4o:free', 
      'anthropic/claude-3-haiku:free', 
      'google/gemini-pro:free',
      'mistralai/mistral-7b-instruct:free',
      'nousresearch/nous-capybara-7b:free'
    ];
    return allowedModels.includes(context.model);
  },
  description: 'Контроль доступа к моделям через белый список'
});

/**
 * Эндпоинт проверки безопасности операции
 */
router.post('/check-safety', async (req, res) => {
  try {
    const { operation, context } = req.body;

    if (!operation) {
      return res.status(400).json({ 
        error: 'Operation type is required' 
      });
    }

    // Проверка безопасности операции
    const isSafe = safetyModel.checkOperationSafety(operation, context);

    if (!isSafe) {
      return res.status(403).json({ 
        safe: false, 
        message: `Operation ${operation} blocked by safety constraints`,
        context
      });
    }

    // Дополнительная проверка инвариантов перед выполнением
    const invariantsValid = await safetyModel.verifyAllInvariants();
    
    if (!invariantsValid) {
      return res.status(423).json({ 
        safe: false, 
        message: 'System invariants violated, operation blocked for safety',
        context
      });
    }

    res.json({ 
      safe: true, 
      message: `Operation ${operation} approved by safety model`,
      context
    });

  } catch (error) {
    console.error('Safety check error:', error);
    res.status(500).json({ 
      error: 'Internal safety model error',
      details: error.message
    });
  }
});

/**
 * Эндпоинт проверки целостности критических модулей
 */
router.get('/integrity-check', async (req, res) => {
  try {
    const integrityValid = await safetyModel.verifyCriticalModulesIntegrity();
    
    res.json({ 
      integrityValid,
      report: safetyModel.getSafetyReport()
    });
  } catch (error) {
    console.error('Integrity check error:', error);
    res.status(500).json({ 
      error: 'Integrity verification failed',
      details: error.message
    });
  }
});

/**
 * Эндпоинт получения отчета о безопасности
 */
router.get('/report', (req, res) => {
  try {
    const report = safetyModel.getSafetyReport();
    res.json(report);
  } catch (error) {
    console.error('Safety report error:', error);
    res.status(500).json({ 
      error: 'Could not generate safety report',
      details: error.message
    });
  }
});

/**
 * Эндпоинт проверки формальных свойств системы
 */
router.post('/formal-verification', (req, res) => {
  try {
    const { property } = req.body;
    
    if (!property) {
      return res.status(400).json({ 
        error: 'Property to verify is required' 
      });
    }

    const proofResult = safetyModel.formalVerification(property);
    
    res.json(proofResult);
  } catch (error) {
    console.error('Formal verification error:', error);
    res.status(500).json({ 
      error: 'Formal verification failed',
      details: error.message
    });
  }
});

/**
 * Эндпоинт проверки токена на целостность
 */
router.post('/verify-token', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        error: 'Token is required' 
      });
    }

    const isValid = safetyModel.verifyTokenIntegrity(token);
    
    res.json({ 
      valid: isValid,
      token: isValid ? token.substring(0, 8) + '...' : null
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      error: 'Token verification failed',
      details: error.message
    });
  }
});

/**
 * Эндпоинт регистрации нового инварианта безопасности
 */
router.post('/register-invariant', async (req, res) => {
  try {
    const { name, predicate, critical } = req.body;

    if (!name || !predicate) {
      return res.status(400).json({ 
        error: 'Invariant name and predicate function are required' 
      });
    }

    if (critical) {
      safetyModel.registerCriticalInvariant(name, predicate);
    } else {
      safetyModel.registerInvariant(name, predicate);
    }

    res.json({ 
      success: true, 
      message: `Invariant ${name} registered successfully`,
      critical: !!critical
    });

  } catch (error) {
    console.error('Invariant registration error:', error);
    res.status(500).json({ 
      error: 'Failed to register invariant',
      details: error.message
    });
  }
});

/**
 * Эндпоинт получения статуса инвариантов
 */
router.get('/invariants-status', async (req, res) => {
  try {
    const invariantsStatus = Array.from(safetyModel.invariants.entries()).map(([name, invariant]) => ({
      name,
      registeredAt: invariant.registeredAt,
      verified: invariant.verified,
      lastChecked: invariant.lastChecked,
      violationCount: invariant.violationCount,
      critical: invariant.critical
    }));

    res.json({ 
      invariants: invariantsStatus,
      total: invariantsStatus.length,
      verified: invariantsStatus.filter(i => i.verified).length,
      critical: invariantsStatus.filter(i => i.critical).length
    });
  } catch (error) {
    console.error('Invariants status error:', error);
    res.status(500).json({ 
      error: 'Could not retrieve invariants status',
      details: error.message
    });
  }
});

/**
 * Эндпоинт принудительной проверки инвариантов
 */
router.post('/verify-invariants', async (req, res) => {
  try {
    const result = await safetyModel.verifyAllInvariants();
    
    res.json({ 
      allVerified: result,
      report: safetyModel.getSafetyReport()
    });
  } catch (error) {
    console.error('Invariants verification error:', error);
    res.status(500).json({ 
      error: 'Invariants verification failed',
      details: error.message
    });
  }
});

/**
 * Эндпоинт добавления ограничения безопасности
 */
router.post('/add-constraint', async (req, res) => {
  try {
    const { name, appliesTo, condition, description } = req.body;

    if (!name || !appliesTo || !condition) {
      return res.status(400).json({ 
        error: 'Constraint name, appliesTo and condition are required' 
      });
    }

    // В реальном приложении condition должен быть проверен на безопасность
    // прежде чем его можно будет использовать
    safetyModel.addSafetyConstraint({
      name,
      appliesTo: Array.isArray(appliesTo) ? appliesTo : [appliesTo],
      condition: new Function('context', condition), // Опасно! В продакшене нужна безопасная обработка
      description: description || 'No description provided'
    });

    res.json({ 
      success: true, 
      message: `Constraint ${name} added successfully`,
      constraint: { name, appliesTo, description }
    });

  } catch (error) {
    console.error('Constraint addition error:', error);
    res.status(500).json({ 
      error: 'Failed to add safety constraint',
      details: error.message
    });
  }
});

module.exports = router;