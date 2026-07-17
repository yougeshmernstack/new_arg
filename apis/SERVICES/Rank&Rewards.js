const PlansInfo = require("../MODALS/Plan");
const { Power } = require("../MODALS/Power");
const Ranks = require("../MODALS/Ranks");
const Upline = require("../MODALS/upline_bonus");
const UserData = require("../MODALS/userData");
const UserWallet = require("../MODALS/userWallets");
const { INTERNAL_SERVER_ERROR } = require("../utils/errorMessages");
const { errorLogger } = require("../utils/logger");
const Action = require("./Activity");
const Team = require("./UpdateTeam");

class REWARDS {
    constructor() {
        this.calculateBusiness = this.calculateBusiness.bind(this);
        // this.calculateTotalTeamBusiness = this.calculateBusiness.bind(this);
    }

    async achieveRewards(uid) {
        // Fetch the required data
        const plan = await PlansInfo.findOne();
        if (!plan || !plan.reward || !plan.reward.rewards) {
            throw new Error("Plan or rewards not found");
        }

        const rewardsList = plan.reward.rewards;
        const ranks = await Ranks.find({ uid, rankType: "reward" });
        const userWallet = await UserWallet.findOne({ uid });

        if (!userWallet) {
            throw new Error("User wallet not found");
        }

        const teamSection = userWallet.teamSection || [];
       let direct_business= teamSection.length > 0 ? teamSection[0].business || 0 : 0

        const sum = teamSection.reduce(
            (acc, level) => ({
                total_team: acc.total_team + (level.total_team || 0),
                active_team: acc.active_team + (level.active_team || 0),
                business: acc.business + (level.business || 0),
            }),
            { total_team: 0, active_team: 0, business: 0 }
        );

        // const { topLegBusiness, totalOtherBusiness, secondLegBusiness } = await this.calculateTotalTeamBusiness(uid);
       
        let total_business = sum.business;

        // console.log("totalOtherBusiness:", totalOtherBusiness);

        const rewardGoals = [];

        for (const reward of rewardsList) {
            let rewardStatus = 0; // Status for this specific reward
            const userRank = ranks.find((rank) => 
                rank.rankId === reward.rankId && 
                rank.rankType === "reward"
            );

            // Calculate required business for each leg
            const team_required = reward.royalty_income.team_required 
            const team_required_business = reward.royalty_income.team_required_business 
            const direct_required = reward.royalty_income.direct_required 
            const direct_business_required = reward.royalty_income.direct_business_required 
            const investment_required = reward.royalty_income.investment_required

            // Determine available business for each leg
            const directTeamCount = await UserData.countDocuments({ sponsor_Id: uid, status: 1 });
            const walletData = await UserWallet.findOne({ uid, 'wallets.slug': 'self_investment' });
            const selfInvestmentWallet = walletData?.wallets.find(wallet => wallet.slug === 'self_investment');
            const selfInvestmentValue = selfInvestmentWallet ? selfInvestmentWallet.value : 0;
        

            // Check if reward criteria are met
            const isRewardAchieved =
            total_business >= team_required_business  &&
             sum.active_team >= team_required &&
            directTeamCount >= direct_required && 
            selfInvestmentValue >= investment_required &&
             direct_business_required <= direct_business;

            if (isRewardAchieved) {
                rewardStatus = 1;

                if (!userRank) {
                    const newRank = new Ranks({
                        uid,
                        rankId: reward.rankId,
                        status: rewardStatus,
                        rankName: reward.rank_name,
                        rankType: "reward",
                        days_count: 0,
                        createdAt: new Date(),
                    });
                    await newRank.save();

                }
            }

    
           
            // Store reward progress
            rewardGoals.push({
                rankname: reward.rank_name,
                rankId: reward.rankId,
                status: rewardStatus,
                ranksAchievedDate: userRank ? userRank.createdAt : "-",
                team_required,
                team_required_business,
                direct_required,
                direct_business_required,
                investment_required,
                team_members: sum.active_team,
                team_business: total_business,
                direct_members: directTeamCount,
                direct_business, 
                self_investment: selfInvestmentValue,
                income: reward.royalty_income.amount,
                
            });

        }

        return rewardGoals;
    }

    async achieveRewardsInRatio(uid) {
        // Fetch the required data - use lean() to get plain JavaScript objects
        const plan = await PlansInfo.findOne().lean();
        if (!plan || !plan.reward || !plan.reward.rewards) {
            throw new Error("Plan or rewards not found");
        }

        const rewardsList = plan.reward.rewards;
        const ranks = await Ranks.find({ uid, rankType: "reward" });
        const userWallet = await UserWallet.findOne({ uid });

        if (!userWallet) {
            throw new Error("User wallet not found");
        }

        const teamSection = userWallet.teamSection || [];
        const sum = teamSection.reduce(
            (acc, level) => ({
                total_team: acc.total_team + (level.total_team || 0),
                active_team: acc.active_team + (level.active_team || 0),
                business: acc.business + (level.business || 0),
            }),
            { total_team: 0, active_team: 0, business: 0 }
        );

        // Fetch user's business data
        
        const { topLegBusiness, totalOtherBusiness, secondLegBusiness } = await this.calculateTotalTeamBusiness(uid);
        // console.log("topLegBusiness, totalOtherBusiness, secondLegBusiness",topLegBusiness, totalOtherBusiness, secondLegBusiness)

        let remainingTopLegBusiness = topLegBusiness;
        let remainingOtherLegsBusiness = totalOtherBusiness;
        let remainingSecondLegBusiness = secondLegBusiness;

        // console.log("totalOtherBusiness:", totalOtherBusiness);

        const rewardGoals = [];
        const directTeamCount = await UserData.countDocuments({ sponsor_Id: uid, status: 1 });
        const walletData = await UserWallet.findOne({ uid, 'wallets.slug': 'self_investment' });
        const selfInvestmentWallet = walletData?.wallets.find(wallet => wallet.slug === 'self_investment');
        const selfInvestmentValue = selfInvestmentWallet ? selfInvestmentWallet.value : 0;

        for (const reward of rewardsList) {
            let rewardStatus = 0; // Status for this specific reward
            
            // Convert to plain object if it's a Mongoose document to ensure all fields are accessible
            const rewardObj = reward.toObject ? reward.toObject() : reward;
            
            const userRank = ranks.find((rank) => 
                rank.rankId === (rewardObj.rankId || reward.rankId) && 
                rank.rankType === "reward"
            );
            
            // console.log("reward", rewardObj);
            // console.log("Direct access test - reward.required_business:", reward.required_business, "rewardObj.required_business:", rewardObj.required_business);
            
            // Ensure values are numbers and have defaults
            const requiredBusiness = Number(rewardObj.required_business) || 0;
            const strongLegRatio = Number(rewardObj.strong_leg_ratio) || 0;
            const secondStrongLegRatio = Number(rewardObj.second_strong_leg_ratio) || 0;
            const otherLegsRatio = Number(rewardObj.other_legs_ratio) || 0;
            
            // console.log("Values check - requiredBusiness:", requiredBusiness, "strongLegRatio:", strongLegRatio, "secondStrongLegRatio:", secondStrongLegRatio, "otherLegsRatio:", otherLegsRatio);
            
            // Calculate required business for each leg
            const requiredTopLegBusiness = (requiredBusiness * strongLegRatio) / 100;
            const requiredOtherLegsBusiness = (requiredBusiness * otherLegsRatio) / 100;
            const requiredSecondLegsBusiness = (requiredBusiness * secondStrongLegRatio) / 100;
            // console.log("requiredTopLegBusiness, requiredOtherLegsBusiness, requiredSecondLegsBusiness",requiredTopLegBusiness, requiredOtherLegsBusiness, requiredSecondLegsBusiness);
            // Determine available business for each leg
            const topLegBusinessAvailable = Math.min(remainingTopLegBusiness, requiredTopLegBusiness);
            const otherLegsBusinessAvailable = Math.min(remainingOtherLegsBusiness, requiredOtherLegsBusiness);
            const secondLegsBusinessAvailable = Math.min(remainingSecondLegBusiness, requiredSecondLegsBusiness);

            // Check if reward criteria are met
            // console.log("topLegBusinessAvailable, otherLegsBusinessAvailable, secondLegsBusinessAvailable",topLegBusinessAvailable, otherLegsBusinessAvailable, secondLegsBusinessAvailable);
            const isRewardAchieved =
                topLegBusinessAvailable >= requiredTopLegBusiness &&
                otherLegsBusinessAvailable >= requiredOtherLegsBusiness &&
                secondLegsBusinessAvailable >= requiredSecondLegsBusiness;

            if (isRewardAchieved) {
                // console.log("Reward achieved:", rewardObj.rank_name);
                rewardStatus = 1;

                if (!userRank) {
                    const newRank = new Ranks({
                        uid,
                        rankId: rewardObj.rankId || reward.rankId,
                        status: rewardStatus,
                        rankName: rewardObj.rank_name || reward.rank_name,
                        rankType: "reward",
                        days_count: 0,
                        createdAt: new Date(),
                    });
                    await newRank.save();

                    // Distribute instant_income one time when new rank is achieved
                    const instantIncome = rewardObj.instant_income || reward.instant_income;
                    if (instantIncome && instantIncome.status === 1 && instantIncome.amount > 0) {
                        try {
                            const activity = {
                                amount: instantIncome.amount,
                                activity_name: 'leadership_reward',
                                Status: 1,
                                to_from: uid,
                                release: 1, // Instant release
                                currentDate: new Date(),
                                rankId: rewardObj.rankId || reward.rankId
                            };
                            await Action.actInternally(uid, activity);
                        } catch (incomeError) {
                            errorLogger(`Error distributing instant income for rank ${rewardObj.rankId || reward.rankId} for user ${uid}: ${incomeError.message || incomeError}`);
                        }
                    }
                }
            }

            // Get direct team count and self investment for response (optional fields not used in achievement check)

            rewardGoals.push({
                rankname: rewardObj.rank_name || reward.rank_name,
                required_business: rewardObj.required_business,
                rankId: rewardObj.rankId || reward.rankId,
                strong_leg_required: requiredTopLegBusiness,
                second_strong_leg_required: requiredSecondLegsBusiness,
                other_legs_required: requiredOtherLegsBusiness,
                status: rewardStatus,
                rewardAchievedDate: userRank ? userRank.createdAt : "-",
                business: topLegBusinessAvailable + otherLegsBusinessAvailable + secondLegsBusinessAvailable,
                topLegBusiness: topLegBusinessAvailable,
                otherLegsBusiness: otherLegsBusinessAvailable,
                secondLegBusiness: secondLegsBusinessAvailable,
                monthly_income: rewardObj.monthly_income || reward.monthly_income,
                royalty_income: rewardObj.royalty_income || reward.royalty_income,
                instant_income: rewardObj.instant_income || reward.instant_income,
                cto_income: rewardObj.cto_income || reward.cto_income,
                directTeamCount: directTeamCount,
                self_package: selfInvestmentValue,
                totaltopLegBusiness: topLegBusiness, 
                totalOtherBusiness: totalOtherBusiness, 
                totalsecondLegBusiness: secondLegBusiness
            });

            // Deduct business used for this reward
            // remainingTopLegBusiness -= topLegBusinessAvailable;
            // remainingOtherLegsBusiness -= otherLegsBusinessAvailable;
            // remainingSecondLegBusiness -= secondLegsBusinessAvailable;
        }

        return rewardGoals;
    }

    /**
     * Distribute monthly income for reward_2 ranks
     * Note: monthlyIncome.amount is stored as daily amount, but released monthly
     * @param {Number} uid - User ID
     * @param {Number} rankId - Rank ID
     * @param {Object} userRank - User rank document from database
     * @param {Object} monthlyIncome - Monthly income configuration from reward (amount is daily)
     * @returns {Object} Result object with success status and details
     */
    async distributeMonthlyIncomeForReward2(uid, rankId, userRank, monthlyIncome) {
        try {
            // Validate inputs
            if (!uid || !rankId || !userRank || !monthlyIncome) {
                return { success: false, message: 'Missing required parameters' };
            }

            // Check if monthly income is active and has valid amount
            if (monthlyIncome.status !== 1 || !monthlyIncome.amount || monthlyIncome.amount <= 0 || !monthlyIncome.duration || monthlyIncome.duration <= 0) {
                return { success: false, message: 'Monthly income not active or invalid configuration' };
            }

            // Check if rank is achieved
            if (userRank.status !== 1) {
                return { success: false, message: 'Rank not achieved' };
            }

            // duration is in days (e.g., 400 days)
            const durationInDays = monthlyIncome.duration;
            const dailyAmount = monthlyIncome.amount; // This is the daily amount
            const currentDaysCount = userRank.days_count || 0;

            if (currentDaysCount >= durationInDays) {
                return { success: false, message: 'Monthly income duration completed' };
            }

            // Calculate days since rank was achieved
            const daysSinceRankAchieved = Math.floor((new Date() - new Date(userRank.createdAt)) / (1000 * 60 * 60 * 24));
            
            // Calculate remaining days available for distribution
            const remainingDays = Math.min(durationInDays - currentDaysCount, daysSinceRankAchieved - currentDaysCount);
            
            if (remainingDays <= 0) {
                return { success: true, distributionsCount: 0, totalDistributed: 0, message: 'No payments due at this time' };
            }

            // Calculate how many complete months (30 days each) need to be paid
            const monthsElapsed = Math.floor(daysSinceRankAchieved / 30);
            const monthsPaid = Math.floor(currentDaysCount / 30);
            const monthsToPay = monthsElapsed - monthsPaid;

            let distributionsCount = 0;
            let totalDistributed = 0;

            // Distribute monthly income for each complete month that should be paid
            if (monthsToPay > 0 && (monthsPaid + monthsToPay) * 30 <= durationInDays) {
                for (let month = 1; month <= monthsToPay; month++) {
                    try {
                        // Calculate monthly amount: daily amount * 30 days
                        const monthlyAmount = dailyAmount * 30;
                        
                        const activity = {
                            amount: monthlyAmount, // Release monthly accumulated amount (daily * 30)
                            activity_name: 'team_bonus',
                            Status: 1,
                            to_from: uid,
                            release: 1, // Instant release
                            currentDate: new Date(),
                            rankId: rankId
                        };
                        await Action.actInternally(uid, activity);
                        console.log("Distributed monthly income for rank", rankId, "for user", uid, "month", month, "amount", monthlyAmount);
                        // Update days_count after each distribution (add 30 days for each month)
                        const newDaysCount = Math.min((monthsPaid + month) * 30, durationInDays);
                        await Ranks.updateOne(
                            { _id: userRank._id },
                            { $set: { days_count: newDaysCount } }
                        );

                        distributionsCount++;
                        totalDistributed += monthlyAmount;
                    } catch (incomeError) {
                        errorLogger(`Error distributing monthly income for rank ${rankId} for user ${uid}, month ${month}: ${incomeError.message || incomeError}`);
                    }
                }
            }

            return {
                success: true,
                distributionsCount,
                totalDistributed,
                dailyAmount, // Include daily amount for frontend display
                monthlyAmount: dailyAmount * 30, // Monthly amount for reference
                newDaysCount: Math.min((monthsPaid + distributionsCount) * 30, durationInDays),
                message: distributionsCount > 0 ? `Distributed ${distributionsCount} monthly payment(s) totaling ${totalDistributed} (${dailyAmount} daily × 30 days × ${distributionsCount} months)` : 'No payments due at this time'
            };

        } catch (error) {
            errorLogger(`Error in distributeMonthlyIncomeForReward2 for user ${uid}, rank ${rankId}: ${error.message || error}`);
            return { success: false, message: error.message || 'Error distributing monthly income' };
        }
    }

    /**
     * Process monthly income for a specific user's reward_2 ranks
     * Can be called independently to process monthly payments for a user
     * @param {Number} uid - User ID (optional, if not provided processes all users)
     * @returns {Object} Result object with processing summary
     */
    async processMonthlyIncomeForUser(uid = null) {
        try {
            const plan = await PlansInfo.findOne().lean();
            if (!plan || !plan.reward_2 || !plan.reward_2.rewards) {
                return { success: false, message: 'Plan or reward_2 rewards not found' };
            }

            const rewardsList = plan.reward_2.rewards;
            
            // Build query - if uid provided, process only that user, otherwise process all
            const query = { rankType: "reward_2", status: 1 };
            if (uid) {
                query.uid = uid;
            }

            // Fetch all achieved reward_2 ranks
            const achievedRanks = await Ranks.find(query);

            if (achievedRanks.length === 0) {
                return { 
                    success: true, 
                    processedUsers: 0, 
                    totalDistributions: 0, 
                    message: uid ? 'No achieved reward_2 ranks found for this user' : 'No achieved reward_2 ranks found'
                };
            }

            let totalDistributions = 0;
            let totalAmountDistributed = 0;
            const results = [];

            for (const userRank of achievedRanks) {
                // Find the reward configuration for this rank
                const rewardConfig = rewardsList.find(r => r.rankId === userRank.rankId);
                
                if (!rewardConfig) {
                    continue;
                }

                const rewardObj = rewardConfig.toObject ? rewardConfig.toObject() : rewardConfig;
                const monthlyIncome = rewardObj.monthly_income;

                // Process monthly income for this rank
                const distributionResult = await this.distributeMonthlyIncomeForReward2(
                    userRank.uid,
                    userRank.rankId,
                    userRank,
                    monthlyIncome
                );

                if (distributionResult.success && distributionResult.distributionsCount > 0) {
                    totalDistributions += distributionResult.distributionsCount;
                    totalAmountDistributed += distributionResult.totalDistributed;
                    results.push({
                        uid: userRank.uid,
                        rankId: userRank.rankId,
                        rankName: userRank.rankName,
                        ...distributionResult
                    });
                }
            }

            return {
                success: true,
                processedUsers: results.length,
                totalDistributions,
                totalAmountDistributed,
                results,
                message: `Processed monthly income for ${results.length} user(s). Distributed ${totalDistributions} payment(s) totaling ${totalAmountDistributed}`
            };

        } catch (error) {
            errorLogger(`Error in processMonthlyIncomeForUser for ${uid || 'all users'}: ${error.message || error}`);
            return { success: false, message: error.message || 'Error processing monthly income' };
        }
    }

    async achieveRewardsInRatio_2(uid) {
        // Fetch the required data - use lean() to get plain JavaScript objects
        const plan = await PlansInfo.findOne().lean();
        if (!plan || !plan.reward_2 || !plan.reward_2.rewards) {
            throw new Error("Plan or reward_2 rewards not found");
        }

        const rewardsList = plan.reward_2.rewards;
        // console.log("rewardsList for reward_2", rewardsList);
        const ranks = await Ranks.find({ uid, rankType: "reward_2" });
        const userWallet = await UserWallet.findOne({ uid });

        if (!userWallet) {
            throw new Error("User wallet not found");
        }

        const teamSection = userWallet.teamSection || [];
        const sum = teamSection.reduce(
            (acc, level) => ({
                total_team: acc.total_team + (level.total_team || 0),
                active_team: acc.active_team + (level.active_team || 0),
                business: acc.business + (level.business || 0),
            }),
            { total_team: 0, active_team: 0, business: 0 }
        );

        // Fetch user's business data
        
        const { topLegBusiness, totalOtherBusiness, secondLegBusiness } = await this.calculateTotalTeamBusiness(uid);
        // console.log("topLegBusiness, totalOtherBusiness, secondLegBusiness",topLegBusiness, totalOtherBusiness, secondLegBusiness)

        let remainingTopLegBusiness = topLegBusiness;
        let remainingOtherLegsBusiness = totalOtherBusiness;
        let remainingSecondLegBusiness = secondLegBusiness;

        // console.log("totalOtherBusiness:", totalOtherBusiness);

        const rewardGoals = [];
        const directTeamCount = await UserData.countDocuments({ sponsor_Id: uid, status: 1 });
        const walletData = await UserWallet.findOne({ uid, 'wallets.slug': 'self_investment' });
        const selfInvestmentWallet = walletData?.wallets.find(wallet => wallet.slug === 'self_investment');
        const selfInvestmentValue = selfInvestmentWallet ? selfInvestmentWallet.value : 0;

        for (const reward of rewardsList) {
            let rewardStatus = 0; // Status for this specific reward
            
            // Convert to plain object if it's a Mongoose document to ensure all fields are accessible
            const rewardObj = reward.toObject ? reward.toObject() : reward;
            
            const userRank = ranks.find((rank) => 
                rank.rankId === (rewardObj.rankId || reward.rankId) && 
                rank.rankType === "reward_2"
            );
            
            // console.log("reward", rewardObj);
            // console.log("Direct access test - reward.required_business:", reward.required_business, "rewardObj.required_business:", rewardObj.required_business);
            
            // Ensure values are numbers and have defaults
            const requiredBusiness = Number(rewardObj.required_business) || 0;
            const strongLegRatio = Number(rewardObj.strong_leg_ratio) || 0;
            const secondStrongLegRatio = Number(rewardObj.second_strong_leg_ratio) || 0;
            const otherLegsRatio = Number(rewardObj.other_legs_ratio) || 0;
            
            // console.log("Values check - requiredBusiness:", requiredBusiness, "strongLegRatio:", strongLegRatio, "secondStrongLegRatio:", secondStrongLegRatio, "otherLegsRatio:", otherLegsRatio);
            
            // Calculate required business for each leg
            const requiredTopLegBusiness = (requiredBusiness * strongLegRatio) / 100;
            const requiredOtherLegsBusiness = (requiredBusiness * otherLegsRatio) / 100;
            const requiredSecondLegsBusiness = (requiredBusiness * secondStrongLegRatio) / 100;
            // console.log("requiredTopLegBusiness, requiredOtherLegsBusiness, requiredSecondLegsBusiness",requiredTopLegBusiness, requiredOtherLegsBusiness, requiredSecondLegsBusiness);
            // Determine available business for each leg
            const topLegBusinessAvailable = Math.min(remainingTopLegBusiness, requiredTopLegBusiness);
            const otherLegsBusinessAvailable = Math.min(remainingOtherLegsBusiness, requiredOtherLegsBusiness);
            const secondLegsBusinessAvailable = Math.min(remainingSecondLegBusiness, requiredSecondLegsBusiness);

            // Check if reward criteria are met
            // console.log("topLegBusinessAvailable, otherLegsBusinessAvailable, secondLegsBusinessAvailable",topLegBusinessAvailable, otherLegsBusinessAvailable, secondLegsBusinessAvailable);
            const isRewardAchieved =
                topLegBusinessAvailable >= requiredTopLegBusiness &&
                otherLegsBusinessAvailable >= requiredOtherLegsBusiness &&
                secondLegsBusinessAvailable >= requiredSecondLegsBusiness;

            if (isRewardAchieved) {
                // console.log("Reward achieved:", rewardObj.rank_name);
                rewardStatus = 1;

                if (!userRank) {
                    const newRank = new Ranks({
                        uid,
                        rankId: rewardObj.rankId || reward.rankId,
                        status: rewardStatus,
                        rankName: rewardObj.rank_name || reward.rank_name,
                        rankType: "reward_2",
                        days_count: 0,
                        createdAt: new Date(),
                    });
                    await newRank.save();

                } else if (userRank && userRank.status === 1) {
                    // Rank already achieved - distribute monthly_income based on duration and days_count
                    await this.distributeMonthlyIncomeForReward2(uid, rewardObj.rankId || reward.rankId, userRank, rewardObj.monthly_income || reward.monthly_income);
                }
            }

            // Get direct team count and self investment for response (optional fields not used in achievement check)
            const daysSinceRankAchieved = userRank && userRank.createdAt 
                ? Math.floor((new Date() - new Date(userRank.createdAt)) / (1000 * 60 * 60 * 24))
                : 0;
            const days_count = userRank ? userRank.days_count : 0;
            rewardGoals.push({
                rankname: rewardObj.rank_name || reward.rank_name,
                required_business: rewardObj.required_business,
                rankId: rewardObj.rankId || reward.rankId,
                strong_leg_required: requiredTopLegBusiness,
                second_strong_leg_required: requiredSecondLegsBusiness,
                other_legs_required: requiredOtherLegsBusiness,
                status: rewardStatus,
                rewardAchievedDate: userRank ? userRank.createdAt : "-",
                business: topLegBusinessAvailable + otherLegsBusinessAvailable + secondLegsBusinessAvailable,
                topLegBusiness: topLegBusinessAvailable,
                otherLegsBusiness: otherLegsBusinessAvailable,
                secondLegBusiness: secondLegsBusinessAvailable,
                monthly_income: rewardObj.monthly_income || reward.monthly_income,
                royalty_income: rewardObj.royalty_income || reward.royalty_income,
                instant_income: rewardObj.instant_income || reward.instant_income,
                cto_income: rewardObj.cto_income || reward.cto_income,
                directTeamCount: directTeamCount,
                self_package: selfInvestmentValue,
                totaltopLegBusiness: topLegBusiness, 
                totalOtherBusiness: totalOtherBusiness, 
                totalsecondLegBusiness: secondLegBusiness,
                days_passed: daysSinceRankAchieved,
                generated_amount: rewardObj.monthly_income.amount * daysSinceRankAchieved, 
                paid_amount: rewardObj.monthly_income.amount * days_count,
            });

            // Deduct business used for this reward
            // remainingTopLegBusiness -= topLegBusinessAvailable;
            // remainingOtherLegsBusiness -= otherLegsBusinessAvailable;
            // remainingSecondLegBusiness -= secondLegsBusinessAvailable;
        }

        return rewardGoals;
    }
    
    
    async upline_bonus(uid) {
        // Fetch the required data
        const plan = await PlansInfo.findOne();
        if (!plan || !plan.upline_bonus) {
            throw new Error("Plan or upline Bonus not found");
        }
    
        const bonusConfig = plan.upline_bonus;
        const userRanks = await Upline.find({ uid });
        const userWallet = await UserWallet.findOne({ uid });
    
        if (!userWallet) {
            throw new Error("User wallet not found");
        }
    
        const teamSection = userWallet.teamSection || [];
        let direct_business = teamSection.length > 0 ? teamSection[0].business || 0 : 0;
    
        // Get direct team count
        const directTeamCount = await UserData.countDocuments({ sponsor_Id: uid, status: 1 });
    
        const rewardGoals = [];
    
        for (const level of bonusConfig.level) {
            if (!level.status) continue; 
           
            let rewardStatus = 0;
            
            const userRank = userRanks.find(rank => rank.level === level.level);
    
            const isRewardAchieved = 
                directTeamCount >= level.direct_required && 
                direct_business >= level.business_required;
    
            if (isRewardAchieved) {
                rewardStatus = 1;
    
                if (!userRank) {
                    const newRank = new Upline({
                        uid,
                        level: level.level,
                        status: rewardStatus,
                        rankName: `Level ${String(level.level)}`,
                        createdAt: new Date(),
                    });
                    await newRank.save();
                }
            }
    
            rewardGoals.push({
                // Explicitly convert to string to avoid undefined issues
                upline_level: `Level ${String(level.level)}`,
                level: level.level,
                status: rewardStatus,
                uplineAchievedDate: userRank ? userRank.createdAt : "-",
                direct_required: level.direct_required,
                direct_business_required: level.business_required, // Renamed from business_required for clarity
                direct_members: directTeamCount,
                direct_business,
                income: level.income // Also include income in the response
            });
        }
    
        return rewardGoals;
    }
   
    async gamingwallet_for_Activation(uid) {
        const userWallet = await UserWallet.findOne({ uid });
        if (!userWallet) throw new Error("User wallet not found");
    
        const user = await UserData.findOne({ uid, status: 1 });
        const now = new Date();
    
        const rewardGoals = [{
            uid,
            directTeamCount: 0,
            direct_required: 0,
            direct_business: 0,
            direct_business_required: 0,
            selfBusiness: 0,
            activationDate: null,
            endDate: null,
            status: 0,
            enddate_status: 0
        }];
    
        const goal = rewardGoals[0];
    
        if (!user) return rewardGoals;
    
        if (user.enable_gaming_wallet === 1 && user.enable_gaming_wallet_Date) {
            goal.activationDate = user.Activation_date;
            goal.status = 1;
            return rewardGoals;
        }
    
        goal.activationDate = new Date(user.Activation_date);
        const calculatedEndDate = new Date(goal.activationDate);
        calculatedEndDate.setDate(calculatedEndDate.getDate() + 30);
    
        const within30Days = now <= calculatedEndDate;
        goal.endDate = within30Days ? calculatedEndDate : "lifetime";
        goal.enddate_status = within30Days ? 1 : 0;
    
        goal.selfBusiness = userWallet?.wallets?.find(wallet => wallet.slug === "self_investment")?.value || 0;
    
        const dateQuery = {
            sponsor_Id: uid,
            status: 1,
            Activation_date: { $gte: goal.activationDate }
        };
        if (within30Days) {
            dateQuery.Activation_date.$lte = calculatedEndDate;
        }
    
        goal.directTeamCount = await UserData.countDocuments(dateQuery);
    
        const businessEndDate = within30Days ? calculatedEndDate : now;
        goal.direct_business = await Team.calculateTeamBusiness(goal.activationDate, businessEndDate, uid, 1);
    
        goal.direct_required = within30Days ? 2 : 4;
        goal.direct_business_required = goal.direct_required * goal.selfBusiness;
    
        if (
            goal.directTeamCount >= goal.direct_required &&
            goal.direct_business >= goal.direct_business_required
        ) {
            await UserData.updateOne({ uid }, {
                $set: {
                    enable_gaming_wallet: 1,
                    enable_gaming_wallet_Date: now
                }
            });
            goal.status = 1;
        }
    
        return rewardGoals;
    }
       
    async calculateBusiness(uid) {
        try {
            // Fetch the referrals
            const referrals = await UserData.find({ sponsor_Id: uid });
            const referralUids = referrals.map(user => user.uid);

            if (referralUids.length === 0) {
                return { topLegBusiness: 0, totalOtherBusiness: 0 };
            }

            // Fetch wallets for referrals
            const referralWallets = await UserWallet.find({ uid: { $in: referralUids } });

            // Calculate business values from teamSection
            const teamSectionBusiness = referralWallets.flatMap(wallet => {
                const invest = wallet.wallets.filter(w => w.wallet_type === 'investment').map(w => w.value)
                const bus = wallet.teamSection.reduce((sum, value) => sum + value.business, 0)
                //console.log('here=====', invest, bus)
                return (invest[0] + bus)
            }
            );

            const sortedBusinessValues = teamSectionBusiness.sort((a, b) => b - a);
            const topLegBusiness = sortedBusinessValues[0] || 0;
            const secondLegBusiness = sortedBusinessValues[1] || 0;
            const total = sortedBusinessValues.reduce((sum, value) => sum + value, 0);

            const totalOtherBusiness = total - topLegBusiness - secondLegBusiness;

            //console.log('sortedBusinessValues',  sortedBusinessValues, topLegBusiness, totalOtherBusiness, referralUids);

            return { topLegBusiness, totalOtherBusiness, secondLegBusiness };
        } catch (error) {
            errorLogger(error);
            // throw new Error('Error calculating business metrics');
        }
    }
 
    // async calculateTotalTeamBusiness(uid) {
    //     try {
    //         // Fetch all referrals of the given user
    //         const referrals = await UserData.find({ sponsor_Id: uid });
    //         console.log(referrals);
    //         const referralUids = referrals.map(user => user.uid);
    
    //         if (referralUids.length === 0) {
    //             return { topLegBusiness: 0, secondLegBusiness: 0, totalOtherBusiness: 0 };
    //         }
    
    //         // Fetch wallets for referrals
    //         const referralWallets = await UserWallet.find({ uid: { $in: referralUids } });
    
    //         // Collect business values, skipping Level 1 & Level 2
    //         const teamSectionBusiness = referralWallets.flatMap(wallet => {
    //             const invest = wallet.wallets
    //                 .filter(w => w.wallet_type === 'investment')
    //                 .map(w => w.value);
                
    //             // Skip Level 1 & Level 2 business from teamSection
    //             const businessFromTeam = wallet.teamSection
    //                 .filter(team => team.level > 1) // Skip level 1 & 2
    //                 .reduce((sum, team) => sum + team.business, 0);
    
    //             return businessFromTeam;
    //         });
    
    //         if (teamSectionBusiness.length === 0) {
    //             return { topLegBusiness: 0, secondLegBusiness: 0, totalOtherBusiness: 0 };
    //         }
    
    //         // Sort the business values in descending order
    //         const sortedBusinessValues = teamSectionBusiness.sort((a, b) => b - a);
    //         const topLegBusiness = sortedBusinessValues[0] || 0;
    //         const secondLegBusiness = sortedBusinessValues[1] || 0;
    //         const total = sortedBusinessValues.reduce((sum, value) => sum + value, 0);
    
    //         // Other leg business excluding top and second top leg
    //         const totalOtherBusiness = total - topLegBusiness - secondLegBusiness;
    
    //         return { topLegBusiness, secondLegBusiness, totalOtherBusiness };
    //     } catch (error) {
    //         errorLogger(error);
    //         throw new Error('Error calculating business metrics');
    //     }
    // }
    
    
    // new
    async getUserRankProgress(uid) {
        // Fetch required data
        const plan = await PlansInfo.findOne();
        if (!plan || !plan.reward || !plan.reward.rewards) {
            return res.status(404).json({ message: "Plan or rewards not found" });
        }
    
        const rewardsList = plan.reward.rewards;
        const ranks = await Ranks.find({ uid, rankType: "reward" }).sort({ createdAt: 1 }); // Sort by earliest achieved
        const userWallet = await UserWallet.findOne({ uid });
    
        if (!userWallet) {
            return res.status(404).json({ message: "User wallet not found" });
        }
    
        // Fetch user's business data
        const { topLegBusiness, totalOtherBusiness, secondLegBusiness } = await this.calculateTotalTeamBusiness(uid);
        // const { topLegBusiness, totalOtherBusiness, secondLegBusiness } = await this.calculateBusiness(uid);
    
        let lastAchievedRank = ranks.length ? ranks[ranks.length - 1] : null;
        let nextRank = rewardsList.find(reward => !ranks.some(rank => rank.rankId === reward.rankId));
    
        let displayedRanks = [];
    
        if (!lastAchievedRank) {
            // If no rank is achieved, first entry should be "Pending Rank"
            const firstRank = rewardsList[0];
    
            if (firstRank) {
                const requiredTopLegBusiness = (firstRank.required_business * firstRank.strong_leg_ratio) / 100;
                const requiredSecondLegsBusiness = (firstRank.required_business * firstRank.second_strong_leg_ratio) / 100;
                const requiredOtherLegsBusiness = (firstRank.required_business * firstRank.other_legs_ratio) / 100;
    
                displayedRanks.push({
                    rankName: "Fight For Rank",
                    requiredTopLegBusiness,
                    TopLegBusiness: Math.min(topLegBusiness, requiredTopLegBusiness),
                    requiredSecondLegsBusiness,
                    SecondLegsBusiness: Math.min(secondLegBusiness, requiredSecondLegsBusiness),
                    requiredOtherLegsBusiness,
                    OtherLegsBusiness: Math.min(totalOtherBusiness, requiredOtherLegsBusiness),
                    status: "Pending"
                });
    
                // Second entry: First actual rank (BRONZE)
                displayedRanks.push({
                    rankName: firstRank.rank_name,
                    requiredTopLegBusiness,
                    TopLegBusiness: Math.min(topLegBusiness, requiredTopLegBusiness),
                    requiredSecondLegsBusiness,
                    SecondLegsBusiness: Math.min(secondLegBusiness, requiredSecondLegsBusiness),
                    requiredOtherLegsBusiness,
                    OtherLegsBusiness: Math.min(totalOtherBusiness, requiredOtherLegsBusiness),
                    status: "Pending"
                });
            }
        } else {
            // First entry: Last achieved rank with actual business values
            const achievedRank = rewardsList.find(reward => reward.rankId === lastAchievedRank.rankId);
            if (achievedRank) {
                const requiredTopLegBusiness = (achievedRank.required_business * achievedRank.strong_leg_ratio) / 100;
                const requiredSecondLegsBusiness = (achievedRank.required_business * achievedRank.second_strong_leg_ratio) / 100;
                const requiredOtherLegsBusiness = (achievedRank.required_business * achievedRank.other_legs_ratio) / 100;
    
                displayedRanks.push({
                    rankName: achievedRank.rank_name,
                    requiredTopLegBusiness,
                    TopLegBusiness: Math.min(topLegBusiness, requiredTopLegBusiness),
                    requiredSecondLegsBusiness,
                    SecondLegsBusiness: Math.min(secondLegBusiness, requiredSecondLegsBusiness),
                    requiredOtherLegsBusiness,
                    OtherLegsBusiness: Math.min(totalOtherBusiness, requiredOtherLegsBusiness),
                    status: 1 // Achieved rank
                });
            }
    
            // Second entry: Next required rank with business progress
            if (nextRank) {
                const requiredTopLegBusiness = (nextRank.required_business * nextRank.strong_leg_ratio) / 100;
                const requiredSecondLegsBusiness = (nextRank.required_business * nextRank.second_strong_leg_ratio) / 100;
                const requiredOtherLegsBusiness = (nextRank.required_business * nextRank.other_legs_ratio) / 100;
    
                displayedRanks.push({
                    rankName: nextRank.rank_name,
                    requiredTopLegBusiness,
                    TopLegBusiness: Math.min(topLegBusiness, requiredTopLegBusiness),
                    requiredSecondLegsBusiness,
                    SecondLegsBusiness: Math.min(secondLegBusiness, requiredSecondLegsBusiness),
                    requiredOtherLegsBusiness,
                    OtherLegsBusiness: Math.min(totalOtherBusiness, requiredOtherLegsBusiness),
                    status: "Pending"
                });
            }
        }
    
        return displayedRanks;
    }
 
async calculateTotalTeamBusiness(uid) {
    try {
        // Fetch all referrals of the given user
        const referrals = await UserData.find({ sponsor_Id: uid });
        const referralUids = referrals.map(user => user.uid);

        if (referralUids.length === 0) {
            return {
                topLegBusiness: 0, 
                secondLegBusiness: 0, 
                totalOtherBusiness: 0,
                topUid: [], 
                secondTopUid: [], 
                otherUids: []
            };
        }

        // Fetch wallets for referrals
        const referralWallets = await UserWallet.find({ uid: { $in: referralUids } });

        let teamBusinessData = referralWallets.map(wallet => {
            // Calculate downline business from teamSection
            const downlineBusiness = wallet.teamSection
                .reduce((sum, team) => sum + (team.business || 0), 0);
            
            // Get self-investment (the node's own business)
            const selfInvestmentWallet = wallet.wallets?.find(w => w.slug === 'self_investment');
            const selfInvestmentValue = selfInvestmentWallet ? (selfInvestmentWallet.value || 0) : 0;
            
            // Total business = downline business + self investment
            const totalBusiness = downlineBusiness + selfInvestmentValue;

            return { uid: wallet.uid, totalBusiness };
        });

        if (teamBusinessData.length === 0) {
            return {
                topLegBusiness: 0, 
                secondLegBusiness: 0, 
                totalOtherBusiness: 0,
                topUid: [], 
                secondTopUid: [], 
                otherUids: []
            };
        }

        // Fetch Power business sum for each uid in teamBusinessData
        for (let entry of teamBusinessData) {
            const powerBusiness = await Power.aggregate([
                { $match: { uid: entry.uid } },
                { $group: { _id: null, totalPowerBusiness: { $sum: "$power" } } }
            ]);

            // Add Power business sum to total business
            entry.totalBusiness += powerBusiness.length > 0 ? powerBusiness[0].totalPowerBusiness : 0;
        }

        // Sort by total business in descending order
        teamBusinessData.sort((a, b) => b.totalBusiness - a.totalBusiness);

        // Extract top, second top, and other UIDs
        const topLegBusiness = teamBusinessData[0]?.totalBusiness || 0;
        const secondLegBusiness = teamBusinessData[1]?.totalBusiness || 0;
        const totalBusiness = teamBusinessData.reduce((sum, entry) => sum + entry.totalBusiness, 0);
        const totalOtherBusiness = totalBusiness - topLegBusiness - secondLegBusiness;

        return {
            topLegBusiness,
            secondLegBusiness,
            totalOtherBusiness,
            topUid: teamBusinessData[0] ? [teamBusinessData[0].uid] : [],
            secondTopUid: teamBusinessData[1] ? [teamBusinessData[1].uid] : [],
            otherUids: teamBusinessData.slice(2).map(entry => entry.uid)
        };
    } catch (error) {
        errorLogger(error);
        throw new Error('Error calculating business metrics');
    }
}   
async calculateTotalTeamBusiness_without_power(uid) {
    try {
        // Fetch all referrals of the given user
        const referrals = await UserData.find({ sponsor_Id: uid });
        const referralUids = referrals.map(user => user.uid);

        if (referralUids.length === 0) {
            return {
                topLegBusiness: 0, 
                secondLegBusiness: 0, 
                totalOtherBusiness: 0,
                totalBusiness: 0, // Added total business
                topUid: [], 
                secondTopUid: [], 
                otherUids: []
            };
        }

        // Fetch wallets for referrals
        const referralWallets = await UserWallet.find({ uid: { $in: referralUids } });

        // Initialize the team business data array
        let teamBusinessData = [];

        // Process each wallet
        for (const wallet of referralWallets) {
            // Check if teamSection exists and is an array
            if (!wallet.teamSection || !Array.isArray(wallet.teamSection)) {
                continue;
            }

            // Calculate business from levels > 1
            let totalTeamBusiness = wallet.teamSection
                .filter(team => team.level > 1) 
                .reduce((sum, team) => sum + (Number(team.business) || 0), 0);

            teamBusinessData.push({ uid: wallet.uid, totalBusiness: totalTeamBusiness });
        }

        if (teamBusinessData.length === 0) {
            return {
                topLegBusiness: 0, 
                secondLegBusiness: 0, 
                totalOtherBusiness: 0,
                totalBusiness: 0, // Added total business
                topUid: [], 
                secondTopUid: [], 
                otherUids: []
            };
        }

        // Sort by total business in descending order
        teamBusinessData.sort((a, b) => b.totalBusiness - a.totalBusiness);

        // Extract top, second top, and other UIDs
        const topLegBusiness = teamBusinessData[0]?.totalBusiness || 0;
        const secondLegBusiness = teamBusinessData[1]?.totalBusiness || 0;
        const totalBusiness = teamBusinessData.reduce((sum, entry) => sum + entry.totalBusiness, 0);
        const totalOtherBusiness = totalBusiness - topLegBusiness - secondLegBusiness;

        return {
            topLegBusiness,
            secondLegBusiness,
            totalOtherBusiness,
            totalBusiness, // Added total business
            topUid: teamBusinessData[0] ? [teamBusinessData[0].uid] : [],
            secondTopUid: teamBusinessData[1] ? [teamBusinessData[1].uid] : [],
            otherUids: teamBusinessData.slice(2).map(entry => entry.uid)
        };
    } catch (error) {
        console.error('Error calculating business metrics:', error);
        throw new Error('Error calculating business metrics');
    }
} 

}
const Rewards = new REWARDS()
module.exports = Rewards;
