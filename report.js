import cron from 'node-cron';
import pkg from 'whatsapp-web.js';
const { Client } = pkg;
import handlers from './handlers.js';

class ReportScheduler {
  constructor(whatsappClient) {
    this.client = whatsappClient;
    this.isScheduled = false;
  }

  startScheduling() {
    if (this.isScheduled) {
      console.log('⚠️ Report scheduling already started');
      return;
    }

    // Schedule daily report at 23:59
    const reportTime = process.env.REPORT_TIME || '23:59';
    const [hour, minute] = reportTime.split(':');
    
    const cronExpression = `${minute} ${hour} * * *`;
    
    cron.schedule(cronExpression, async () => {
      console.log('🕐 Daily report time triggered');
      await this.sendReportsToAllGroups();
    }, {
      timezone: 'UTC'
    });

    // Schedule cleanup at 00:05 (5 minutes after reports)
    cron.schedule('5 0 * * *', async () => {
      console.log('🧹 Daily cleanup time triggered');
      await handlers.cleanupOldMessages();
    }, {
      timezone: 'UTC'
    });

    this.isScheduled = true;
    console.log(`✅ Report scheduling started - Reports at ${reportTime} UTC, Cleanup at 00:05 UTC`);
  }

  async sendReportsToAllGroups() {
    try {
      if (!this.client) {
        console.error('❌ WhatsApp client not available for reports');
        return;
      }

      // Get all chats
      const chats = await this.client.getChats();
      
      // Filter only group chats
      const groupChats = chats.filter(chat => chat.isGroup);
      
      console.log(`📊 Found ${groupChats.length} group chats for reports`);

      // Send reports to all groups
      for (const chat of groupChats) {
        try {
          await handlers.generateAndSendDailyReport(chat);
          
          // Add delay between reports to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Failed to send report to ${chat.name}:`, error.message);
        }
      }

      console.log('✅ Daily reports completed for all groups');
    } catch (error) {
      console.error('❌ Error sending reports to all groups:', error.message);
    }
  }

  stopScheduling() {
    cron.destroy();
    this.isScheduled = false;
    console.log('🛑 Report scheduling stopped');
  }
}

export default ReportScheduler;
