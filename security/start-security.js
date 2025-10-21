#!/usr/bin/env node

/**
 * Скрипт запуска системы безопасности
 * Запускает все компоненты системы безопасности
 */

const SecurityManager = require('./security-manager');
const fs = require('fs');
const path = require('path');

async function startSecuritySystem() {
    console.log('🛡️ Запуск системы безопасности...');
    
    try {
        // Загружаем конфигурацию
        const configPath = path.join(__dirname, 'config.json');
        let config = {};
        
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('✅ Конфигурация загружена');
        } else {
            console.log('⚠️ Конфигурационный файл не найден, используются настройки по умолчанию');
        }
        
        // Настраиваем каналы алертов
        const alertChannels = [];
        
        // Telegram алерты
        if (process.env.TELEGRAM_ALERT_BOT_TOKEN && process.env.TELEGRAM_ALERT_CHAT_ID) {
            alertChannels.push({
                type: 'telegram',
                config: {
                    botToken: process.env.TELEGRAM_ALERT_BOT_TOKEN,
                    chatId: process.env.TELEGRAM_ALERT_CHAT_ID
                }
            });
            console.log('✅ Telegram алерты настроены');
        }
        
        // Webhook алерты
        if (process.env.WEBHOOK_ALERT_URL) {
            alertChannels.push({
                type: 'webhook',
                config: {
                    url: process.env.WEBHOOK_ALERT_URL,
                    headers: {
                        'Authorization': `Bearer ${process.env.WEBHOOK_ALERT_TOKEN || ''}`
                    }
                }
            });
            console.log('✅ Webhook алерты настроены');
        }
        
        // Создаем менеджер безопасности
        const securityManager = new SecurityManager({
            enableMonitoring: config.security?.monitoring?.enabled !== false,
            enableTokenRotation: config.security?.tokenRotation?.enabled !== false,
            enableAutoRecovery: config.security?.autoRecovery?.enabled !== false,
            alertChannels
        });
        
        // Добавляем домены для мониторинга
        if (config.domains?.primary) {
            if (config.domains.primary.web) {
                securityManager.addDomain(config.domains.primary.web, 'web');
            }
            if (config.domains.primary.bot) {
                securityManager.addDomain(config.domains.primary.bot, 'bot');
            }
            if (config.domains.primary.api) {
                securityManager.addDomain(config.domains.primary.api, 'api');
            }
        }
        
        // Добавляем домены из переменных окружения
        if (process.env.WEB_DOMAIN) {
            securityManager.addDomain(process.env.WEB_DOMAIN, 'web');
        }
        if (process.env.BOT_DOMAIN) {
            securityManager.addDomain(process.env.BOT_DOMAIN, 'bot');
        }
        if (process.env.API_DOMAIN) {
            securityManager.addDomain(process.env.API_DOMAIN, 'api');
        }
        
        // Добавляем сервисы для мониторинга
        if (config.services?.monitoring) {
            for (const service of config.services.monitoring) {
                if (service.type === 'custom' && service.checkFunction) {
                    const checkFunction = getCheckFunction(service.checkFunction);
                    if (checkFunction) {
                        securityManager.addService(service.name, checkFunction);
                    }
                }
            }
        }
        
        // Добавляем стандартные проверки
        securityManager.addService('database', checkDatabase);
        securityManager.addService('file_system', checkFileSystem);
        securityManager.addService('disk_space', checkDiskSpace);
        
        console.log('✅ Система безопасности запущена и готова к работе');
        
        // Создаем отчет о статусе
        setTimeout(() => {
            const status = securityManager.getSecurityStatus();
            console.log('📊 Статус системы безопасности:', JSON.stringify(status, null, 2));
        }, 5000);
        
        return securityManager;
        
    } catch (error) {
        console.error('❌ Ошибка запуска системы безопасности:', error);
        process.exit(1);
    }
}

/**
 * Получает функцию проверки по имени
 */
function getCheckFunction(functionName) {
    const checkFunctions = {
        checkDatabase,
        checkFileSystem,
        checkDiskSpace,
        checkNetwork,
        checkMemory
    };
    
    return checkFunctions[functionName] || null;
}

/**
 * Проверяет базу данных
 */
async function checkDatabase() {
    try {
        // Здесь должна быть реальная проверка базы данных
        // Для демонстрации возвращаем true
        return true;
    } catch (error) {
        console.error('❌ Ошибка проверки базы данных:', error);
        return false;
    }
}

/**
 * Проверяет файловую систему
 */
async function checkFileSystem() {
    try {
        const criticalPaths = [
            './data',
            './backups',
            './security',
            './link',
            './bot'
        ];
        
        for (const path of criticalPaths) {
            if (!fs.existsSync(path)) {
                console.error(`❌ Критический путь не найден: ${path}`);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка проверки файловой системы:', error);
        return false;
    }
}

/**
 * Проверяет свободное место на диске
 */
async function checkDiskSpace() {
    try {
        const { exec } = require('child_process');
        
        return new Promise((resolve) => {
            exec('df -h .', (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Ошибка проверки диска:', error);
                    resolve(false);
                    return;
                }
                
                // Парсим вывод df
                const lines = stdout.split('\n');
                if (lines.length > 1) {
                    const parts = lines[1].split(/\s+/);
                    const usedPercent = parseInt(parts[4].replace('%', ''));
                    
                    // Если используется больше 90%, считаем это проблемой
                    resolve(usedPercent < 90);
                } else {
                    resolve(false);
                }
            });
        });
    } catch (error) {
        console.error('❌ Ошибка проверки диска:', error);
        return false;
    }
}

/**
 * Проверяет сетевую связность
 */
async function checkNetwork() {
    try {
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
    } catch (error) {
        console.error('❌ Ошибка проверки сети:', error);
        return false;
    }
}

/**
 * Проверяет использование памяти
 */
async function checkMemory() {
    try {
        const { exec } = require('child_process');
        
        return new Promise((resolve) => {
            exec('free -m', (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Ошибка проверки памяти:', error);
                    resolve(false);
                    return;
                }
                
                // Парсим вывод free
                const lines = stdout.split('\n');
                if (lines.length > 1) {
                    const parts = lines[1].split(/\s+/);
                    const total = parseInt(parts[1]);
                    const used = parseInt(parts[2]);
                    const usedPercent = (used / total) * 100;
                    
                    // Если используется больше 90%, считаем это проблемой
                    resolve(usedPercent < 90);
                } else {
                    resolve(false);
                }
            });
        });
    } catch (error) {
        console.error('❌ Ошибка проверки памяти:', error);
        return false;
    }
}

// Если файл запущен напрямую
if (require.main === module) {
    startSecuritySystem().then((securityManager) => {
        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('🛑 Получен сигнал остановки...');
            await securityManager.shutdown();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('🛑 Получен сигнал завершения...');
            await securityManager.shutdown();
            process.exit(0);
        });
        
        // Обработка необработанных исключений
        process.on('uncaughtException', async (error) => {
            console.error('❌ Необработанное исключение:', error);
            await securityManager.sendAlert(`Критическая ошибка системы: ${error.message}`);
            await securityManager.shutdown();
            process.exit(1);
        });
        
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('❌ Необработанное отклонение промиса:', reason);
            await securityManager.sendAlert(`Критическая ошибка промиса: ${reason}`);
        });
        
    }).catch((error) => {
        console.error('❌ Критическая ошибка запуска:', error);
        process.exit(1);
    });
}

module.exports = { startSecuritySystem };
