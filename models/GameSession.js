const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  gameType: {
    type: String,
    required: [true, 'Game type is required'],
    enum: ['race', 'time-trial', 'practice', 'tournament'],
    default: 'race'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // Duration in seconds
    default: null
  },
  score: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  gameData: {
    // Store game-specific data as JSON
    track: String,
    vehicle: String,
    laps: Number,
    bestLapTime: Number,
    totalDistance: Number,
    checkpoints: [Number],
    powerUps: [String],
    achievements: [String]
  },
  deviceInfo: {
    platform: String,
    version: String,
    hardwareId: String
  },
  location: {
    // Optional location data if available
    latitude: Number,
    longitude: Number,
    accuracy: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
gameSessionSchema.index({ userId: 1, createdAt: -1 });
gameSessionSchema.index({ status: 1, createdAt: -1 });
gameSessionSchema.index({ gameType: 1, score: -1 });

// Virtual for calculating duration if not stored
gameSessionSchema.virtual('calculatedDuration').get(function() {
  if (this.startTime && this.endTime) {
    return Math.floor((this.endTime - this.startTime) / 1000);
  }
  return null;
});

// Pre-save middleware to calculate duration
gameSessionSchema.pre('save', function(next) {
  if (this.startTime && this.endTime && !this.duration) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  next();
});

// Static method to get user's game statistics
gameSessionSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), status: 'completed' } },
    {
      $group: {
        _id: '$gameType',
        totalSessions: { $sum: 1 },
        totalScore: { $sum: '$score' },
        avgScore: { $avg: '$score' },
        totalDuration: { $sum: '$duration' },
        bestScore: { $max: '$score' }
      }
    }
  ]);

  return stats;
};

module.exports = mongoose.model('GameSession', gameSessionSchema);