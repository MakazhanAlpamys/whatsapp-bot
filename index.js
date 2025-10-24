import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import express from 'express';
import database from './db.js';
import geminiService from './gemini.js';
import handlers from './handlers.js';

// Load environment variables
dotenv.config();

class WhatsAppBot {
  constructor() {
    this.client = null;
    this.isRunning = false;
    this.httpServer = null;
  }

  startHttpServer() {
    const app = express();
    const port = process.env.PORT || 10000;

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).send('OK');
    });

    // Home endpoint
    app.get('/', (req, res) => {
      res.status(200).send('WhatsApp Analytics Bot is running!');
    });

    this.httpServer = app.listen(port, '0.0.0.0', () => {
      console.log(`🌐 HTTP server started on port ${port}`);
    });
  }

  async initialize() {
    try {
      console.log('🚀 Starting WhatsApp Analytics Bot...');

      // Check required environment variables
      this.validateEnvironment();

      // Initialize database
      const dbConnected = await database.connect();
      if (!dbConnected) {
        throw new Error('Failed to connect to database');
      }

      // Initialize Gemini AI
      const geminiInitialized = await geminiService.initialize();
      if (!geminiInitialized) {
        throw new Error('Failed to initialize Gemini AI');
      }

      // Test Gemini connection
      await geminiService.testConnection();

      // Initialize WhatsApp client
      await this.initializeWhatsApp();

      console.log('✅ Bot initialization completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Bot initialization failed:', error.message);
      return false;
    }
  }

  validateEnvironment() {
    const required = ['GEMINI_API_KEY', 'DATABASE_URL'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  async initializeWhatsApp() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "whatsapp-analytics-bot"
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    // Set up event handlers
    this.setupEventHandlers();

    // Initialize the client
    await this.client.initialize();
  }

  setupEventHandlers() {
    // QR Code generation
    this.client.on('qr', (qr) => {
      console.log('📱 QR Code received, scan with WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    // Client ready
    this.client.on('ready', async () => {
      console.log('✅ WhatsApp client is ready!');
      this.isRunning = true;
      
      // Report scheduling disabled - use /report command instead
      console.log('💡 Use /report command in any group to get daily report');
    });

    // Message received
    this.client.on('message', async (message) => {
      await handlers.handleIncomingMessage(message);
    });

    // Authentication success
    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp authentication successful');
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp authentication failed:', msg);
    });

    // Client disconnected
    this.client.on('disconnected', (reason) => {
      console.log('📴 WhatsApp client disconnected:', reason);
      this.isRunning = false;
    });

    // Error handling
    this.client.on('error', (error) => {
      console.error('❌ WhatsApp client error:', error.message);
    });
  }

  async start() {
    // Start HTTP server first for Render
    this.startHttpServer();

    const initialized = await this.initialize();
    if (!initialized) {
      process.exit(1);
    }

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down bot...');
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down bot...');
      await this.shutdown();
      process.exit(0);
    });

    // Keep the process alive
    console.log('🔄 Bot is running. Press Ctrl+C to stop.');
  }

  async shutdown() {
    try {
      console.log('🔄 Shutting down HTTP server...');
      if (this.httpServer) {
        this.httpServer.close();
      }

      console.log('🔄 Disconnecting from WhatsApp...');
      if (this.client) {
        await this.client.destroy();
      }

      console.log('🔄 Disconnecting from database...');
      await database.disconnect();

      console.log('✅ Bot shutdown completed');
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
    }
  }
}

// Start the bot
const bot = new WhatsAppBot();
bot.start().catch(error => {
  console.error('❌ Failed to start bot:', error.message);
  process.exit(1);
});
