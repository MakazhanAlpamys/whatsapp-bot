import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
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
    this.qrCode = null;
    this.isAuthenticated = false;
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
      const status = this.isAuthenticated ? 'authenticated ✅' : 'waiting for QR scan 📱';
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>WhatsApp Analytics Bot</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
            }
            .container {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            }
            h1 { margin-top: 0; font-size: 2.5em; }
            .status {
              font-size: 1.3em;
              margin: 20px 0;
              padding: 15px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 10px;
            }
            a {
              display: inline-block;
              margin: 10px;
              padding: 15px 30px;
              background: white;
              color: #667eea;
              text-decoration: none;
              border-radius: 10px;
              font-weight: bold;
              transition: transform 0.2s;
            }
            a:hover { transform: scale(1.05); }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🤖 WhatsApp Analytics Bot</h1>
            <div class="status">Status: ${status}</div>
            <div>
              <a href="/qr">📱 View QR Code</a>
              <a href="/status">📊 Check Status</a>
            </div>
          </div>
        </body>
        </html>
      `);
    });

    // QR Code endpoint - displays QR as image
    app.get('/qr', async (req, res) => {
      if (this.isAuthenticated) {
        res.status(200).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>WhatsApp Bot - Authenticated</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 600px;
                margin: 50px auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center;
              }
              .container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                padding: 40px;
                border-radius: 20px;
              }
              h1 { color: #4ade80; }
              a {
                display: inline-block;
                margin-top: 20px;
                padding: 15px 30px;
                background: white;
                color: #667eea;
                text-decoration: none;
                border-radius: 10px;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ Already Authenticated!</h1>
              <p>WhatsApp is already connected and ready to use.</p>
              <a href="/">← Back to Home</a>
            </div>
          </body>
          </html>
        `);
        return;
      }

      if (!this.qrCode) {
        res.status(200).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>WhatsApp Bot - QR Code</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="refresh" content="3">
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 600px;
                margin: 50px auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center;
              }
              .container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                padding: 40px;
                border-radius: 20px;
              }
              .spinner {
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top: 4px solid white;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>⏳ Waiting for QR Code...</h1>
              <div class="spinner"></div>
              <p>Please wait while WhatsApp client initializes...</p>
              <p><small>Page will auto-refresh every 3 seconds</small></p>
            </div>
          </body>
          </html>
        `);
        return;
      }

      try {
        const qrImage = await QRCode.toDataURL(this.qrCode, {
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        res.status(200).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>WhatsApp Bot - QR Code</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="refresh" content="30">
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 600px;
                margin: 50px auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-align: center;
              }
              .container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                padding: 40px;
                border-radius: 20px;
              }
              .qr-container {
                background: white;
                padding: 20px;
                border-radius: 15px;
                display: inline-block;
                margin: 20px 0;
              }
              img { border-radius: 10px; }
              .instructions {
                margin-top: 20px;
                text-align: left;
                background: rgba(255, 255, 255, 0.2);
                padding: 20px;
                border-radius: 10px;
              }
              ol { text-align: left; }
              a {
                display: inline-block;
                margin-top: 20px;
                padding: 15px 30px;
                background: white;
                color: #667eea;
                text-decoration: none;
                border-radius: 10px;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📱 Scan QR Code</h1>
              <div class="qr-container">
                <img src="${qrImage}" alt="WhatsApp QR Code" />
              </div>
              <div class="instructions">
                <h3>📋 Instructions:</h3>
                <ol>
                  <li>Open WhatsApp on your phone</li>
                  <li>Tap <strong>Menu (⋮)</strong> or <strong>Settings</strong></li>
                  <li>Tap <strong>Linked Devices</strong></li>
                  <li>Tap <strong>Link a Device</strong></li>
                  <li>Point your phone at this screen to scan the QR code</li>
                </ol>
              </div>
              <p><small>⏱ QR code refreshes every 30 seconds</small></p>
              <a href="/">← Back to Home</a>
            </div>
          </body>
          </html>
        `);
      } catch (error) {
        res.status(500).send('Error generating QR code');
      }
    });

    // Status endpoint - JSON response
    app.get('/status', (req, res) => {
      res.json({
        running: this.isRunning,
        authenticated: this.isAuthenticated,
        hasQrCode: !!this.qrCode,
        timestamp: new Date().toISOString()
      });
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
      console.log('🌐 View QR code in browser: https://whatsapp-bot-q49g.onrender.com/qr');
      qrcodeTerminal.generate(qr, { small: true });
      this.qrCode = qr;
      this.isAuthenticated = false;
    });

    // Client ready
    this.client.on('ready', async () => {
      console.log('✅ WhatsApp client is ready!');
      this.isRunning = true;
      this.isAuthenticated = true;
      this.qrCode = null;
      
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
      this.isAuthenticated = true;
      this.qrCode = null;
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
