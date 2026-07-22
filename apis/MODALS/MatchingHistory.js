const mongoose = require('mongoose');

/**
 * Ledger of binary matching income closings (1:1 in multiples of 1250).
 * Equal sides: 1250 cut from left first. Leftover carries forward.
 */
const matchingHistorySchema = new mongoose.Schema({
  uid: { type: Number, required: true, index: true },
  username: { type: String, default: '', index: true },
  name: { type: String, default: '' },

  // Volumes available before this match (team + dummy − prior consumption)
  left_bv_before: { type: Number, default: 0 },
  right_bv_before: { type: Number, default: 0 },
  left_dummy_bv: { type: Number, default: 0 },
  right_dummy_bv: { type: Number, default: 0 },
  left_team_bv: { type: Number, default: 0 },
  right_team_bv: { type: Number, default: 0 },

  // 1:1 deduction in multiples of 1250 (leftover does not match)
  matched_bv: { type: Number, required: true, min: 0 },
  left_deducted: { type: Number, default: 0 },
  right_deducted: { type: Number, default: 0 },
  stronger_side: { type: String, enum: ['left', 'right', 'equal'], default: 'equal' },
  ratio: { type: String, enum: ['1:1', '2:1', '1:2'], default: '1:1' },

  // Remaining after this match (leftover / last — not matched, carry forward)
  left_bv_after: { type: Number, default: 0 },
  right_bv_after: { type: Number, default: 0 },

  // Income credited
  income_amount: { type: Number, default: 0 },
  income_percent: { type: Number, default: 0 },
  income_type: { type: String, enum: ['fixed', 'percentage'], default: 'percentage' },

  tx_Ids: { type: [Number], default: [] },
  remark: { type: String, default: '' },
  closing_date: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'matching_history'
});

matchingHistorySchema.index({ createdAt: -1 });
matchingHistorySchema.index({ uid: 1, createdAt: -1 });
matchingHistorySchema.index({ closing_date: -1 });

module.exports = mongoose.model('MatchingHistory', matchingHistorySchema);
