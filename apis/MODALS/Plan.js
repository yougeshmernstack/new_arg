const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
    rank_id: { type: Number, default: 0 },
    rank_name: { type: String, default: '' },
    matched_business: { type: Number, default: 0 },
    reward_amount: { type: Number, default: 0 },
    reward_item: { type: String, default: '' },
});

const royalitySchema = new mongoose.Schema({
    rank_id: { type: Number, default: 0 },
    rank_name: { type: String, default: '' },
    matched_business: { type: Number, default: 0 },
    income: { type: Number, default: 0 },
    reward_item: { type: String, default: '' },
});

const travelingBonusSchema = new mongoose.Schema({
    rank_id: { type: Number, default: 0 },
    rank_name: { type: String, default: '' },
    matched_business: { type: Number, default: 0 },
    income: { type: Number, default: 0 },
    reward_item: { type: String, default: '' },
});
const planSchema = new mongoose.Schema({
    planId: { type: Number, default: 1, unique: true },

    planType: {
        options: { type: String, default: "binary,generation,matrix" },
        value: { type: String, default: "binary" }
    },

    // Direct sponsor income on package purchase — % of package BV
    direct_income: {
        income_type: { type: String, enum: ['fixed', 'percentage'], default: 'percentage' },
        status: { type: Number, enum: [0, 1], default: 1 },
        amount: { type: Number, default: 15 }
    },

    matching_income: {
        income_type: { type: String, enum: ['fixed', 'percentage'], default: 'percentage' },
        status: { type: Number, enum: [0, 1], default: 1 },
        amount: { type: Number, default: 10 }
    },
    repurchase_matching_income: {
        income_type: { type: String, enum: ['fixed', 'percentage'], default: 'percentage' },
        status: { type: Number, enum: [0, 1], default: 1 },
        amount: { type: Number, default: 12 }
    },
    upline_matching_income: {
        income_type: { type: String, enum: ['fixed', 'percentage'], default: 'percentage' },
        status: { type: Number, enum: [0, 1], default: 1 },
        amount: { type: Number, default: 10 }
    },
    reward: {
        type: [rewardSchema],
        default: [
            { rank_id: 1, rank_name: 'Reward 1', matched_business: 10000, reward_amount: 100, reward_item: 'Premium Watch' },
            { rank_id: 2, rank_name: 'Reward 2', matched_business: 25000, reward_amount: 200, reward_item: 'Trolly Set' },
            { rank_id: 3, rank_name: 'Reward 3', matched_business: 75000, reward_amount: 300, reward_item: '2d/1n Shimla tour' },
            { rank_id: 4, rank_name: 'Reward 4', matched_business: 200000, reward_amount: 400, reward_item: 'Gold Jewellery' },
            { rank_id: 5, rank_name: 'Reward 5', matched_business: 500000, reward_amount: 500, reward_item: 'Pataya Tour 5d/4n' },
            { rank_id: 6, rank_name: 'Reward 6', matched_business: 1250000, reward_amount: 600, reward_item: 'honda activa' },
            { rank_id: 7, rank_name: 'Reward 7', matched_business: 3000000, reward_amount: 700, reward_item: 'Royal enfield' },
            { rank_id: 8, rank_name: 'Reward 8', matched_business: 7500000, reward_amount: 800, reward_item: 'Ceuze Tour' },
            { rank_id: 9, rank_name: 'Reward 9', matched_business: 18000000, reward_amount: 900, reward_item: 'Car fund 15 lakh' },
            { rank_id: 10, rank_name: 'Reward 10', matched_business: 45000000, reward_amount: 1000, reward_item: 'BMW Car' },
        ]
    },
    royality: {
        type: [royalitySchema],
        default: [
            { rank_id: 1, rank_name: 'Royality 1', matched_business: 200000, income: 3, reward_item: 'Premium Watch' },
            { rank_id: 2, rank_name: 'Royality 2', matched_business: 500000, income: 2, reward_item: 'Trolly Set' },
            { rank_id: 3, rank_name: 'Royality 3', matched_business: 1200000, income: 2, reward_item: '2d/1n Shimla tour' },
            { rank_id: 4, rank_name: 'Royality 4', matched_business: 1800000, income: 2, reward_item: 'Gold Jewellery' },
            { rank_id: 5, rank_name: 'Royality 5', matched_business: 3000000, income: 1, reward_item: 'Pataya Tour 5d/4n' },
        ]
    },
    traveling_bonus: {
        type: [travelingBonusSchema],
        default: [
            { rank_id: 1, rank_name: 'Traveling Bonus', matched_business: 200000, income: 3, reward_item: '3% traveling Bonus + 2% Accidenctal insurance (1 Year)' },
        ]
    },

}, {
    collection: 'plan_data'
});

const PlansInfo = mongoose.model('PlansInfo', planSchema);

/**
 * Ensure plan_data has planId:1 with reward / royality / traveling_bonus tiers.
 * Safe to call repeatedly (upsert + backfill empty arrays).
 */
async function ensurePlanData() {
    let plan = await PlansInfo.findOne({ planId: 1 });
    if (!plan) {
        plan = await new PlansInfo({ planId: 1 }).save();
        return plan;
    }

    const patch = {};
    if (!Array.isArray(plan.reward) || plan.reward.length === 0) {
        patch.reward = planSchema.path('reward').options.default;
    } else {
        // Fix legacy duplicate rank_id 9 on Reward 10
        const needsFix = plan.reward.some((r) => r.rank_name === 'Reward 10' && Number(r.rank_id) === 9);
        if (needsFix) {
            patch.reward = plan.reward.map((r) => {
                const obj = typeof r.toObject === 'function' ? r.toObject() : { ...r };
                if (obj.rank_name === 'Reward 10' && Number(obj.rank_id) === 9) obj.rank_id = 10;
                return obj;
            });
        }
    }
    if (!Array.isArray(plan.royality) || plan.royality.length === 0) {
        patch.royality = planSchema.path('royality').options.default;
    }
    if (!Array.isArray(plan.traveling_bonus) || plan.traveling_bonus.length === 0) {
        patch.traveling_bonus = planSchema.path('traveling_bonus').options.default;
    }

    if (Object.keys(patch).length) {
        await PlansInfo.updateOne({ planId: 1 }, { $set: patch });
        plan = await PlansInfo.findOne({ planId: 1 });
    }
    return plan;
}

PlansInfo.ensurePlanData = ensurePlanData;

module.exports = PlansInfo;
