const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    brandId: { type: Number, unique: true },
    name: { type: String, required: true },
    slug: { type: String, unique: true },
    description: { type: String, default: '' },
    logo: { type: String, default: null },
    // enabled | disabled — never hard deleted
    status: { type: String, enum: ['enabled', 'disabled'], default: 'enabled' },
    created_by: { type: Number, default: null },
    created_date: { type: Date, default: Date.now }
}, {
    timestamps: true
});

brandSchema.index({ status: 1 });

brandSchema.pre('save', async function (next) {
    try {
        if (!this.brandId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { brandId: -1 } });
            this.brandId = latest ? latest.brandId + 1 : 1;
        }
        if (!this.slug && this.name) {
            this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
        next();
    } catch (error) {
        next(error);
    }
});

const Brand = mongoose.model('Brand', brandSchema);
module.exports = Brand;
