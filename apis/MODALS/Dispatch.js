const mongoose = require('mongoose');

const dispatchSchema = new mongoose.Schema({
    dispatchId: { type: Number, unique: true },
    orderId: { type: Number, required: true },
    order_number: { type: String, required: true },
    franchiseId: { type: Number, required: true },
    franchise_uid: { type: Number, required: true },
    courier_name: { type: String, required: true },
    tracking_number: { type: String, required: true },
    dispatch_date: { type: Date, default: Date.now },
    expected_delivery: { type: Date, default: null },
    delivered_date: { type: Date, default: null },
    status: {
        type: String,
        enum: ['dispatched', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
        default: 'dispatched'
    },
    remark: { type: String, default: '' },
    created_date: { type: Date, default: Date.now }
}, {
    timestamps: true
});

dispatchSchema.index({ orderId: 1 });
dispatchSchema.index({ franchiseId: 1 });
dispatchSchema.index({ tracking_number: 1 });

dispatchSchema.pre('save', async function (next) {
    try {
        if (!this.dispatchId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { dispatchId: -1 } });
            this.dispatchId = latest ? latest.dispatchId + 1 : 1;
        }
        next();
    } catch (error) {
        next(error);
    }
});

const Dispatch = mongoose.model('Dispatch', dispatchSchema);
module.exports = Dispatch;
