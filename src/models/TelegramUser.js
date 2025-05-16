const mongoose = require('mongoose');

const telegramUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  telegramId: {
    type: String,
    required: true,
    unique: true
  },
  username: String,
  firstName: String,
  lastName: String,
  languageCode: String,
  isBot: Boolean,
  lastSync: {
    type: Date,
    default: Date.now
  },
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    syncFrequency: {
      type: String,
      enum: ['hourly', 'daily', 'weekly'],
      default: 'daily'
    }
  }
});

module.exports = mongoose.model('TelegramUser', telegramUserSchema); 