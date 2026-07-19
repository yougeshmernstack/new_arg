const mongoose = require('mongoose');
const { errorLogger } = require('../utils/logger');

const transactionSchema = new mongoose.Schema({
    uid: { type: Number, required: true },
    to_from: { type: String, required: true },
    tx_Id: { type: Number, unique: true },
    bet_tx_Id: { type: String, unique: false },
    reqest_tx_Id: { type: String, unique: false,required:false },
    order_Id: { type: Number },
    account: { type: Object, default: null },
    tx_hash: { type: String, default: null },
    stake_order_Id: { type: Number, default: null },
    tx_type: { type: String, required: true },
    debit_credit: { type: String, required: true, enum: ['debit', 'credit'] },
    source: { type: String },
    to_from_username: { type: String },
    wallet_type: { type: String, required: true },
    panel: { type: String, default: null }, // distributor | franchise | theme | admin
    level: { type: String },
    level_distribution_status: { type: Number,default:0 },
    community_distribution_status: { type: Number,default:0 },
    amount: { type: Number ,required:true},
    order_amount: { type: Number},
    user_package: { type: Number},
    business: { type: Number},
    income_percent: { type: Number},
    profit_Share: { type: Number, required: false },
    currency: { type: String },
    withdrawal_amount: { type: Number, default: 0 },
    release: { type: Number},
    rankId: { type: Number},
    tx_charge: { type: Number, default: 0 },
    TDS: { type: Number, default: 0 },
    capping_set_admin: { type: Number },
    capping_set_Date: { type: Date },  
    ben_per: { type: Number },
    time: { type: Date, default: Date.now },
    order_Activation_date: { type: Date },
    user_joining_date: { type: Date },
    status: { type: Number, default: 0 },
    remark: { type: String },
    token_address:{type:String},
    token_symbol:{type:String},
    proofUrl: { type: String }, // Add this field to store the proof URL
    pancard: { type: String }, // PAN card for withdrawal transactions
    open_ord: { type: Number, default: 0 },
  close_ord: { type: Number, default: 0 },
  open_src: { type: Number, default: 0 },
  close_src: { type: Number, default: 0 },
  overall_open: { type: Number, default: 0 },
  overall_close: { type: Number, default: 0 },
  Re_purchase_wallet: { type: Number },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null }
}, {
    timestamps: true
});

transactionSchema.pre('save', async function (next) {
    try {
        if (!this.tx_Id) {
            const latestTransaction = await this.constructor.findOne({}, {}, { sort: { 'tx_Id': -1 } });
            const lastTxId = latestTransaction ? latestTransaction.tx_Id : 0;
            this.tx_Id = lastTxId + 1;
        }
        next();
    } catch (error) {
            errorLogger(error)
        next(error);
    }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
