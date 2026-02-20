#!/usr/bin/env node

/**
 * Тестирование системы безопасности
 * Проверяет все компоненты системы безопасности
 */

const SecurityManager = require('./security-manager');
const fs = require('fs');
const path = require('path');

class SecurityTester {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    /**
     * Добавляет тест
     */
    addTest(name, testFunction) {
        this.tests.push({ name, testFunction });
    }

    /**
     * Запускает все тесты
     */
    async runTests() {
        console.log('🧪 Запуск тестов системы безопасности...\n');
        
        for (const test of this.tests) {
            try {
                console.log(`🔍 Тест: ${test.name}`);
                const result = await test.testFunction();
                this.results.push({
                    name: test.name,
                    status: result ? 'PASS' : 'FAIL',
                    result
                });
                console.log(`✅ ${test.name}: ${result ? 'ПРОЙДЕН' : 'ПРОВАЛЕН'}\n`);
            } catch (error) {
                this.results.push({
                    name: test.name,
                    status: 'ERROR',
                    error: error.message
                });
                console.log(`❌ ${test.name}: ОШИБКА - ${error.message}\n`);
            }
        }
        
        this.printSummary();
    }

    /**
     * Выводит сводку результатов
     */
    printSummary() {
        console.log('📊 СВОДКА РЕЗУЛЬТАТОВ ТЕСТИРОВАНИЯ');
        console.log('=====================================');
        
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const errors = this.results.filter(r => r.status === 'ERROR').length;
        const total = this.results.length;
        
        console.log(`Всего тестов: ${total}`);
        console.log(`✅ Пройдено: ${passed}`);
        console.log(`❌ Провалено: ${failed}`);
        console.log(`🚨 Ошибок: ${errors}`);
        console.log(`📈 Успешность: ${((passed / total) * 100).toFixed(1)}%\n`);
        
        if (failed > 0 || errors > 0) {
            console.log('❌ ПРОВАЛЕННЫЕ ТЕСТЫ:');
            this.results
                .filter(r => r.status !== 'PASS')
                .forEach(r => {
                    console.log(`  - ${r.name}: ${r.status}`);
                    if (r.error) {
                        console.log(`    Ошибка: ${r.error}`);
                    }
                });
        }
        
        console.log('\n🎯 РЕКОМЕНДАЦИИ:');
        if (passed === total) {
            console.log('  ✅ Все тесты пройдены! Система безопасности готова к работе.');
        } else {
            console.log('  ⚠️ Обнаружены проблемы. Проверьте конфигурацию и зависимости.');
            console.log('  🔧 Убедитесь, что все переменные окружения настроены правильно.');
            console.log('  📚 Проверьте документацию по настройке системы безопасности.');
        }
    }
}

async function runSecurityTests() {
    const tester = new SecurityTester();
    
    // Тест 1: Проверка конфигурации
    tester.addTest('Конфигурация системы', async () => {
        const configPath = path.join(__dirname, 'config.json');
        return fs.existsSync(configPath);
    });
    
    // Тест 2: Проверка переменных окружения
    tester.addTest('Переменные окружения', async () => {
        const requiredVars = [
            'TELEGRAM_ALERT_BOT_TOKEN',
            'TELEGRAM_ALERT_CHAT_ID'
        ];
        
        return requiredVars.every(varName => process.env[varName]);
    });
    
    // Тест 3: Проверка файловой системы
    tester.addTest('Файловая система', async () => {
        const requiredDirs = [
            './backups',
            './data',
            './security'
        ];
        
        return requiredDirs.every(dir => fs.existsSync(dir));
    });
    
    // Тест 4: Проверка сети
    tester.addTest('Сетевая связность', async () => {
        const https = require('https');
        
        return new Promise((resolve) => {
            const req = https.request('https://www.google.com', { timeout: 5000 }, (res) => {
                resolve(res.statusCode === 200);
            });
            
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            
            req.end();
        });
    });
    
    // Тест 5: Проверка Telegram API
    tester.addTest('Telegram API', async () => {
        const botToken = process.env.TELEGRAM_ALERT_BOT_TOKEN;
        if (!botToken) return false;
        
        const https = require('https');
        
        return new Promise((resolve) => {
            const url = `https://api.telegram.org/bot${botToken}/getMe`;
            const req = https.request(url, { timeout: 10000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        resolve(result.ok === true);
                    } catch {
                        resolve(false);
                    }
                });
            });
            
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            
            req.end();
        });
    });
    
    // Тест 6: Проверка Docker
    tester.addTest('Docker', async () => {
        const { exec } = require('child_process');
        
        return new Promise((resolve) => {
            exec('docker --version', (error, stdout, stderr) => {
                resolve(!error && stdout.includes('Docker version'));
            });
        });
    });
    
    // Тест 7: Проверка Docker Compose
    tester.addTest('Docker Compose', async () => {
        const { exec } = require('child_process');
        
        return new Promise((resolve) => {
            exec('docker-compose --version', (error, stdout, stderr) => {
                resolve(!error && stdout.includes('docker-compose version'));
            });
        });
    });
    
    // Тест 8: Проверка прав доступа
    tester.addTest('Права доступа', async () => {
        try {
            const testFile = './security/test-write.tmp';
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            return true;
        } catch {
            return false;
        }
    });
    
    // Тест 9: Проверка памяти
    tester.addTest('Доступная память', async () => {
        const { exec } = require('child_process');
        
        return new Promise((resolve) => {
            exec('free -m', (error, stdout, stderr) => {
                if (error) {
                    resolve(false);
                    return;
                }
                
                const lines = stdout.split('\n');
                if (lines.length > 1) {
                    const parts = lines[1].split(/\s+/);
                    const total = parseInt(parts[1]);
                    const used = parseInt(parts[2]);
                    const available = total - used;
                    
                    // Требуем минимум 512MB свободной памяти
                    resolve(available >= 512);
                } else {
                    resolve(false);
                }
            });
        });
    });
    
    // Тест 10: Проверка дискового пространства
    tester.addTest('Дисковое пространство', async () => {
        const { exec } = require('child_process');
        
        return new Promise((resolve) => {
            exec('df -h .', (error, stdout, stderr) => {
                if (error) {
                    resolve(false);
                    return;
                }
                
                const lines = stdout.split('\n');
                if (lines.length > 1) {
                    const parts = lines[1].split(/\s+/);
                    const usedPercent = parseInt(parts[4].replace('%', ''));
                    
                    // Требуем минимум 10% свободного места
                    resolve(usedPercent < 90);
                } else {
                    resolve(false);
                }
            });
        });
    });
    
    // Запускаем тесты
    await tester.runTests();
}

// Если файл запущен напрямую
if (require.main === module) {
    runSecurityTests().catch((error) => {
        console.error('❌ Критическая ошибка тестирования:', error);
        process.exit(1);
    });
}

module.exports = { SecurityTester, runSecurityTests };
