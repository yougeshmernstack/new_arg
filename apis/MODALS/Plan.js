const mongoose = require('mongoose');

const levelIncomeSchema = new mongoose.Schema({
    direct_required: { type: Number, default: 0 },
    total_team_required: { type: Number, default: 0 },
    team_required_by_level: { type: Number, default: 0 },
    business_required: { type: Number, default: 0 },
    income: { type: Number, default: 50 },
    status: { type: Number, enum: [0, 1], default: 1 },
    level: { type: Number }
}, { _id: false });

const achieve_rankSchema = new mongoose.Schema({
    level_required: { type: Number, default: 0 },
    rank_name: { type: String },
    require_business: { type: Number, default: 0 }
}, { _id: false });

const rewardSchema = new mongoose.Schema({
    rankId: { type: Number, required: true },
    rank_name: { type: String, required: false },
    required_business: { type: Number, default: 0 },
    strong_leg_ratio: { type: Number, default: 0 },
    second_strong_leg_ratio: { type: Number, default: 0 },
    other_legs_ratio: { type: Number, default: 0 },
    monthly_income: {
        team_rank_required: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        duration: { type: Number, default: 0 },
        status: { type: Number, enum: [0, 1], default: 0 }
    },
    royalty_income: {
        amount: { type: Number, default: 0 },
        duration: { type: Number, default: 0 },
        status: { type: Number, enum: [0, 1], default: 0 }
    },
    instant_income: {
        team_rank_required: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        status: { type: Number, enum: [0, 1], default: 0 }
    },
    cto_income: {
        amount: { type: Number, default: 0 },
        status: { type: Number, enum: [0, 1], default: 0 }
    }
}, { _id: false, strict: false }); // strict: false allows additional fields not in schema

const planSchema = new mongoose.Schema({
    planId: { type: Number, default: 1, unique: true },

    planType: {
        options: { type: String, default: "binary,generation,matrix" },
        value: { type: String, default: "generation" }
    },

    packages: {
        type: [
            {
                name: { type: String },
                packageId: { type: Number },
                min_amount: { type: Number },
                max_amount: { type: Number },
                multiplier: { type: Number },
                staking_period: { type: Number, default: 1095 }, // 3 years in days
                total_capping: { type: Number },
                included_incomes_for_capping: {
                    type: [String],
                    default: [
                        "roi_income",
                        "level_income",
                        "daily_trading_profit",
                        "direct_referral_bonus",
                        "instant_leadership_reward",
                        "team_activity_bonus"
                    ]
                }
            }
        ],
        default: [
            {
                name: "Starter Plan",
                packageId: 1,
                min_amount: 20,
                max_amount: 20,
                multiplier: 1,
                staking_period: 1095,
                total_capping: 200
            },
            {
                name: "Silver Plan",
                packageId: 2,
                min_amount: 50,
                max_amount: 50,
                multiplier: 1.5,
                staking_period: 1095,
                total_capping: 400
            },
            {
                name: "Gold Plan",
                packageId: 3,
                min_amount: 100,
                max_amount: 100,
                multiplier: 2,
                staking_period: 1095,
                total_capping: 800
            }
        ]
    },

    roi_income: {
        income_type: { type: String, enum: ['fix', 'percentage'], default: 'percentage' },
        status: { type: Number, enum: [0, 1], default: 1 },
        frequency: { type: String, enum: ['Daily', 'Monthly', 'Yearly', '10Days'], default: 'Daily' },
        income: { type: Number, default: 10 },
        distribution_ratio: {
            roi: { type: Number, default: 100 },
            level: { type: Number, default: 0 },
            company: { type: Number, default: 0 }
        },
        duration: { type: Number, default: 108 },
        maximum: { type: Number, default: 1e18 }
    },

    // Level Income
    level_income: {
        income_type: { type: String, enum: ['fix', 'percentage'], default: 'percentage' },
        status: { type: Number, enum: [0, 1], default: 1 },
        level: {
            type: [levelIncomeSchema],
            default: () => Array.from({ length: 10 }, () => ({
                direct_required: 0,
                total_team_required: 0,
                team_required_by_level: 0,
                business_required: 0,
                income: 0
            }))
        }
    },

    // ROI Level Income
    roi_level_income: {
        income_type: { type: String, enum: ['fix', 'percentage'], default: 'percentage' },
        status: { type: Number, enum: [0, 1], default: 1 },
        level: {
            type: [levelIncomeSchema],
            default: () => Array.from({ length: 20 }, () => ({
                direct_required: 0,
                total_team_required: 0,
                team_required_by_level: 0,
                business_required: 0,
                income: 0.5
            }))
        }
    },

    // Reward System
    reward: {
        income_type: { type: String, enum: ['fix', 'percentage'], default: 'fix' },
        status: { type: Number, enum: [0, 1], default: 1 },
        rewards: {
            type: [rewardSchema],
            default: [
                { rankId: 1, rank_name: "1 Star", royalty_income: { direct_business_required: 0, team_required_business: 0, direct_required: 0, team_required: 0, investment_required: 25, amount: 0, status: 1 } },
                { rankId: 2, rank_name: "2 Star", royalty_income: { direct_business_required: 500, team_required_business: 2000, direct_required: 3, team_required: 6, investment_required: 200, amount: 0.5, status: 1 } },
                { rankId: 3, rank_name: "3 Star", royalty_income: { direct_business_required: 1000, team_required_business: 10000, direct_required: 5, team_required: 50, investment_required: 500, amount: 0.5, status: 1 } },
                { rankId: 4, rank_name: "4 Star", royalty_income: { direct_business_required: 5000, team_required_business: 50000, direct_required: 10, team_required: 150, investment_required: 2000, amount: 0.5, status: 1 } },
                { rankId: 5, rank_name: "5 Star", royalty_income: { direct_business_required: 10000, team_required_business: 100000, direct_required: 20, team_required: 300, investment_required: 2500, amount: 0.5, status: 1 } }
            ]
        }
    },

    // Reward System 2 (Second reward type)
    reward_2: {
        income_type: { type: String, enum: ['fix', 'percentage'], default: 'fix' },
        status: { type: Number, enum: [0, 1], default: 1 },
        rewards: {
            type: [rewardSchema],
            default: []
        }
    },

    // New Income Types Added (from image)
    daily_trading_profit: {
        income_type: { type: String, enum: ['fix', 'percentage'], default: 'percentage' },
        status: { type: Number, enum: [0, 1], default: 1 },
        amount: { type: Number, default: 5 }
    },
    direct_referral_bonus: {
        income_type: { type: String, enum: ['fix', 'percentage'], default: 'percentage' },
        status: { type: Number, enum: [0, 1], default: 1 },
        amount: { type: Number, default: 10 }
    },
    // Direct sponsor income on package purchase — % of package BV
    direct_income: {
        income_type: { type: String, enum: ['fixed', 'percentage'], default: 'percentage' },
        status: { type: Number, enum: [0, 1], default: 1 },
        amount: { type: Number, default: 15 }
    },
    instant_leadership_reward: {
        income_type: { type: String, enum: ['fix', 'percentage'], default: 'percentage' },
        status: { type: Number, enum: [0, 1], default: 1 },
        amount: { type: Number, default: 3 }
    },
    team_activity_bonus: {
        income_type: { type: String, enum: ['fix', 'percentage'], default: 'percentage' },
        status: { type: Number, enum: [0, 1], default: 1 },
        amount: { type: Number, default: 2 }
    },

    buy_status: { type: Number, enum: [0, 1], default: 1 }

}, {
    collection: 'plan_data'
});

const PlansInfo = mongoose.model('PlansInfo', planSchema);

async function ensurePlanData() {
    try {
        let plan = await PlansInfo.findOne({ planId: 1 });
        if (!plan) {
            plan = await PlansInfo.create({
                planId: 1,
                direct_income: {
                    income_type: 'percentage',
                    status: 1,
                    amount: 15
                }
            });
            return plan;
        }
        if (!plan.direct_income || plan.direct_income.amount == null) {
            plan.direct_income = {
                income_type: plan.direct_income?.income_type || 'percentage',
                status: plan.direct_income?.status != null ? plan.direct_income.status : 1,
                amount: 15
            };
            await plan.save();
        }
        return plan;
    } catch (err) {
        return null;
    }
}

if (mongoose.connection.readyState === 1) {
    ensurePlanData();
} else {
    mongoose.connection.once('connected', () => {
        ensurePlanData();
    });
}

module.exports = PlansInfo;
module.exports.ensurePlanData = ensurePlanData;
