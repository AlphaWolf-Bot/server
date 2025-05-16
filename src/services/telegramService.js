const axios = require('axios');
const TelegramUser = require('../models/TelegramUser');
const UserLevel = require('../models/UserLevel');

class TelegramService {
  constructor() {
    this.apiToken = process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = `https://api.telegram.org/bot${this.apiToken}`;
  }

  async syncUserData(telegramId) {
    try {
      const response = await axios.get(`${this.apiUrl}/getChat`, {
        params: { chat_id: telegramId }
      });

      const telegramData = response.data.result;
      const telegramUser = await TelegramUser.findOne({ telegramId });

      if (telegramUser) {
        telegramUser.username = telegramData.username;
        telegramUser.firstName = telegramData.first_name;
        telegramUser.lastName = telegramData.last_name;
        telegramUser.lastSync = new Date();
        await telegramUser.save();
      }

      return telegramUser;
    } catch (error) {
      console.error('Error syncing Telegram user data:', error);
      throw error;
    }
  }

  async sendMessage(telegramId, message) {
    try {
      await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: telegramId,
        text: message,
        parse_mode: 'HTML'
      });
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  }

  async handleLevelUp(userId, newLevel) {
    const telegramUser = await TelegramUser.findOne({ userId });
    if (telegramUser && telegramUser.settings.notifications) {
      await this.sendMessage(
        telegramUser.telegramId,
        `🎉 Congratulations! You've reached level ${newLevel}!`
      );
    }
  }

  async syncUserProgress(userId) {
    const telegramUser = await TelegramUser.findOne({ userId });
    if (!telegramUser) return;

    const userLevel = await UserLevel.findOne({ userId });
    if (!userLevel) return;

    // Sync user progress to Telegram
    const progressMessage = `
📊 Your Progress:
Level: ${userLevel.level}
Experience: ${userLevel.experience}/${userLevel.experienceToNextLevel}
Streak: ${userLevel.streak} days
    `.trim();

    await this.sendMessage(telegramUser.telegramId, progressMessage);
  }
}

module.exports = new TelegramService(); 