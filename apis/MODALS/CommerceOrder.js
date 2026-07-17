const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: { type: Number, required: true },
    sku: { type: String, required: true },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    gst: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true }
}, { _id: false });

const timelineSchema = new mongoose.Schema({
    status: { type: String, required: true },
    remark: { type: String, default: '' },
    updated_by: { type: Number, default: null },
    updated_at: { type: Date, default: Date.now }
}, { _id: false });

const commerceOrderSchema = new mongoose.Schema({
    orderId: { type: Number, unique: true },
    order_number: { type: String, unique: true },
    // franchise_purchase | distributor_purchase | theme_purchase
    order_type: {
        type: String,
        enum: ['franchise_purchase', 'distributor_purchase', 'theme_purchase'],
        required: true
    },
    buyer_uid: { type: Number, required: true },
    buyer_role: {
        type: String,
        enum: ['franchise', 'distributor', 'theme'],
        required: true
    },
    franchiseId: { type: Number, default: null },
    distributorId: { type: Number, default: null },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    grand_total: { type: Number, default: 0 },
    payment_status: {
        type: String,
        enum: ['pending', 'received', 'failed', 'refunded'],
        default: 'pending'
    },
    // Order Placed → … → Completed + failure statuses
    order_status: {
        type: String,
        enum: [
            'order_placed',
            'payment_received',
            'confirmed',
            'packed',
            'ready_to_dispatch',
            'dispatched',
            'in_transit',
            'out_for_delivery',
            'delivered',
            'completed',
            'cancelled',
            'returned',
            'refunded',
            'out_of_stock'
        ],
        default: 'order_placed'
    },
    dispatch_status: {
        type: String,
        enum: ['pending', 'ready', 'dispatched', 'delivered', 'cancelled'],
        default: 'pending'
    },
    timeline: { type: [timelineSchema], default: [] },
    shipping_address: {
        name: { type: String, default: '' },
        mobile: { type: String, default: '' },
        line1: { type: String, default: '' },
        line2: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        country: { type: String, default: 'India' }
    },
    created_date: { type: Date, default: Date.now }
}, {
    timestamps: true
});

commerceOrderSchema.index({ buyer_uid: 1 });
commerceOrderSchema.index({ order_status: 1 });
commerceOrderSchema.index({ order_type: 1 });
commerceOrderSchema.index({ created_date: -1 });

commerceOrderSchema.pre('save', async function (next) {
    try {
        if (!this.orderId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { orderId: -1 } });
            this.orderId = latest ? latest.orderId + 1 : 10001;
        }
        if (!this.order_number) {
            this.order_number = `ORD-${this.orderId}`;
        }
        if (!this.timeline || this.timeline.length === 0) {
            this.timeline = [{
                status: this.order_status || 'order_placed',
                remark: 'Order created',
                updated_at: new Date()
            }];
        }
        next();
    } catch (error) {
        next(error);
    }
});

const CommerceOrder = mongoose.model('CommerceOrder', commerceOrderSchema);
module.exports = CommerceOrder;
