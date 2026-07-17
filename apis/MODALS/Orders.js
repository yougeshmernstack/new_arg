const mongoose = require('mongoose');
const { errorLogger } = require('../utils/logger');

const orderSchema = new mongoose.Schema({
    uid: { type: Number, required: true },
    order_Id: { type: Number, unique: true },
    tx_Id: { type: String },
    source: { type: String },
    transactionHash: { type: String,default: null },
    type: { type: String ,enum:['Purchase','Re-purchase']},
    amount: { type: Number, required: true },
    capping: { type: Number},
    order_bv: { type: Number, required: false },
    currency: { type: String },
    status: { type: Number, default: 0 },
    planId:{type:Number,default:1},
    token_address:{type:String},
    last_principal_withdrawal_amount:{type:Number,default:0},
    token_symbol:{type:String},
    added_on:{type:Date,default:Date.now},
    currentCycle: { type: Number, default: 1 },
    lastCycleCompletionDate: {type:Date},
    nextDistributionDate: {type:Date},
    cycleClaimStatus: { type: Number, default: 1 },
    cycleCompleted: { type: Boolean, default: false },
    pendingIncome: { type: Number, default: 0 },
    lastClaimDate: { type: Date },
    cycleDuration: { type: Number, default: 10 },
    pendingDays: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 }
}, {
    timestamps: true
});

orderSchema.pre('save', async function (next) {
    try {
        if (!this.order_Id) {
            const latestTransaction = await this.constructor.findOne({}, {}, { sort: { 'order_Id': -1 } });
            const lastTxId = latestTransaction ? latestTransaction.order_Id : 0;
            this.order_Id = lastTxId + 1;
        }
        next();
    } catch (error) {
            errorLogger(error)
        next(error);
    }
});

const Orders = mongoose.model('Orders', orderSchema);

module.exports = Orders;
