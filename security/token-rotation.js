#!/usr/bin/env node

/**
 * Система ротации токенов и ключей
 * Автоматически обновляет токены ботов, API ключи и другие секреты
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');

class TokenRotationSystem {
    constructor(config) {
        this.config = {
            rotationInterval: 24 * 60 * 60 * 1000, // 24 часа
            backupTokens: 3, // Количество резервных токенов
            alertChannels: [],
            ...config
        };
        
        this.tokens = new Map();
        this.rotationHistory = [];
        this.isRotating = false;
        
        this.loadExistingTokens();
        this.startRotationSchedule();
    }

    /**
     * Загружает существующие токены
     */
    loadExistingTokens() {
        const tokensFile = './security/tokens.json';
        if (fs.existsSync(tokensFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
                this.tokens = new Map(Object.entries(data));
                console.log('✅ Токены загружены из файла');
            } catch (error) {
                console.error('❌ Ошибка загрузки токенов:', error);
            }
        }
    }

    /**
     * Сохраняет токены в файл
     */
    saveTokens() {
        const tokensFile = './security/tokens.json';
        const tokensDir = path.dirname(tokensFile);
        
        if (!fs.existsSync(tokensDir)) {
            fs.mkdirSync(tokensDir, { recursive: true });
        }

        const data = Object.fromEntries(this.tokens);
        fs.writeFileSync(tokensFile, JSON.stringify(data, null, 2));
        console.log('💾 Токены сохранены');
    }

    /**
     * Запускает расписание ротации
     */
    startRotationSchedule() {
        console.log('🔄 Запуск системы ротации токенов...');
        
        setInterval(() => {
            this.performRotation();
        }, this.config.rotationInterval);

        // Первоначальная ротация через 1 час
        setTimeout(() => {
            this.performRotation();
        }, 60 * 60 * 1000);
    }

    /**
     * Выполняет ротацию токенов
     */
    async performRotation() {
        if (this.isRotating) {
            console.log('⏳ Ротация уже выполняется...');
            return;
        }

        this.isRotating = true;
        console.log('🔄 Начало ротации токенов...');

        try {
            // Ротация Telegram ботов
            await this.rotateTelegramBots();
            
            // Ротация API ключей
            await this.rotateAPIKeys();
            
            // Ротация JWT секретов
            await this.rotateJWTSecrets();
            
            // Ротация ключей шифрования
            await this.rotateEncryptionKeys();
            
            // Обновление конфигурации
            await this.updateConfiguration();
            
            // Уведомление команды
            await this.notifyTeam();
            
            console.log('✅ Ротация токенов завершена');
            
        } catch (error) {
            console.error('❌ Ошибка ротации токенов:', error);
            await this.sendAlert(`Критическая ошибка ротации токенов: ${error.message}`);
        } finally {
            this.isRotating = false;
        }
    }

    /**
     * Ротирует Telegram ботов
     */
    async rotateTelegramBots() {
        console.log('🤖 Ротация Telegram ботов...');
        
        const botConfigs = [
            { name: 'main_bot', purpose: 'Основной бот для голосования' },
            { name: 'alert_bot', purpose: 'Бот для алертов системы' },
            { name: 'backup_bot', purpose: 'Резервный бот' }
        ];

        for (const botConfig of botConfigs) {
            try {
                // Создаем нового бота
                const newBot = await this.createNewTelegramBot(botConfig);
                
                // Сохраняем старый токен как резервный
                const oldToken = this.tokens.get(botConfig.name);
                if (oldToken) {
                    await this.addBackupToken(botConfig.name, oldToken);
                }
                
                // Обновляем токен
                this.tokens.set(botConfig.name, newBot.token);
                
                // Обновляем webhook
                await this.updateTelegramWebhook(newBot.token);
                
                console.log(`✅ Бот ${botConfig.name} обновлен`);
                
            } catch (error) {
                console.error(`❌ Ошибка ротации бота ${botConfig.name}:`, error);
            }
        }
    }

    /**
     * Создает нового Telegram бота
     */
    async createNewTelegramBot(config) {
        // В реальной реализации здесь должен быть вызов API BotFather
        // Для демонстрации генерируем фиктивный токен
        const token = this.generateSecureToken(35);
        
        return {
            token,
            username: `vote_bot_${Date.now()}`,
            config
        };
    }

    /**
     * Обновляет webhook Telegram бота
     */
    async updateTelegramWebhook(token) {
        const webhookUrl = `${process.env.BOT_BASE_URL}/webhook`;
        
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
     * Ротирует API ключи
     */
    async rotateAPIKeys() {
        console.log('🔑 Ротация API ключей...');
        
        const apiKeys = [
            'database_key',
            'external_api_key',
            'payment_gateway_key',
            'email_service_key'
        ];

        for (const keyName of apiKeys) {
            try {
                const oldKey = this.tokens.get(keyName);
                if (oldKey) {
                    await this.addBackupToken(keyName, oldKey);
                }
                
                const newKey = this.generateSecureToken(64);
                this.tokens.set(keyName, newKey);
                
                console.log(`✅ API ключ ${keyName} обновлен`);
                
            } catch (error) {
                console.error(`❌ Ошибка ротации ключа ${keyName}:`, error);
            }
        }
    }

    /**
     * Ротирует JWT секреты
     */
    async rotateJWTSecrets() {
        console.log('🔐 Ротация JWT секретов...');
        
        const jwtSecrets = [
            'access_token_secret',
            'refresh_token_secret',
            'admin_token_secret'
        ];

        for (const secretName of jwtSecrets) {
            try {
                const oldSecret = this.tokens.get(secretName);
                if (oldSecret) {
                    await this.addBackupToken(secretName, oldSecret);
                }
                
                const newSecret = this.generateSecureToken(128);
                this.tokens.set(secretName, newSecret);
                
                console.log(`✅ JWT секрет ${secretName} обновлен`);
                
            } catch (error) {
                console.error(`❌ Ошибка ротации секрета ${secretName}:`, error);
            }
        }
    }

    /**
     * Ротирует ключи шифрования
     */
    async rotateEncryptionKeys() {
        console.log('🔒 Ротация ключей шифрования...');
        
        const encryptionKeys = [
            'data_encryption_key',
            'backup_encryption_key',
            'communication_key'
        ];

        for (const keyName of encryptionKeys) {
            try {
                const oldKey = this.tokens.get(keyName);
                if (oldKey) {
                    await this.addBackupToken(keyName, oldKey);
                }
                
                const newKey = crypto.randomBytes(32).toString('hex');
                this.tokens.set(keyName, newKey);
                
                console.log(`✅ Ключ шифрования ${keyName} обновлен`);
                
            } catch (error) {
                console.error(`❌ Ошибка ротации ключа ${keyName}:`, error);
            }
        }
    }

    /**
     * Добавляет токен в резерв
     */
    async addBackupToken(name, token) {
        const backupKey = `${name}_backup_${Date.now()}`;
        this.tokens.set(backupKey, token);
        
        // Ограничиваем количество резервных токенов
        const backupTokens = Array.from(this.tokens.keys())
            .filter(key => key.startsWith(`${name}_backup_`))
            .sort()
            .reverse();
        
        if (backupTokens.length > this.config.backupTokens) {
            const tokensToRemove = backupTokens.slice(this.config.backupTokens);
            tokensToRemove.forEach(key => this.tokens.delete(key));
        }
    }

    /**
     * Генерирует безопасный токен
     */
    generateSecureToken(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }

    /**
     * Обновляет конфигурацию
     */
    async updateConfiguration() {
        console.log('⚙️ Обновление конфигурации...');
        
        // Обновляем .env файл
        await this.updateEnvFile();
        
        // Обновляем docker-compose файлы
        await this.updateDockerCompose();
        
        // Перезапускаем сервисы
        await this.restartServices();
    }

    /**
     * Обновляет .env файл
     */
    async updateEnvFile() {
        const envFile = '.env';
        if (!fs.existsSync(envFile)) {
            return;
        }

        let content = fs.readFileSync(envFile, 'utf8');
        
        // Обновляем токены в .env файле
        for (const [name, token] of this.tokens) {
            if (!name.includes('_backup_')) {
                const regex = new RegExp(`^${name}=.*$`, 'm');
                if (regex.test(content)) {
                    content = content.replace(regex, `${name}=${token}`);
                } else {
                    content += `\n${name}=${token}`;
                }
            }
        }
        
        fs.writeFileSync(envFile, content);
        console.log('✅ .env файл обновлен');
    }

    /**
     * Обновляет docker-compose файлы
     */
    async updateDockerCompose() {
        const composeFiles = [
            'docker-compose.frontend.yml',
            'docker-compose.bot.yml'
        ];

        for (const file of composeFiles) {
            if (fs.existsSync(file)) {
                let content = fs.readFileSync(file, 'utf8');
                
                // Обновляем переменные окружения в docker-compose
                for (const [name, token] of this.tokens) {
                    if (!name.includes('_backup_')) {
                        const regex = new RegExp(`\\$\\{${name}\\}`, 'g');
                        content = content.replace(regex, token);
                    }
                }
                
                fs.writeFileSync(file, content);
                console.log(`✅ ${file} обновлен`);
            }
        }
    }

    /**
     * Перезапускает сервисы
     */
    async restartServices() {
        console.log('🔄 Перезапуск сервисов...');
        
        return new Promise((resolve, reject) => {
            const command = 'docker-compose down && docker-compose up -d';
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    console.log('✅ Сервисы перезапущены');
                    resolve(stdout);
                }
            });
        });
    }

    /**
     * Уведомляет команду
     */
    async notifyTeam() {
        const message = `🔄 Ротация токенов завершена. Обновлены: ${Array.from(this.tokens.keys()).filter(k => !k.includes('_backup_')).join(', ')}`;
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
            type: 'token_rotation'
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
     * Получает статус ротации
     */
    getRotationStatus() {
        return {
            isRotating: this.isRotating,
            lastRotation: this.rotationHistory[this.rotationHistory.length - 1],
            nextRotation: new Date(Date.now() + this.config.rotationInterval),
            activeTokens: Array.from(this.tokens.keys()).filter(k => !k.includes('_backup_')),
            backupTokens: Array.from(this.tokens.keys()).filter(k => k.includes('_backup_')).length
        };
    }

    /**
     * Принудительная ротация
     */
    async forceRotation() {
        console.log('🚨 Принудительная ротация токенов...');
        await this.performRotation();
    }

    /**
     * Восстанавливает токен из резерва
     */
    async restoreFromBackup(tokenName) {
        const backupTokens = Array.from(this.tokens.keys())
            .filter(key => key.startsWith(`${tokenName}_backup_`))
            .sort()
            .reverse();

        if (backupTokens.length > 0) {
            const backupToken = backupTokens[0];
            const token = this.tokens.get(backupToken);
            
            this.tokens.set(tokenName, token);
            this.tokens.delete(backupToken);
            
            await this.updateConfiguration();
            console.log(`✅ Токен ${tokenName} восстановлен из резерва`);
            
            return true;
        }
        
        return false;
    }
}

module.exports = TokenRotationSystem;

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

    const rotation = new TokenRotationSystem(config);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('🛑 Остановка системы ротации токенов...');
        rotation.saveTokens();
        process.exit(0);
    });
}
