# 🚀 Deployment Instructions

## Prerequisites
1. GitHub account
2. Vercel account (linked to GitHub)

## Deploying the Main Application (link/)

1. Create a new repository on GitHub for the main application
2. Push the contents of the `link/` directory to this repository
3. Go to Vercel dashboard
4. Click "New Project"
5. Import your GitHub repository
6. Configure the project:
   - Framework Preset: Other
   - Root Directory: leave empty
   - Build Command: `npm run build`
   - Output Directory: `public`
7. Add environment variables if needed
8. Deploy

## Deploying the Telegram Bot (bot/)

1. Create a new repository on GitHub for the Telegram bot
2. Push the contents of the `bot/` directory to this repository
3. Go to Vercel dashboard
4. Click "New Project"
5. Import your GitHub repository
6. Configure the project:
   - Framework Preset: Other
   - Root Directory: leave empty
   - Build Command: leave empty (not needed)
   - Output Directory: leave empty (not needed)
7. Add environment variables:
   - `TELEGRAM_BOT_TOKEN` - Your bot token from @BotFather
   - `API_BASE_URL` - URL of your main application API
8. Deploy

## Setting up the Telegram Bot Webhook

After deploying the bot, you need to set up the webhook:

1. Visit your deployed bot URL: `https://your-bot-url.vercel.app/api/webhook`
2. This will automatically register the webhook with Telegram

## Amazon Lightsail Deployment (Alternative)

If you prefer to use Amazon Lightsail instead of Vercel:

### For Main Application:
1. Create a Node.js instance on Lightsail
2. Upload the contents of `link/` directory to the instance
3. SSH into the instance
4. Run:
   ```bash
   npm install
   npm start
   ```

### For Telegram Bot:
1. Create a Node.js instance on Lightsail
2. Upload the contents of `bot/` directory to the instance
3. SSH into the instance
4. Set environment variables:
   ```bash
   export TELEGRAM_BOT_TOKEN=your_token_here
   export API_BASE_URL=https://your-main-app-url
   ```
5. Run:
   ```bash
   npm install
   npm start
   ```

## Environment Variables

### Main Application:
- `PORT` - Port to run server on (default: 8000)

### Telegram Bot:
- `TELEGRAM_BOT_TOKEN` - Token from @BotFather
- `API_BASE_URL` - URL of main application API