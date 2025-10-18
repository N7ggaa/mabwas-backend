const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  userName: {
    type: String,
    required: [true, 'User name is required'],
    trim: true
  },
  score: {
    type: Number,
    required: [true, 'Score is required'],
    min: [0, 'Score cannot be negative']
  },
  gameType: {
    type: String,
    required: [true, 'Game type is required'],
    enum: ['race', 'time-trial', 'practice', 'tournament'],
    default: 'race'
  },
  gameSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameSession',
    required: [true, 'Game session ID is required']
  },
  rank: {
    type: Number,
    default: null // Will be calculated when retrieving leaderboard
  },
  achievedAt: {
    type: Date,
    default: Date.now
  },
  gameData: {
    // Store relevant game data for this score
    track: String,
    vehicle: String,
    duration: Number,
    laps: Number,
    bestLapTime: Number,
    achievements: [String]
  },
  isActive: {
    type: Boolean,
    default: true // Can be used to hide scores if needed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
leaderboardSchema.index({ gameType: 1, score: -1, achievedAt: -1 });
leaderboardSchema.index({ userId: 1, gameType: 1, achievedAt: -1 });
leaderboardSchema.index({ isActive: 1, gameType: 1, score: -1 });

// Virtual for formatted score display
leaderboardSchema.virtual('formattedScore').get(function() {
  if (this.gameType === 'time-trial') {
    // For time-based games, format as time
    const minutes = Math.floor(this.score / 60);
    const seconds = (this.score % 60).toFixed(2);
    return `${minutes}:${seconds.padStart(5, '0')}`;
  }
  return this.score.toLocaleString();
});

// Static method to get top scores for a game type
leaderboardSchema.statics.getTopScores = async function(gameType, limit = 10) {
  const leaderboard = await this.find({
    gameType,
    isActive: true
  })
  .sort({ score: -1 })
  .limit(limit)
  .populate('userId', 'name email')
  .lean();

  // Add rank to each entry
  return leaderboard.map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));
};

// Static method to get user's rank for a specific game type
leaderboardSchema.statics.getUserRank = async function(userId, gameType) {
  const userBestScore = await this.findOne({
    userId,
    gameType,
    isActive: true
  }).sort({ score: -1 });

  if (!userBestScore) return null;

  const betterScoresCount = await this.countDocuments({
    gameType,
    isActive: true,
    score: { $gt: userBestScore.score }
  });

  return betterScoresCount + 1;
};

// Static method to get user's personal best scores across all game types
leaderboardSchema.statics.getUserPersonalBests = async function(userId) {
  const personalBests = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        isActive: true
      }
    },
    {
      $group: {
        _id: '$gameType',
        bestScore: { $max: '$score' },
        achievedAt: { $max: '$achievedAt' },
        totalEntries: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    }
  ]);

  return personalBests;
};

// Instance method to update user name if it changes
leaderboardSchema.methods.updateUserName = async function(newName) {
  this.userName = newName;
  return this.save();
};

module.exports = mongoose.model('Leaderboard', leaderboardSchema);