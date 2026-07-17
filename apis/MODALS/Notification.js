const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    notificationId: { type: Number, unique: true },
    uid: { type: Number, required: true },
    role: {
        type: String,
        enum: ['admin', 'franchise', 'distributor', 'theme', 'user', 'manager'],
        required: true
    },
    // orders | dispatch | invoice | stock | registration | payments | returns
    type: {
        type: String,
        enum: ['orders', 'dispatch', 'invoice', 'stock', 'registration', 'payments', 'returns', 'general'],
        default: 'general'
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    reference_type: { type: String, default: '' },
    reference_id: { type: String, default: '' },
    is_read: { type: Number, default: 0 },
    created_date: { type: Date, default: Date.now }
}, {
    timestamps: true
});

notificationSchema.index({ uid: 1, is_read: 1 });
notificationSchema.index({ created_date: -1 });

notificationSchema.pre('save', async function (next) {
    try {
        if (!this.notificationId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { notificationId: -1 } });
            this.notificationId = latest ? latest.notificationId + 1 : 1;
        }
        next();
    } catch (error) {
        next(error);
    }
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
