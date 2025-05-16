const express = require('express');
const router = express.Router();
const adService = require('../services/adService');
const auth = require('../middleware/auth');

// Get ad for user
router.get('/get', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const ad = await adService.getAdForUser(req.userId, type);
    
    if (!ad) {
      return res.status(404).json({ message: 'No suitable ad found' });
    }

    res.json({
      adId: ad._id,
      type: ad.type,
      platform: ad.platform,
      adUnitId: ad.adUnitId
    });
  } catch (error) {
    res.status(500).json({ message: 'Error getting ad', error: error.message });
  }
});

// Handle ad click
router.post('/click/:adId', auth, async (req, res) => {
  try {
    const success = await adService.handleAdClick(req.params.adId);
    if (!success) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    res.json({ message: 'Ad click tracked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error tracking ad click', error: error.message });
  }
});

// Handle rewarded ad completion
router.post('/reward/:adId', auth, async (req, res) => {
  try {
    const success = await adService.handleRewardedAd(req.userId, req.params.adId);
    if (!success) {
      return res.status(400).json({ message: 'Invalid ad or user' });
    }
    res.json({ message: 'Reward granted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error handling rewarded ad', error: error.message });
  }
});

// Get ad metrics (admin only)
router.get('/metrics/:adId', auth, async (req, res) => {
  try {
    const metrics = await adService.getAdMetrics(req.params.adId);
    if (!metrics) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ message: 'Error getting ad metrics', error: error.message });
  }
});

// Create new ad (admin only)
router.post('/create', auth, async (req, res) => {
  try {
    const ad = await adService.createAd(req.body);
    if (!ad) {
      return res.status(400).json({ message: 'Error creating ad' });
    }
    res.status(201).json(ad);
  } catch (error) {
    res.status(500).json({ message: 'Error creating ad', error: error.message });
  }
});

// Update ad status (admin only)
router.put('/status/:adId', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const success = await adService.updateAdStatus(req.params.adId, status);
    if (!success) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    res.json({ message: 'Ad status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating ad status', error: error.message });
  }
});

module.exports = router; 