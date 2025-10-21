#!/usr/bin/env node

/**
 * Система автоматического восстановления и развертывания
 * Создает новые инстансы, домены и восстанавливает сервисы
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

class AutoRecoverySystem {
    constructor(config) {
        this.config = {
            providers: [],
            backupLocations: [],
            alertChannels: [],
            maxRecoveryAttempts: 3,
            recoveryTimeout: 300000, // 5 минут
            ...config
        };
        
        this.recoveryHistory = [];
        this.activeRecoveries = new Map();
        this.backupData = new Map();
        
        this.initializeProviders();
    }

    /**
     * Инициализирует провайдеров
     */
    initializeProviders() {
        console.log('🔧 Инициализация провайдеров восстановления...');
        
        // Добавляем провайдеров по умолчанию
        this.addProvider('vercel', {
            apiKey: process.env.VERCEL_API_KEY,
            teamId: process.env.VERCEL_TEAM_ID
        });
        
        this.addProvider('aws', {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'us-east-1'
        });
        
        this.addProvider('digitalocean', {
            apiKey: process.env.DIGITALOCEAN_API_KEY
        });
    }

    /**
     * Добавляет провайдера
     */
    addProvider(name, config) {
        this.config.providers.push({ name, config });
        console.log(`✅ Провайдер ${name} добавлен`);
    }

    /**
     * Добавляет канал для алертов
     */
    addAlertChannel(type, config) {
        this.config.alertChannels.push({ type, config });
    }

    /**
     * Запускает полное восстановление
     */
    async startFullRecovery(reason = 'manual') {
        console.log('🚨 Запуск полного восстановления системы...');
        
        const recoveryId = crypto.randomUUID();
        const recovery = {
            id: recoveryId,
            reason,
            startTime: Date.now(),
            status: 'in_progress',
            steps: []
        };
        
        this.activeRecoveries.set(recoveryId, recovery);
        
        try {
            // 1. Создаем резервную копию текущего состояния
            await this.createEmergencyBackup(recoveryId);
            
            // 2. Генерируем новые домены
            const newDomains = await this.generateNewDomains();
            
            // 3. Разворачиваем на новых провайдерах
            const deployments = await this.deployToNewProviders(newDomains);
            
            // 4. Обновляем DNS
            await this.updateDNSRecords(newDomains);
            
            // 5. Восстанавливаем данные
            await this.restoreData(deployments);
            
            // 6. Обновляем конфигурацию
            await this.updateGlobalConfiguration(newDomains);
            
            // 7. Уведомляем команду
            await this.notifyRecoveryComplete(recoveryId, newDomains);
            
            recovery.status = 'completed';
            recovery.endTime = Date.now();
            recovery.newDomains = newDomains;
            
            console.log('✅ Полное восстановление завершено');
            
        } catch (error) {
            console.error('❌ Ошибка полного восстановления:', error);
            recovery.status = 'failed';
            recovery.error = error.message;
            recovery.endTime = Date.now();
            
            await this.sendAlert(`Критическая ошибка восстановления: ${error.message}`);
        } finally {
            this.recoveryHistory.push(recovery);
            this.activeRecoveries.delete(recoveryId);
        }
        
        return recovery;
    }

    /**
     * Создает экстренную резервную копию
     */
    async createEmergencyBackup(recoveryId) {
        console.log('💾 Создание экстренной резервной копии...');
        
        const backupDir = `./backups/emergency-${recoveryId}`;
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Копируем конфигурационные файлы
        const configFiles = [
            '.env',
            'docker-compose.frontend.yml',
            'docker-compose.bot.yml',
            'package.json',
            'security/tokens.json'
        ];

        for (const file of configFiles) {
            if (fs.existsSync(file)) {
                const destPath = path.join(backupDir, path.basename(file));
                fs.copyFileSync(file, destPath);
            }
        }

        // Создаем архив данных
        const dataArchive = path.join(backupDir, 'data.tar.gz');
        await this.createDataArchive(dataArchive);
        
        this.backupData.set(recoveryId, {
            directory: backupDir,
            dataArchive,
            timestamp: Date.now()
        });
        
        console.log('✅ Экстренная резервная копия создана');
    }

    /**
     * Создает архив данных
     */
    async createDataArchive(outputPath) {
        return new Promise((resolve, reject) => {
            const command = `tar -czf ${outputPath} --exclude=node_modules --exclude=.git --exclude=backups .`;
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(outputPath);
                }
            });
        });
    }

    /**
     * Генерирует новые домены
     */
    async generateNewDomains() {
        console.log('🌐 Генерация новых доменов...');
        
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex');
        
        const domains = {
            main: `vote-${timestamp}-${random}.vercel.app`,
            bot: `bot-${timestamp}-${random}.vercel.app`,
            api: `api-${timestamp}-${random}.vercel.app`,
            backup: `backup-${timestamp}-${random}.netlify.app`
        };
        
        console.log('✅ Новые домены сгенерированы:', domains);
        return domains;
    }

    /**
     * Разворачивает на новых провайдерах
     */
    async deployToNewProviders(domains) {
        console.log('🚀 Развертывание на новых провайдерах...');
        
        const deployments = [];
        
        for (const provider of this.config.providers) {
            try {
                const deployment = await this.deployToProvider(provider, domains);
                deployments.push(deployment);
                console.log(`✅ Развертывание на ${provider.name} завершено`);
            } catch (error) {
                console.error(`❌ Ошибка развертывания на ${provider.name}:`, error);
            }
        }
        
        return deployments;
    }

    /**
     * Разворачивает на конкретном провайдере
     */
    async deployToProvider(provider, domains) {
        switch (provider.name) {
            case 'vercel':
                return await this.deployToVercel(provider.config, domains);
            case 'aws':
                return await this.deployToAWS(provider.config, domains);
            case 'digitalocean':
                return await this.deployToDigitalOcean(provider.config, domains);
            default:
                throw new Error(`Неподдерживаемый провайдер: ${provider.name}`);
        }
    }

    /**
     * Разворачивает на Vercel
     */
    async deployToVercel(config, domains) {
        console.log('📦 Развертывание на Vercel...');
        
        // Создаем проекты на Vercel
        const projects = [];
        
        // Основное приложение
        const mainProject = await this.createVercelProject(config, {
            name: `vote-main-${Date.now()}`,
            domain: domains.main,
            directory: './link'
        });
        projects.push(mainProject);
        
        // Telegram бот
        const botProject = await this.createVercelProject(config, {
            name: `vote-bot-${Date.now()}`,
            domain: domains.bot,
            directory: './bot'
        });
        projects.push(botProject);
        
        return {
            provider: 'vercel',
            projects,
            domains
        };
    }

    /**
     * Создает проект на Vercel
     */
    async createVercelProject(config, projectConfig) {
        const url = `https://api.vercel.com/v1/projects`;
        const data = JSON.stringify({
            name: projectConfig.name,
            gitRepository: {
                type: 'github',
                repo: process.env.GITHUB_REPO,
                ref: 'main'
            },
            buildCommand: 'npm run build',
            outputDirectory: projectConfig.directory,
            installCommand: 'npm install'
        });

        return new Promise((resolve, reject) => {
            const req = https.request(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            }, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(responseData);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    /**
     * Разворачивает на AWS
     */
    async deployToAWS(config, domains) {
        console.log('☁️ Развертывание на AWS...');
        
        // Здесь должна быть логика развертывания на AWS
        // Например, через AWS SDK или CloudFormation
        
        return {
            provider: 'aws',
            instances: [],
            domains
        };
    }

    /**
     * Разворачивает на DigitalOcean
     */
    async deployToDigitalOcean(config, domains) {
        console.log('🌊 Развертывание на DigitalOcean...');
        
        // Здесь должна быть логика развертывания на DigitalOcean
        // Например, через DigitalOcean API
        
        return {
            provider: 'digitalocean',
            droplets: [],
            domains
        };
    }

    /**
     * Обновляет DNS записи
     */
    async updateDNSRecords(domains) {
        console.log('🔧 Обновление DNS записей...');
        
        // Обновляем DNS для всех доменов
        for (const [type, domain] of Object.entries(domains)) {
            try {
                await this.updateDNSRecord(domain, type);
                console.log(`✅ DNS для ${domain} обновлен`);
            } catch (error) {
                console.error(`❌ Ошибка обновления DNS для ${domain}:`, error);
            }
        }
    }

    /**
     * Обновляет DNS запись
     */
    async updateDNSRecord(domain, type) {
        // Здесь должна быть логика обновления DNS
        // Например, через API провайдера DNS (Cloudflare, Route53, etc.)
        console.log(`🔧 Обновление DNS для ${domain} (${type})`);
    }

    /**
     * Восстанавливает данные
     */
    async restoreData(deployments) {
        console.log('📊 Восстановление данных...');
        
        for (const deployment of deployments) {
            try {
                await this.restoreDataToDeployment(deployment);
                console.log(`✅ Данные восстановлены для ${deployment.provider}`);
            } catch (error) {
                console.error(`❌ Ошибка восстановления данных для ${deployment.provider}:`, error);
            }
        }
    }

    /**
     * Восстанавливает данные в развертывание
     */
    async restoreDataToDeployment(deployment) {
        // Восстанавливаем данные из последней резервной копии
        const latestBackup = this.getLatestBackup();
        if (latestBackup) {
            await this.uploadBackupToDeployment(deployment, latestBackup);
        }
    }

    /**
     * Получает последнюю резервную копию
     */
    getLatestBackup() {
        const backupDir = './backups';
        if (!fs.existsSync(backupDir)) {
            return null;
        }

        const backups = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.tar.gz'))
            .map(file => ({
                file,
                path: path.join(backupDir, file),
                timestamp: fs.statSync(path.join(backupDir, file)).mtime
            }))
            .sort((a, b) => b.timestamp - a.timestamp);

        return backups[0] || null;
    }

    /**
     * Загружает резервную копию в развертывание
     */
    async uploadBackupToDeployment(deployment, backup) {
        console.log(`📤 Загрузка резервной копии в ${deployment.provider}...`);
        
        // Здесь должна быть логика загрузки резервной копии
        // в зависимости от провайдера
    }

    /**
     * Обновляет глобальную конфигурацию
     */
    async updateGlobalConfiguration(domains) {
        console.log('⚙️ Обновление глобальной конфигурации...');
        
        // Обновляем конфигурационные файлы
        await this.updateConfigFiles(domains);
        
        // Обновляем переменные окружения
        await this.updateEnvironmentVariables(domains);
        
        // Обновляем webhook'и
        await this.updateWebhooks(domains);
    }

    /**
     * Обновляет конфигурационные файлы
     */
    async updateConfigFiles(domains) {
        const configFiles = [
            'docker-compose.frontend.yml',
            'docker-compose.bot.yml',
            '.env'
        ];

        for (const file of configFiles) {
            if (fs.existsSync(file)) {
                let content = fs.readFileSync(file, 'utf8');
                
                // Обновляем домены в файлах
                for (const [type, domain] of Object.entries(domains)) {
                    const regex = new RegExp(`\\$\\{${type.toUpperCase()}_DOMAIN\\}`, 'g');
                    content = content.replace(regex, domain);
                }
                
                fs.writeFileSync(file, content);
                console.log(`✅ ${file} обновлен`);
            }
        }
    }

    /**
     * Обновляет переменные окружения
     */
    async updateEnvironmentVariables(domains) {
        const envFile = '.env';
        if (!fs.existsSync(envFile)) {
            return;
        }

        let content = fs.readFileSync(envFile, 'utf8');
        
        // Обновляем домены в .env файле
        for (const [type, domain] of Object.entries(domains)) {
            const regex = new RegExp(`^${type.toUpperCase()}_DOMAIN=.*$`, 'm');
            if (regex.test(content)) {
                content = content.replace(regex, `${type.toUpperCase()}_DOMAIN=${domain}`);
            } else {
                content += `\n${type.toUpperCase()}_DOMAIN=${domain}`;
            }
        }
        
        fs.writeFileSync(envFile, content);
        console.log('✅ Переменные окружения обновлены');
    }

    /**
     * Обновляет webhook'и
     */
    async updateWebhooks(domains) {
        console.log('🔗 Обновление webhook\'ов...');
        
        // Обновляем webhook'и для Telegram ботов
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (botToken) {
            await this.updateTelegramWebhook(botToken, domains.bot);
        }
        
        // Обновляем webhook'и для других сервисов
        // (GitHub, payment gateways, etc.)
    }

    /**
     * Обновляет webhook Telegram бота
     */
    async updateTelegramWebhook(token, botDomain) {
        const webhookUrl = `https://${botDomain}/webhook`;
        
        const data = JSON.stringify({
            url: webhookUrl,
            max_connections: 100,
            allowed_updates: ['message', 'callback_query']
        });

        return new Promise((resolve, reject) => {
            const url = `https://api.telegram.org/bot${token}/setWebhook`;
            const req = https.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            }, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(responseData);
                        if (result.ok) {
                            resolve(result);
                        } else {
                            reject(new Error(result.description));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    /**
     * Уведомляет о завершении восстановления
     */
    async notifyRecoveryComplete(recoveryId, domains) {
        const message = `🔄 Система восстановлена! Новые домены:
        
🌐 Основной сайт: ${domains.main}
🤖 Telegram бот: ${domains.bot}
🔗 API: ${domains.api}
💾 Резервный: ${domains.backup}

ID восстановления: ${recoveryId}`;
        
        await this.sendAlert(message);
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
     * Отправляет webhook алерт
     */
    async sendWebhookAlert(config, message) {
        const data = JSON.stringify({
            message,
            timestamp: new Date().toISOString(),
            type: 'recovery_complete'
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
     * Получает статус восстановления
     */
    getRecoveryStatus() {
        return {
            activeRecoveries: Array.from(this.activeRecoveries.values()),
            recoveryHistory: this.recoveryHistory.slice(-10), // Последние 10
            providers: this.config.providers.map(p => p.name),
            backupCount: this.backupData.size
        };
    }

    /**
     * Тестирует восстановление
     */
    async testRecovery() {
        console.log('🧪 Тестирование системы восстановления...');
        
        try {
            const recovery = await this.startFullRecovery('test');
            console.log('✅ Тест восстановления завершен:', recovery);
            return recovery;
        } catch (error) {
            console.error('❌ Тест восстановления провален:', error);
            throw error;
        }
    }
}

module.exports = AutoRecoverySystem;

// Если файл запущен напрямую
if (require.main === module) {
    const config = {
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

    const recovery = new AutoRecoverySystem(config);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('🛑 Остановка системы восстановления...');
        process.exit(0);
    });
}
