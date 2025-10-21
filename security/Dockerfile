FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем системные зависимости
RUN apk add --no-cache \
    curl \
    tar \
    gzip \
    openssl \
    docker-cli

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Создаем необходимые директории
RUN mkdir -p /app/backups /app/data /app/security/reports

# Устанавливаем права доступа
RUN chmod +x start-security.js

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S security -u 1001 -G nodejs

# Меняем владельца файлов
RUN chown -R security:nodejs /app

# Переключаемся на пользователя security
USER security

# Открываем порт
EXPOSE 3001

# Добавляем health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node health-check.js

# Запускаем систему безопасности
CMD ["node", "start-security.js"]
