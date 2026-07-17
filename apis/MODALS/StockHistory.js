const mongoose = require('mongoose');

const stockHistorySchema = new mongoose.Schema({
    historyId: { type: Number, unique: true },
    franchiseId: { type: Number, required: true },
    franchise_uid: { type: Number, required: true },
    productId: { type: Number, required: true },
    sku: { type: String, required: true },
    // purchase | dispatch | return | cancel | damage | adjust
    action: {
        type: String,
        enum: ['purchase', 'dispatch', 'return', 'cancel', 'damage', 'adjust'],
        required: true
    },
    quantity: { type: Number, required: true },
    previous_available: { type: Number, default: 0 },
    new_available: { type: Number, default: 0 },
    reference_type: { type: String, default: '' }, // order | invoice | dispatch
    reference_id: { type: String, default: '' },
    remark: { type: String, default: '' },
    created_by: { type: Number, default: null },
    created_date: { type: Date, default: Date.now }
}, {
    timestamps: true
});

stockHistorySchema.index({ franchiseId: 1, productId: 1 });
stockHistorySchema.index({ created_date: -1 });

stockHistorySchema.pre('save', async function (next) {
    try {
        if (!this.historyId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { historyId: -1 } });
            this.historyId = latest ? latest.historyId + 1 : 1;
        }
        next();
    } catch (error) {
        next(error);
    }
});

const StockHistory = mongoose.model('StockHistory', stockHistorySchema);
module.exports = StockHistory;
