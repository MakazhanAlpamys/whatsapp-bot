# WhatsApp Group Analytics Bot

A powerful Node.js bot that provides AI-powered analytics and daily summaries for WhatsApp groups using Google Gemini AI and PostgreSQL.

## 🚀 Features

- **Real-time Message Monitoring**: Automatically stores all group messages in PostgreSQL
- **AI-Powered Daily Reports**: Generates comprehensive daily summaries at 23:59 UTC
- **Interactive Q&A**: Ask questions about group activity using `/bot <question>`
- **Multi-Language Support**: Automatically detects chat language and responds in the same language
- **Business-Focused Reports**: Detailed professional reports with statistics, decisions, and actionable insights
- **Smart Language Detection**: Handles mixed-language chats by detecting the majority language
- **Automatic Cleanup**: Removes messages older than 14 days to manage storage
- **Session Persistence**: Maintains WhatsApp session across restarts
- **Multi-Group Support**: Monitors and reports on multiple groups simultaneously
- **Smart Message Splitting**: Handles long reports by splitting them into multiple messages

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database (Neon, Supabase, or self-hosted)
- Google Gemini API key
- WhatsApp account for QR code scanning

## 🛠️ Installation

1. **Clone or download the project files**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp env.sample .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   DATABASE_URL=postgresql://username:password@hostname:port/database_name
   SESSION_PATH=./session.json
   BOT_NAME=AnalyticsBot
   REPORT_TIME=23:59
   MESSAGE_RETENTION_DAYS=14
   ```

## 🔧 Setup Instructions

### 1. Google Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add the key to your `.env` file as `GEMINI_API_KEY`

### 2. PostgreSQL Database Setup

#### Option A: Neon (Recommended)
1. Sign up at [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string to your `.env` file

#### Option B: Supabase
1. Sign up at [Supabase](https://supabase.com)
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string to your `.env` file

#### Option C: Self-hosted PostgreSQL
1. Install PostgreSQL locally or on a server
2. Create a database for the bot
3. Use format: `postgresql://username:password@hostname:port/database_name`

### 3. WhatsApp Setup

1. **First Run**: The bot will generate a QR code
2. **Scan QR Code**: Use WhatsApp mobile app to scan the QR code
   - Open WhatsApp > Settings > Linked Devices > Link a Device
   - Scan the QR code displayed in your terminal
3. **Session Persistence**: After first scan, the session will be saved and reused

## 🚀 Running the Bot

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## 📱 Usage

### Daily Business Reports
- **Automatic**: Professional reports generated daily at 23:59 UTC
- **Content**: Detailed statistics, project analysis, decisions made, task assignments, insights
- **Format**: Business-style reports with actionable information and recommendations
- **Delivery**: Sent directly to all monitored groups with proper formatting

### Interactive Q&A
Use the `/bot` command to ask questions:

**English:**
```
/bot What topics were discussed today?
/bot Who was most active this week?
/bot What important decisions were made?
/bot Show me the conversation about [topic]
```

**Russian:**
```
/bot Какие темы обсуждались сегодня?
/bot Кто был самым активным на этой неделе?
/bot Какие важные решения были приняты?
/bot Покажи разговор про [тема]
```

**Multi-Language Support:**
The bot automatically detects the chat language and responds in the same language. Supported languages include Russian, English, Spanish, French, German, Chinese, Arabic, and more.

## 🏗️ Project Structure

```
whatsapp-bot/
├── index.js          # Main application entry point
├── db.js             # PostgreSQL database connection and operations
├── gemini.js         # Google Gemini AI integration
├── handlers.js       # Message handling and bot commands
├── report.js         # Daily report scheduling and generation
├── package.json      # Dependencies and scripts
├── env.sample        # Environment variables template
├── BUSINESS_REPORTS_EXAMPLES.md # Business report examples and templates
├── .gitignore        # Git ignore file
└── README.md         # This file
```

## 🚀 Deployment Options

### 1. Railway (Recommended)

1. **Connect GitHub**: Link your repository to Railway
2. **Environment Variables**: Add all variables from `.env` in Railway dashboard
3. **Deploy**: Railway will automatically deploy and restart on changes

### 2. Render

1. **Create Web Service**: Connect your GitHub repository
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. **Environment Variables**: Add all variables from `.env`

### 3. VPS/Server

1. **Install Node.js 18+** on your server
2. **Clone repository** and install dependencies
3. **Set up environment variables**
4. **Use PM2** for process management:
   ```bash
   npm install -g pm2
   pm2 start index.js --name whatsapp-bot
   pm2 startup
   pm2 save
   ```

### 4. Docker

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `SESSION_PATH` | WhatsApp session file path | `./session.json` |
| `BOT_NAME` | Bot display name | `AnalyticsBot` |
| `REPORT_TIME` | Daily report time (HH:MM) | `23:59` |
| `MESSAGE_RETENTION_DAYS` | Days to keep messages | `14` |

### Customization

- **Report Time**: Change `REPORT_TIME` to your preferred timezone
- **Retention Period**: Adjust `MESSAGE_RETENTION_DAYS` for longer/shorter storage
- **Bot Commands**: Modify the `/bot` prefix in `handlers.js`

## 🛡️ Security & Best Practices

### Rate Limiting
- Built-in delays between operations to prevent rate limiting
- Automatic reconnection on disconnection
- Error handling for API failures

### Data Privacy
- Messages are stored locally in your database
- No data is sent to third parties except Google Gemini
- Automatic cleanup of old messages

### Account Safety
- Use responsibly to avoid WhatsApp restrictions
- Monitor bot activity and logs
- Implement additional rate limiting if needed

## 🐛 Troubleshooting

### Common Issues

1. **QR Code Not Appearing**
   - Check internet connection
   - Restart the bot
   - Clear session files and re-scan

2. **Database Connection Failed**
   - Verify `DATABASE_URL` format
   - Check database credentials
   - Ensure database is accessible

3. **Gemini API Errors**
   - Verify `GEMINI_API_KEY` is correct
   - Check API quota limits
   - Ensure API key has proper permissions

4. **Bot Not Responding**
   - Check if WhatsApp session is active
   - Verify bot is in the group
   - Check logs for error messages

### Logs

The bot provides detailed logging:
- ✅ Success operations
- ❌ Error messages
- 📊 Report generation
- 🔄 Connection status

## 📊 Database Schema

```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  platform TEXT DEFAULT 'whatsapp',
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## ⚠️ Disclaimer

This bot uses unofficial WhatsApp Web APIs. Use responsibly and in accordance with WhatsApp's Terms of Service. The developers are not responsible for any account restrictions or violations.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error messages
3. Ensure all environment variables are set correctly
4. Verify database and API connections

---

**Happy analyzing! 🤖📊**
