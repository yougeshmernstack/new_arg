const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productId: { type: Number, unique: true },
    product_name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    categoryId: { type: Number, required: true },
    brandId: { type: Number, required: true },
    packageId: { type: Number, required: true },
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    description: { type: String, default: '' },
    // Long-form description gallery (shown at bottom of product detail)
    description_images: { type: [String], default: [] },
    ingredients: { type: String, default: '' },
    benefits: { type: [String], default: [] },
    nutrition_facts: { type: String, default: '' },
    directions: { type: String, default: '' },
    storage: { type: String, default: '' },
    manufacturing_details: { type: String, default: '' },
    batch_number: { type: String, default: '' },
    expiry_date: { type: Date, default: null },
    weight: { type: String, default: '' },
    gst: { type: Number, default: 0 },
    mrp: { type: Number, required: true, default: 0 },
    distributor_price: { type: Number, required: true, default: 0 },
    franchise_price: { type: Number, required: true, default: 0 },
    // Repurchase matching BV — credited on distributor product purchase
    bv: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    // Admin hide/show — hidden products are invisible to buyers
    is_hidden: { type: Boolean, default: false },
    // enabled | disabled — products are never deleted
    status: { type: String, enum: ['enabled', 'disabled'], default: 'enabled' },
    created_by: { type: Number, default: null },
    created_date: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

productSchema.virtual('out_of_stock').get(function () {
    return (this.stock || 0) <= 0;
});

productSchema.index({ status: 1 });
productSchema.index({ is_hidden: 1 });
productSchema.index({ packageId: 1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ brandId: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ stock: 1 });

productSchema.pre('save', async function (next) {
    try {
        if (!this.productId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { productId: -1 } });
            this.productId = latest ? latest.productId + 1 : 1;
        }
        this.updated_at = new Date();
        next();
    } catch (error) {
        next(error);
    }
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
