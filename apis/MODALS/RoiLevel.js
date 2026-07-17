const mongoose = require('mongoose');

const IncomeSchema = new mongoose.Schema({
    uid: {
        type: Number,
        required: true,
    },
    to_from: {
        type: Number,
        required: true,
    },
    source: {
        type: String,
        enum: ['roi_level_income'],
        required: true,
    },
    status: {
        type: Number,
        enum: [0, 1], // Assuming 0 for inactive and 1 for active
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    level: {
        type: Number,
        required: true,
    },
    business: {
        type: Number,
        default: 0,
    },
    time:{
        type:Date,
        default:Date.now
    }
}, {
    timestamps: true
});

const IncomeModal = mongoose.model('Income', IncomeSchema);
module.exports = IncomeModal;