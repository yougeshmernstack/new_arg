const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  uid: { type: Number,required: true },
  otpCode: { type: String, required: true },
  otpAction: { type: String},
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  status: { type: Number, default: 0 }, // 0: Not used, 1: Used
});

module.exports = mongoose.model('Otp', otpSchema);
