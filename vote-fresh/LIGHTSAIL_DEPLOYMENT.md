# 🚀 Amazon Lightsail Deployment Instructions

## Prerequisites
1. AWS account
2. SSH key pair
3. Telegram bot token (from @BotFather)

## Step 1: Create Lightsail Instances

### Main Application Instance
1. Go to AWS Lightsail console
2. Click "Create instance"
3. Select "Node.js" blueprint
4. Choose instance plan (USD 5/month recommended for testing)
5. Name your instance (e.g., "vote-main")
6. Create the instance

### Telegram Bot Instance
1. Repeat the process above
2. Name your instance (e.g., "vote-bot")
3. Create the instance

## Step 2: Deploy Main Application

1. Connect to your main instance via SSH
2. Update system packages:
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   ```

3. Upload application files (you can use SCP or Git):
   ```bash
   # Option 1: Clone from GitHub
   git clone https://github.com/hoOJluGun/vote.git
   cd vote/link
   
   # Option 2: Upload via SCP
   # scp -i your-key.pem -r link/* ubuntu@your-instance-ip:/home/ubuntu/vote
   ```

4. Install dependencies:
   ```bash
   cd /home/ubuntu/vote/link
   npm install
   ```

5. Create a systemd service file:
   ```bash
   sudo nano /etc/systemd/system/vote-main.service
   ```
   
   Add the following content:
   ```ini
   [Unit]
   Description=Ukraine Children Voting System
   After=network.target

   [Service]
   Type=simple
   User=ubuntu
   WorkingDirectory=/home/ubuntu/vote/link
   ExecStart=/usr/bin/npm start
   Restart=always
   RestartSec=10
   Environment=PORT=8000

   [Install]
   WantedBy=multi-user.target
   ```

6. Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable vote-main
   sudo systemctl start vote-main
   ```

7. Check service status:
   ```bash
   sudo systemctl status vote-main
   ```

## Step 3: Deploy Telegram Bot

1. Connect to your bot instance via SSH
2. Update system packages:
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   ```

3. Upload bot files:
   ```bash
   # Option 1: Clone from GitHub
   git clone https://github.com/hoOJluGun/vote.git
   cd vote/bot
   
   # Option 2: Upload via SCP
   # scp -i your-key.pem -r bot/* ubuntu@your-bot-instance-ip:/home/ubuntu/bot
   ```

4. Install dependencies:
   ```bash
   cd /home/ubuntu/vote/bot
   npm install
   ```

5. Create environment variables file:
   ```bash
   nano /home/ubuntu/vote/bot/.env
   ```
   
   Add your configuration:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   API_BASE_URL=http://your-main-instance-ip:8000/api
   ```

6. Create a systemd service file:
   ```bash
   sudo nano /etc/systemd/system/vote-bot.service
   ```
   
   Add the following content:
   ```ini
   [Unit]
   Description=Ukraine Children Telegram Bot
   After=network.target

   [Service]
   Type=simple
   User=ubuntu
   WorkingDirectory=/home/ubuntu/vote/bot
   ExecStart=/usr/bin/npm start
   Restart=always
   RestartSec=10
   Environment=TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   Environment=API_BASE_URL=http://your-main-instance-ip:8000/api

   [Install]
   WantedBy=multi-user.target
   ```

7. Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable vote-bot
   sudo systemctl start vote-bot
   ```

8. Check service status:
   ```bash
   sudo systemctl status vote-bot
   ```

## Step 4: Set up Webhooks

1. Once both services are running, set up the Telegram webhook:
   ```bash
   # On your bot instance
   curl http://localhost:3000/api/webhook
   ```

   Or manually:
   ```bash
   curl "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://your-bot-instance-ip/api/webhook"
   ```

## Step 5: Configure Networking (if needed)

1. In the Lightsail console, go to your instance
2. Click on "Networking" tab
3. Add static IP if you haven't already
4. Open ports if needed:
   - Port 8000 for main application
   - Port 443 for HTTPS (if using SSL)
   - Port 22 for SSH (should be open by default)

## Step 6: Testing

1. Visit your main instance IP on port 8000:
   ```
   http://your-main-instance-ip:8000
   ```

2. Test API endpoints:
   ```
   http://your-main-instance-ip:8000/api/health
   http://your-main-instance-ip:8000/api/children
   http://your-main-instance-ip:8000/api/stats
   ```

3. Test voting:
   ```bash
   curl -X POST http://your-main-instance-ip:8000/api/submit-vote \
        -H "Content-Type: application/json" \
        -d '{"childId": 1}'
   ```

4. Test bot commands in Telegram

## Environment Variables

### Main Application
- `PORT` - Port to run server on (default: 8000)

### Telegram Bot
- `TELEGRAM_BOT_TOKEN` - Token from @BotFather
- `API_BASE_URL` - URL of main application API (e.g., http://your-main-instance-ip:8000/api)

## Troubleshooting

1. Check service logs:
   ```bash
   sudo journalctl -u vote-main -f
   sudo journalctl -u vote-bot -f
   ```

2. Restart services if needed:
   ```bash
   sudo systemctl restart vote-main
   sudo systemctl restart vote-bot
   ```

3. Check if ports are open:
   ```bash
   sudo netstat -tlnp | grep :8000
   ```

## Optional: Set up SSL with Let's Encrypt

1. Install Certbot:
   ```bash
   sudo apt-get install certbot -y
   ```

2. Obtain SSL certificate:
   ```bash
   sudo certbot certonly --standalone -d your-domain.com
   ```

3. Configure reverse proxy (nginx) to serve with SSL