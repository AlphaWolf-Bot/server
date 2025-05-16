const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['banner', 'interstitial', 'rewarded']
  },
  content: {
    type: String,
    required: true
  },
  targetLevel: {
    type: Number,
    required: true,
    min: 1
  },
  rewardType: {
    type: String,
    enum: ['points', 'premium'],
    required: function() {
      return this.type === 'rewarded';
    }
  },
  rewardAmount: {
    type: Number,
    required: function() {
      return this.type === 'rewarded';
    },
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  views: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  clicks: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
adSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Add indexes for better query performance
adSchema.index({ status: 1, type: 1, targetLevel: 1 });
adSchema.index({ startDate: 1, endDate: 1 });
adSchema.index({ 'views.userId': 1 });
adSchema.index({ 'clicks.userId': 1 });

const Ad = mongoose.model('Ad', adSchema);

module.exports = Ad; 