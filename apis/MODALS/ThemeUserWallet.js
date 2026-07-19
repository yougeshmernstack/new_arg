const mongoose = require('mongoose');

const walletEntrySchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String, default: 'Main Wallet' },
    wallet_type: { type: String, default: 'wallet' },
    wallet_status: { type: Number, default: 1 },
    value: { type: Number, default: 0 },
    updated_on: { type: Date, default: null },
    slug: { type: String },
    count_in: { type: String }
});

const themeUserWalletSchema = new mongoose.Schema({
    uid: { type: Number, required: true, unique: true },
    wallets: { type: [walletEntrySchema], default: [] }
}, {
    timestamps: true,
    collection: 'theme_user_wallets'
});

module.exports = mongoose.model('ThemeUserWallet', themeUserWalletSchema);
