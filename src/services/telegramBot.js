const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const UserLevel = require('../models/UserLevel');
const Achievement = require('../models/Achievement');
const TelegramUser = require('../models/TelegramUser');

class TelegramBotService {
  constructor() {
    // Initialize bot without polling
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    this.initializeCommands();
  }

  initializeCommands() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot.sendMessage(chatId, 
        'Welcome to the Learning Bot! 🎓\n\n' +
        'Available commands:\n' +
        '/connect - Link your account\n' +
        '/progress - Check your progress\n' +
        '/achievements - View your achievements\n' +
        '/streak - Check your current streak\n' +
        '/help - Show this help message\n' +
        '/settings - Manage your notification settings'
      );
    });

    // Connect command
    this.bot.onText(/\/connect/, async (msg) => {
      const chatId = msg.chat.id;
      const connectionCode = Math.random().toString(36).substring(2, 8);
      await this.bot.sendMessage(chatId, 
        `Your connection code is: ${connectionCode}\n\n` +
        'Use this code in the web app to connect your account.'
      );
    });

    // Progress command
    this.bot.onText(/\/progress/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramUser = await TelegramUser.findOne({ telegramId: chatId.toString() });
      
      if (!telegramUser) {
        return this.bot.sendMessage(chatId, 'Please connect your account first using /connect');
      }

      const userLevel = await UserLevel.findOne({ userId: telegramUser.userId });
      if (!userLevel) {
        return this.bot.sendMessage(chatId, 'No progress data found');
      }

      const progressMessage = `
📊 Your Progress:
Level: ${userLevel.level}
Experience: ${userLevel.experience}/${userLevel.experienceToNextLevel}
Streak: ${userLevel.streak} days
Achievements: ${userLevel.achievements.length}
      `.trim();

      await this.bot.sendMessage(chatId, progressMessage);
    });

    // Achievements command
    this.bot.onText(/\/achievements/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramUser = await TelegramUser.findOne({ telegramId: chatId.toString() });
      
      if (!telegramUser) {
        return this.bot.sendMessage(chatId, 'Please connect your account first using /connect');
      }

      const userLevel = await UserLevel.findOne({ userId: telegramUser.userId });
      if (!userLevel || !userLevel.achievements.length) {
        return this.bot.sendMessage(chatId, 'No achievements unlocked yet');
      }

      const achievementsList = userLevel.achievements
        .map(achievement => `${achievement.icon} ${achievement.name}\n${achievement.description}`)
        .join('\n\n');

      await this.bot.sendMessage(chatId, `🏆 Your Achievements:\n\n${achievementsList}`);
    });

    // Streak command
    this.bot.onText(/\/streak/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramUser = await TelegramUser.findOne({ telegramId: chatId.toString() });
      
      if (!telegramUser) {
        return this.bot.sendMessage(chatId, 'Please connect your account first using /connect');
      }

      const userLevel = await UserLevel.findOne({ userId: telegramUser.userId });
      if (!userLevel) {
        return this.bot.sendMessage(chatId, 'No streak data found');
      }

      const streakMessage = `
🔥 Your Streak:
Current Streak: ${userLevel.streak} days
Last Active: ${new Date(userLevel.lastActive).toLocaleDateString()}
      `.trim();

      await this.bot.sendMessage(chatId, streakMessage);
    });

    // Settings command
    this.bot.onText(/\/settings/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramUser = await TelegramUser.findOne({ telegramId: chatId.toString() });
      
      if (!telegramUser) {
        return this.bot.sendMessage(chatId, 'Please connect your account first using /connect');
      }

      const settingsMessage = `
⚙️ Your Settings:
Notifications: ${telegramUser.settings.notifications ? '✅ On' : '❌ Off'}
Sync Frequency: ${telegramUser.settings.syncFrequency}

To change settings, use:
/settings_notifications - Toggle notifications
/settings_frequency - Change sync frequency
      `.trim();

      await this.bot.sendMessage(chatId, settingsMessage);
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot.sendMessage(chatId,
        '📚 Help Guide:\n\n' +
        'Commands:\n' +
        '/start - Start the bot\n' +
        '/connect - Link your account\n' +
        '/progress - Check your progress\n' +
        '/achievements - View achievements\n' +
        '/streak - Check your streak\n' +
        '/settings - Manage settings\n' +
        '/help - Show this help message\n\n' +
        'Need more help? Contact support at support@example.com'
      );
    });
  }

  // Verify Telegram Web App data
  async verifyTelegramData(initData) {
    try {
      const data = new URLSearchParams(initData);
      const hash = data.get('hash');
      data.delete('hash');

      // Sort data alphabetically
      const dataCheckString = Array.from(data.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Create HMAC
      const secretKey = crypto.createHmac('sha256', 'WebAppData')
        .update(process.env.TELEGRAM_BOT_TOKEN)
        .digest();

      const calculatedHash = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      if (calculatedHash !== hash) {
        throw new Error('Invalid hash');
      }

      // Parse user data
      const user = {
        id: data.get('user') ? JSON.parse(data.get('user')).id : null,
        username: data.get('user') ? JSON.parse(data.get('user')).username : null,
        first_name: data.get('user') ? JSON.parse(data.get('user')).first_name : null,
        last_name: data.get('user') ? JSON.parse(data.get('user')).last_name : null
      };

      return { user };
    } catch (error) {
      console.error('Telegram data verification error:', error);
      return { user: null };
    }
  }

  // Send achievement notification
  async sendAchievementNotification(telegramId, achievement) {
    try {
      const message = `
🏆 Achievement Unlocked!
${achievement.icon} ${achievement.name}
${achievement.description}
      `.trim();

      await this.bot.sendMessage(telegramId, message);
    } catch (error) {
      console.error('Error sending achievement notification:', error);
    }
  }

  // Send level up notification
  async sendLevelUpNotification(telegramId, newLevel) {
    try {
      const message = `
🎉 Level Up!
You've reached level ${newLevel}!
Keep up the great work!
      `.trim();

      await this.bot.sendMessage(telegramId, message);
    } catch (error) {
      console.error('Error sending level up notification:', error);
    }
  }

  // Send withdrawal notification
  async sendWithdrawalNotification(telegramId, amount, status) {
    try {
      const message = `
💰 Withdrawal Update
Amount: ${amount} coins
Status: ${status}
      `.trim();

      await this.bot.sendMessage(telegramId, message);
    } catch (error) {
      console.error('Error sending withdrawal notification:', error);
    }
  }

  // Send daily bonus notification
  async sendDailyBonusNotification(telegramId, amount) {
    try {
      const message = `
🎁 Daily Bonus Claimed!
You received ${amount} coins!
Come back tomorrow for more!
      `.trim();

      await this.bot.sendMessage(telegramId, message);
    } catch (error) {
      console.error('Error sending daily bonus notification:', error);
    }
  }
}

module.exports = new TelegramBotService(); 