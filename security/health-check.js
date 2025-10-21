#!/usr/bin/env node

/**
 * Health check для системы безопасности
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/health',
    method: 'GET',
    timeout: 5000
};

const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
        console.log('✅ Система безопасности работает');
        process.exit(0);
    } else {
        console.log(`❌ Система безопасности недоступна: ${res.statusCode}`);
        process.exit(1);
    }
});

req.on('error', (error) => {
    console.log(`❌ Ошибка подключения к системе безопасности: ${error.message}`);
    process.exit(1);
});

req.on('timeout', () => {
    console.log('❌ Таймаут подключения к системе безопасности');
    req.destroy();
    process.exit(1);
});

req.end();
