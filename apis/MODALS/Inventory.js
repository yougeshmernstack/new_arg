const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    inventoryId: { type: Number, unique: true },
    franchiseId: { type: Number, required: true },
    franchise_uid: { type: Number, required: true },
    productId: { type: Number, required: true },
    sku: { type: String, required: true },
    available_stock: { type: Number, default: 0 },
    purchased_stock: { type: Number, default: 0 },
    reserved_stock: { type: Number, default: 0 },
    sold_stock: { type: Number, default: 0 },
    returned_stock: { type: Number, default: 0 },
    damaged_stock: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: true
});

inventorySchema.index({ franchiseId: 1, productId: 1 }, { unique: true });
inventorySchema.index({ franchise_uid: 1 });
inventorySchema.index({ productId: 1 });

inventorySchema.pre('save', async function (next) {
    try {
        if (!this.inventoryId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { inventoryId: -1 } });
            this.inventoryId = latest ? latest.inventoryId + 1 : 1;
        }
        this.updated_at = new Date();
        next();
    } catch (error) {
        next(error);
    }
});

const Inventory = mongoose.model('Inventory', inventorySchema);
module.exports = Inventory;
