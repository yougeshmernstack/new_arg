const mongoose = require('mongoose');

const stockHistorySchema = new mongoose.Schema({
    historyId: { type: Number, unique: true },
    // Optional — admin-level stock changes do not belong to a franchise
    franchiseId: { type: Number, default: null },
    franchise_uid: { type: Number, default: null },
    scope: {
        type: String,
        enum: ['admin', 'franchise'],
        default: 'admin'
    },
    productId: { type: Number, required: true },
    sku: { type: String, required: true },
    action: {
        type: String,
        enum: [
            'purchase',
            'dispatch',
            'return',
            'cancel',
            'damage',
            'adjust',
            'increase',
            'decrease',
            'set',
            'order'
        ],
        required: true
    },
    quantity: { type: Number, required: true },
    previous_available: { type: Number, default: 0 },
    new_available: { type: Number, default: 0 },
    reference_type: { type: String, default: '' }, // order | invoice | dispatch | manual
    reference_id: { type: String, default: '' },
    remark: { type: String, default: '' },
    created_by: { type: Number, default: null },
    created_date: { type: Date, default: Date.now }
}, {
    timestamps: true
});

stockHistorySchema.index({ franchiseId: 1, productId: 1 });
stockHistorySchema.index({ productId: 1 });
stockHistorySchema.index({ created_date: -1 });
stockHistorySchema.index({ scope: 1 });

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
