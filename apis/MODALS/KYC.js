const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
    uid: { type: Number, required: true, unique: true },
    bankDetails: {
        accountNumber: { type: String },
        ifscCode: { type: String },
        bankName: { type: String },
        document: { type: String },
        holderName:{type:String},
        accountType:{type:String,enum:['Saving','Current']}
    },
    panDetails: {
        panNumber: { type: String },
        document: { type: String }
    },
    addressDetails: {
        idType: { type: String, enum: ['Aadhar Card', 'Driving License', 'Passport'] },
        idNumber: { type: String },
        name: { type: String },
        address: { type: String },
        documentFront: { type: String },
        documentBack: { type: String }
    },
    status: {
        bank: { type: Number, default: 0 }, // 0: pending, 1: approved, 2: rejected
        pan: { type: Number, default: 0 },
        address: { type: Number, default: 0 }
    }
});

const kycDetails = mongoose.model('kycDetails', kycSchema);

module.exports = kycDetails;
