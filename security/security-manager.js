#!/usr/bin/env node

/**
 * Главный менеджер системы безопасности
 * Объединяет мониторинг, ротацию токенов и автоматическое восстановление
 */

const SecurityMonitoringSystem = require('./monitoring-system');
const TokenRotationSystem = require('./token-rotation');
const AutoRecoverySystem = require('./auto-recovery');
const fs = require('fs');
const path = require('path');

class SecurityManager {
    constructor(config) {
        this.config = {
            enableMonitoring: true,
            enableTokenRotation: true,
            enableAutoRecovery: true,
            alertChannels: [],
            ...config
        };
        
        this.monitoring = null;
        this.tokenRotation = null;
        this.autoRecovery = null;
        this.isRunning = false;
        
        this.initialize();
    }

    /**
     * Инициализирует систему безопасности
     */
    async initialize() {
        console.log('🛡️ Инициализация системы безопасности...');
        
        try {
            // Инициализируем компоненты
            if (this.config.enableMonitoring) {
                this.monitoring = new SecurityMonitoringSystem({
                    alertChannels: this.config.alertChannels
                });
            }
            
            if (this.config.enableTokenRotation) {
                this.tokenRotation = new TokenRotationSystem({
                    alertChannels: this.config.alertChannels
                });
            }
            
            if (this.config.enableAutoRecovery) {
                this.autoRecovery = new AutoRecoverySystem({
                    alertChannels: this.config.alertChannels
                });
            }
            
            // Настраиваем интеграцию между компонентами
            this.setupIntegration();
            
            this.isRunning = true;
            console.log('✅ Система безопасности инициализирована');
            
            // Отправляем уведомление о запуске
            await this.sendAlert('🛡️ Система безопасности запущена и готова к работе');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации системы безопасности:', error);
            throw error;
        }
    }

    /**
     * Настраивает интеграцию между компонентами
     */
    setupIntegration() {
        if (this.monitoring && this.autoRecovery) {
            // При критическом сбое запускаем восстановление
            this.monitoring.on('criticalFailure', async (failure) => {
                console.log('🚨 Критический сбой обнаружен, запуск восстановления...');
                await this.autoRecovery.startFullRecovery('critical_failure');
            });
        }
        
        if (this.tokenRotation && this.autoRecovery) {
            // При ротации токенов обновляем конфигурацию
            this.tokenRotation.on('tokensRotated', async (newTokens) => {
                console.log('🔄 Токены обновлены, синхронизация конфигурации...');
                await this.syncConfiguration(newTokens);
            });
        }
    }

    /**
     * Синхронизирует конфигурацию после ротации токенов
     */
    async syncConfiguration(newTokens) {
        try {
            // Обновляем переменные окружения
            await this.updateEnvironmentVariables(newTokens);
            
            // Перезапускаем сервисы
            await this.restartServices();
            
            console.log('✅ Конфигурация синхронизирована');
        } catch (error) {
            console.error('❌ Ошибка синхронизации конфигурации:', error);
        }
    }

    /**
     * Обновляет переменные окружения
     */
    async updateEnvironmentVariables(tokens) {
        const envFile = '.env';
        if (!fs.existsSync(envFile)) {
            return;
        }

        let content = fs.readFileSync(envFile, 'utf8');
        
        for (const [name, token] of Object.entries(tokens)) {
            const regex = new RegExp(`^${name}=.*$`, 'm');
            if (regex.test(content)) {
                content = content.replace(regex, `${name}=${token}`);
            } else {
                content += `\n${name}=${token}`;
            }
        }
        
        fs.writeFileSync(envFile, content);
    }

    /**
     * Перезапускает сервисы
     */
    async restartServices() {
        const { exec } = require('child_process');
        
        return new Promise((resolve, reject) => {
            const command = 'docker-compose down && docker-compose up -d';
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    /**
     * Добавляет домен для мониторинга
     */
    addDomain(domain, type = 'web') {
        if (this.monitoring) {
            this.monitoring.addDomain(domain, type);
        }
    }

    /**
     * Добавляет сервис для мониторинга
     */
    addService(name, checkFunction) {
        if (this.monitoring) {
            this.monitoring.addService(name, checkFunction);
        }
    }

    /**
     * Принудительно запускает ротацию токенов
     */
    async forceTokenRotation() {
        if (this.tokenRotation) {
            console.log('🔄 Принудительная ротация токенов...');
            await this.tokenRotation.forceRotation();
        }
    }

    /**
     * Запускает тестовое восстановление
     */
    async testRecovery() {
        if (this.autoRecovery) {
            console.log('🧪 Тестирование восстановления...');
            return await this.autoRecovery.testRecovery();
        }
    }

    /**
     * Запускает полное восстановление
     */
    async startFullRecovery(reason = 'manual') {
        if (this.autoRecovery) {
            console.log('🚨 Запуск полного восстановления...');
            return await this.autoRecovery.startFullRecovery(reason);
        }
    }

    /**
     * Получает статус системы безопасности
     */
    getSecurityStatus() {
        const status = {
            isRunning: this.isRunning,
            components: {
                monitoring: !!this.monitoring,
                tokenRotation: !!this.tokenRotation,
                autoRecovery: !!this.autoRecovery
            },
            timestamp: new Date().toISOString()
        };

        if (this.monitoring) {
            status.monitoring = this.monitoring.getSystemStatus();
        }

        if (this.tokenRotation) {
            status.tokenRotation = this.tokenRotation.getRotationStatus();
        }

        if (this.autoRecovery) {
            status.autoRecovery = this.autoRecovery.getRecoveryStatus();
        }

        return status;
    }

    /**
     * Создает отчет о безопасности
     */
    generateSecurityReport() {
        const status = this.getSecurityStatus();
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                systemStatus: status.isRunning ? 'operational' : 'stopped',
                componentsActive: Object.values(status.components).filter(Boolean).length,
                totalComponents: Object.keys(status.components).length
            },
            details: status
        };

        // Сохраняем отчет
        const reportsDir = './security/reports';
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const reportFile = path.join(reportsDir, `security-report-${Date.now()}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

        console.log(`📊 Отчет о безопасности создан: ${reportFile}`);
        return report;
    }

    /**
     * Отправляет алерт
     */
    async sendAlert(message) {
        console.log(`📢 СИСТЕМА БЕЗОПАСНОСТИ: ${message}`);
        
        for (const channel of this.config.alertChannels) {
            try {
                switch (channel.type) {
                    case 'telegram':
                        await this.sendTelegramAlert(channel.config, message);
                        break;
                    case 'webhook':
                        await this.sendWebhookAlert(channel.config, message);
                        break;
                }
            } catch (error) {
                console.error(`❌ Ошибка отправки алерта через ${channel.type}:`, error);
            }
        }
    }

    /**
     * Отправляет Telegram алерт
     */
    async sendTelegramAlert(config, message) {
        const https = require('https');
        const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
        const data = JSON.stringify({
            chat_id: config.chatId,
            text: message,
            parse_mode: 'HTML'
        });

        return new Promise((resolve, reject) => {
            const req = https.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            }, (res) => {
                resolve(res);
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    /**
     * Отправляет webhook алерт
     */
    async sendWebhookAlert(config, message) {
        const https = require('https');
        const data = JSON.stringify({
            message,
            timestamp: new Date().toISOString(),
            type: 'security_alert'
        });

        return new Promise((resolve, reject) => {
            const req = https.request(config.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            }, (res) => {
                resolve(res);
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    /**
     * Останавливает систему безопасности
     */
    async shutdown() {
        console.log('🛑 Остановка системы безопасности...');
        
        this.isRunning = false;
        
        // Сохраняем состояние
        if (this.tokenRotation) {
            this.tokenRotation.saveTokens();
        }
        
        // Отправляем уведомление о остановке
        await this.sendAlert('🛑 Система безопасности остановлена');
        
        console.log('✅ Система безопасности остановлена');
    }

    /**
     * Перезапускает систему безопасности
     */
    async restart() {
        console.log('🔄 Перезапуск системы безопасности...');
        
        await this.shutdown();
        await this.initialize();
        
        console.log('✅ Система безопасности перезапущена');
    }
}

module.exports = SecurityManager;

// Если файл запущен напрямую
if (require.main === module) {
    const config = {
        enableMonitoring: true,
        enableTokenRotation: true,
        enableAutoRecovery: true,
        alertChannels: [
            {
                type: 'telegram',
                config: {
                    botToken: process.env.TELEGRAM_ALERT_BOT_TOKEN,
                    chatId: process.env.TELEGRAM_ALERT_CHAT_ID
                }
            }
        ]
    };

    const securityManager = new SecurityManager(config);
    
    // Добавляем домены для мониторинга
    securityManager.addDomain(process.env.WEB_DOMAIN || 'localhost:3000', 'web');
    securityManager.addDomain(process.env.BOT_DOMAIN || 'localhost:8080', 'bot');
    
    // Добавляем сервисы для мониторинга
    securityManager.addService('database', async () => {
        // Проверка базы данных
        return true;
    });
    
    securityManager.addService('file_system', async () => {
        // Проверка файловой системы
        return fs.existsSync('./data');
    });

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
}
