import database from './db.js';
import geminiService from './gemini.js';

class MessageHandlers {
  constructor() {
    this.botCommandPrefix = '/bot';
    this.reportCommandPrefix = '/report';
  }

  async handleIncomingMessage(message) {
    try {
      // Skip if message is from status broadcast or system
      if (message.from === 'status@broadcast' || message.type === 'system') {
        return;
      }

      // Get chat info
      const chat = await message.getChat();
      const contact = await message.getContact();
      
      // Only process group messages
      if (!chat.isGroup) {
        return;
      }

      const chatId = chat.id._serialized;
      const userId = contact.id._serialized;
      const userName = contact.name || contact.pushname || 'Unknown';
      const messageText = message.body || '[Media/System Message]';

      // Store message in database
      await database.insertMessage(chatId, userId, userName, messageText);

      // Check if it's a bot command
      if (messageText.toLowerCase().startsWith(this.botCommandPrefix)) {
        await this.handleBotCommand(message, chat, messageText);
      }
      
      // Check if it's a report command
      if (messageText.toLowerCase().startsWith(this.reportCommandPrefix)) {
        await this.handleReportCommand(message, chat);
      }

    } catch (error) {
      console.error('❌ Error handling incoming message:', error.message);
    }
  }

  async handleReportCommand(message, chat) {
    try {
      // Send processing message
      const processingMsg = await message.reply('📊 Генерирую отчет... Это может занять до 30 секунд.');
      
      // Generate and send the report
      await this.generateAndSendDailyReport(chat);
      
      // Delete processing message
      try {
        await processingMsg.delete(true);
      } catch (e) {
        // Ignore delete errors
      }
      
    } catch (error) {
      console.error('❌ Error handling report command:', error.message);
      try {
        await message.reply('❌ Ошибка генерации отчета. Попробуйте позже.');
      } catch (replyError) {
        console.error('❌ Failed to send error reply:', replyError.message);
      }
    }
  }

  async handleBotCommand(message, chat, messageText) {
    try {
      // Extract the question from the command
      const question = messageText.substring(this.botCommandPrefix.length).trim();
      
      if (!question) {
        await message.reply('🤖 Система аналитики готова к работе. Задайте вопрос о групповой активности.\n\nПримеры:\n• /bot Какие проекты обсуждались?\n• /bot Кто был самым активным?\n• /bot Какие решения были приняты?\n• /report - получить дневной отчет');
        return;
      }

      // Send processing message
      const processingMsg = await message.reply('🤖 Анализирую данные группы... Обработка может занять до 30 секунд.');

      // Get messages from last 14 days
      const messages = await database.getMessagesByDays(chat.id._serialized, 14);

      if (messages.length === 0) {
        await processingMsg.edit('❌ Данные для анализа отсутствуют. Попробуйте позже.');
        return;
      }

      // Generate AI response
      const aiResponse = await geminiService.answerQuestion(question, messages);

      // Send the response
      await processingMsg.edit(`🤖 *АНАЛИТИЧЕСКИЙ ОТВЕТ*\n\n${aiResponse}`);

    } catch (error) {
      console.error('❌ Error handling bot command:', error.message);
      try {
        await message.reply('❌ Системная ошибка обработки запроса. Обратитесь к администратору.');
      } catch (replyError) {
        console.error('❌ Failed to send error reply:', replyError.message);
      }
    }
  }

  async generateAndSendDailyReport(chat) {
    try {
      console.log(`📊 Generating daily report for chat: ${chat.name}`);

      // Get messages from last 24 hours
      const messages = await database.getMessagesByTimeRange(chat.id._serialized, 24);

      if (messages.length === 0) {
        console.log('📊 No messages found for daily report');
        return;
      }

      // Generate AI report
      const report = await geminiService.generateDailyReport(messages);

      // Format the report with better structure
      const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Create a nicely formatted business report
      const header = `📊 *ЕЖЕДНЕВНЫЙ ДЕЛОВОЙ ОТЧЕТ*\n📅 ${timestamp} UTC\n📈 Анализ активности группы\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      
      const footer = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🤖 _WhatsApp Analytics Bot | Деловой анализ_`;

      const formattedReport = `${header}\n\n${report}${footer}`;

      // Split long messages if needed (WhatsApp limit is ~4096 characters)
      if (formattedReport.length > 4000) {
        const chunks = this.splitMessage(formattedReport, 4000);
        for (const chunk of chunks) {
          await chat.sendMessage(chunk);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between messages
        }
      } else {
        await chat.sendMessage(formattedReport);
      }
      
      console.log('✅ Daily report sent successfully');

    } catch (error) {
      console.error('❌ Error generating daily report:', error.message);
      
      // Send error notification
      try {
        await chat.sendMessage('❌ Ошибка генерации делового отчета. Проверьте логи системы.');
      } catch (sendError) {
        console.error('❌ Failed to send error notification:', sendError.message);
      }
    }
  }

  splitMessage(text, maxLength) {
    const chunks = [];
    let currentChunk = '';
    
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxLength) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = line;
        } else {
          // Line is too long, split it
          chunks.push(line.substring(0, maxLength));
          currentChunk = line.substring(maxLength);
        }
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  async cleanupOldMessages() {
    try {
      const retentionDays = parseInt(process.env.MESSAGE_RETENTION_DAYS) || 14;
      await database.cleanupOldMessages(retentionDays);
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
    }
  }
}

export default new MessageHandlers();
