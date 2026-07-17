const mongoose = require('mongoose');

const PaymentAddressSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true }, // Unique identifier for the user
    privateKey: { type: String, required: true }, // Single private key for both addresses
    bep20: {
        address: { type: String, required: false }, // BEP20 address
    },
    trc20: {
        address: { type: String, required: false }, // TRC20 address
    },
    createdAt: { type: Date, default: Date.now }, // Automatically set the creation date
    updatedAt: { type: Date, default: Date.now }, // Automatically set the last update date
});

// Pre-save middleware to update the `updatedAt` field automatically
PaymentAddressSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

const PaymentAddress = mongoose.model('PaymentAddress', PaymentAddressSchema);

module.exports = PaymentAddress;
