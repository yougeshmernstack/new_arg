const mongoose = require('mongoose');
const { getNextOrderNumber } = require('../utils/sequence');

const ORDER_STATUSES = [
    'pending',
    'confirmed',
    'packed',
    'shipped',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'returned',
    'refunded'
];

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
    updated_by_role: { type: String, default: '' },
    updated_by_name: { type: String, default: '' },
    updated_at: { type: Date, default: Date.now }
}, { _id: false });

const shippingSchema = new mongoose.Schema({
    courier_name: { type: String, default: '' },
    tracking_number: { type: String, default: '' },
    shipping_partner: { type: String, default: '' },
    dispatch_date: { type: Date, default: null },
    estimated_delivery: { type: Date, default: null },
    delivered_date: { type: Date, default: null }
}, { _id: false });

const commerceOrderSchema = new mongoose.Schema({
    orderId: { type: Number, unique: true },
    order_number: { type: String, unique: true },
    invoice_number: { type: String, unique: true, sparse: true },
    idempotency_key: { type: String, unique: true, sparse: true },
    // franchise_purchase | distributor_purchase | theme_purchase | distributor_package_purchase
    order_type: {
        type: String,
        enum: [
            'franchise_purchase',
            'distributor_purchase',
            'theme_purchase',
            'distributor_package_purchase'
        ],
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
    packageId: { type: Number, default: null },
    package_name: { type: String, default: '' },
    bv: { type: Number, default: 0 },
    pv: { type: Number, default: 0 },
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
    order_status: {
        type: String,
        enum: ORDER_STATUSES,
        default: 'pending'
    },
    dispatch_status: {
        type: String,
        enum: ['pending', 'ready', 'dispatched', 'delivered', 'cancelled'],
        default: 'pending'
    },
    timeline: { type: [timelineSchema], default: [] },
    shipping: { type: shippingSchema, default: () => ({}) },
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
    // Set true once franchise Inventory has been credited on admin confirm
    franchise_stock_credited: { type: Boolean, default: false },
    // Set true once distributor repurchase_bv was credited from this order
    repurchase_bv_credited: { type: Boolean, default: false },
    created_date: { type: Date, default: Date.now }
}, {
    timestamps: true
});

commerceOrderSchema.index({ buyer_uid: 1 });
commerceOrderSchema.index({ order_status: 1 });
commerceOrderSchema.index({ order_type: 1 });
commerceOrderSchema.index({ created_date: -1 });
commerceOrderSchema.index({ invoice_number: 1 }, { unique: true, sparse: true });
commerceOrderSchema.index({ idempotency_key: 1 }, { unique: true, sparse: true });

commerceOrderSchema.pre('save', async function (next) {
    try {
        if (!this.orderId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { orderId: -1 } });
            this.orderId = latest ? latest.orderId + 1 : 10001;
        }
        if (!this.order_number) {
            this.order_number = await getNextOrderNumber();
        }
        if (!this.timeline || this.timeline.length === 0) {
            this.timeline = [{
                status: this.order_status || 'pending',
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
module.exports.ORDER_STATUSES = ORDER_STATUSES;
