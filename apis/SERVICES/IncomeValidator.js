const Orders = require('../MODALS/Orders');
const PlansInfo = require('../MODALS/Plan');
const Ranks = require('../MODALS/Ranks');
const Transaction = require('../MODALS/transactions');
const UserData = require('../MODALS/userData');
const UserWallet = require('../MODALS/userWallets');
const { errorLogger, logConditionFailure } = require('../utils/logger');

class Validator {

    async validateLevelIncomeConditions(uid, plan, levelIndex, levelCondition) {
        try {
            const userWallet = await UserWallet.findOne({ uid });
            if (!userWallet || !plan) {
                return false;
            }

            const user = await UserData.findOne({ uid });
            if(user.status === 0){
                return 
              }

            const { direct_required, total_team_required, team_required_by_level, business_required } = levelCondition;

            // const directCount = userWallet.teamSection.reduce((acc, team) => acc + team.active_team, 0);
            // console.log("new_direct");
            const directCount = userWallet.teamSection?.[0]?.active_team || 0;
            // console.log("new_direct_data",directCount);
            const totalTeamCount = userWallet.teamSection.reduce((acc, team) => acc + team.total_team, 0);
            const business = userWallet.teamSection.reduce((acc, team) => acc + team.business, 0);
            const userLevel = userWallet.teamSection.find(level => level.level === levelIndex) || {};

            if (direct_required && directCount < direct_required) return false ;
            if (total_team_required && totalTeamCount < total_team_required) return false;
            if (team_required_by_level && (userLevel.total_team || 0) < team_required_by_level) return false;
            if (business_required && business < business_required) return false;

            return true;
        } catch (error) {
            errorLogger(error);
            return false;
        }
    }

    async validateROIConditions(uid, planId=1, order_Id, amount) {
        try {
            // Fetch the user's wallet and plan details
            const userWallet = await UserWallet.findOne({ uid });
            const plan = await PlansInfo.findOne({ planId });
    
            if (!userWallet || !plan) {
                logConditionFailure(`User wallet or plan not found for UID: ${uid}, Plan ID: ${planId}`);
                return false;
            }
    
            const roiCondition = plan.roi_income;
            const { maximum: default_maximum_roi } = roiCondition;
            const { total_capping, included_incomes_for_capping } = plan.package;
    
            // Get transactions to track how much ROI already paid for this order
            const trans = await Transaction.aggregate([
                {
                    $match: {
                        status:1,
                        uid: uid,
                        source: {$in:['roi_income', 'roi_level_income','community_income','reward_income','team_royalty_income','leadership_income','salary_income']}
                    }
                },  
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: "$amount" }
                    }
                }
            ]);
            const totalIncomeResult = await Transaction.aggregate([
                { $match: { source: 'withdrawal', uid ,status:1,remark:"from_admin"} }, 
                { $group: { _id: null, totalIncome: { $sum: "$amount" } } }
            ]);
    
            const totalAmount = (trans[0]?.totalAmount || 0) + (totalIncomeResult[0]?.totalIncome || 0);
    
            let maximum_income = default_maximum_roi; 
    
            const { teamSection } = userWallet;

            const level1 = teamSection.find(entry => entry.level == 1);
                
            const directBusiness = level1 ? level1.business : 0;

            
            const goldRanks = await Ranks.find({ uid, rankId: { $gte: 3 }, status: 1 });
            const hasGoldRank = goldRanks.length > 0;
    
            if (hasGoldRank) {
                maximum_income = 500; 
            } else if (directBusiness >= 1000) {
                maximum_income = 300; 
            }
            
            const orderCount = await Orders.countDocuments({
                uid,
                status: { $in: [1,2] },
                order_Id: { $lte: order_Id },
                amount: { $ne: 0 }
            });
            const total_income_Capping= maximum_income*orderCount
          
            if (totalAmount >= (amount * total_income_Capping / 100)) {
                const updateOrder = await Orders.findOneAndUpdate({ order_Id }, { $set: { status: 2 } });
                logConditionFailure(`User ${uid} attempted to take maximum total income.`);
                return false;
            }
    
            return true;
        } catch (error) {
            errorLogger(error);
            return false;
        }
    }

    


}
const validator = new Validator();
module.exports = validator;
