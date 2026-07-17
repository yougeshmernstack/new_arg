const Orders = require("../MODALS/Orders");
const PlansInfo = require("../MODALS/Plan");
const fs = require('fs');
const path = require('path');
const validator = require("./IncomeValidator");
const Transaction = require("../MODALS/transactions");
const UserWallet = require("../MODALS/userWallets");
const { logConditionFailure, errorLogger } = require("../utils/logger");
const LevelIncome = require("./LevelIncome");
const IncomeModal = require("../MODALS/RoiLevel");
const UserData = require("../MODALS/userData");
const Action = require("./Activity.js");
const Ranks = require("../MODALS/Ranks.js");
const advance_info = require("../MODALS/advanceInfo.js");
const Upline = require("../MODALS/upline_bonus.js");
class ROI {

    async roiIncome() {
        console.log('ROI Income distribution started at:', new Date());
        try {
            logConditionFailure(`ROI CLOSING STARTED AT TIME ${new Date()}`);
            const activeOrders = await Orders.find({ status: 1 
                // ,nextDistributionDate:{$lte:new Date()}
             });
            console.log('Total active orders found:', activeOrders.length);
    
            for (let order of activeOrders) {
                try {
                    // Find plan information
                    const plan = await PlansInfo.findOne({ planId: 1 });
                    if (!plan) {
                        logConditionFailure(`Plan with planid ${order.planId} not found.`);
                        continue;
                    }
    
                    const roiIncome = plan.roi_income;
                    if (roiIncome.status !== 1) {
                        logConditionFailure(`ROI income not active for planid ${order.planId}.`);
                        continue;
                    }
                    
                    // Get order details
                    const { uid, amount, order_Id, added_on, capping } = order;
                    
                    // Get the current cycle from order (default to 1 if not set)
                    let currentCycle = order.currentCycle || 1;
                    let lastIncomeDate;
                    
                    // Find the last ROI transaction for this order
                    const lastTransaction = await Transaction.findOne({ 
                        uid: uid, 
                        order_Id: order_Id, 
                        source: 'roi_income', 
                        status: 1 
                    }).sort({ time: -1 }).limit(1);
                    
                    if (lastTransaction) {
                        lastIncomeDate = new Date(lastTransaction.time);
                    } else {
                        lastIncomeDate = new Date(order.added_on);
                    }
                    
                    // Calculate days since last income distribution
                    let currentDate = new Date();
                    // lastIncomeDate.setHours(0, 0, 0, 0);
                    // currentDate.setHours(0, 0, 0, 0);
                    
                    // const pendingDays =Math.floor((currentDate - lastIncomeDate) / (1000 * 60 * 60 * 24));// 24 hours

                    const pendingDays = Math.floor((currentDate - lastIncomeDate) / (1000 * 60));// 60 minutes

                    if (pendingDays <= 0) {
                        console.log(`No pending days for order ${order_Id}, skipping`);
                        continue;
                    }
                    
                    console.log(`Processing order ${order_Id} - Current cycle: ${currentCycle}, Pending days: ${pendingDays}`);
                    
                    // Process multiple cycles if needed
                    const cycleResults = await this.processMultipleCycles(
                        uid, amount, roiIncome, capping, order_Id, pendingDays, currentCycle
                    );
                    
                    if (cycleResults.length === 0) {
                        console.log(`No complete cycles for order ${order_Id}, no income to distribute`);
                        continue;
                    }
                    
                    let finalCycle = currentCycle;
                    
                    // Create transactions for each completed cycle
                    for (const result of cycleResults) {
                        if (result.income <= 0) continue;
                        
                        const eligibilityResult = await LevelIncome.checkUserIncomeEligibility(uid, result.income);
                        const finalIncomeAmount = eligibilityResult.allowedAmount;
                        
                        // Create activity record
                        const activity = { 
                            amount: finalIncomeAmount, 
                            activity_name: 'roi_income', 
                            Status: 1, 
                            to_from: uid, 
                            level: 0, 
                            order_Id,
                            order_Activation_date: added_on,
                            release: 1, 
                            profit_Share: result.fullAmount, 
                            order_amount: amount,
                            income_percent: 10, 
                            user_package: amount,
                            currentDate: new Date(),
                            metadata: {
                                cycle: result.cycle,
                                cycleDuration: result.cycleDuration,
                                cycleCompleted: true
                            }
                        };
                        
                       await Action.actInternally(uid, activity);
                        
                        // Update the final cycle
                        finalCycle = result.cycle + 1;
                    }
                    
                    // Update the order with the new cycle information
                    await this.updateOrderCycle(order_Id, finalCycle, new Date());
                    
                } catch (orderError) {
                    console.error(`Error processing order ${order.order_Id}:`, orderError);
                    continue;
                }
            }
            
            console.log('ROI Income distribution completed at:', new Date());
        } catch (error) {
            console.error('Error in ROI income distribution:', error);
            errorLogger(error);
        }
    }
    
    async processMultipleCycles(uid, amount, roiIncome, total_capping, order_Id, pendingDays, startCycle = 1) {
        let remainingDays = pendingDays;
        let currentCycle = startCycle;
        let cycleResults = [];
  
        const trans = await Transaction.aggregate([
            {
                $match: { 
                    uid: uid,           
                    order_Id: order_Id, 
                    source: "roi_income",
                    status: 1
                }
            },
            {
                $group: {
                    _id: null, 
                    totalAmount: { $sum: "$amount" } 
                }
            }
        ]);
        
        let totalEarnedSoFar = trans[0]?.totalAmount || 0;
        const maximumCap = amount * 5; // 5X maximum cap

        while (remainingDays > 0 && currentCycle <= 50) { // Max 50 cycles

            const cycleDuration = 10 + (currentCycle - 1); // First cycle is 10 days, then +1 for each cycle
            
            console.log(`Cycle ${currentCycle} duration: ${cycleDuration} days, remaining days: ${remainingDays}`);

            if (remainingDays >= cycleDuration) {

                let cycleIncome = (amount * 10) / 100;
                
                if ((totalEarnedSoFar + cycleIncome) > maximumCap) {
                    cycleIncome = maximumCap - totalEarnedSoFar;
                    if (cycleIncome < 0) cycleIncome = 0;
                }
                
                let distributedIncome = cycleIncome;
                if (roiIncome.distribution_ratio && roiIncome.distribution_ratio.roi) {
                    distributedIncome = (cycleIncome * roiIncome.distribution_ratio.roi) / 100;
                }
                
                cycleResults.push({
                    cycle: currentCycle,
                    income: distributedIncome,
                    fullAmount: cycleIncome,
                    cycleDuration: cycleDuration,
                    cycleCompleted: true
                });
                

                totalEarnedSoFar += distributedIncome;
                
                remainingDays -= cycleDuration;
                currentCycle++;
                
                if (totalEarnedSoFar >= maximumCap) {
                    console.log(`Maximum earning cap reached for order ${order_Id}`);
                    break;
                }
            } else {
                console.log(`Cycle ${currentCycle} incomplete with ${remainingDays}/${cycleDuration} days`);
                break;
            }
        }
        
        return cycleResults;
    }
    
   
    async updateOrderCycle(orderId, cycle, lastDistributionDate) {
        try {
            console.log(`Updating order ${orderId} to cycle ${cycle}`);
            
            // Calculate next distribution date
            const nextDistributionDate = new Date(lastDistributionDate);
            const cycleDuration = 10 + (cycle - 1); // Calculate next cycle duration
            nextDistributionDate.setDate(nextDistributionDate.getDate() + cycleDuration);
            
            await Orders.updateOne(
                { order_Id: orderId },
                { 
                    $set: { 
                        currentCycle: cycle,
                        lastCycleDate: lastDistributionDate,
                        nextDistributionDate: nextDistributionDate
                    }
                }
            );
            
            return true;
        } catch (error) {
            console.error(`Error updating order cycle: ${error.message}`);
            return false;
        }
    }
   
    // under testing  

    // async emergencyPrincipalWithdrawal(uid, orderId) {
    //     try {
    //         const order = await Orders.findOne({ uid, order_Id: orderId });
    //         if (!order) {
    //             throw new Error('Order not found');
    //         }
            
    //         if (order.status !== 1) {
    //             throw new Error('Order is not active');
    //         }
            
    //         const lastTransaction = await Transaction.findOne({ 
    //             uid: uid, 
    //             order_Id: orderId, 
    //             source: 'roi_income', 
    //             status: 1 
    //         }).sort({ time: -1 }).limit(1);
           
    //         await Orders.updateOne(
    //             { order_Id: orderId },
    //             { $set: { status: 3, withdrawal_date: new Date() } }
    //         );
            
    //         // Create withdrawal transaction
    //         const withdrawalActivity = {
    //             amount: order.amount,
    //             activity_name: 'principal_withdrawal',
    //             Status: 1,
    //             to_from: uid,
    //             order_Id: orderId,
    //             currentDate: new Date(),
    //             withdrawal_type: 'emergency'
    //         };
            
    //         await Action.actInternally(uid, withdrawalActivity);
            
    //         return { success: true, message: 'Principal amount withdrawn successfully' };
    //     } catch (error) {
    //         console.error(`Emergency withdrawal error: ${error.message}`);
    //         return { success: false, message: error.message };
    //     }
    // }

    async distribute_royalty_income() {
        console.log('Starting royalty income distribution...');
        try {
            const activeRanks = await Ranks.find({ status: 1 });
    
            if (activeRanks.length === 0) {
                console.log("No active rank found.");
                return { message: "No active rank found for income distribution." };
            }
    
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
    
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
    
            const totalAmountResult = await Orders.aggregate([
                {
                    $match: {
                        status: 1,
                        added_on: {
                            $gte: startOfDay,
                            $lt: endOfDay
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: "$amount" }
                    }
                }
            ]);
    
            const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;
    
            if (totalAmount <= 0) {
                console.log("No new turnover for distribution.");
                return { message: "No new turnover for distribution." };
            }
    
            const plan = await PlansInfo.findOne();
            if (!plan?.reward?.rewards || !Array.isArray(plan.reward.rewards) || plan.reward.rewards.length === 0) {
                console.log("Invalid reward structure in plan");
                return { message: "Invalid reward structure in plan" };
            }
    
            for (let user of activeRanks) {
                const { uid, rankId } = user;
    
                // Check if royalty income was already distributed today for this user
                const alreadyDistributed = await Transaction.findOne({
                    uid: uid,
                    tx_type: 'royalty_income',
                    status: 1,
                    rankId: rankId,
                    createdAt: { $gte: startOfDay, $lt: endOfDay }
                });
    
                if (alreadyDistributed) {
                    console.log(`Royalty income already distributed today for user ${uid}`);
                    continue;
                }
    
                const rankReward = plan.reward.rewards.find(r => r.rankId === rankId);
    
                if (!rankReward?.royalty_income?.status || rankReward.royalty_income.status !== 1) {
                    console.log(`Royalty income is not active for rank ${rankId} of user ${uid}`);
                    continue;
                }
    
                const royaltyPercentage = rankReward.royalty_income.amount || 0;
                if (royaltyPercentage <= 0) {
                    console.log(`No royalty percentage defined for rank ${rankId}`);
                    continue;
                }
    
                const royaltyAmount = (totalAmount * royaltyPercentage) / 100;
    
                const activity = {
                    amount: royaltyAmount,
                    activity_name: 'royalty_income',
                    Status: 1,
                    to_from: uid,
                    level: 0,
                    order_Id: null,
                    profit_Share: royaltyPercentage,
                    currentDate: new Date(),
                    business: totalAmount,
                    rankId: rankId,
                };
    
                await Action.actInternally(uid, activity);
            }
    
        } catch (error) {
            console.error("Error in distribute_royalty_income:", error);
            errorLogger(error);
            throw error;
        }
    }
    
    async distribute_upline_bonus() {
        try {
            console.log('Starting upline bonus distribution...');
            
            // Get plan configuration
            const plan = await PlansInfo.findOne();
            if (!plan || !plan.upline_bonus) {
                console.log("Plan or upline bonus configuration not found");
                return { message: "Plan or upline bonus configuration not found" };
            }
            
            const bonusConfig = plan.upline_bonus;
            if (!bonusConfig.level || !Array.isArray(bonusConfig.level)) {
                console.log("Invalid upline bonus level configuration");
                return { message: "Invalid upline bonus level configuration" };
            }
            
            // Get all active users
            const activeUsers = await Upline.find({ status: 1 });
            activeUsers.length === 0 && console.log("No active users found for upline bonus distribution");
            // Process each user
            const results = [];
            for (const userUpline of activeUsers) {
                const uid = userUpline.uid;
                const userLevel = userUpline.level;
                
                // Find the applicable bonus configuration for this user's level
                const levelConfig = bonusConfig.level.find(l => l.level === userLevel);
                if (!levelConfig) {
                    console.log(`No bonus configuration found for level ${userLevel}`);
                    continue;
                }
                
                const bonusPercentage = levelConfig.income || 0;
                if (bonusPercentage <= 0) {
                    console.log(`No bonus amount defined for level ${userLevel}`);
                    continue;
                }
    
                // Get user's data to find their sponsor
                const userData = await UserData.findOne({ uid: uid });
                if (!userData || !userData.sponsor_Id) {
                    console.log(`No sponsor found for user ${uid}`);
                    continue;
                }
    
                let income_from;
                if (userLevel === 1) {
                    // First level - direct sponsor
                    income_from = userData.sponsor_Id;
                } else if (userLevel === 2) {
                    // Second level - sponsor's sponsor
                    const sponsorData = await UserData.findOne({ uid: userData.sponsor_Id });
                    if (!sponsorData || !sponsorData.sponsor_Id) {
                        console.log(`No second level upline found for user ${uid}`);
                        continue;
                    }
                    income_from = sponsorData.sponsor_Id;
                } else {
                    console.log(`Unsupported level ${userLevel} for user ${uid}`);
                    continue;
                }
    
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
        
                const endOfDay = new Date();
                endOfDay.setHours(23, 59, 59, 999);
        
                // Find ROI income for the income_from user (to calculate bonus on)
                const totalAmountResult = await Transaction.aggregate([
                    {
                        $match: {
                            status: 1,
                            uid: income_from,
                            source: "roi_income",
                            time: {
                                $gte: startOfDay,
                                $lt: endOfDay
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalAmount: { $sum: "$amount" }
                        }
                    }
                ]);
        
                const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;
        
                if (totalAmount <= 0) {
                    console.log(`No income found for sponsor for distribution for user ${uid}`);
                    continue; // Skip to next user instead of returning
                }
    
                const alreadyDistributed = await Transaction.findOne({
                    uid: uid,
                    tx_type: 'upline_income',
                    status: 1,
                    level: userLevel,
                    createdAt: { $gte: startOfDay, $lt: endOfDay }
                });
    
                if (alreadyDistributed) {
                    console.log(`Royalty income already distributed today for user ${uid}`);
                    continue;
                }

                const income_amount = totalAmount * bonusPercentage / 100;
                const activity = {
                    amount: income_amount,
                    activity_name: 'upline_income',
                    Status: 1,
                    to_from: income_from,
                    level: userLevel,
                    order_Id: null,
                    profit_Share: bonusPercentage,
                    currentDate: new Date(),
                    business: totalAmount, // Using actual business amount instead of undefined variable
                };
                
                // Process the transaction
                const result = await Action.actInternally(uid, activity);
                
            }
           
            
        } catch (error) {
            console.error("Error in distribute_upline_bonus:", error);
            errorLogger(error);
            throw error;
        }
    }

}

const roiClosing = new ROI();
//  roiClosing.roiIncome()
//  roiClosing.distribute_royalty_income()
//  roiClosing.distribute_upline_bonus()

module.exports = roiClosing;