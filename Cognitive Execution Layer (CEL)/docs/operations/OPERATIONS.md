# CEL Operations Guide

## System Administration

### Starting the System

#### Development Mode
```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Server will be available at http://localhost:3000
```

#### Production Mode
```bash
# Install dependencies
npm install --production

# Start production server
npm start

# Or using PM2 for process management
pm2 start ecosystem.config.js
```

### Environment Configuration

Create `config/.env` file:
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# API Keys
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE=https://openrouter.ai/api/v1

# Resource Limits
USAGE_BUDGET_LIMIT=1000000
MAX_CONCURRENT_REQUESTS=10

# Database (if applicable)
DATABASE_URL=postgresql://user:password@localhost:5432/cel_db

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Process Management

#### Using PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start src/server/index.js --name "cel-server"

# Monitor processes
pm2 list
pm2 monit

# View logs
pm2 logs cel-server

# Restart application
pm2 restart cel-server

# Stop application
pm2 stop cel-server
```

#### Using systemd (Linux)
```ini
# /etc/systemd/system/cel.service
[Unit]
Description=Cognitive Execution Layer
After=network.target

[Service]
Type=simple
User=cel-user
WorkingDirectory=/opt/cel
ExecStart=/usr/bin/node src/server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable cel.service
sudo systemctl start cel.service

# Check status
sudo systemctl status cel.service

# View logs
sudo journalctl -u cel.service -f
```

## Monitoring and Maintenance

### Health Checks

#### System Health
```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health information
curl http://localhost:3000/v1/reliability-info

# System usage statistics
curl http://localhost:3000/usage
```

#### Component Health
```bash
# Check specific components
curl http://localhost:3000/v1/stability-status
curl http://localhost:3000/v1/architecture-entropy
curl http://localhost:3000/v1/anti-stagnation-stats
```

### Log Management

#### Log Locations
```
/var/log/cel/                    # Main log directory
├── application.log             # Main application logs
├── errors.log                  # Error logs
├── audit.log                   # Security audit logs
└── metrics/                    # Performance metrics
```

#### Log Rotation
```bash
# Using logrotate configuration
# /etc/logrotate.d/cel
/opt/cel/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 cel-user cel-group
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Performance Monitoring

#### System Metrics
```bash
# CPU and Memory usage
top -p $(pgrep -f "node.*server")

# Process-specific metrics
ps aux | grep "node.*server"

# Resource limits
ulimit -a
```

#### Application Metrics
```bash
# Built-in metrics endpoint
curl http://localhost:3000/metrics

# Prometheus format metrics
curl -H "Accept: application/json" http://localhost:3000/metrics
```

## Backup and Recovery

### Data Backup Strategy

#### Configuration Backup
```bash
# Backup configuration files
tar -czf cel-config-backup-$(date +%Y%m%d).tar.gz \
    config/ \
    .env \
    package.json \
    package-lock.json

# Store in secure location
scp cel-config-backup-*.tar.gz backup-server:/backups/cel/
```

#### Database Backup (if applicable)
```bash
# PostgreSQL backup
pg_dump cel_database > cel-db-backup-$(date +%Y%m%d).sql

# MongoDB backup
mongodump --db cel_db --out /backup/mongodb/cel-$(date +%Y%m%d)

# Restore database
psql cel_database < cel-db-backup-*.sql
```

### Disaster Recovery

#### Recovery Procedure
```bash
# 1. Stop current service
pm2 stop cel-server

# 2. Restore configuration
tar -xzf cel-config-backup-latest.tar.gz -C /opt/cel/

# 3. Restore database (if needed)
psql cel_database < cel-db-backup-latest.sql

# 4. Start service
pm2 start cel-server

# 5. Verify operation
curl http://localhost:3000/health
```

## Security Operations

### Access Control

#### User Management
```bash
# Add system user
sudo useradd -r -s /bin/false cel-user

# Set proper permissions
sudo chown -R cel-user:cel-group /opt/cel/
sudo chmod -R 750 /opt/cel/
```

#### Firewall Configuration
```bash
# UFW firewall rules
sudo ufw allow 3000/tcp    # API access
sudo ufw allow 9090/tcp    # Metrics access (internal only)
sudo ufw deny from any to any port 3000  # Restrict external access

# IP whitelisting
sudo ufw allow from 192.168.1.0/24 to any port 3000
```

### Security Monitoring

#### Log Analysis
```bash
# Monitor for suspicious activity
tail -f /var/log/cel/errors.log | grep -i "error\|warning\|fail"

# Security audit logs
grep "security" /var/log/cel/audit.log

# Failed request analysis
awk '/401|403/ {print $0}' /var/log/cel/application.log
```

#### Vulnerability Scanning
```bash
# Run security audit
npm audit

# Update vulnerable packages
npm audit fix

# Detailed security report
npm audit --audit-level high
```

## Performance Tuning

### Resource Optimization

#### Node.js Tuning
```bash
# Optimize Node.js memory usage
export NODE_OPTIONS="--max-old-space-size=4096"

# Cluster mode for multi-core systems
pm2 start src/server/index.js -i max --name "cel-cluster"
```

#### Database Connection Pooling
```javascript
// config/database.js
const poolConfig = {
  max: 20,           // Maximum connections
  min: 5,            // Minimum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

### Caching Strategy

#### Redis Configuration
```bash
# Install and configure Redis
sudo apt-get install redis-server

# Redis configuration
# /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

#### Application Caching
```javascript
// Implement caching middleware
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = '__express__' + req.originalUrl || req.url;
    const cached = cache.get(key);
    
    if (cached) {
      return res.json(cached);
    } else {
      res.sendResponse = res.json;
      res.json = (body) => {
        cache.set(key, body, duration * 1000);
        res.sendResponse(body);
      };
      next();
    }
  };
};
```

## Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check if port is available
netstat -tlnp | grep :3000

# Check Node.js version
node --version

# Check environment variables
printenv | grep CEL_

# View detailed error logs
pm2 logs cel-server --lines 100
```

#### Performance Issues
```bash
# Monitor system resources
htop

# Check memory usage
free -h

# Check disk space
df -h

# Analyze slow queries (if using database)
# PostgreSQL: EXPLAIN ANALYZE
# MongoDB: db.collection.explain()
```

#### Connection Problems
```bash
# Test network connectivity
telnet localhost 3000

# Check firewall rules
sudo iptables -L

# Test SSL/TLS (if applicable)
openssl s_client -connect localhost:3000
```

### Diagnostic Commands

#### System Diagnostics
```bash
# Run built-in diagnostics
curl http://localhost:3000/v1/system-diagnostics

# Check component status
curl http://localhost:3000/v1/component-status

# Get system information
curl http://localhost:3000/v1/system-info
```

#### Application Debugging
```bash
# Enable debug mode
DEBUG=cel:* npm run dev

# Run with inspector
node --inspect src/server/index.js

# Memory profiling
node --inspect --prof src/server/index.js
```

## Update Procedures

### Version Updates

#### Minor Version Updates
```bash
# Backup current version
cp -r /opt/cel /opt/cel-backup-$(date +%Y%m%d)

# Update dependencies
npm update

# Run tests
npm test

# Restart service
pm2 restart cel-server
```

#### Major Version Updates
```bash
# 1. Create backup
tar -czf cel-full-backup-$(date +%Y%m%d).tar.gz /opt/cel/

# 2. Stop service
pm2 stop cel-server

# 3. Update codebase
cd /opt/cel
git pull origin main

# 4. Update dependencies
npm install

# 5. Run migrations (if applicable)
npm run migrate

# 6. Run tests
npm test

# 7. Start service
pm2 start cel-server

# 8. Verify operation
curl http://localhost:3000/health
```

### Rollback Procedure
```bash
# 1. Stop current service
pm2 stop cel-server

# 2. Restore from backup
rm -rf /opt/cel/*
tar -xzf cel-backup-latest.tar.gz -C /opt/cel/

# 3. Restore database (if needed)
psql cel_database < cel-db-backup-before-update.sql

# 4. Start service
pm2 start cel-server

# 5. Verify operation
curl http://localhost:3000/health
```

## Maintenance Schedule

### Daily Tasks
- [ ] Check system health and logs
- [ ] Monitor resource usage
- [ ] Review security logs
- [ ] Verify backup completion

### Weekly Tasks
- [ ] Run security scans
- [ ] Update dependencies
- [ ] Performance analysis
- [ ] Review metrics and trends

### Monthly Tasks
- [ ] Full system backup
- [ ] Database maintenance
- [ ] Security audit
- [ ] Capacity planning review

This operations guide provides comprehensive procedures for deploying, maintaining, and troubleshooting the Cognitive Execution Layer system in production environments.