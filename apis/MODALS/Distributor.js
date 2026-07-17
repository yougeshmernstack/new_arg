const mongoose = require('mongoose');

const distributorSchema = new mongoose.Schema({
    distributorId: { type: Number, unique: true },
    uid: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    sponsor_Id: { type: Number, required: true },
    sponsor_uid: { type: Number, default: null },
    address: {
        line1: { type: String, default: '' },
        line2: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        country: { type: String, default: 'India' }
    },
    photo: { type: String, default: null },
    // active | inactive | disabled
    status: { type: String, enum: ['active', 'inactive', 'disabled'], default: 'active' },
    joining_date: { type: Date, default: Date.now },
    id_card_validity: { type: Date, default: null }
}, {
    timestamps: true
});

distributorSchema.index({ status: 1 });
distributorSchema.index({ uid: 1 });
distributorSchema.index({ sponsor_Id: 1 });

distributorSchema.pre('save', async function (next) {
    try {
        if (!this.distributorId) {
            const latest = await this.constructor.findOne({}, {}, { sort: { distributorId: -1 } });
            this.distributorId = latest ? latest.distributorId + 1 : 2001;
        }
        next();
    } catch (error) {
        next(error);
    }
});

const Distributor = mongoose.model('Distributor', distributorSchema);
module.exports = Distributor;
