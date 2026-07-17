const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
    productId: { type: Number, required: true },
    sku: { type: String, required: true },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    total: { type: Number, required: true }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
    invoiceId: { type: Number, unique: true },
    invoice_number: { type: String, unique: true },
    orderId: { type: Number, required: true },
    order_number: { type: String, required: true },
    customer_uid: { type: Number, required: true },
    customer_role: {
        type: String,
        enum: ['franchise', 'distributor', 'theme'],
        required: true
    },
    customer_details: {
        name: { type: String, default: '' },
        email: { type: String, default: '' },
        mobile: { type: String, default: '' },
        address: { type: String, default: '' },
        gst_number: { type: String, default: '' }
    },
    company_details: {
        name: { type: String, default: '' },
        email: { type: String, default: '' },
        mobile: { type: String, default: '' },
        address: { type: String, default: '' },
        gst_number: { type: String, default: '' },
        logo: { type: String, default: null }
    },
    items: { type: [invoiceItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    grand_total: { type: Number, default: 0 },
    payment_status: {
        type: String,
        enum: ['pending', 'received', 'failed', 'refunded'],
        default: 'pending'
    },
    dispatch_status: {
        type: String,
        enum: ['pending', 'ready', 'dispatched', 'delivered', 'cancelled'],
        default: 'pending'
    },
    qr_code: { type: String, default: null },
    barcode: { type: String, default: null },
    pdf_path: { type: String, default: null },
    created_date: { type: Date, default: Date.now }
}, {
    timestamps: true
});

invoiceSchema.index({ customer_uid: 1 });
invoiceSchema.index({ orderId: 1 });
invoiceSchema.index({ created_date: -1 });

invoiceSchema.pre('save', async function (next) {
    try {
        if (!this.invoiceId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { invoiceId: -1 } });
            this.invoiceId = latest ? latest.invoiceId + 1 : 50001;
        }
        if (!this.invoice_number) {
            this.invoice_number = `INV-${this.invoiceId}`;
        }
        next();
    } catch (error) {
        next(error);
    }
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;
