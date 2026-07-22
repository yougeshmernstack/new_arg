const mongoose = require('mongoose');

/**
 * Achieved reward / royality / traveling_bonus ranks based on lifetime matched BV.
 */
const rankAchievementSchema = new mongoose.Schema({
  uid: { type: Number, required: true, index: true },
  username: { type: String, default: '', index: true },
  name: { type: String, default: '' },

  type: {
    type: String,
    enum: ['reward', 'royality', 'traveling_bonus'],
    required: true,
    index: true
  },

  rank_id: { type: Number, required: true },
  rank_name: { type: String, default: '' },
  matched_business: { type: Number, default: 0 },
  matched_bv_at_achieve: { type: Number, default: 0 },

  reward_amount: { type: Number, default: 0 },
  income: { type: Number, default: 0 },
  reward_item: { type: String, default: '' },

  // 0 = pending fulfillment, 1 = completed / paid by admin
  status: { type: Number, enum: [0, 1], default: 0, index: true },
  remark: { type: String, default: '' },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: Number, default: null },

  achievedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'rank_achievements'
});

rankAchievementSchema.index({ type: 1, rank_id: 1, uid: 1 }, { unique: true });
rankAchievementSchema.index({ type: 1, achievedAt: -1 });
rankAchievementSchema.index({ uid: 1, type: 1 });

module.exports = mongoose.model('RankAchievement', rankAchievementSchema);
