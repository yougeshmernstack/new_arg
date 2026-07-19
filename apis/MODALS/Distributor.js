const mongoose = require('mongoose');

/**
 * Distributor identity + profile — collection: distributor_data
 * Auth lives here (not in UserData).
 */
const distributorSchema = new mongoose.Schema({
    distributorId: { type: Number, unique: true },
    uid: { type: Number, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    sponsor_Id: { type: Number, required: true },
    sponsor_uid: { type: Number, default: null },
    // franchise | distributor | admin
    sponsor_type: { type: String, enum: ['franchise', 'distributor', 'admin'], default: 'franchise' },
    // Binary tree placement (among distributors only)
    parent_Id: { type: Number, default: null },
    position: { type: String, enum: ['left', 'right'], default: null },
    address: {
        line1: { type: String, default: '' },
        line2: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        country: { type: String, default: 'India' }
    },
    photo: { type: String, default: null },
    // active | inactive | disabled — new registrations start inactive
    status: { type: String, enum: ['active', 'inactive', 'disabled'], default: 'inactive' },
    blockStatus: { type: Number, default: 0 },
    activation_date: { type: Date, default: null },
    activated_package_id: { type: Number, default: null },
    package_bv: { type: Number, default: 0 },
    package_pv: { type: Number, default: 0 },
    // Binary BV carry / dummy (dashboard Binary section)
    left_bv: { type: Number, default: 0 },
    right_bv: { type: Number, default: 0 },
    match_bv: { type: Number, default: 0 },
    left_dummy_bv: { type: Number, default: 0 },
    right_dummy_bv: { type: Number, default: 0 },
    joining_date: { type: Date, default: Date.now },
    id_card_validity: { type: Date, default: null },
    lastActivity: { type: Date, default: null }
}, {
    timestamps: true,
    collection: 'distributor_data'
});

distributorSchema.index({ status: 1 });
distributorSchema.index({ uid: 1 });
distributorSchema.index({ sponsor_Id: 1 });
distributorSchema.index({ parent_Id: 1 });
distributorSchema.index(
    { parent_Id: 1, position: 1 },
    {
        unique: true,
        partialFilterExpression: {
            parent_Id: { $type: 'number' },
            position: { $in: ['left', 'right'] }
        }
    }
);

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
