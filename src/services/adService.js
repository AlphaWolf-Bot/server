const Ad = require('../models/Ad');
const User = require('../models/User');
const realtimeService = require('./realtimeService');

class AdService {
  constructor() {
    this.rewardMultiplier = 1.5; // Experience multiplier for watching ads
  }

  async getAdForUser(userId, adType) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get a random active ad of the specified type
    const ad = await Ad.aggregate([
      { $match: { 
        status: 'active',
        type: adType,
        targetLevel: { $lte: user.level },
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      }},
      { $sample: { size: 1 } }
    ]);

    return ad[0] || null;
  }

  async recordAdClick(adId, userId) {
    const ad = await Ad.findById(adId);
    if (!ad) {
      throw new Error('Ad not found');
    }

    ad.clicks.push({
      userId,
      timestamp: new Date()
    });

    await ad.save();
    return ad;
  }

  async processAdReward(adId, userId) {
    const ad = await Ad.findById(adId);
    if (!ad) {
      throw new Error('Ad not found');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Record the view
    ad.views.push({
      userId,
      timestamp: new Date()
    });

    // Grant reward to user
    if (ad.rewardType === 'points') {
      user.points += ad.rewardAmount;
    } else if (ad.rewardType === 'premium') {
      user.premiumDays += ad.rewardAmount;
    }

    await Promise.all([ad.save(), user.save()]);
    return { ad, user };
  }

  async getAdMetrics(adId) {
    const ad = await Ad.findById(adId);
    if (!ad) {
      throw new Error('Ad not found');
    }

    return {
      totalViews: ad.views.length,
      totalClicks: ad.clicks.length,
      uniqueViewers: new Set(ad.views.map(v => v.userId.toString())).size,
      uniqueClickers: new Set(ad.clicks.map(c => c.userId.toString())).size,
      ctr: ad.views.length > 0 ? (ad.clicks.length / ad.views.length) * 100 : 0
    };
  }

  async createAd(adData) {
    const ad = new Ad(adData);
    await ad.save();
    return ad;
  }

  async updateAdStatus(adId, status) {
    const ad = await Ad.findById(adId);
    if (!ad) {
      throw new Error('Ad not found');
    }

    ad.status = status;
    await ad.save();
    return ad;
  }
}

module.exports = new AdService(); 