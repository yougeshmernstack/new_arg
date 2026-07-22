const mongoose = require('mongoose');

/**
 * Ledger of repurchase matching income closings (1:1 in multiples of 500).
 * Product BV only — no dummy business.
 */
const repurchaseMatchingHistorySchema = new mongoose.Schema({
  uid: { type: Number, required: true, index: true },
  username: { type: String, default: '', index: true },
  name: { type: String, default: '' },

  left_bv_before: { type: Number, default: 0 },
  right_bv_before: { type: Number, default: 0 },
  left_team_bv: { type: Number, default: 0 },
  right_team_bv: { type: Number, default: 0 },

  matched_bv: { type: Number, required: true, min: 0 },
  left_deducted: { type: Number, default: 0 },
  right_deducted: { type: Number, default: 0 },
  stronger_side: { type: String, enum: ['left', 'right', 'equal'], default: 'equal' },
  ratio: { type: String, enum: ['1:1', '2:1', '1:2'], default: '1:1' },

  left_bv_after: { type: Number, default: 0 },
  right_bv_after: { type: Number, default: 0 },

  income_amount: { type: Number, default: 0 },
  income_percent: { type: Number, default: 0 },
  income_type: { type: String, enum: ['fixed', 'percentage'], default: 'percentage' },

  tx_Ids: { type: [Number], default: [] },
  remark: { type: String, default: '' },
  closing_date: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'repurchase_matching_history'
});

repurchaseMatchingHistorySchema.index({ createdAt: -1 });
repurchaseMatchingHistorySchema.index({ uid: 1, createdAt: -1 });
repurchaseMatchingHistorySchema.index({ closing_date: -1 });

module.exports = mongoose.model('RepurchaseMatchingHistory', repurchaseMatchingHistorySchema);
