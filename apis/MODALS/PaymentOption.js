const mongoose = require('mongoose');

const PaymentOptionSchema = new mongoose.Schema({
    manual: {
        status: { type: Number, default: 1 }, // Active by default
        upi: [
            {
                name: String,
                upiId: String,
                status: { type: Number, default: 1 } // Active by default
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
                status: { type: Number, default: 1 } // Active by default
            }
        ]
    },
    api: {
        status: { type: Number, default: 1 }, // Active by default
        providers: [
            {
                name: String,
                details: String,
                status: { type: Number, default: 1 } // Active by default
            }
        ]
    },
    web3: {
        status: { type: Number, default: 1 }, // Active by default
        chains: [
            {
                chain: String,
                address: String,
                status: { type: Number, default: 1 } // Active by default
            }
        ]
    }
});

module.exports = mongoose.model('PaymentOption', PaymentOptionSchema);
