const mongoose = require('mongoose');

const userLevelSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  level: {
    type: Number,
    default: 1
  },
  experience: {
    type: Number,
    default: 0
  },
  experienceToNextLevel: {
    type: Number,
    default: 100
  },
  achievements: [{
    name: String,
    description: String,
    unlockedAt: Date
  }],
  lastActive: {
    type: Date,
    default: Date.now
  },
  streak: {
    type: Number,
    default: 0
  },
  lastStreakUpdate: {
    type: Date,
    default: Date.now
  }
});

// Method to add experience and handle level up
userLevelSchema.methods.addExperience = async function(amount) {
  this.experience += amount;
  
  while (this.experience >= this.experienceToNextLevel) {
    this.level += 1;
    this.experience -= this.experienceToNextLevel;
    this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * 1.5);
  }
  
  await this.save();
  return this;
};

// Method to update streak
userLevelSchema.methods.updateStreak = async function() {
  const now = new Date();
  const lastUpdate = new Date(this.lastStreakUpdate);
  const daysDiff = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));

  if (daysDiff === 1) {
    this.streak += 1;
  } else if (daysDiff > 1) {
    this.streak = 1;
  }

  this.lastStreakUpdate = now;
  await this.save();
  return this;
};

module.exports = mongoose.model('UserLevel', userLevelSchema); 