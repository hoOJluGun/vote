# 🚀 УНИВЕРСАЛЬНЫЙ МАНУАЛ РАЗВЕРТЫВАНИЯ ПРОЕКТОВ

## 🎯 ОБЗОР

Этот мануал содержит **универсальные инструкции** для развертывания любых проектов с системой безопасности и автоматического восстановления. Подходит для:

- 🌐 **Веб-приложений** (React, Vue, Angular, Node.js)
- 📱 **Мобильных приложений** (iOS, Android, React Native, Flutter)
- 🖥️ **Десктопных приложений** (Electron, Tauri, Swift, C#)
- ☁️ **Cloud приложений** (AWS, Azure, GCP, DigitalOcean)
- 🔗 **API сервисов** (REST, GraphQL, gRPC)
- 🐳 **Контейнеризованных приложений** (Docker, Kubernetes)

## 📋 ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ

### Системные Требования
- **macOS** 14.0+ (для Apple проектов)
- **Linux** Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Windows** 10/11 (с WSL2 для Linux инструментов)
- **Docker** 20.10+
- **Git** 2.30+

### Обязательные Инструменты
```bash
# Установка базовых инструментов
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Node.js (для веб-проектов)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python (для скриптов)
sudo apt-get install -y python3 python3-pip

# Go (для высокопроизводительных сервисов)
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
```

## 🏗️ АРХИТЕКТУРА СИСТЕМЫ

### Компоненты Системы
```
┌─────────────────────────────────────────────────────────────┐
│                    СИСТЕМА БЕЗОПАСНОСТИ                     │
├─────────────────────────────────────────────────────────────┤
│  🔍 МОНИТОРИНГ    │  🔄 РОТАЦИЯ    │  🚨 ВОССТАНОВЛЕНИЕ    │
│  • Health Checks  │  • Токены      │  • Auto Recovery      │
│  • Performance    │  • API Keys    │  • Domain Rotation    │
│  • Security       │  • Certificates│  • Data Restore       │
├─────────────────────────────────────────────────────────────┤
│  💾 РЕЗЕРВИРОВАНИЕ │  📱 УВЕДОМЛЕНИЯ │  ⚙️ КОНФИГУРАЦИЯ      │
│  • Auto Backup    │  • Telegram    │  • Environment        │
│  • Encryption     │  • Email       │  • Secrets            │
│  • Retention      │  • Webhooks    │  • Scaling            │
└─────────────────────────────────────────────────────────────┘
```

### Провайдеры Поддержки
- **Vercel** - Frontend и Serverless
- **AWS** - Полная облачная инфраструктура
- **DigitalOcean** - Простые VPS и Droplets
- **Google Cloud** - AI/ML и аналитика
- **Azure** - Enterprise решения
- **Heroku** - Быстрое развертывание
- **Railway** - Современная платформа
- **Fly.io** - Глобальное развертывание

## 🚀 БЫСТРОЕ РАЗВЕРТЫВАНИЕ

### 1. Клонирование Шаблона

```bash
# Клонируйте универсальный шаблон
git clone https://github.com/your-org/universal-security-template.git
cd universal-security-template

# Или используйте существующий проект
cd your-existing-project
```

### 2. Инициализация Системы Безопасности

```bash
# Запустите инициализацию
./init-security.sh

# Или для конкретного типа проекта
./init-security.sh --type=web
./init-security.sh --type=mobile
./init-security.sh --type=api
./init-security.sh --type=desktop
```

### 3. Настройка Конфигурации

```bash
# Создайте конфигурационный файл
cp config.example.yaml config.yaml

# Отредактируйте под ваши нужды
nano config.yaml
```

### 4. Развертывание

```bash
# Полное развертывание
./deploy.sh

# Или поэтапно
./deploy.sh --step=monitoring
./deploy.sh --step=security
./deploy.sh --step=recovery
```

## 📝 КОНФИГУРАЦИЯ

### Базовый config.yaml

```yaml
# Универсальная конфигурация системы безопасности
project:
  name: "your-project"
  type: "web" # web, mobile, api, desktop, cloud
  version: "1.0.0"
  description: "Описание вашего проекта"

# Домены и URL
domains:
  primary:
    web: "your-domain.com"
    api: "api.your-domain.com"
    admin: "admin.your-domain.com"
  backup:
    web: "backup.your-domain.com"
    api: "backup-api.your-domain.com"

# Провайдеры развертывания
providers:
  primary: "vercel" # vercel, aws, digitalocean, gcp, azure
  backup: "aws"
  cdn: "cloudflare"

# Мониторинг
monitoring:
  enabled: true
  interval: 30 # секунды
  endpoints:
    - url: "https://your-domain.com/health"
      type: "http"
      timeout: 10
    - url: "https://api.your-domain.com/health"
      type: "http"
      timeout: 10
  alerts:
    telegram:
      enabled: true
      bot_token: "${TELEGRAM_BOT_TOKEN}"
      chat_id: "${TELEGRAM_CHAT_ID}"
    email:
      enabled: false
      smtp_host: "smtp.gmail.com"
      smtp_port: 587
      username: "${EMAIL_USERNAME}"
      password: "${EMAIL_PASSWORD}"

# Ротация токенов
token_rotation:
  enabled: true
  interval: 86400 # 24 часа в секундах
  tokens:
    - name: "API_KEY"
      type: "api"
      length: 64
    - name: "JWT_SECRET"
      type: "jwt"
      length: 128
    - name: "ENCRYPTION_KEY"
      type: "encryption"
      length: 256

# Автоматическое восстановление
auto_recovery:
  enabled: true
  max_attempts: 3
  timeout: 300 # 5 минут
  strategies:
    - "domain_rotation"
    - "provider_failover"
    - "data_restoration"
    - "service_restart"

# Резервное копирование
backup:
  enabled: true
  interval: 300 # 5 минут
  retention: 7 # дней
  encryption: true
  locations:
    - "local"
    - "s3"
    - "gcs"

# Безопасность
security:
  ssl:
    enabled: true
    provider: "letsencrypt"
    auto_renew: true
  firewall:
    enabled: true
    rules:
      - action: "allow"
        port: 80
        protocol: "tcp"
      - action: "allow"
        port: 443
        protocol: "tcp"
      - action: "deny"
        port: 22
        protocol: "tcp"
        source: "0.0.0.0/0"
  rate_limiting:
    enabled: true
    requests_per_minute: 100
    burst_size: 200
```

## 🔧 ТИПЫ ПРОЕКТОВ

### 1. Веб-Приложения

#### React/Vue/Angular
```bash
# Инициализация для веб-проекта
./init-security.sh --type=web --framework=react

# Конфигурация
cat > config.yaml << EOF
project:
  type: "web"
  framework: "react"
  build_command: "npm run build"
  output_dir: "dist"
  
deployment:
  provider: "vercel"
  build_settings:
    framework: "create-react-app"
    output_directory: "dist"
EOF

# Развертывание
./deploy.sh
```

#### Node.js/Express
```bash
# Инициализация для Node.js
./init-security.sh --type=api --framework=express

# Конфигурация
cat > config.yaml << EOF
project:
  type: "api"
  framework: "express"
  start_command: "npm start"
  port: 3000
  
deployment:
  provider: "railway"
  environment:
    NODE_ENV: "production"
    PORT: "3000"
EOF

# Развертывание
./deploy.sh
```

### 2. Мобильные Приложения

#### React Native
```bash
# Инициализация для React Native
./init-security.sh --type=mobile --framework=react-native

# Конфигурация
cat > config.yaml << EOF
project:
  type: "mobile"
  framework: "react-native"
  platforms: ["ios", "android"]
  
deployment:
  ios:
    provider: "app-store-connect"
    bundle_id: "com.yourcompany.yourapp"
  android:
    provider: "google-play"
    package_name: "com.yourcompany.yourapp"
EOF

# Развертывание
./deploy.sh
```

#### Flutter
```bash
# Инициализация для Flutter
./init-security.sh --type=mobile --framework=flutter

# Конфигурация
cat > config.yaml << EOF
project:
  type: "mobile"
  framework: "flutter"
  platforms: ["ios", "android", "web"]
  
deployment:
  ios:
    provider: "codemagic"
  android:
    provider: "codemagic"
  web:
    provider: "firebase-hosting"
EOF

# Развертывание
./deploy.sh
```

### 3. API Сервисы

#### REST API
```bash
# Инициализация для REST API
./init-security.sh --type=api --protocol=rest

# Конфигурация
cat > config.yaml << EOF
project:
  type: "api"
  protocol: "rest"
  framework: "fastapi" # или express, django, etc.
  
endpoints:
  - path: "/health"
    method: "GET"
    response: "200"
  - path: "/api/v1/users"
    method: "GET"
    auth: "bearer"
    
deployment:
  provider: "aws"
  service: "lambda"
  runtime: "python3.9"
EOF

# Развертывание
./deploy.sh
```

#### GraphQL API
```bash
# Инициализация для GraphQL
./init-security.sh --type=api --protocol=graphql

# Конфигурация
cat > config.yaml << EOF
project:
  type: "api"
  protocol: "graphql"
  framework: "apollo-server"
  
endpoints:
  - path: "/graphql"
    method: "POST"
    introspection: true
    playground: true
    
deployment:
  provider: "heroku"
  addons:
    - "heroku-postgresql"
    - "heroku-redis"
EOF

# Развертывание
./deploy.sh
```

### 4. Десктопные Приложения

#### Electron
```bash
# Инициализация для Electron
./init-security.sh --type=desktop --framework=electron

# Конфигурация
cat > config.yaml << EOF
project:
  type: "desktop"
  framework: "electron"
  platforms: ["macos", "windows", "linux"]
  
build:
  macos:
    target: "dmg"
    identity: "Developer ID Application: Your Name"
  windows:
    target: "nsis"
    certificate: "your-certificate.p12"
  linux:
    target: "AppImage"
    
deployment:
  provider: "github-releases"
  auto_update: true
EOF

# Развертывание
./deploy.sh
```

#### Tauri
```bash
# Инициализация для Tauri
./init-security.sh --type=desktop --framework=tauri

# Конфигурация
cat > config.yaml << EOF
project:
  type: "desktop"
  framework: "tauri"
  frontend: "react"
  
build:
  bundle:
    identifier: "com.yourcompany.yourapp"
    publisher: "Your Company"
    
deployment:
  provider: "github-releases"
  signing: true
EOF

# Развертывание
./deploy.sh
```

### 5. Cloud Приложения

#### AWS
```bash
# Инициализация для AWS
./init-security.sh --type=cloud --provider=aws

# Конфигурация
cat > config.yaml << EOF
project:
  type: "cloud"
  provider: "aws"
  
infrastructure:
  compute:
    service: "ecs"
    cluster: "your-cluster"
    task_definition: "your-task"
  storage:
    service: "s3"
    bucket: "your-bucket"
  database:
    service: "rds"
    engine: "postgresql"
    instance: "db.t3.micro"
  networking:
    service: "cloudfront"
    domain: "your-domain.com"
    
deployment:
  method: "codepipeline"
  source: "github"
EOF

# Развертывание
./deploy.sh
```

#### Google Cloud
```bash
# Инициализация для GCP
./init-security.sh --type=cloud --provider=gcp

# Конфигурация
cat > config.yaml << EOF
project:
  type: "cloud"
  provider: "gcp"
  
infrastructure:
  compute:
    service: "cloud-run"
    region: "us-central1"
  storage:
    service: "cloud-storage"
    bucket: "your-bucket"
  database:
    service: "cloud-sql"
    engine: "postgresql"
    tier: "db-f1-micro"
  networking:
    service: "cloud-cdn"
    domain: "your-domain.com"
    
deployment:
  method: "cloud-build"
  source: "github"
EOF

# Развертывание
./deploy.sh
```

## 🐳 КОНТЕЙНЕРИЗАЦИЯ

### Docker

#### Базовый Dockerfile
```dockerfile
# Универсальный Dockerfile
FROM node:18-alpine

WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S app -u 1001 -G nodejs

# Меняем владельца файлов
RUN chown -R app:nodejs /app
USER app

# Открываем порт
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Запускаем приложение
CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - db
      - redis
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - app-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - app-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### Kubernetes

#### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app
  labels:
    app: your-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: your-app
  template:
    metadata:
      labels:
        app: your-app
    spec:
      containers:
      - name: your-app
        image: your-registry/your-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: your-app-service
spec:
  selector:
    app: your-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## 🔒 БЕЗОПАСНОСТЬ

### SSL/TLS Сертификаты

#### Let's Encrypt
```bash
# Автоматическое получение сертификатов
./setup-ssl.sh --provider=letsencrypt --domain=your-domain.com

# Или через Certbot
certbot certonly --webroot -w /var/www/html -d your-domain.com
```

#### Cloudflare
```bash
# Настройка Cloudflare SSL
./setup-ssl.sh --provider=cloudflare --domain=your-domain.com --api-key=${CLOUDFLARE_API_KEY}
```

### Firewall

#### UFW (Ubuntu)
```bash
# Настройка базового файрвола
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

#### iptables
```bash
# Более детальная настройка
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -j DROP
```

### Rate Limiting

#### Nginx
```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    server {
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
        }
        
        location /login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://backend;
        }
    }
}
```

## 📊 МОНИТОРИНГ

### Prometheus + Grafana

#### Prometheus Config
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'your-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: /metrics
    scrape_interval: 5s
```

#### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Your App Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

### Health Checks

#### Node.js
```javascript
const express = require('express');
const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  };
  
  res.status(200).json(health);
});

// Readiness check
app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    await db.ping();
    
    // Check external services
    await checkExternalServices();
    
    res.status(200).json({ status: 'Ready' });
  } catch (error) {
    res.status(503).json({ status: 'Not Ready', error: error.message });
  }
});
```

#### Python
```python
from flask import Flask, jsonify
import psutil
import time

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({
        'status': 'OK',
        'timestamp': time.time(),
        'uptime': time.time() - start_time,
        'memory': psutil.virtual_memory()._asdict(),
        'cpu': psutil.cpu_percent()
    })

@app.route('/ready')
def ready():
    try:
        # Check database
        db.ping()
        
        # Check external services
        check_external_services()
        
        return jsonify({'status': 'Ready'})
    except Exception as e:
        return jsonify({'status': 'Not Ready', 'error': str(e)}), 503
```

## 🚨 АВТОМАТИЧЕСКОЕ ВОССТАНОВЛЕНИЕ

### Скрипт Восстановления

```bash
#!/bin/bash
# auto-recovery.sh

set -e

# Конфигурация
BACKUP_DIR="/backups"
NEW_DOMAIN="recovery-$(date +%s)-$(openssl rand -hex 4).example.com"
PROVIDER="vercel"

# Функция логирования
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Создание резервной копии
create_backup() {
    log "Создание резервной копии..."
    tar -czf "$BACKUP_DIR/emergency-$(date +%Y%m%d-%H%M%S).tar.gz" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=backups \
        .
}

# Генерация нового домена
generate_domain() {
    log "Генерация нового домена: $NEW_DOMAIN"
    echo "$NEW_DOMAIN"
}

# Развертывание на новом домене
deploy_new_domain() {
    log "Развертывание на новом домене..."
    
    case $PROVIDER in
        "vercel")
            vercel --prod --name "$NEW_DOMAIN"
            ;;
        "aws")
            aws s3 sync . s3://"$NEW_DOMAIN" --delete
            aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"
            ;;
        "digitalocean")
            doctl apps create-deployment "$APP_ID" --force-rebuild
            ;;
    esac
}

# Обновление DNS
update_dns() {
    log "Обновление DNS записей..."
    
    # Cloudflare
    curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
        -H "Authorization: Bearer $CLOUDFLARE_API_KEY" \
        -H "Content-Type: application/json" \
        --data "{\"content\":\"$NEW_DOMAIN\"}"
}

# Уведомление команды
notify_team() {
    log "Уведомление команды..."
    
    # Telegram
    curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id=$TELEGRAM_CHAT_ID" \
        -d "text=🚨 Система восстановлена на новом домене: $NEW_DOMAIN"
    
    # Email
    echo "Система восстановлена на $NEW_DOMAIN" | \
        mail -s "Emergency Recovery" admin@yourcompany.com
}

# Основная функция
main() {
    log "Запуск автоматического восстановления..."
    
    create_backup
    generate_domain
    deploy_new_domain
    update_dns
    notify_team
    
    log "Восстановление завершено успешно"
}

# Запуск
main "$@"
```

## 📱 УВЕДОМЛЕНИЯ

### Telegram Bot

```python
import requests
import json
from datetime import datetime

class TelegramNotifier:
    def __init__(self, bot_token, chat_id):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.base_url = f"https://api.telegram.org/bot{bot_token}"
    
    def send_alert(self, message, severity="info"):
        emoji = {
            "info": "ℹ️",
            "warning": "⚠️",
            "critical": "🚨",
            "success": "✅"
        }.get(severity, "📢")
        
        text = f"{emoji} **Security Alert**\n\n{message}\n\n_Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_"
        
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "Markdown"
        }
        
        response = requests.post(f"{self.base_url}/sendMessage", json=payload)
        return response.json()
    
    def send_recovery_notification(self, new_domains):
        message = "🔄 **System Recovery Complete**\n\n"
        message += "New domains:\n"
        
        for service, domain in new_domains.items():
            message += f"• {service}: {domain}\n"
        
        return self.send_alert(message, "success")

# Использование
notifier = TelegramNotifier("YOUR_BOT_TOKEN", "YOUR_CHAT_ID")
notifier.send_alert("System is under attack!", "critical")
```

### Email Уведомления

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class EmailNotifier:
    def __init__(self, smtp_host, smtp_port, username, password):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.username = username
        self.password = password
    
    def send_alert(self, to_email, subject, message, severity="info"):
        msg = MIMEMultipart()
        msg['From'] = self.username
        msg['To'] = to_email
        msg['Subject'] = f"[{severity.upper()}] {subject}"
        
        body = f"""
        Security Alert
        
        Severity: {severity.upper()}
        Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        
        Message:
        {message}
        
        ---
        Automated Security System
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(self.smtp_host, self.smtp_port)
        server.starttls()
        server.login(self.username, self.password)
        text = msg.as_string()
        server.sendmail(self.username, to_email, text)
        server.quit()

# Использование
email_notifier = EmailNotifier(
    "smtp.gmail.com", 587,
    "your-email@gmail.com", "your-password"
)
email_notifier.send_alert(
    "admin@yourcompany.com",
    "System Under Attack",
    "Critical security breach detected!",
    "critical"
)
```

## 🧪 ТЕСТИРОВАНИЕ

### Автоматические Тесты

```bash
#!/bin/bash
# test-deployment.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Функции
log() { echo -e "${GREEN}[TEST]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Тест доступности
test_availability() {
    local url=$1
    local expected_status=$2
    
    log "Тестирование доступности: $url"
    
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" = "$expected_status" ]; then
        log "✅ $url доступен (статус: $status)"
        return 0
    else
        error "❌ $url недоступен (статус: $status, ожидался: $expected_status)"
        return 1
    fi
}

# Тест производительности
test_performance() {
    local url=$1
    local max_time=$2
    
    log "Тестирование производительности: $url"
    
    local time=$(curl -s -o /dev/null -w "%{time_total}" "$url")
    
    if (( $(echo "$time < $max_time" | bc -l) )); then
        log "✅ $url быстрый (время: ${time}s, максимум: ${max_time}s)"
        return 0
    else
        warn "⚠️ $url медленный (время: ${time}s, максимум: ${max_time}s)"
        return 1
    fi
}

# Тест безопасности
test_security() {
    local url=$1
    
    log "Тестирование безопасности: $url"
    
    # Проверка HTTPS
    if [[ $url == https://* ]]; then
        log "✅ Используется HTTPS"
    else
        warn "⚠️ Не используется HTTPS"
    fi
    
    # Проверка заголовков безопасности
    local headers=$(curl -s -I "$url")
    
    if echo "$headers" | grep -q "X-Content-Type-Options: nosniff"; then
        log "✅ X-Content-Type-Options установлен"
    else
        warn "⚠️ X-Content-Type-Options не установлен"
    fi
    
    if echo "$headers" | grep -q "X-Frame-Options"; then
        log "✅ X-Frame-Options установлен"
    else
        warn "⚠️ X-Frame-Options не установлен"
    fi
}

# Основная функция тестирования
main() {
    log "Запуск тестов развертывания..."
    
    local base_url="https://your-domain.com"
    local tests_passed=0
    local tests_total=0
    
    # Тест главной страницы
    ((tests_total++))
    if test_availability "$base_url" "200"; then
        ((tests_passed++))
    fi
    
    # Тест API
    ((tests_total++))
    if test_availability "$base_url/api/health" "200"; then
        ((tests_passed++))
    fi
    
    # Тест производительности
    ((tests_total++))
    if test_performance "$base_url" "2.0"; then
        ((tests_passed++))
    fi
    
    # Тест безопасности
    ((tests_total++))
    if test_security "$base_url"; then
        ((tests_passed++))
    fi
    
    # Результаты
    log "Тесты завершены: $tests_passed/$tests_total пройдено"
    
    if [ $tests_passed -eq $tests_total ]; then
        log "🎉 Все тесты пройдены успешно!"
        exit 0
    else
        error "❌ Некоторые тесты провалены"
        exit 1
    fi
}

# Запуск
main "$@"
```

## 📚 ДОКУМЕНТАЦИЯ

### Автогенерация Документации

```python
import os
import yaml
from datetime import datetime

class DocumentationGenerator:
    def __init__(self, config_file):
        with open(config_file, 'r') as f:
            self.config = yaml.safe_load(f)
    
    def generate_readme(self):
        readme_content = f"""# {self.config['project']['name']}

## Описание
{self.config['project']['description']}

## Быстрый старт

### Предварительные требования
- Docker 20.10+
- Node.js 18+
- Git 2.30+

### Установка
```bash
git clone {self.config['project']['repository']}
cd {self.config['project']['name']}
./deploy.sh
```

### Конфигурация
Скопируйте и отредактируйте конфигурационный файл:
```bash
cp config.example.yaml config.yaml
nano config.yaml
```

### Развертывание
```bash
./deploy.sh
```

## Мониторинг
Система автоматически мониторит:
- Доступность сервисов
- Производительность
- Безопасность
- Использование ресурсов

## Восстановление
При обнаружении проблем система автоматически:
- Создает резервные копии
- Разворачивает на новых доменах
- Обновляет DNS записи
- Уведомляет команду

## Поддержка
- Документация: {self.config['project']['docs_url']}
- Issues: {self.config['project']['issues_url']}
- Email: {self.config['project']['support_email']}

---
*Сгенерировано автоматически: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""
        
        with open('README.md', 'w', encoding='utf-8') as f:
            f.write(readme_content)
        
        print("✅ README.md сгенерирован")
    
    def generate_api_docs(self):
        if self.config['project']['type'] != 'api':
            return
        
        api_docs = f"""# API Документация

## Базовый URL
{self.config['domains']['primary']['api']}

## Аутентификация
```bash
Authorization: Bearer YOUR_TOKEN
```

## Endpoints

### Health Check
```http
GET /health
```

**Ответ:**
```json
{{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "version": "1.0.0"
}}
```

### API Endpoints
"""
        
        # Добавление специфичных для проекта endpoints
        if 'endpoints' in self.config:
            for endpoint in self.config['endpoints']:
                api_docs += f"""
#### {endpoint['path']}
```http
{endpoint['method']} {endpoint['path']}
```

**Описание:** {endpoint.get('description', 'Описание отсутствует')}

**Параметры:**
"""
                if 'parameters' in endpoint:
                    for param in endpoint['parameters']:
                        api_docs += f"- `{param['name']}` ({param['type']}): {param['description']}\n"
        
        with open('API.md', 'w', encoding='utf-8') as f:
            f.write(api_docs)
        
        print("✅ API.md сгенерирован")

# Использование
generator = DocumentationGenerator('config.yaml')
generator.generate_readme()
generator.generate_api_docs()
```

## 🎯 ЗАКЛЮЧЕНИЕ

Этот универсальный мануал предоставляет:

✅ **Полное покрытие** всех типов проектов  
✅ **Автоматизацию** развертывания и мониторинга  
✅ **Безопасность** на всех уровнях  
✅ **Восстановление** при любых сбоях  
✅ **Масштабируемость** от простых до enterprise проектов  
✅ **Документацию** и тестирование  

**Используйте этот мануал как основу для развертывания любых проектов с максимальной безопасностью и надежностью!**

---

*Создано с ❤️ для универсального развертывания проектов*
