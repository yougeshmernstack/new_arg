const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    name: { type: String },
    wallet_type: { type: String },
    status: { type: Number },
    slug: { type: String, unique: true },
    count_in: { type: String, default: null },
    withdraw_limit: { type: Number, default: undefined },
    payout_limit: { type: Number, default: undefined }
});

const wallets = [
    {
        id: 1,
        name: "Main Wallet",
        wallet_type: "wallet",
        status: 1,
        slug: 'main_wallet',
        count_in: null
    },
    {
        id: 3,
        name: "Fund Wallet",
        wallet_type: "wallet",
        status: 1,
        slug: 'fund_wallet',
        count_in: null
    },
    {
        id: 5,
        name: "Self Investment",
        wallet_type: "investment",
        status: 1,
        slug: 'self_investment',
        count_in: null
    },
    {
        id: 6,
        name: "Total Withdrawal",
        wallet_type: "withdrawal",
        status: 1,
        withdraw_limit: 0,
        slug: 'total_withdrawal',
        count_in: null
    },
    {
        id: 7,
        name: "Total Payout",
        wallet_type: "payout",
        status: 1,
        payout_limit: 0,
        slug: 'total_payout',
        count_in: null
    },
    {
        id: 8,
        name: "Direct Income",
        wallet_type: "income",
        status: 1,
        slug: 'direct_income',
        count_in: 'main_wallet'
    },
    {
        id: 9,
        name: "Matching Income",
        wallet_type: "income",
        status: 1,
        slug: 'matching_income',
        count_in: 'main_wallet'
    },
    {
        id: 10,
        name: "Repurchase Matching Income",
        wallet_type: "income",
        status: 1,
        slug: 'repurchase_matching_income',
        count_in: 'main_wallet'
    },
    {
        id: 11,
        name: "Mentor Income",
        wallet_type: "income",
        status: 1,
        slug: 'upline_matching_income',
        count_in: 'main_wallet'
    }
];

const Wallets = mongoose.model('Wallets', walletSchema);

async function seedWallets() {
    try {
        const count = await Wallets.countDocuments();
        if (count === 0) {
            await Wallets.insertMany(wallets);
        } else {
            // Keep fund_wallet active for panel deposit flow
            await Wallets.updateOne(
                { slug: 'fund_wallet' },
                { $set: { status: 1, name: 'Fund Wallet', wallet_type: 'wallet' } },
                { upsert: true }
            );
            // Ensure income wallets exist and roll into main_wallet
            for (const w of wallets.filter((item) => item.wallet_type === 'income')) {
                await Wallets.updateOne(
                    { slug: w.slug },
                    {
                        $set: {
                            id: w.id,
                            name: w.name,
                            wallet_type: w.wallet_type,
                            status: w.status,
                            count_in: w.count_in
                        }
                    },
                    { upsert: true }
                );
            }
        }
    } catch (e) {
        // Swallow errors during startup seeding to avoid crashing
    }
}

function has_wallet() {
    // If not connected yet, defer seeding until connected
    if (mongoose.connection.readyState !== 1) {
        mongoose.connection.once('connected', seedWallets);
        return;
    }
    // Already connected
    seedWallets();
}

module.exports = Wallets;
has_wallet();
