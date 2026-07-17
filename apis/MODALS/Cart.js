const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productId: { type: Number, required: true },
    sku: { type: String, required: true },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    price: { type: Number, required: true },
    image: { type: String, default: null }
}, { _id: false });

const cartSchema = new mongoose.Schema({
    uid: { type: Number, required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: true
});

cartSchema.index({ uid: 1 });

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
