const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['level', 'streak', 'experience', 'custom'],
    required: true
  },
  requirement: {
    type: Number,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  experienceReward: {
    type: Number,
    default: 0
  }
});

// Predefined achievements
const predefinedAchievements = [
  {
    name: 'First Steps',
    description: 'Reach level 5',
    type: 'level',
    requirement: 5,
    icon: '🎯',
    rarity: 'common',
    experienceReward: 100
  },
  {
    name: 'Dedicated Learner',
    description: 'Maintain a 7-day streak',
    type: 'streak',
    requirement: 7,
    icon: '🔥',
    rarity: 'uncommon',
    experienceReward: 200
  },
  {
    name: 'Experience Master',
    description: 'Earn 1000 experience points',
    type: 'experience',
    requirement: 1000,
    icon: '⭐',
    rarity: 'rare',
    experienceReward: 500
  },
  {
    name: 'Telegram Pro',
    description: 'Connect your Telegram account',
    type: 'custom',
    requirement: 1,
    icon: '📱',
    rarity: 'common',
    experienceReward: 50
  },
  {
    name: 'Level 10 Champion',
    description: 'Reach level 10',
    type: 'level',
    requirement: 10,
    icon: '🏆',
    rarity: 'rare',
    experienceReward: 300
  },
  {
    name: 'Monthly Streak',
    description: 'Maintain a 30-day streak',
    type: 'streak',
    requirement: 30,
    icon: '🌟',
    rarity: 'epic',
    experienceReward: 1000
  }
];

// Initialize achievements if they don't exist
achievementSchema.statics.initializeAchievements = async function() {
  for (const achievement of predefinedAchievements) {
    await this.findOneAndUpdate(
      { name: achievement.name },
      achievement,
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('Achievement', achievementSchema); 