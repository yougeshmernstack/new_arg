const PlansInfo = require("../../MODALS/Plan");

class PlanSetting {

    async getAllPackage(req, res) {
        try {
            const packages = await PlansInfo.find({})
            return res.status(200).json({ packages });
        } catch (error) {
            console.error("Error fetching all packages:", error);
            res.status(500).json({ error: 'Error fetching all packages' });
        }
    }

    async updateBonusIncome(req, res) {
        try {
            const { income, type, levelIndex } = req.body;

            if (income === undefined || income === null) {
                return res.status(400).json({ error: 'income is required' });
            }

            // Determine update path based on requested type
            let update = null;
            if (type === 'direct_income') {
                update = { $set: { 'direct_income.amount': income } };
            } else if (type === 'direct_referral_bonus') {
                update = { $set: { 'direct_referral_bonus.amount': income } };
            } else if (type === 'team_activity_bonus') {
                update = { $set: { 'team_activity_bonus.amount': income } };
            } else if (type === 'instant_leadership_reward') {
                update = { $set: { 'instant_leadership_reward.amount': income } };
            } else if (type === 'daily_trading_profit') {
                update = { $set: { 'daily_trading_profit.amount': income } };
            } else if (type === 'level_income') {
                const idx = Number.isInteger(levelIndex) ? levelIndex : 0;
                update = { $set: { [`level_income.level.${idx}.income`]: income } };
            } else if (type === 'roi_level_income') {
                const idx = Number.isInteger(levelIndex) ? levelIndex : 0;
                update = { $set: { [`roi_level_income.level.${idx}.income`]: income } };
            } else if (type === 'roi_income') {
                update = { $set: { 'roi_income.income': income } };
            }

            if (!update) {
                return res.status(400).json({ error: 'Unsupported type. Use one of: direct_income, direct_referral_bonus, team_activity_bonus, instant_leadership_reward, daily_trading_profit, level_income, roi_level_income, roi_income' });
            }

            const updatedPlanInfo = await PlansInfo.findOneAndUpdate(
                {},
                update,
                { new: true }
            );

            if (!updatedPlanInfo) {
                return res.status(404).json({ error: 'Plan information not found' });
            }

            res.status(200).json({ message: 'Income updated successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Error updating income' });
        }
    }
}

const plansetting = new PlanSetting();
module.exports = plansetting;
