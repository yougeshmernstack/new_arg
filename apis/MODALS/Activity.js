// models/activity.js
const mongoose = require('mongoose');
const { errorLogger } = require('../utils/logger');
const walletSchema = new mongoose.Schema({
    wallet_name: { type: String, required: true },
    percentage: { type: Number, required: true, min: 0, max: 100 }
});

const activitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    view: { type: String },
    description: { type: String },
    type: { type: String, },
    debit_credit: { type: String, },
    use_wallet: {
        type: [walletSchema],
        validate: {
            validator: function (wallets) {
                const totalPercentage = wallets.reduce((acc, curr) => acc + curr.percentage, 0);
                return totalPercentage <= 100;
            },
            message: props => `Sum of percentages in use_wallet must be 100, but it is not.`
        }
    },
    status: { type: Number, default: 1 },
    allowed_roles: [{ type: String, enum: ['admin', 'user', 'manager', 'distributor', 'franchise', 'theme'] }],
    act_id: { type: Number, unique: true, required: true }
});


const Activity = mongoose.model('Activity', activitySchema);

const act = [
    {
        name: 'topup',
        view: 'topup',
        description: 'Activity to topup a id',
        type: 'expenses',
        debit_credit: 'debit',
        use_wallet: [
            {
                wallet_name: 'fund_wallet',
                percentage: 100
            }
        ],
        status: 1,
        allowed_roles: ['user', 'admin', 'manager'],
        act_id: 1
    },
    {
        name: 'matching_income',
        view: 'Matching income',
        description: 'Binary matching income (2:1)',
        type: 'income',
        debit_credit: 'credit',
        use_wallet: [
            {
                wallet_name: 'main_wallet',
                percentage: 100
            }
        ],
        status: 1,
        allowed_roles: ['distributor', 'user', 'admin'],
        act_id: 2
    },
    {
        name: 'level_income',
         view: 'direct income',
        description: 'level Activity',
        type: 'income',
        debit_credit: 'credit',
        use_wallet: [
            {
                wallet_name: 'main_wallet',
                percentage: 100
            }
        ],
        status: 0,
        allowed_roles: ['user'],
        act_id: 3
    },
    {
        name: 'add_fund',
        view: 'add_fund',
        description: 'Payment Activity',
        type: 'p2p',
        debit_credit: 'credit',
        use_wallet: [
            {
                wallet_name: 'fund_wallet',
                percentage: 100
            }
            // You can add more wallets here, but the sum of the percentages for each wallet must equal 100%.
        ],
        status: 1,
        allowed_roles: ['distributor', 'admin'],
        act_id: 4
    },
    {
        name: 'withdrawal',
        view: 'withdrawal',
        description: 'withdrawal Activity',
        type: 'withdrawal',
        debit_credit: 'debit',
        use_wallet: [
            {
                wallet_name: 'main_wallet',
                percentage: 100
            }

        ],
        status: 1,
        allowed_roles: ['user', 'distributor'],
        act_id: 5
    },
    {
        name: 'withdrawal_refund',
        view: 'Withdrawal Refund',
        description: 'Credit main wallet when withdrawal request is rejected',
        type: 'refund',
        debit_credit: 'credit',
        use_wallet: [
            {
                wallet_name: 'main_wallet',
                percentage: 100
            }
        ],
        status: 1,
        allowed_roles: ['distributor', 'admin'],
        act_id: 19
    },
    {
        name: 'generate_fund',
        view: 'generate_fund',
        description: 'withdrawal Activity',
        type: 'income',
        debit_credit: 'credit',
        use_wallet: [
            {
                wallet_name: 'fund_wallet',
                percentage: 100
            },
        ],
        status: 1,
        allowed_roles: ['admin','user'],
        act_id: 6
    },
    {
        name: 'fund_transfer',
        view: 'fund_transfer',
        description: 'Payment Activity',
        type: 'p2p',
        debit_credit: 'debit',
        use_wallet: [
            {
                wallet_name: 'fund_wallet',
                percentage: 100
            }

        ],
        status: 1,
        allowed_roles: ['user'],
        act_id: 7
    },
    {
        name: 'emporium_regular_income',
        view: 'emporium regular Income',
        description: 'emporium regular income Activity',
        type: 'income',
        debit_credit: 'credit',
        use_wallet: [
            {
                wallet_name: 'main_wallet',
                percentage: 100
            }
        ],
        status: 0,
        allowed_roles: ['user'],
        act_id: 8
    },
    {
        name: 'emporium_income',
        view: 'emporium Income',
        description: 'emporium income Activity',
        type: 'income',
        debit_credit: 'credit',
        use_wallet: [
            {
                wallet_name: 'main_wallet',
                percentage: 100
            }
        ],
        status: 0,
        allowed_roles: ['user'],
        act_id: 9
    },
    {
        name: 'roi_level_income',
        view: 'level Income',
        description: 'roi level  income Activity',
        type: 'income',
        debit_credit: 'credit',
        use_wallet: [
            {
                wallet_name: 'main_wallet',
                percentage: 100
            }
        ],
        status: 0,
        allowed_roles: ['user'],
        act_id: 10
    },
    {
        name: 'retrieve_fund',
        view: 'retrieve_fund',
        description: 'Activity to retrieve a fund',
        type: 'retrieve_fund',
        debit_credit: 'debit',
        use_wallet: [
            {
                wallet_name: 'fund_wallet',
                percentage: 100
            }
        ],
        status: 1,
        allowed_roles: ['user', 'admin', 'manager'],
        act_id: 11
    },    
    {
        name: 'royalty_income',
        view: 'royalty income',
        description: 'royalty income Activity',
        type: 'income',
        debit_credit: 'credit',
        use_wallet: [
            {
                wallet_name: 'main_wallet',
                percentage: 100
            }
        ],
        status: 0,
        allowed_roles: ['user'],
        act_id: 12
    },
    {
        name: 'leadership_reward',
        view: 'Leadership Reward',
        description: 'Leadership reward income Activity',
        type: 'income',
        debit_credit: 'credit',
        use_wallet: [
            {
                wallet_name: 'leadership_reward',
                percentage: 100
            }
        ],
        status: 0,
        allowed_roles: ['user'],
        act_id: 13
    },
    {
        name: 'team_bonus',
        view: 'Team Bonus',
        description: 'Team bonus income Activity',
        type: 'income',
        debit_credit: 'credit',
        use_wallet: [
            {
                wallet_name: 'team_bonus',
                percentage: 100
            }
        ],
        status: 0,
        allowed_roles: ['user'],
        act_id: 14
    },
    {
        name: 'package_purchase',
        view: 'Package Purchase',
        description: 'Debit fund wallet for distributor package purchase',
        type: 'expenses',
        debit_credit: 'debit',
        use_wallet: [
            {
                wallet_name: 'fund_wallet',
                percentage: 100
            }
        ],
        status: 1,
        allowed_roles: ['distributor'],
        act_id: 15
    },
    {
        name: 'direct_income',
        view: 'Direct Income',
        description: 'Direct sponsor income on package purchase (BV %)',
        type: 'income',
        debit_credit: 'credit',
        use_wallet: [
            {
                wallet_name: 'main_wallet',
                percentage: 100
            }
        ],
        status: 1,
        allowed_roles: ['distributor'],
        act_id: 16
    },
    {
        name: 'repurchase_matching_income',
        view: 'Repurchase Matching Income',
        description: 'Repurchase matching income on product BV (1:1 × 500)',
        type: 'income',
        debit_credit: 'credit',
        use_wallet: [
            {
                wallet_name: 'main_wallet',
                percentage: 100
            }
        ],
        status: 1,
        allowed_roles: ['distributor', 'user', 'admin'],
        act_id: 17
    },
    {
        name: 'upline_matching_income',
        view: 'Upline Matching Income',
        description: 'Share of sponsor matching income distributed equally to active directs',
        type: 'income',
        debit_credit: 'credit',
        use_wallet: [
            {
                wallet_name: 'main_wallet',
                percentage: 100
            }
        ],
        status: 1,
        allowed_roles: ['distributor', 'user', 'admin'],
        act_id: 18
    },
]
async function ensureActivity(def) {
    const existing = await Activity.findOne({ name: def.name });
    if (existing) {
        existing.status = def.status;
        existing.debit_credit = def.debit_credit;
        existing.type = def.type;
        existing.view = def.view;
        existing.description = def.description;
        existing.use_wallet = def.use_wallet;
        existing.allowed_roles = def.allowed_roles;
        await existing.save();
        return;
    }
    const max = await Activity.findOne().sort({ act_id: -1 }).select('act_id');
    const act_id = def.act_id || ((max?.act_id || 0) + 1);
    await Activity.create({ ...def, act_id });
}

async function saveActivity() {
    try {
        const ttl_activity = await Activity.find().count();
        if (ttl_activity == 0) {
            await Activity.insertMany(act)
        } else {
            // Keep add_fund active for distributor fund deposits
            await ensureActivity({
                name: 'add_fund',
                view: 'add_fund',
                description: 'Payment Activity',
                type: 'p2p',
                debit_credit: 'credit',
                use_wallet: [{ wallet_name: 'fund_wallet', percentage: 100 }],
                status: 1,
                allowed_roles: ['distributor', 'admin'],
                act_id: 4
            });
            // Debit fund wallet on package purchase
            await ensureActivity({
                name: 'package_purchase',
                view: 'Package Purchase',
                description: 'Debit fund wallet for distributor package purchase',
                type: 'expenses',
                debit_credit: 'debit',
                use_wallet: [{ wallet_name: 'fund_wallet', percentage: 100 }],
                status: 1,
                allowed_roles: ['distributor'],
                act_id: 15
            });
            // Credit direct sponsor income (BV %) on package purchase
            await ensureActivity({
                name: 'direct_income',
                view: 'Direct Income',
                description: 'Direct sponsor income on package purchase (BV %)',
                type: 'income',
                debit_credit: 'credit',
                use_wallet: [{ wallet_name: 'main_wallet', percentage: 100 }],
                status: 1,
                allowed_roles: ['distributor'],
                act_id: 16
            });
            // Binary matching income (1:1 closing)
            await ensureActivity({
                name: 'matching_income',
                view: 'Matching income',
                description: 'Binary matching income (1:1 × 1250)',
                type: 'income',
                debit_credit: 'credit',
                use_wallet: [{ wallet_name: 'main_wallet', percentage: 100 }],
                status: 1,
                allowed_roles: ['distributor', 'user', 'admin'],
                act_id: 2
            });
            // Repurchase matching income (product BV, no dummy)
            await ensureActivity({
                name: 'repurchase_matching_income',
                view: 'Repurchase Matching Income',
                description: 'Repurchase matching income on product BV (1:1 × 500)',
                type: 'income',
                debit_credit: 'credit',
                use_wallet: [{ wallet_name: 'main_wallet', percentage: 100 }],
                status: 1,
                allowed_roles: ['distributor', 'user', 'admin'],
                act_id: 17
            });
            // Upline matching income (share of sponsor matching → active directs)
            await ensureActivity({
                name: 'upline_matching_income',
                view: 'Upline Matching Income',
                description: 'Share of sponsor matching income distributed equally to active directs',
                type: 'income',
                debit_credit: 'credit',
                use_wallet: [{ wallet_name: 'main_wallet', percentage: 100 }],
                status: 1,
                allowed_roles: ['distributor', 'user', 'admin'],
                act_id: 18
            });
            // Distributor withdrawal from main wallet
            await ensureActivity({
                name: 'withdrawal',
                view: 'withdrawal',
                description: 'withdrawal Activity',
                type: 'withdrawal',
                debit_credit: 'debit',
                use_wallet: [{ wallet_name: 'main_wallet', percentage: 100 }],
                status: 1,
                allowed_roles: ['user', 'distributor'],
                act_id: 5
            });
            // Refund main wallet on withdrawal reject
            await ensureActivity({
                name: 'withdrawal_refund',
                view: 'Withdrawal Refund',
                description: 'Credit main wallet when withdrawal request is rejected',
                type: 'refund',
                debit_credit: 'credit',
                use_wallet: [{ wallet_name: 'main_wallet', percentage: 100 }],
                status: 1,
                allowed_roles: ['distributor', 'admin'],
                act_id: 19
            });
        }
    } catch (error) {
        errorLogger(error)
        console.log(error)
    }
}
saveActivity()
module.exports = Activity;
