const mongoose = require('mongoose');

const PaymentOptionSchema = new mongoose.Schema({
    manual: {
        status: { type: Number, default: 1 },
        upi: [
            {
                name: String,
                upiId: String,
                qrCodeUrl: { type: String, default: null },
                status: { type: Number, default: 1 }
            }
        ],
        bank: [
            {
                bankName: String,
                accountNumber: String,
                ifsc: String,
                holder: String,
                ac_type: String,
                branch: String,
                status: { type: Number, default: 1 }
            }
        ]
    },
    api: {
        status: { type: Number, default: 1 },
        providers: [
            {
                name: String,
                details: String,
                status: { type: Number, default: 1 }
            }
        ]
    },
    web3: {
        status: { type: Number, default: 1 },
        chains: [
            {
                chain: String,
                address: String,
                status: { type: Number, default: 1 }
            }
        ]
    }
});

module.exports = mongoose.model('PaymentOption', PaymentOptionSchema);
