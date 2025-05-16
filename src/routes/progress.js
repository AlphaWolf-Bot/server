const express = require('express');
const router = express.Router();
const UserLevel = require('../models/UserLevel');
const auth = require('../middleware/auth');
const telegramService = require('../services/telegramService');

// Get user progress
router.get('/progress', auth, async (req, res) => {
  try {
    let userLevel = await UserLevel.findOne({ userId: req.userId });
    
    if (!userLevel) {
      userLevel = new UserLevel({ userId: req.userId });
      await userLevel.save();
    }

    res.json(userLevel);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching progress', error: error.message });
  }
});

// Add experience
router.post('/experience', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    let userLevel = await UserLevel.findOne({ userId: req.userId });
    
    if (!userLevel) {
      userLevel = new UserLevel({ userId: req.userId });
    }

    const oldLevel = userLevel.level;
    await userLevel.addExperience(amount);
    await userLevel.updateStreak();

    // Notify on level up
    if (userLevel.level > oldLevel) {
      await telegramService.handleLevelUp(req.userId, userLevel.level);
    }

    res.json(userLevel);
  } catch (error) {
    res.status(500).json({ message: 'Error updating experience', error: error.message });
  }
});

// Sync progress with Telegram
router.post('/sync-telegram', auth, async (req, res) => {
  try {
    await telegramService.syncUserProgress(req.userId);
    res.json({ message: 'Progress synced with Telegram' });
  } catch (error) {
    res.status(500).json({ message: 'Error syncing progress', error: error.message });
  }
});

// Get achievements
router.get('/achievements', auth, async (req, res) => {
  try {
    const userLevel = await UserLevel.findOne({ userId: req.userId });
    if (!userLevel) {
      return res.status(404).json({ message: 'User progress not found' });
    }
    res.json(userLevel.achievements);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching achievements', error: error.message });
  }
});

module.exports = router; 