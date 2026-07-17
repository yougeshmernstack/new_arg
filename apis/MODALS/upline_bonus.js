const mongoose = require('mongoose');

const uplineSchema = new mongoose.Schema({
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
    rankName: {
        type: String,
    },
    level: {
        type: Number,
       
    },
    rewardApprovalDate: {
        type: Date,
       
    }
    
}, {
    timestamps: true
});
uplineSchema.pre('save', async function (next) {
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
const Upline = mongoose.model('upline_bonus', uplineSchema);

module.exports = Upline;
