#!/usr/bin/env node

/**
 * Система мониторинга и автоматического восстановления
 * Отслеживает состояние сервисов и автоматически восстанавливает их
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

class SecurityMonitoringSystem {
    constructor(config) {
        this.config = {
            checkInterval: 30000, // 30 секунд
            maxFailures: 3,
            recoveryTimeout: 60000, // 1 минута
            backupInterval: 300000, // 5 минут
            domains: [],
            services: [],
            alertChannels: [],
            ...config
        };
        
        this.failureCounts = new Map();
        this.lastBackup = Date.now();
        this.isRecovering = false;
        this.recoveryQueue = [];
        
        this.startMonitoring();
    }

    /**
     * Добавляет домен для мониторинга
     */
    addDomain(domain, type = 'web') {
        this.config.domains.push({
            domain,
            type,
            lastCheck: null,
            status: 'unknown',
            failures: 0
        });
    }

    /**
     * Добавляет сервис для мониторинга
     */
    addService(name, checkFunction) {
        this.config.services.push({
            name,
            checkFunction,
            lastCheck: null,
            status: 'unknown',
            failures: 0
        });
    }

    /**
     * Добавляет канал для алертов
     */
    addAlertChannel(type, config) {
        this.config.alertChannels.push({ type, config });
    }

    /**
     * Запускает мониторинг
     */
    startMonitoring() {
        console.log('🔍 Запуск системы мониторинга безопасности...');
        
        // Проверка доменов
        setInterval(() => {
            this.checkDomains();
        }, this.config.checkInterval);

        // Проверка сервисов
        setInterval(() => {
            this.checkServices();
        }, this.config.checkInterval);

        // Резервное копирование
        setInterval(() => {
            this.createBackup();
        }, this.config.backupInterval);

        // Обработка очереди восстановления
        setInterval(() => {
            this.processRecoveryQueue();
        }, 10000);

        console.log('✅ Система мониторинга запущена');
    }

    /**
     * Проверяет доступность доменов
     */
    async checkDomains() {
        for (const domainConfig of this.config.domains) {
            try {
                const isHealthy = await this.checkDomainHealth(domainConfig.domain);
                
                if (isHealthy) {
                    domainConfig.status = 'healthy';
                    domainConfig.failures = 0;
                    this.failureCounts.delete(domainConfig.domain);
                } else {
                    domainConfig.status = 'unhealthy';
                    domainConfig.failures++;
                    
                    if (domainConfig.failures >= this.config.maxFailures) {
                        await this.handleDomainFailure(domainConfig);
                    }
                }
                
                domainConfig.lastCheck = new Date();
            } catch (error) {
                console.error(`❌ Ошибка проверки домена ${domainConfig.domain}:`, error.message);
                domainConfig.status = 'error';
                domainConfig.failures++;
            }
        }
    }

    /**
     * Проверяет здоровье домена
     */
    async checkDomainHealth(domain) {
        return new Promise((resolve) => {
            const options = {
                hostname: domain,
                port: 443,
                path: '/health',
                method: 'GET',
                timeout: 10000,
                rejectUnauthorized: false
            };

            const req = https.request(options, (res) => {
                resolve(res.statusCode === 200);
            });

            req.on('error', () => {
                resolve(false);
            });

            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });

            req.end();
        });
    }

    /**
     * Обрабатывает сбой домена
     */
    async handleDomainFailure(domainConfig) {
        console.log(`🚨 Критический сбой домена: ${domainConfig.domain}`);
        
        // Отправляем алерт
        await this.sendAlert(`Критический сбой домена ${domainConfig.domain}. Запуск процедуры восстановления.`);
        
        // Добавляем в очередь восстановления
        this.recoveryQueue.push({
            type: 'domain',
            config: domainConfig,
            timestamp: Date.now(),
            priority: 'high'
        });
    }

    /**
     * Проверяет сервисы
     */
    async checkServices() {
        for (const service of this.config.services) {
            try {
                const isHealthy = await service.checkFunction();
                
                if (isHealthy) {
                    service.status = 'healthy';
                    service.failures = 0;
                } else {
                    service.status = 'unhealthy';
                    service.failures++;
                    
                    if (service.failures >= this.config.maxFailures) {
                        await this.handleServiceFailure(service);
                    }
                }
                
                service.lastCheck = new Date();
            } catch (error) {
                console.error(`❌ Ошибка проверки сервиса ${service.name}:`, error.message);
                service.status = 'error';
                service.failures++;
            }
        }
    }

    /**
     * Обрабатывает сбой сервиса
     */
    async handleServiceFailure(service) {
        console.log(`🚨 Критический сбой сервиса: ${service.name}`);
        
        await this.sendAlert(`Критический сбой сервиса ${service.name}. Запуск процедуры восстановления.`);
        
        this.recoveryQueue.push({
            type: 'service',
            config: service,
            timestamp: Date.now(),
            priority: 'high'
        });
    }

    /**
     * Обрабатывает очередь восстановления
     */
    async processRecoveryQueue() {
        if (this.isRecovering || this.recoveryQueue.length === 0) {
            return;
        }

        this.isRecovering = true;
        
        // Сортируем по приоритету
        this.recoveryQueue.sort((a, b) => {
            if (a.priority === 'high' && b.priority !== 'high') return -1;
            if (b.priority === 'high' && a.priority !== 'high') return 1;
            return a.timestamp - b.timestamp;
        });

        const recovery = this.recoveryQueue.shift();
        
        try {
            await this.executeRecovery(recovery);
        } catch (error) {
            console.error('❌ Ошибка восстановления:', error);
            // Возвращаем в очередь с задержкой
            setTimeout(() => {
                this.recoveryQueue.push(recovery);
            }, 60000);
        } finally {
            this.isRecovering = false;
        }
    }

    /**
     * Выполняет восстановление
     */
    async executeRecovery(recovery) {
        console.log(`🔄 Выполнение восстановления: ${recovery.type}`);
        
        switch (recovery.type) {
            case 'domain':
                await this.recoverDomain(recovery.config);
                break;
            case 'service':
                await this.recoverService(recovery.config);
                break;
            default:
                console.log('❓ Неизвестный тип восстановления:', recovery.type);
        }
    }

    /**
     * Восстанавливает домен
     */
    async recoverDomain(domainConfig) {
        console.log(`🌐 Восстановление домена: ${domainConfig.domain}`);
        
        // 1. Генерируем новый домен
        const newDomain = await this.generateNewDomain();
        
        // 2. Обновляем DNS
        await this.updateDNS(newDomain);
        
        // 3. Разворачиваем на новом домене
        await this.deployToNewDomain(newDomain);
        
        // 4. Обновляем конфигурацию
        await this.updateConfiguration(domainConfig.domain, newDomain);
        
        // 5. Уведомляем команду
        await this.notifyTeam(newDomain);
        
        console.log(`✅ Домен восстановлен: ${newDomain}`);
    }

    /**
     * Генерирует новый домен
     */
    async generateNewDomain() {
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex');
        return `vote-${timestamp}-${random}.example.com`;
    }

    /**
     * Обновляет DNS
     */
    async updateDNS(newDomain) {
        console.log(`🔧 Обновление DNS для ${newDomain}`);
        // Здесь должна быть логика обновления DNS
        // Например, через API провайдера DNS
    }

    /**
     * Разворачивает на новом домене
     */
    async deployToNewDomain(newDomain) {
        console.log(`🚀 Развертывание на новом домене: ${newDomain}`);
        
        // Обновляем переменные окружения
        const envUpdate = {
            WEB_DOMAIN: newDomain,
            BOT_DOMAIN: `bot-${newDomain}`
        };
        
        // Перезапускаем контейнеры
        await this.restartContainers(envUpdate);
    }

    /**
     * Перезапускает контейнеры
     */
    async restartContainers(envVars) {
        return new Promise((resolve, reject) => {
            const command = `docker-compose down && docker-compose up -d`;
            exec(command, { env: { ...process.env, ...envVars } }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    /**
     * Обновляет конфигурацию
     */
    async updateConfiguration(oldDomain, newDomain) {
        console.log(`⚙️ Обновление конфигурации: ${oldDomain} -> ${newDomain}`);
        
        // Обновляем конфигурационные файлы
        const configFiles = [
            'docker-compose.frontend.yml',
            'docker-compose.bot.yml',
            '.env'
        ];
        
        for (const file of configFiles) {
            await this.updateConfigFile(file, oldDomain, newDomain);
        }
    }

    /**
     * Обновляет конфигурационный файл
     */
    async updateConfigFile(filePath, oldDomain, newDomain) {
        try {
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                content = content.replace(new RegExp(oldDomain, 'g'), newDomain);
                fs.writeFileSync(filePath, content);
            }
        } catch (error) {
            console.error(`❌ Ошибка обновления файла ${filePath}:`, error);
        }
    }

    /**
     * Уведомляет команду
     */
    async notifyTeam(newDomain) {
        const message = `🔄 Система автоматически восстановлена на новом домене: ${newDomain}`;
        await this.sendAlert(message);
    }

    /**
     * Создает резервную копию
     */
    async createBackup() {
        const backupDir = './backups';
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `backup-${timestamp}.tar.gz`);

        return new Promise((resolve, reject) => {
            const command = `tar -czf ${backupFile} --exclude=node_modules --exclude=.git .`;
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    this.lastBackup = Date.now();
                    console.log(`💾 Резервная копия создана: ${backupFile}`);
                    resolve(backupFile);
                }
            });
        });
    }

    /**
     * Отправляет алерт
     */
    async sendAlert(message) {
        console.log(`📢 АЛЕРТ: ${message}`);
        
        for (const channel of this.config.alertChannels) {
            try {
                switch (channel.type) {
                    case 'telegram':
                        await this.sendTelegramAlert(channel.config, message);
                        break;
                    case 'email':
                        await this.sendEmailAlert(channel.config, message);
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
     * Отправляет email алерт
     */
    async sendEmailAlert(config, message) {
        // Здесь должна быть логика отправки email
        console.log(`📧 Email алерт: ${message}`);
    }

    /**
     * Отправляет webhook алерт
     */
    async sendWebhookAlert(config, message) {
        const data = JSON.stringify({
            message,
            timestamp: new Date().toISOString(),
            level: 'critical'
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
     * Получает статус системы
     */
    getSystemStatus() {
        return {
            domains: this.config.domains.map(d => ({
                domain: d.domain,
                status: d.status,
                lastCheck: d.lastCheck,
                failures: d.failures
            })),
            services: this.config.services.map(s => ({
                name: s.name,
                status: s.status,
                lastCheck: s.lastCheck,
                failures: s.failures
            })),
            recoveryQueue: this.recoveryQueue.length,
            isRecovering: this.isRecovering,
            lastBackup: this.lastBackup
        };
    }
}

module.exports = SecurityMonitoringSystem;

// Если файл запущен напрямую
if (require.main === module) {
    const config = {
        domains: [
            { domain: 'your-domain.com', type: 'web' }
        ],
        services: [
            {
                name: 'database',
                checkFunction: async () => {
                    // Проверка базы данных
                    return true;
                }
            }
        ],
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

    const monitoring = new SecurityMonitoringSystem(config);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('🛑 Остановка системы мониторинга...');
        process.exit(0);
    });
}
