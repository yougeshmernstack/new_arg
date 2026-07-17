const mongoose = require('mongoose');
const { errorLogger } = require('../utils/logger');

const rankSchema = new mongoose.Schema({
    Id: {type: Number,
        unique:true
    },
    uid: {type: Number,
        required: true,
    },
    status: {
        type: Number,
        required: true,
        default: 1
    },
    requested: {
        type: Number,
        default: 0
    },
    paid: {
        type: Number,
        default: 0
    },
    item: {
        type: String,
        default:"amount",
        
    },
    rankName: {
        type: String,
    },
    rankId: {
        type: Number,
       
    },
    rankType: {
        type: String,
        enum: ["reward", "reward_2"],
        default: "reward"
    },
    days_count: {
        type: Number,
        default: 0
    },
    rewardApprovalDate: {
        type: Date,
       
    },
    rewardClaimDate: {
        type: Date,
       
    }
}, {
    timestamps: true
});
rankSchema.pre('save', async function (next) {
    try {
        if (!this.Id) {
            const latestTransaction = await this.constructor.findOne({}, {}, { sort: { 'Id': -1 } });
            const lastTxId = latestTransaction ? latestTransaction.Id : 0;
            this.Id = lastTxId + 1;
        }
        next();
    } catch (error) {
            errorLogger(error)
        next(error);
    }
});
const Ranks = mongoose.model('Rank', rankSchema);

module.exports = Ranks;
