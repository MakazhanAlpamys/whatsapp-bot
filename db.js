import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });

      // Test the connection
      const client = await this.pool.connect();
      console.log('✅ Connected to PostgreSQL database');
      client.release();
      
      this.isConnected = true;
      await this.initializeTables();
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async initializeTables() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          platform TEXT DEFAULT 'whatsapp',
          chat_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          user_name TEXT NOT NULL,
          message_text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
        CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
      `;

      await this.pool.query(createTableQuery);
      console.log('✅ Database tables initialized');
    } catch (error) {
      console.error('❌ Failed to initialize tables:', error.message);
      throw error;
    }
  }

  async insertMessage(chatId, userId, userName, messageText) {
    if (!this.isConnected) {
      console.warn('⚠️ Database not connected, skipping message insert');
      return;
    }

    try {
      const query = `
        INSERT INTO messages (chat_id, user_id, user_name, message_text)
        VALUES ($1, $2, $3, $4)
      `;
      
      await this.pool.query(query, [chatId, userId, userName, messageText]);
    } catch (error) {
      console.error('❌ Failed to insert message:', error.message);
    }
  }

  async getMessagesByTimeRange(chatId, hours = 24) {
    if (!this.isConnected) {
      console.warn('⚠️ Database not connected, returning empty array');
      return [];
    }

    try {
      const query = `
        SELECT user_id, user_name, message_text, created_at
        FROM messages
        WHERE chat_id = $1 
        AND created_at >= NOW() - INTERVAL '${hours} hours'
        ORDER BY created_at ASC
      `;
      
      const result = await this.pool.query(query, [chatId]);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to get messages:', error.message);
      return [];
    }
  }

  async getMessagesByDays(chatId, days = 14) {
    if (!this.isConnected) {
      console.warn('⚠️ Database not connected, returning empty array');
      return [];
    }

    try {
      const query = `
        SELECT user_id, user_name, message_text, created_at
        FROM messages
        WHERE chat_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY created_at ASC
      `;
      
      const result = await this.pool.query(query, [chatId]);
      return result.rows;
    } catch (error) {
      console.error('❌ Failed to get messages:', error.message);
      return [];
    }
  }

  async cleanupOldMessages(days = 14) {
    if (!this.isConnected) {
      console.warn('⚠️ Database not connected, skipping cleanup');
      return;
    }

    try {
      const query = `
        DELETE FROM messages 
        WHERE created_at < NOW() - INTERVAL '${days} days'
      `;
      
      const result = await this.pool.query(query);
      console.log(`🧹 Cleaned up ${result.rowCount} old messages`);
    } catch (error) {
      console.error('❌ Failed to cleanup old messages:', error.message);
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('📴 Disconnected from database');
    }
  }

  async reconnect() {
    console.log('🔄 Attempting to reconnect to database...');
    await this.disconnect();
    return await this.connect();
  }
}

export default new Database();
