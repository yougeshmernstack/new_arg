const mongoose = require('mongoose');

/**
 * Wellness / panel admin identity — collection: admin_data
 * Separate from MLM UserData.
 */
const adminDataSchema = new mongoose.Schema({
    adminId: { type: Number, unique: true },
    uid: { type: Number, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    mobile: { type: String, default: '' },
    photo: { type: String, default: null },
    // admin | manager
    roles: [{ type: String, enum: ['admin', 'manager'], default: ['admin'] }],
    status: { type: Number, default: 1 },
    blockStatus: { type: Number, default: 0 },
    joining_date: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: null }
}, {
    timestamps: true,
    collection: 'admin_data'
});

adminDataSchema.index({ status: 1 });

adminDataSchema.pre('save', async function (next) {
    try {
        if (!this.adminId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { adminId: -1 } });
            this.adminId = latest ? latest.adminId + 1 : 1;
        }
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('AdminData', adminDataSchema);
