const Action = require('./Activity');
const UserData = require('../MODALS/userData');
const PlansInfo = require('../MODALS/Plan');
const { errorLogger, logConditionFailure } = require('../utils/logger');
const UserWallet = require('../MODALS/userWallets');
const validator = require('./IncomeValidator');
// const Community
// 
//  = require('../MODALS/Community_bonus');
const Rewards = require('./Rank&Rewards');
const Team = require('./UpdateTeam');
const Ranks = require('../MODALS/Ranks');
const Orders = require('../MODALS/Orders');
const Transaction = require('../MODALS/transactions');

class LEVEL {


    // async distributeLevelIncome(uid, planId, amount, order_Id) {
    //     console.log("worrking level income");
    //     try {
    //         let user = await UserData.findOne({ uid });
    //         const plan = await PlansInfo.findOne({ planId });
    //         if (!plan) {
    //             return;
    //         }
    //         let sponsor_Id = user.sponsor_Id;
    //         const { level_income } = plan;
    //         if (level_income.status !== 1) {
    //             return;
    //         }

    //         for (let levelIndex = 0; levelIndex < level_income.level.length && sponsor_Id; levelIndex++) {
    //             const sponsor = await UserData.findOne({ uid: sponsor_Id });

    //             if (!sponsor) {
    //                 break;
    //             }

    //             const selfInvestment = await Orders.aggregate([
    //                 {
    //                     $match: {
    //                         uid: sponsor.uid,
    //                         status: 1,
    //                     }
    //                 },
    //                 {
    //                     $group: {
    //                         _id: null,
    //                         totalInvestment: { $sum: "$amount" }
    //                     }
    //                 }
    //             ]);

    //             const totalInvestment = selfInvestment[0]?.totalInvestment || 0;
    //             let orderamount=totalInvestment>=amount?amount:totalInvestment;

    //             const levelCondition = plan.level_income.level[levelIndex];

    //             const conditionValid = await validator.validateLevelIncomeConditions(sponsor.uid, plan, levelIndex, levelCondition);

    //             if (conditionValid) {
    //                 const incomeAmount = this.calculateIncome(orderamount, plan.level_income.level[levelIndex], plan.level_income.income_type);


    //                 //  const eligibilityResult = await this.checkUserIncomeEligibility(sponsor.uid, incomeAmount);
    //                 //   const finalIncomeAmount = eligibilityResult.allowedAmount;

    //                 let activity = { amount: incomeAmount, activity_name: 'level_income', Status: 1, to_from: user.uid, level: levelIndex + 1, order_Id };


    //                 await Action.actInternally(sponsor.uid, activity);
    //             } else {
    //                 const logMessage = `User ID: ${uid}, Level: ${levelIndex}, Failed Conditions: ${JSON.stringify(levelCondition)}, Date: ${new Date().toISOString()}\n`;
    //                 logConditionFailure(logMessage);
    //             }
    //             sponsor_Id = sponsor.sponsor_Id;
    //         }
    //     } catch (error) {
    //         errorLogger(error);
    //     }
    // }


    async distributeLevelIncome(uid, planId, amount, order_Id) {
        try {
            let user = await UserData.findOne({ uid });
            const plan = await PlansInfo.findOne({ planId: 1 });
            if (!plan) {
                return;
            }
            let sponsor_Id = user.sponsor_Id;
            const { level_income } = plan;
            if (level_income.status !== 1) {
                return;
            }

            for (let levelIndex = 0; levelIndex < level_income.level.length && sponsor_Id; levelIndex++) {
                const sponsor = await UserData.findOne({ uid: sponsor_Id });
                if (!sponsor) {
                    break;
                }
                const levelCondition = plan.level_income.level[levelIndex];

                const conditionValid = await validator.validateLevelIncomeConditions(sponsor.uid, plan, levelIndex, levelCondition);

                if (conditionValid) {
                    let incomeAmount = this.calculateIncome(amount, plan.level_income.level[levelIndex], plan.level_income.income_type);
                    //check income eligibility
                    console.log("incomeAmount", incomeAmount)
                    const eligibilityResult = await this.checkUserIncomeEligibility(sponsor.uid, incomeAmount);
                    incomeAmount = eligibilityResult.allowedAmount;
                    console.log("incomeAmountAfterEligibility", incomeAmount)
                    let activity = { amount: incomeAmount, activity_name: 'level_income', Status: 1, to_from: user.uid, level: levelIndex + 1, order_Id };
                    await Action.actInternally(sponsor.uid, activity);
                } else {
                    const logMessage = `User ID: ${uid}, Level: ${levelIndex}, Failed Conditions: ${JSON.stringify(levelCondition)}, Date: ${new Date().toISOString()}\n`;
                    logConditionFailure(logMessage);
                }
                sponsor_Id = sponsor.sponsor_Id;
            }
        } catch (error) {
            errorLogger(error);
        }
    }

    async distributebonusIncome(uid, planId, amount, order_Id) {
        try {
            const plan = await PlansInfo.findOne({ planId });
            if (!plan) {
                return;
            }
            const { bonus_income } = plan;
            if (bonus_income.status !== 1) {
                return;
            }

            for (let levelIndex = 0; levelIndex < bonus_income.level.length; levelIndex++) {

                const levelCondition = plan.bonus_income.level[levelIndex];

                const conditionValid = await validator.validateLevelIncomeConditions(uid, plan, levelIndex, levelCondition);
                console.log("conditionValid", conditionValid)
                if (conditionValid) {
                    const incomeAmount = this.calculateIncome(amount, plan.bonus_income.level[levelIndex], plan.bonus_income.income_type);

                    let activity = { amount: incomeAmount, activity_name: 'bonus_income', Status: 1, to_from: 1, level: 0, order_Id };
                    // console.log("activity",activity)
                    await Action.actInternally(uid, activity);
                } else {
                    const logMessage = `User ID: ${uid}, Level: ${levelIndex}, Failed Conditions: ${JSON.stringify(levelCondition)}, Date: ${new Date().toISOString()}\n`;
                    logConditionFailure(logMessage);
                }
            }
        } catch (error) {
            errorLogger(error);
        }
    }

    async distributeLevelIncomeOnReferralCompletion(sponsorUid, completedReferralUid, planId, amount, order_Id) {
        try {
            // Check if sponsor has exactly 2 completed referrals (activated users with orders)
            const completedReferrals = await UserData.find({
                sponsor_Id: sponsorUid,
                status: 1  // Activated users
            });

            // Filter to only count referrals that have completed orders
            const referralsWithOrders = await Promise.all(
                completedReferrals.map(async (referral) => {
                    const hasOrder = await Orders.findOne({
                        uid: referral.uid,
                        status: 1
                    });
                    return hasOrder ? referral : null;
                })
            );

            const completedReferralsCount = referralsWithOrders.filter(r => r !== null).length;

            // Only distribute if sponsor has exactly 2 completed referrals
            if (completedReferralsCount >= 1) {
                // Get the sponsor's data
                const sponsor = await UserData.findOne({ uid: sponsorUid });
                if (!sponsor) {
                    return;
                }

                // Get the plan
                const plan = await PlansInfo.findOne({ planId: planId || 1 });
                if (!plan) {
                    return;
                }

                const { level_income } = plan;
                if (level_income.status !== 1) {
                    return;
                }

                // Distribute level income to sponsor's upline
                let uplineSponsorId = sponsorUid;

                for (let levelIndex = 0; levelIndex < level_income.level.length && uplineSponsorId; levelIndex++) {
                    const uplineSponsor = await UserData.findOne({ uid: uplineSponsorId });

                    if (!uplineSponsor) {
                        break;
                    }

                    const levelCondition = plan.level_income.level[levelIndex];
                    const conditionValid = await validator.validateLevelIncomeConditions(
                        uplineSponsor.uid,
                        plan,
                        levelIndex,
                        levelCondition
                    );

                    if (conditionValid) {
                        let incomeAmount = this.calculateIncome(
                            amount,
                            plan.level_income.level[levelIndex],
                            plan.level_income.income_type
                        );

                        const eligibilityResult = await this.checkUserIncomeEligibility(uplineSponsor.uid, incomeAmount);
                        incomeAmount = eligibilityResult.allowedAmount;

                        if (incomeAmount > 0) {
                            // suym of total_income of user
                            const totalIncome_data = await Transaction.aggregate([
                                {
                                    $match: {
                                        uid: uplineSponsor.uid,
                                        source: { $in: ['matching_income'] },
                                        status: 1
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        totalIncome: { $sum: "$amount" }
                                    }
                                }
                            ]);
                            const totalIncome = totalIncome_data[0]?.totalIncome || 0;
                            console.log("uid", uplineSponsor.uid)
                            console.log("totalIncome", totalIncome)
                            console.log("uplineSponsor.capping", uplineSponsor.capping)
                            
                            if (totalIncome + incomeAmount > uplineSponsor.capping) {
                                incomeAmount = uplineSponsor.capping - totalIncome
                            }
                            console.log("incomeAmount", incomeAmount)
                            const check=true;
                            if (incomeAmount > 0 && check) {
                                let activity = {
                                    amount: incomeAmount,
                                    activity_name: 'matching_income',
                                    Status: 1,
                                    to_from: sponsorUid,  // The sponsor who has 2 referrals
                                    level: levelIndex + 1,
                                    order_Id
                                };
                                await Action.actInternally(uplineSponsor.uid, activity);
                            }
                        }
                    } else {
                        const logMessage = `Sponsor UID: ${sponsorUid}, Level: ${levelIndex}, Failed Conditions: ${JSON.stringify(levelCondition)}, Date: ${new Date().toISOString()}\n`;
                        logConditionFailure(logMessage);
                    }

                    uplineSponsorId = uplineSponsor.sponsor_Id;
                }
            }
        } catch (error) {
            errorLogger(error);
        }
    }

    async distributeROILevelIncome(uid, plan, amount, order_amount, time, order_Activation_date, user_package) {
        try {
            console.log("distribuition_Start")
            const user = await UserData.findOne({ uid });
            if (!user || !plan) return;

            let sponsor_Id = user.sponsor_Id;

            const { roi_level_income } = plan;

            if (roi_level_income?.status !== 1) return;

            for (let levelIndex = 0; levelIndex < roi_level_income.level.length && sponsor_Id; levelIndex++) {
                const sponsor = await UserData.findOne({ uid: sponsor_Id });

                if (sponsor.status == 0) {
                    // console.log("sponsor.status",sponsor.uid,sponsor.status)
                    sponsor_Id = sponsor.sponsor_Id;
                    continue;
                }
                ;

                const levelCondition = roi_level_income.level[levelIndex];

                const conditionValid = await validator.validateLevelIncomeConditions(
                    sponsor.uid, plan, levelIndex, levelCondition
                );
                if (conditionValid) {

                    let incomeAmount = await this.calculateIncome(
                        amount, levelCondition, roi_level_income.income_type, sponsor.uid
                    );

                    console.log('incomeAmount', incomeAmount);
                    if (isNaN(incomeAmount) || incomeAmount <= 0) {
                        console.warn(`Skipping invalid incomeAmount: ${incomeAmount} for sponsor: ${sponsor.uid}`);
                        continue;
                    }

                    let income_percent = levelCondition.income;

                    const eligibilityResult = await this.checkUserIncomeEligibility(sponsor.uid, incomeAmount);

                    incomeAmount = eligibilityResult.allowedAmount;

                    let activity = { amount: incomeAmount, activity_name: 'roi_level_income', Status: 1, to_from: uid, level: levelIndex + 1, order_Activation_date, release: 1, currentDate: time, order_amount: amount, user_package, income_percent, user_joining_date: sponsor.joining_date };
                    // console.log('incomeAmount', activity);
                    await Action.actInternally(sponsor.uid, activity);



                } else {
                    const logMessage = `User ID: ${uid}, Level: ${levelIndex}, Failed Conditions: ${JSON.stringify(levelCondition)}, Date: ${new Date().toISOString()}\n`;
                    logConditionFailure(logMessage);
                }

                sponsor_Id = sponsor.sponsor_Id;
            }
        } catch (error) {
            errorLogger(error);
        }
    }





    async distribute_royalty_income(uid, Id, rankId, status) {
        try {
            // Validate input parameters
            if (!uid || !Id || !rankId || !status) {
                console.log("Missing required parameters for team royalty income distribution");
                return false;
            }

            // Normalize uid to ensure consistent comparisons
            const userUid = Number(uid);

            // Fetch the current user
            const user = await UserData.findOne({ uid: userUid });
            if (!user) {
                console.log(`User not found: ${userUid}`);
                return false;
            }

            // Fetch plan info containing reward structure
            const plan = await PlansInfo.findOne();
            if (!plan?.reward?.rewards || !Array.isArray(plan.reward.rewards) || plan.reward.rewards.length === 0) {
                console.log(`Invalid reward structure for user ${userUid}`);
                return false;
            }

            // Get user's rank reward configuration
            const userRankReward = plan.reward.rewards.find(r => r.rankId === rankId);

            // Make sure team_royalty_income is enabled for this rank
            if (!userRankReward?.royalty_income?.status || userRankReward.royalty_income.status !== 1) {
                console.log(`Team royalty income is not active for rank ${rankId}`);
                return false;
            }

            // Get user's team members
            const teamData = await Team.getAllTeamUIDsByLevel_withlevel(userUid);
            if (!teamData || !Array.isArray(teamData) || teamData.length === 0) {
                console.log(`No team members found for user ${userUid}`);
                return true; // Not an error, just no team to process
            }

            console.log(`Processing team royalty income for user ${userUid} with rank ${rankId}`);

            // Get current date/time for transaction records
            const currentDate = new Date();

            // Track processed order IDs to prevent duplicate income
            let processedOrders = new Set();
            let totalProcessedRoyalty = 0;

            // Get user's royalty percentage based on rank
            const userRoyaltyPercent = userRankReward.royalty_income.amount || 0;
            if (userRoyaltyPercent <= 0) {
                console.log(`User ${userUid} has 0% team royalty income for rank ${rankId}`);
                return false;
            }

            // Process each level of team members
            for (const levelData of teamData) {
                if (!levelData?.uids || !Array.isArray(levelData.uids) || levelData.uids.length === 0) {
                    continue; // Skip empty levels
                }

                const level = levelData.level;

                // Process each team member at this level
                for (const memberId of levelData.uids) {
                    const teamMemberUid = Number(memberId);

                    // Skip self-reference
                    if (teamMemberUid === userUid) {
                        continue;
                    }

                    // Get team member's data
                    const teamMember = await UserData.findOne({ uid: teamMemberUid });
                    if (!teamMember || teamMember.status !== 1) {
                        continue; // Skip inactive members
                    }

                    const now = new Date();

                    // Get the first day of the current month
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

                    // Get the first day of the next month (exclusive end)
                    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

                    const memberOrders = await Orders.find({
                        uid: teamMemberUid,
                        status: 1,
                        added_on: {
                            $gte: startOfMonth,
                            $lt: endOfMonth
                        }
                    });

                    if (!memberOrders || memberOrders.length === 0) {
                        continue; // No orders to process
                    }

                    // Get team member's highest rank
                    const memberRank = await Ranks.findOne({ uid: teamMemberUid }).sort({ rankId: -1 });
                    const memberRankId = memberRank?.rankId || 0;

                    // Find upline chain up to current user to calculate differential
                    // Store each upline's rank and royalty percentage
                    const uplineChain = [];
                    let currentSponsorId = teamMember.sponsor_Id;

                    // Build upline chain stopping at the current user
                    while (currentSponsorId && currentSponsorId !== userUid && currentSponsorId !== 0) {
                        const sponsorData = await UserData.findOne({ uid: currentSponsorId });

                        if (!sponsorData || sponsorData.status !== 1) {
                            // Skip inactive sponsors
                            currentSponsorId = sponsorData?.sponsor_Id || 0;
                            continue;
                        }

                        const sponsorRank = await Ranks.findOne({ uid: currentSponsorId }).sort({ rankId: -1 });

                        if (sponsorRank && sponsorRank.rankId >= 3) {
                            // This sponsor has a qualifying rank for team royalty
                            const sponsorReward = plan.reward.rewards.find(r => r.rankId === sponsorRank.rankId);

                            if (sponsorReward?.team_royalty_income?.status === 1) {
                                // Add this sponsor to the upline chain
                                uplineChain.push({
                                    uid: currentSponsorId,
                                    rankId: sponsorRank.rankId,
                                    percentage: sponsorReward.team_royalty_income.amount || 0
                                });
                            }
                        }

                        // Move up to next sponsor
                        currentSponsorId = sponsorData.sponsor_Id;
                    }

                    // Get highest royalty percentage in upline (except current user)
                    const highestUplinePercent = uplineChain.length > 0
                        ? Math.max(...uplineChain.map(u => u.percentage))
                        : 0;

                    // Calculate differential percentage
                    const differentialPercent = Math.max(0, userRoyaltyPercent - highestUplinePercent);

                    if (differentialPercent <= 0) {
                        console.log(`No differential royalty for team member ${teamMemberUid} - User: ${userRoyaltyPercent}%, Highest Upline: ${highestUplinePercent}%`);
                        continue;
                    }

                    // Process each order from this team member
                    for (const order of memberOrders) {
                        // Skip if already processed this order
                        if (processedOrders.has(order.order_Id.toString())) {
                            continue;
                        }
                        processedOrders.add(order.order_Id.toString());

                        // Skip orders with no amount
                        if (!order.amount || order.amount <= 0) {
                            continue;
                        }

                        // Calculate royalty amount for this order
                        const royaltyAmount = (order.amount * differentialPercent) / 100;

                        if (royaltyAmount <= 0) {
                            continue; // Skip if no royalty to distribute
                        }

                        // Prepare activity record
                        const activity = {
                            amount: royaltyAmount,
                            activity_name: 'team_royalty_income',
                            Status: 1,
                            to_from: teamMemberUid,
                            level: level,
                            order_Id: order.order_Id,
                            order_Activation_date: order.createdAt,
                            release: 0,
                            currentDate: currentDate,
                            order_amount: order.amount,
                            user_package: order.amount,
                            income_percent: differentialPercent,
                            user_joining_date: teamMember.joining_date
                        };
                        console.log(`Distributing ${royaltyAmount.toFixed(2)} team royalty to user ${userUid} from member ${teamMemberUid} order ${order._id} (differential: ${differentialPercent}%)`);

                        // Create the transaction
                        try {
                            await Action.actInternally(userUid, activity);
                            totalProcessedRoyalty += royaltyAmount;
                        } catch (actError) {
                            console.error(`Failed to create team royalty activity for user ${userUid} from member ${teamMemberUid} order ${order._id}:`, actError);
                        }
                    }
                }
            }

            console.log(`Completed team royalty distribution for user ${userUid}. Total royalty: ${totalProcessedRoyalty.toFixed(2)}`);
            return true;

        } catch (error) {
            console.error("Error in distribute_team_royalty_income:", error);
            return false;
        }
    }



    calculateIncome(amount, levelCondition, incomeType) {
        const { income } = levelCondition;

        if (incomeType === 'fix') {
            return income;
        } else if (incomeType === 'percentage') {
            return (amount * income) / 100;
        }

        return 0;
    }


    async checkUserIncomeEligibility(uid, incomingAmount) {
        try {
            console.log("checkUserIncomeEligibility", uid, incomingAmount)
            const user = await UserData.findOne({ uid, status: 1 });
            if (!user) return { eligible: false, allowedAmount: 0 };

            const userWallet = await UserWallet.findOne({ uid });
            if (!userWallet) return { eligible: false, allowedAmount: 0 };

            const { teamSection } = userWallet;
            const level1 = teamSection.find(entry => entry.level == 1);
            const directBusiness = level1 ? level1.business : 0;


            const userOrders = await Orders.find({
                uid,
                status: { $in: [1, 2] },
                amount: { $ne: 0 }
            });

            if (!userOrders.length) return { eligible: false, allowedAmount: 0 };

            // Also get active orders (status 1) only to check if user still has active orders
            const activeOrders = await Orders.find({
                uid,
                status: 1,
                amount: { $ne: 0 }
            });

            if (!activeOrders.length) return { eligible: false, allowedAmount: 0 };

            let totalEligibleAmount = 0;
            let allOrderIds = [];



            for (const order of userOrders) {
                const planId = order.planId || 1;
                const plan = await PlansInfo.findOne({ planId });
                if (!plan) continue;

                let maxPercent = 200;

                if (user.capping_set_admin && user.capping_set_admin > 0) {
                    maxPercent = user.capping_set_admin;
                } else {
                    const possibleMaxPercentages = [maxPercent];
                    if (user.enable_gaming_wallet === 1 && user.enable_gaming_wallet_Date) {
                        // possibleMaxPercentages.push(500);
                    }

                    maxPercent = Math.max(...possibleMaxPercentages);
                }


                console.log("maxPercent", maxPercent)
                const eligibleAmount = (order.amount * maxPercent) / 100;

                totalEligibleAmount += eligibleAmount;

                if (order.status === 1) {
                    allOrderIds.push({ order_Id: order.order_Id, eligibleAmount, maxPercent });
                }
            }


            const incomeResult = await Transaction.aggregate([
                {
                    $match: {
                        uid,
                        status: 1,
                        source: {
                            $in: [
                                'roi_income',
                                'roi_level_income',
                                'level_income',
                                'upline_income',
                                'royalty_income'
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalIncome: { $sum: "$amount" }
                    }
                }
            ]);



            const currentIncome = (incomeResult[0]?.totalIncome || 0)

            // If user has reached the cap
            if (currentIncome >= totalEligibleAmount) {
                for (const entry of allOrderIds) {
                    await Orders.findOneAndUpdate(
                        { uid, order_Id: entry.order_Id, status: 1 },
                        { $set: { status: 2 } }
                    );
                }

                return { eligible: false, allowedAmount: 0 };
            }

            // Calculate how much income can be paid
            const remaining = totalEligibleAmount - currentIncome;

            if (incomingAmount <= remaining) {
                return { eligible: true, allowedAmount: incomingAmount };
            } else {
                return { eligible: true, allowedAmount: remaining };
            }

        } catch (error) {
            return { eligible: false, allowedAmount: 0, error: error.message };
        }
    }


}
module.exports = new LEVEL();

