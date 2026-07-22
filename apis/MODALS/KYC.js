const mongoose = require('mongoose');

// Status per type: 0=pending, 1=uploaded, 2=approved, 3=rejected
const typeStatus = () => ({ type: Number, default: 0, enum: [0, 1, 2, 3] });

const kycSchema = new mongoose.Schema(
  {
    uid: { type: Number, required: true, unique: true },
    panDetails: {
      panNumber: { type: String },
      document: { type: String },
    },
    bankDetails: {
      accountNumber: { type: String },
      ifscCode: { type: String },
      bankName: { type: String },
      holderName: { type: String },
      accountType: { type: String, enum: ['Saving', 'Current'] },
      document: { type: String },
    },
    aadhaarDetails: {
      aadhaarNumber: { type: String },
      documentFront: { type: String },
      documentBack: { type: String },
    },
    nomineeDetails: {
      nomineeName: { type: String },
      relation: { type: String },
      mobile: { type: String },
      document: { type: String },
    },
    status: {
      pan: typeStatus(),
      bank: typeStatus(),
      aadhaar: typeStatus(),
      nominee: typeStatus(),
    },
    remarks: {
      pan: { type: String, default: '' },
      bank: { type: String, default: '' },
      aadhaar: { type: String, default: '' },
      nominee: { type: String, default: '' },
    },
    reviewedAt: {
      pan: { type: Date },
      bank: { type: Date },
      aadhaar: { type: Date },
      nominee: { type: Date },
    },
    reviewedBy: {
      pan: { type: Number },
      bank: { type: Number },
      aadhaar: { type: Number },
      nominee: { type: Number },
    },
  },
  { timestamps: true }
);

const kycDetails = mongoose.model('kycDetails', kycSchema);

module.exports = kycDetails;
