const mongoose = require('mongoose');

/**
 * Theme / storefront customer identity — collection: theme_users_data
 * Separate from MLM UserData.
 */
const themeUserSchema = new mongoose.Schema({
    themeUserId: { type: Number, unique: true },
    uid: { type: Number, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    mobile: { type: String, default: '' },
    photo: { type: String, default: null },
    status: { type: Number, default: 1 },
    blockStatus: { type: Number, default: 0 },
    joining_date: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: null }
}, {
    timestamps: true,
    collection: 'theme_users_data'
});

themeUserSchema.index({ status: 1 });

themeUserSchema.pre('save', async function (next) {
    try {
        if (!this.themeUserId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { themeUserId: -1 } });
            this.themeUserId = latest ? latest.themeUserId + 1 : 1;
        }
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('ThemeUser', themeUserSchema);
