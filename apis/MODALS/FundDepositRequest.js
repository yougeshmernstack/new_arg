const mongoose = require('mongoose');

const fundDepositRequestSchema = new mongoose.Schema({
  uid: { type: Number, required: true, index: true },
  panel: { type: String, default: 'distributor', index: true },
  amount: { type: Number, required: true, min: 1 },
  utr: { type: String, required: true, unique: true, trim: true },
  proofUrl: { type: String, default: null },
  status: { type: Number, default: 0 }, // 0 pending | 1 approved | 2 rejected
  remark: { type: String, default: '' },
  reviewedBy: { type: Number, default: null },
  reviewedAt: { type: Date, default: null },
  creditTxId: { type: Number, default: null }
}, {
  timestamps: true,
  collection: 'fund_deposit_requests'
});

fundDepositRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('FundDepositRequest', fundDepositRequestSchema);
