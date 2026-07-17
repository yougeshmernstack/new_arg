const mongoose = require('mongoose');

const UserPaymentOptionSchema = new mongoose.Schema({
    uid: { type: Number, required: true, unique: true },
    bank: [
        {
            bankName: String,
            accountNumber: String,
            ifsc: String,
            holder: String,
            ac_type: String,
            branch: String,
            status: { type: Number, default: 0 } // Default to inactive
        }
    ],
    upi: [
        {
            name: String,
            upiId: String,
            status: { type: Number, default: 0 } // Default to inactive
        }
    ],
    web3: [
        {
            chain: String,
            address: String,
            status: { type: Number, default: 0 } // Default to inactive
        }
    ]
});

module.exports = mongoose.model('UserPaymentOption', UserPaymentOptionSchema);
