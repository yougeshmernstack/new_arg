const mongoose = require('mongoose');

/**
 * Ledger of admin-granted dummy BV (power volume).
 * Stored per recipient only — never rolled into package_bv or other users' team BV.
 */
const dummyBusinessSchema = new mongoose.Schema({
  uid: { type: Number, required: true, index: true },
  username: { type: String, default: '', index: true },
  name: { type: String, default: '' },
  side: { type: String, enum: ['left', 'right'], required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  remark: { type: String, default: '' },
  givenBy: { type: Number, default: null },
  givenByUsername: { type: String, default: '' },
  left_dummy_bv_after: { type: Number, default: 0 },
  right_dummy_bv_after: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'dummy_business'
});

dummyBusinessSchema.index({ createdAt: -1 });
dummyBusinessSchema.index({ uid: 1, createdAt: -1 });

module.exports = mongoose.model('DummyBusiness', dummyBusinessSchema);
