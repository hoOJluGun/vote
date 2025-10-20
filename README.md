# 🇺🇦 Ukraine Children Voting System

This project helps raise funds for Ukrainian children with cancer by allowing people to vote for which child should receive treatment support.

## 📁 Project Structure

```
vote/
├── bot/          # Telegram bot (separate repository for deployment)
└── link/         # Main web application and API
```

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)
- **Main Application**: Deploy `link/` directory to Vercel as a static site with serverless functions
- **Telegram Bot**: Deploy `bot/` directory to Vercel as a separate project

### Option 2: Amazon Lightsail
Amazon Lightsail is suitable for deploying this application. It offers:

- **Pre-configured Node.js instances**
- **Container deployment support**
- **Fixed monthly pricing**
- **1 TB data transfer**
- **Easy management**
- **Asia Pacific data centers**

#### Deploying to Lightsail:
1. Create a Lightsail instance with Node.js blueprint
2. Upload application files via SSH or Git
3. Configure environment variables
4. Set up domain and SSL certificate if needed

## 📦 Components

### Main Web Application (`link/`)
- Static HTML/CSS/JS frontend
- Node.js server with API endpoints
- File-based database for storing votes
- Responsive design for all devices

### Telegram Bot (`bot/`)
- Separate project that can be deployed independently
- Communicates with main application via API
- Provides voting interface through Telegram

## 🛠️ Deployment Instructions

### For Vercel:
1. Deploy `link/` as main project
2. Deploy `bot/` as separate project
3. Set environment variables in both projects
4. Configure webhook for Telegram bot

### For Amazon Lightsail:
1. Create Node.js instance on Lightsail ($5/month plan recommended)
2. Upload files to instance using SSH or Git
3. Install dependencies: `npm install`
4. Set environment variables in the instance
5. Run with: `npm start` or use PM2 for process management
6. Configure domain and SSL if needed

## 🔧 Environment Variables

### Main Application:
- `PORT` - Port to run server on (default: 8000)

### Telegram Bot:
- `TELEGRAM_BOT_TOKEN` - Token for Telegram bot from @BotFather
- `API_BASE_URL` - URL for main application API (e.g., https://your-main-app.vercel.app/api)

## 🎯 Features

- Vote for children needing cancer treatment
- Real-time statistics and progress tracking
- Responsive web interface
- Telegram bot integration
- Multi-language support (Ukrainian)
- File-based persistent storage

## 🤖 Telegram Bot Commands

- `/start` - Welcome message and instructions
- `/help` - Help information
- `/children` - List all children needing help
- `/vote` - Vote for a child
- `/stats` - View system statistics

Both components are ready for deployment and have been tested locally.