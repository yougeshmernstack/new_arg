const mongoose = require('mongoose');

const packageItemSchema = new mongoose.Schema({
    productId: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 }
}, { _id: false });

const packageSchema = new mongoose.Schema({
    packageId: { type: Number, unique: true },
    name: { type: String, required: true },
    // Kept in sync with discounted_amount for older callers
    price: { type: Number, required: true, default: 0 },
    amount: { type: Number, required: true, default: 0 },
    discounted_amount: { type: Number, required: true, default: 0 },
    bv: { type: Number, default: 0 },
    pv: { type: Number, default: 0 },
    items: { type: [packageItemSchema], default: [] },
    description: { type: String, default: '' },
    benefits: { type: [String], default: [] },
    // active | inactive | disabled — packages are never deleted
    status: { type: String, enum: ['active', 'inactive', 'disabled'], default: 'active' },
    created_by: { type: Number, default: null },
    created_date: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: true
});

packageSchema.index({ status: 1 });
packageSchema.index({ name: 1 });

packageSchema.pre('save', async function (next) {
    try {
        if (!this.packageId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { packageId: -1 } });
            this.packageId = latest ? latest.packageId + 1 : 1;
        }
        const discounted = Number(this.discounted_amount);
        if (!Number.isNaN(discounted)) {
            this.price = discounted;
        }
        this.updated_at = new Date();
        next();
    } catch (error) {
        next(error);
    }
});

const Package = mongoose.model('Package', packageSchema);
module.exports = Package;
