const mongoose = require('mongoose');
const Activity = require('./Activity');

const userSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String },
    mobile: { type: String, unique: false },
    password: { type: String },
    status: { type: Number, default: 0 },
    roles: [{ type: String, enum: ['admin', 'user', 'manager', 'franchise', 'distributor', 'theme'], default: 'user' }],
    user_type: { type: String, enum: ['mlm', 'franchise', 'distributor', 'theme'] },
    photo: { type: String, default: null },
    id_card_validity: { type: Date, default: null },
    uid: { type: Number, unique: true },
    username: { type: String, unique: true },
    wallet_address: { type: String, unique: true },
    pancard: { type: String, unique: false },
    sponsor_Id: { type: Number },
    profile_edit_status: { type: Number, default: 0},
    capping: { type: Number, default: 0},
    blockStatus: { type: Number, default: 0 },
    joining_date: { type: Date },
    proofUrl: { type: String },
    Activation_date: { type: Date, default: null },
    enable_gaming_wallet: { type: Number , default: 0},
    enable_gaming_wallet_Date: { type: Date, default: null },
    capping_set_admin: { type: Number , default: 0},
    capping_set_Date: { type: Date, default: null },
    widthrawal_tree_block: { type: Number, default: 0 },
    widthrawal_tree_block_date: { type: Date, default: null },
    disabled_activities: [{ type: Number }],
    kycStatus: {
        bank: { type: Number, default: 0 }, // 0: pending, 1: approved, 2: rejected
        pan: { type: Number, default: 0 },
        birthProof: { type: Number, default: 0 }
    },
    version: {
        type: String,
        default: "1.0.0",  // Default to the first version
    },
    lastActivity: { type: Date, default: null }, // Track last API activity for token expiration
});

userSchema.pre('save', async function (next) {
    try {
        if (!this.wallet_address) {
            const latestTransaction = await this.constructor.findOne({}, {}, { sort: { 'wallet_address': -1 } });
            const lastTxId = latestTransaction ? latestTransaction.wallet_address : 0;
            this.wallet_address = lastTxId + 1;
        }
        next();
    } catch (error) {
        errorLogger(error)
        next(error);
    }
});

const UserData = mongoose.model('UserData', userSchema);

module.exports = UserData;
