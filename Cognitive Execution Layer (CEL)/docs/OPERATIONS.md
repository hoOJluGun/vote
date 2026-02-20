# Cognitive Execution Layer (CEL) - Operations Guide

## Deployment

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- (Optional) Python 3.8+ for stats engine

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd cognitive-execution-layer

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit configuration
vim .env
```

### Configuration

Create a `.env` file with the following options:

```env
# Server Configuration
CEL_PORT=3000
CEL_HOST=127.0.0.1
CEL_NODE_ENV=production

# Rate Limiting
CEL_RATE_LIMIT_ENABLED=true
CEL_RATE_LIMIT_MAX=100

# Logging
CEL_LOG_LEVEL=info

# Stats Engine (optional)
STATS_ENGINE_URL=http://localhost:8000
```

### Starting the Server

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

### Docker Deployment

```bash
# Build image
docker build -t cel-server .

# Run container
docker run -d \
  -p 3000:3000 \
  -e CEL_NODE_ENV=production \
  --name cel \
  cel-server
```

### Docker Compose

```yaml
version: '3.8'
services:
  cel-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - CEL_NODE_ENV=production
      - CEL_RATE_LIMIT_MAX=200
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Monitoring

### Health Endpoints

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `/health` | Quick status | Load balancer checks |
| `/health/detailed` | Full diagnostics | Debugging |
| `/ready` | Readiness probe | Kubernetes |
| `/live` | Liveness probe | Kubernetes |

### Metrics

```bash
# Get request statistics
curl http://localhost:3000/metrics/requests

# Get system metrics
curl http://localhost:3000/api/metrics
```

### Logging

Logs are structured JSON for easy parsing:

```json
{
  "id": "req_1234567890_abc123",
  "type": "REQUEST",
  "method": "POST",
  "url": "/v1/cognitive/optimize",
  "ip": "127.0.0.1",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Log levels:
- `error`: System errors, failed operations
- `warn`: Rate limits, validation errors
- `info`: Normal operations
- `debug`: Detailed diagnostics (development only)

## Performance Tuning

### Rate Limiting

Adjust rate limits based on your needs:

```env
CEL_RATE_LIMIT_MAX=200      # Increase for high-traffic
CEL_RATE_LIMIT_WINDOW=900000 # 15 minutes in ms
```

### Memory Management

Monitor memory usage:

```bash
curl http://localhost:3000/health/detailed | jq '.checks[] | select(.name=="memory")'
```

If memory usage is high:
1. Check for memory leaks in custom engines
2. Reduce `maxConcurrentTasks` in OrchestrationEngine
3. Implement cleanup intervals

### Connection Handling

The server uses keep-alive connections:
- `keepAliveTimeout`: 65 seconds
- `headersTimeout`: 66 seconds

Adjust in configuration if needed.

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### High Memory Usage

1. Check health endpoint for memory details
2. Review active connections
3. Check for stuck tasks in orchestration engine

#### Rate Limiting Issues

If legitimate requests are being blocked:

```env
CEL_RATE_LIMIT_MAX=500  # Increase limit
# Or disable temporarily (not recommended for production)
CEL_RATE_LIMIT_ENABLED=false
```

### Debug Mode

Enable debug logging:

```env
CEL_LOG_LEVEL=debug
CEL_NODE_ENV=development
```

### Graceful Shutdown

The server handles shutdown gracefully:
1. Stops accepting new connections
2. Waits for active requests to complete
3. Runs shutdown hooks
4. Closes remaining connections

Shutdown timeout: 30 seconds (configurable)

## Backup and Recovery

### Configuration Backup

```bash
# Backup configuration
cp .env .env.backup
cp cel.config.json cel.config.json.backup
```

### Logs Backup

```bash
# Archive logs
tar -czf logs-$(date +%Y%m%d).tar.gz logs/
```

## Security Checklist

- [ ] Change default port if exposed publicly
- [ ] Set `CEL_NODE_ENV=production`
- [ ] Configure CORS appropriately
- [ ] Enable rate limiting
- [ ] Review sensitive data handling
- [ ] Set up HTTPS termination
- [ ] Configure firewall rules
- [ ] Regular security updates

## Scaling

### Horizontal Scaling

Use a load balancer with multiple instances:

```nginx
upstream cel_backend {
    server cel1:3000;
    server cel2:3000;
    server cel3:3000;
}

server {
    listen 80;
    location / {
        proxy_pass http://cel_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Vertical Scaling

Increase resources and adjust configuration:

```env
# More concurrent tasks
CEL_MAX_CONCURRENT_TASKS=20

# Larger rate limit
CEL_RATE_LIMIT_MAX=500
```
