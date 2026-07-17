const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    categoryId: { type: Number, unique: true },
    name: { type: String, required: true },
    slug: { type: String, unique: true },
    description: { type: String, default: '' },
    image: { type: String, default: null },
    // enabled | disabled — never hard deleted
    status: { type: String, enum: ['enabled', 'disabled'], default: 'enabled' },
    created_by: { type: Number, default: null },
    created_date: { type: Date, default: Date.now }
}, {
    timestamps: true
});

categorySchema.index({ status: 1 });

categorySchema.pre('save', async function (next) {
    try {
        if (!this.categoryId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { categoryId: -1 } });
            this.categoryId = latest ? latest.categoryId + 1 : 1;
        }
        if (!this.slug && this.name) {
            this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
        next();
    } catch (error) {
        next(error);
    }
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
