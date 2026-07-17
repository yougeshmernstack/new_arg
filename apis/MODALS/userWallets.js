const mongoose = require('mongoose');
const Wallets = require('./wallets');
const defaultWallet = [];

// Function to populate defaultWallet array
async function defaultWalletFun() {
    const wallets = await Wallets.find({ status: 1 });
    wallets.forEach((item,index) => {
        defaultWallet.push({
            id:index,
            name: item.name,
            wallet_type: item.wallet_type,
            slug: item.slug,
            count_in: item.count_in
        });
    });
}
defaultWalletFun();

const walletSchema = new mongoose.Schema({
    id:{type :Number},
    name: { type: String, default: "Main Wallet" },
    wallet_type: { type: String, default: "wallet" },
    wallet_status: { type: Number, default: 1 },
    value: { type: Number, default: 0 },
    updated_on: { type: Date, default: null },
    slug: { type: String },
    count_in: { type: String }
});

const teamLevelSchema = new mongoose.Schema({
    level: { type: Number, required: true },
    total_team: { type: Number, default: 0 },
    active_team: { type: Number, default: 0 },
    business: { type: Number, default: 0 }
});

const userWalletSchema = new mongoose.Schema({
    uid: {
        type: Number,
        required: true,
        unique: true
    },
    wallets: {
        type: [walletSchema], // Array of wallet objects
        default: defaultWallet
    },
    teamSection: {
        type: [teamLevelSchema],
        default: []
    }
});

// Method to add or update a level in teamSection
userWalletSchema.methods.addOrUpdateTeamLevel = function(level, totalTeam, activeTeam, business) {
    const existingLevel = this.teamSection.find(l => l.level === level);
    if (existingLevel) {
        existingLevel.total_team = totalTeam;
        existingLevel.active_team = activeTeam;
        existingLevel.business = business;
    } else {
        this.teamSection.push({ level, total_team: totalTeam, active_team: activeTeam, business });
    }
    return this.save();
};

const UserWallet = mongoose.model('UserWallet', userWalletSchema);

module.exports = UserWallet;
