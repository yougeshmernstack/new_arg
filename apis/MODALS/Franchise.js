const mongoose = require('mongoose');

const franchiseSchema = new mongoose.Schema({
    franchiseId: { type: Number, unique: true },
    uid: { type: Number, required: true, unique: true },
    business_name: { type: String, required: true },
    owner_name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    address: {
        line1: { type: String, default: '' },
        line2: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        country: { type: String, default: 'India' }
    },
    gst_number: { type: String, default: '' },
    photo: { type: String, default: null },
    // active | inactive | disabled
    status: { type: String, enum: ['active', 'inactive', 'disabled'], default: 'active' },
    joining_date: { type: Date, default: Date.now },
    id_card_validity: { type: Date, default: null },
    created_by: { type: Number, default: null }
}, {
    timestamps: true
});

franchiseSchema.index({ status: 1 });
franchiseSchema.index({ uid: 1 });

franchiseSchema.pre('save', async function (next) {
    try {
        if (!this.franchiseId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { franchiseId: -1 } });
            this.franchiseId = latest ? latest.franchiseId + 1 : 1001;
        }
        next();
    } catch (error) {
        next(error);
    }
});

const Franchise = mongoose.model('Franchise', franchiseSchema);
module.exports = Franchise;
