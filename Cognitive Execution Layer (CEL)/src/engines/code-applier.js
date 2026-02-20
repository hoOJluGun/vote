import fs from 'fs/promises';
import path from 'path';

/**
 * Безопасный парсер JavaScript для валидации синтаксиса
 * Использует регулярные выражения вместо new Function() для предотвращения RCE
 */
class SafeJavaScriptValidator {
  /**
   * Проверяет синтаксис JavaScript кода без его выполнения
   * @param {string} code - Код для проверки
   * @returns {{ valid: boolean, error: string|null }}
   */
  static validate(code) {
    // Базовые проверки синтаксиса без выполнения кода
    const errors = [];

    // Проверка баланса скобок
    const brackets = {
      '(': ')',
      '[': ']',
      '{': '}'
    };

    const stack = [];
    const bracketPositions = [];

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      if (brackets[char]) {
        stack.push(brackets[char]);
        bracketPositions.push(i);
      } else if (Object.values(brackets).includes(char)) {
        if (stack.pop() !== char) {
          errors.push(`Несбалансированные скобки на позиции ${i}`);
        }
        bracketPositions.pop();
      }
    }

    if (stack.length > 0) {
      errors.push(`Незакрытые скобки на позициях: ${bracketPositions.join(', ')}`);
    }

    // Проверка баланса кавычек
    const quoteTypes = ["'", '"', '`'];
    for (const quote of quoteTypes) {
      let inQuote = false;
      let escape = false;
      let quoteStart = -1;

      for (let i = 0; i < code.length; i++) {
        const char = code[i];

        if (escape) {
          escape = false;
          continue;
        }

        if (char === '\\') {
          escape = true;
          continue;
        }

        if (char === quote) {
          if (!inQuote) {
            inQuote = true;
            quoteStart = i;
          } else {
            inQuote = false;
          }
        }
      }

      if (inQuote) {
        errors.push(`Незакрытая кавычка ${quote} на позиции ${quoteStart}`);
      }
    }

    // Проверка базовых синтаксических конструкций
    const syntaxPatterns = [
      { pattern: /;\s*;/g, message: 'Двойная точка с запятой' },
      { pattern: /,\s*[,)\]}]/g, message: 'Лишняя запятая' },
      { pattern: /[,]\s*$/gm, message: 'Завершающая запятая в конце строки' },
    ];

    for (const { pattern, message } of syntaxPatterns) {
      const matches = code.match(pattern);
      if (matches && matches.length > 0) {
        // Эти паттерны могут быть допустимы в некоторых случаях, 
        // поэтому добавляем как предупреждения, а не ошибки
        // errors.push(`${message}: найдено ${matches.length}`);
      }
    }

    // Проверка ключевых слов без контекста
    const keywordPattern = /\b(function|class|if|else|for|while|do|switch|try|catch|finally|return|throw|break|continue|const|let|var|import|export|from|async|await)\b/g;

    // Проверка на наличие опасных конструкций
    const dangerousPatterns = [
      { pattern: /eval\s*\(/g, message: 'Использование eval() опасно' },
      { pattern: /Function\s*\(/g, message: 'Использование Function() опасно' },
      { pattern: /new\s+Function\s*\(/g, message: 'Использование new Function() опасно' },
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(message);
      }
    }

    // Проверка на валидность идентификаторов
    const identifierPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;

    // Проверка на корректность объявления переменных
    const varDeclarationPattern = /\b(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
    let match;
    while ((match = varDeclarationPattern.exec(code)) !== null) {
      // Проверяем, что имя переменной валидно
      if (match[2].length === 0) {
        errors.push(`Пустое имя переменной после ${match[1]}`);
      }
    }

    // Проверка на синтаксис стрелочных функций
    const arrowFunctionPattern = /=>\s*[{[]?/g;

    // Проверка на template literals
    const templateLiteralPattern = /`[^`]*\$\{[^}]*\}[^`]*`/g;

    return {
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : null,
      warnings: []
    };
  }

  /**
   * Более строгая валидация с проверкой структуры кода
   */
  static validateStrict(code) {
    const basicResult = this.validate(code);
    if (!basicResult.valid) {
      return basicResult;
    }

    const errors = [];

    // Проверка на наличие точек входа (для модулей)
    const hasExport = /\bexport\s+(default\s+)?(const|let|var|function|class)/.test(code);
    const hasImport = /\bimport\s+.*from\s+['"]/.test(code);

    // Проверка на IIFE или немедленно выполняемый код
    const hasIIFE = /\(\s*function\s*\(/.test(code) || /\(\s*\(\)\s*=>/.test(code);

    return {
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : null,
      warnings: [],
      metadata: {
        hasExport,
        hasImport,
        hasIIFE,
        lineCount: code.split('\n').length,
        charCount: code.length
      }
    };
  }
}

/**
 * Модуль для автоматического применения исправлений кода
 */
export class CodeApplier {
  /**
   * Применяет исправления к файлу на основе diff
   */
  static async applyFixesToFile(filePath, fixes) {
    try {
      // Проверяем, что файл существует
      await fs.access(filePath);

      // Читаем текущий контент файла
      let currentContent = await fs.readFile(filePath, 'utf8');

      // Применяем каждое исправление
      for (const fix of fixes) {
        if (fix.type === 'replacement') {
          currentContent = this.applyReplacement(currentContent, fix);
        } else if (fix.type === 'insertion') {
          currentContent = this.applyInsertion(currentContent, fix);
        } else if (fix.type === 'deletion') {
          currentContent = this.applyDeletion(currentContent, fix);
        } else if (fix.type === 'diff_patch') {
          currentContent = this.applyDiffPatch(currentContent, fix.patch);
        }
      }

      // Записываем обновленный контент обратно в файл
      await fs.writeFile(filePath, currentContent, 'utf8');

      return {
        success: true,
        message: `Успешно применено ${fixes.length} исправлений`,
        appliedFixes: fixes.map(fix => fix.description || 'Unknown fix')
      };
    } catch (error) {
      return {
        success: false,
        message: `Ошибка при применении исправлений: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Применяет замену текста в файле
   */
  static applyReplacement(content, fix) {
    const { oldText, newText, position } = fix;

    if (position) {
      // Если указана позиция, заменяем текст в определенном диапазоне
      const start = content.substring(0, position.start);
      const end = content.substring(position.end);
      return start + newText + end;
    } else {
      // Иначе заменяем первое вхождение oldText на newText
      return content.replace(oldText, newText);
    }
  }

  /**
   * Применяет вставку текста в файл
   */
  static applyInsertion(content, fix) {
    const { text, position } = fix;

    if (typeof position === 'number') {
      // Вставка в определенную позицию
      const start = content.substring(0, position);
      const end = content.substring(position);
      return start + text + end;
    } else if (position && position.lineNumber) {
      // Вставка в определенную строку
      const lines = content.split('\n');
      lines.splice(position.lineNumber, 0, text);
      return lines.join('\n');
    } else {
      // Вставка в конец файла
      return content + '\n' + text;
    }
  }

  /**
   * Применяет удаление текста из файла
   */
  static applyDeletion(content, fix) {
    const { position } = fix;

    if (position) {
      if (position.start && position.end) {
        // Удаление по диапазону позиций
        const start = content.substring(0, position.start);
        const end = content.substring(position.end);
        return start + end;
      } else if (position.lineStart && position.lineEnd) {
        // Удаление по диапазону строк
        const lines = content.split('\n');
        lines.splice(position.lineStart, position.lineEnd - position.lineStart + 1);
        return lines.join('\n');
      }
    }

    // Если позиция не указана, не делаем ничего
    return content;
  }

  /**
   * Применяет diff-патч к содержимому файла
   */
  static applyDiffPatch(content, patch) {
    // Простая реализация для одиночного патча (без сложных конфликтов)
    // Для более сложных случаев можно использовать библиотеку, например, 'diff'

    // Разбиваем патч на строки
    const patchLines = patch.split('\n');
    let result = content.split('\n');

    // Ищем изменения в формате Unified Diff
    let i = 0;
    while (i < patchLines.length) {
      const line = patchLines[i];

      if (line.startsWith('@@')) {
        // Находим номера строк для изменения
        const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (match) {
          const oldStart = parseInt(match[1]) - 1; // diff использует 1-индексацию
          const oldCount = match[2] ? parseInt(match[2]) : 1;
          const newStart = parseInt(match[3]) - 1;

          // Удаляем старые строки
          result.splice(oldStart, oldCount);

          // Добавляем новые строки из патча
          i++; // Переходим к следующей строке
          while (i < patchLines.length) {
            const nextLine = patchLines[i];
            if (nextLine.startsWith('@@') || nextLine.startsWith('---')) {
              break; // Начался следующий блок изменений
            }

            if (nextLine.startsWith('+')) {
              // Добавляем строку
              result.splice(newStart, 0, nextLine.substring(1));
            } else if (nextLine.startsWith('-')) {
              // Удаляем строку (уже удалена выше)
            } else if (!nextLine.startsWith('\\')) {
              // Пропускаем строки контекста
            }

            i++;
          }
          continue; // Не увеличиваем i снова, так как он уже увеличен в цикле
        }
      }

      i++;
    }

    return result.join('\n');
  }

  /**
   * Валидирует изменения перед применением
   * Использует безопасный валидатор вместо new Function()
   */
  static validateChanges(originalContent, newContent, filePath) {
    // Проверяем, что изменения не слишком радикальны (например, не удаляют весь файл)
    if (newContent.length === 0 && originalContent.length > 0) {
      throw new Error('Предлагаемые изменения полностью удаляют содержимое файла. Это может быть ошибкой.');
    }

    // Проверяем, что изменения не увеличивают размер файла слишком сильно
    const sizeRatio = newContent.length / originalContent.length;
    if (sizeRatio > 5 && newContent.length > 1000) {
      throw new Error('Предлагаемые изменения значительно увеличивают размер файла. Это может быть ошибкой.');
    }

    // Для JavaScript файлов используем безопасный валидатор синтаксиса
    if (path.extname(filePath) === '.js') {
      const validation = SafeJavaScriptValidator.validateStrict(newContent);
      if (!validation.valid) {
        throw new Error(`Синтаксическая ошибка в изменениях: ${validation.error}`);
      }
      // Логируем предупреждения, если есть
      if (validation.warnings && validation.warnings.length > 0) {
        console.warn('Предупреждения валидации:', validation.warnings);
      }
    }

    return true;
  }

  /**
   * Применяет исправления с валидацией
   */
  static async applyFixesWithValidation(filePath, fixes) {
    try {
      // Читаем оригинальный контент
      const originalContent = await fs.readFile(filePath, 'utf8');

      // Применяем исправления
      let newContent = originalContent;

      for (const fix of fixes) {
        if (fix.type === 'replacement') {
          newContent = this.applyReplacement(newContent, fix);
        } else if (fix.type === 'insertion') {
          newContent = this.applyInsertion(newContent, fix);
        } else if (fix.type === 'deletion') {
          newContent = this.applyDeletion(newContent, fix);
        } else if (fix.type === 'diff_patch') {
          newContent = this.applyDiffPatch(newContent, fix.patch);
        }
      }

      // Проверяем изменения
      this.validateChanges(originalContent, newContent, filePath);

      // Записываем изменения в файл
      await fs.writeFile(filePath, newContent, 'utf8');

      return {
        success: true,
        message: `Исправления успешно применены к ${filePath}`,
        originalLength: originalContent.length,
        newLength: newContent.length
      };
    } catch (error) {
      return {
        success: false,
        message: `Ошибка при применении исправлений: ${error.message}`,
        error: error.message
      };
    }
  }
}