const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    uid: { type: Number, required: true },
    productId: { type: Number, required: true },
    created_date: { type: Date, default: Date.now }
}, {
    timestamps: true
});

wishlistSchema.index({ uid: 1, productId: 1 }, { unique: true });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);
module.exports = Wishlist;
