/**
 * Модуль анализа результатов тестов и линтеров
 */
export class CodeAnalysis {
  /**
   * Анализирует результаты тестов
   */
  static analyzeTestResults(results) {
    if (!results) {
      return {
        success: true,
        summary: 'Нет результатов тестов для анализа',
        issues: []
      };
    }

    // Если результаты - это объект (например, из CodeTesterLinter), используем поле results
    let resultsText = results;
    if (typeof results === 'object' && results.results !== undefined) {
      resultsText = results.results;
    }
    
    if (typeof resultsText !== 'string') {
      return {
        success: true,
        summary: 'Некорректный формат результатов тестов',
        issues: []
      };
    }

    const lines = resultsText.split('\n');
    const issues = [];
    
    // Проверяем на наличие ошибок тестов
    for (const line of lines) {
      if (line.toLowerCase().includes('error') || line.toLowerCase().includes('fail')) {
        issues.push({
          type: 'test_failure',
          severity: 'high',
          message: line.trim(),
          location: null
        });
      } else if (line.toLowerCase().includes('warning')) {
        issues.push({
          type: 'test_warning',
          severity: 'medium',
          message: line.trim(),
          location: null
        });
      }
    }

    return {
      success: issues.length === 0,
      summary: issues.length > 0 
        ? `Найдено ${issues.length} проблем в тестах` 
        : 'Тесты пройдены успешно',
      issues
    };
  }

  /**
   * Анализирует результаты линтера
   */
  static analyzeLintResults(results) {
    if (!results) {
      return {
        success: true,
        summary: 'Нет результатов линтинга для анализа',
        issues: []
      };
    }

    // Если результаты - это объект (например, из CodeTesterLinter), используем поле results
    let resultsText = results;
    if (typeof results === 'object' && results.results !== undefined) {
      resultsText = results.results;
    }
    
    if (typeof resultsText !== 'string') {
      return {
        success: true,
        summary: 'Некорректный формат результатов линтинга',
        issues: []
      };
    }

    const lines = resultsText.split('\n');
    const issues = [];
    
    // Обработка результатов ESLint
    const eslintPattern = /^.*?:\d+:\d+:.*$/;
    // Обработка результатов SwiftLint
    const swiftLintPattern = /^.*?\.swift:\d+:\d+:.*$/;
    // Обработка результатов flake8
    const flake8Pattern = /^.*?\.py:\d+:[\d]+:.*$/;
    
    for (const line of lines) {
      if (eslintPattern.test(line) || swiftLintPattern.test(line) || flake8Pattern.test(line)) {
        const parts = line.split(':');
        if (parts.length >= 4) {
          const file = parts[0];
          const lineNum = parseInt(parts[1]);
          const colNum = parseInt(parts[2]);
          const message = parts.slice(3).join(':').trim();
          
          // Определяем уровень серьезности
          let severity = 'low';
          if (message.toLowerCase().includes('error') || message.toLowerCase().includes('critical')) {
            severity = 'high';
          } else if (message.toLowerCase().includes('warn')) {
            severity = 'medium';
          }
          
          issues.push({
            type: 'lint_issue',
            severity,
            message,
            location: {
              file,
              line: lineNum,
              column: colNum
            }
          });
        }
      }
    }

    return {
      success: issues.length === 0,
      summary: issues.length > 0 
        ? `Найдено ${issues.length} замечаний линтера` 
        : 'Линтинг пройден успешно',
      issues
    };
  }

  /**
   * Генерирует рекомендации на основе анализа
   */
  static generateRecommendations(testResults, lintResults) {
    const recommendations = [];
    
    // Рекомендации на основе результатов тестов
    if (testResults && !testResults.success) {
      recommendations.push({
        category: 'tests',
        priority: 'high',
        title: 'Исправить ошибки тестов',
        description: 'Необходимо исправить ошибки, выявленные при запуске тестов',
        suggestions: testResults.issues.map(issue => issue.message)
      });
    }
    
    // Рекомендации на основе результатов линтинга
    if (lintResults && !lintResults.success) {
      recommendations.push({
        category: 'linting',
        priority: 'medium',
        title: 'Исправить замечания линтера',
        description: 'Рекомендуется исправить замечания, выявленные линтером',
        suggestions: lintResults.issues.map(issue => issue.message)
      });
    }
    
    // Общие рекомендации по качеству кода
    if ((testResults && !testResults.success) || (lintResults && !lintResults.success)) {
      recommendations.push({
        category: 'best_practices',
        priority: 'low',
        title: 'Улучшить качество кода',
        description: 'Рассмотрите возможность рефакторинга кода для повышения его качества',
        suggestions: [
          'Добавить больше юнит-тестов',
          'Улучшить документирование функций',
          'Проверить покрытие кода тестами',
          'Применить паттерны проектирования'
        ]
      });
    }
    
    return recommendations;
  }

  /**
   * Создает отчет о качестве кода
   */
  static generateCodeQualityReport(testResults, lintResults) {
    return {
      timestamp: new Date().toISOString(),
      testResults: testResults || { success: true, summary: 'Нет результатов тестов', issues: [] },
      lintResults: lintResults || { success: true, summary: 'Нет результатов линтинга', issues: [] },
      overallScore: this.calculateOverallScore(testResults, lintResults),
      recommendations: this.generateRecommendations(testResults, lintResults)
    };
  }

  /**
   * Рассчитывает общий балл качества кода
   */
  static calculateOverallScore(testResults, lintResults) {
    let score = 100;
    
    if (testResults && !testResults.success) {
      // Уменьшаем балл за каждый тест-фейл (с разным весом в зависимости от серьезности)
      const highSeverityIssues = testResults.issues.filter(i => i.severity === 'high').length;
      const mediumSeverityIssues = testResults.issues.filter(i => i.severity === 'medium').length;
      const lowSeverityIssues = testResults.issues.filter(i => i.severity === 'low').length;
      
      score -= highSeverityIssues * 10;
      score -= mediumSeverityIssues * 5;
      score -= lowSeverityIssues * 2;
    }
    
    if (lintResults && !lintResults.success) {
      // Уменьшаем балл за каждое замечание линтера
      const highSeverityIssues = lintResults.issues.filter(i => i.severity === 'high').length;
      const mediumSeverityIssues = lintResults.issues.filter(i => i.severity === 'medium').length;
      const lowSeverityIssues = lintResults.issues.filter(i => i.severity === 'low').length;
      
      score -= highSeverityIssues * 5;
      score -= mediumSeverityIssues * 2;
      score -= lowSeverityIssues * 1;
    }
    
    // Не позволяем баллу быть меньше 0
    return Math.max(0, score);
  }
}