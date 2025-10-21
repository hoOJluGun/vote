# 🧪 Deployment Testing

## Testing the Main Application

1. Run the server locally:
   ```bash
   cd link
   npm install
   npm start
   ```

2. Visit http://localhost:8000 in your browser
3. Test API endpoints:
   - http://localhost:8000/api/health
   - http://localhost:8000/api/children
   - http://localhost:8000/api/stats

4. Test voting functionality:
   ```bash
   curl -X POST http://localhost:8000/api/submit-vote -H "Content-Type: application/json" -d '{"childId": 1}'
   ```

## Testing the Telegram Bot

1. Set environment variables:
   ```bash
   export TELEGRAM_BOT_TOKEN=your_token_here
   export API_BASE_URL=http://localhost:8000/api
   ```

2. Run the bot:
   ```bash
   cd bot
   npm install
   npm start
   ```

3. Test bot commands in Telegram:
   - `/start`
   - `/help`
   - `/children`
   - `/vote`
   - `/stats`

## Verifying Integration

1. Make sure both the main application and bot are running
2. Vote through the web interface and check if it's reflected in bot statistics
3. Vote through the bot and check if it's reflected in web interface statistics
4. Verify that data is persisted in the file-based database

## Common Issues

### Vercel Deployment Issues
- Make sure all environment variables are set correctly
- Check that the vercel.json configuration is correct
- Ensure the build process completes without errors

### Telegram Bot Issues
- Verify that TELEGRAM_BOT_TOKEN is correct
- Check that API_BASE_URL points to the correct endpoint
- Make sure the webhook is properly set up

### Lightsail Deployment Issues
- Ensure Node.js is properly installed
- Check that all dependencies are installed
- Verify that security groups allow traffic on the required ports