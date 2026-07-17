const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    packageId: { type: Number, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
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
        this.updated_at = new Date();
        next();
    } catch (error) {
        next(error);
    }
});

const Package = mongoose.model('Package', packageSchema);
module.exports = Package;
