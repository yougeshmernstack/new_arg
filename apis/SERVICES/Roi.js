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
const Team = require("./UpdateTeam.js");
class ROI {

    // async roiIncome() {
    //     console.log('ROI Income distribution started at:', new Date());
    //     try {
    //         logConditionFailure(`ROI CLOSING STARTED AT TIME ${new Date()}`);
    //         const activeOrders = await Orders.find({ 
    //             status: 1
    //             // $or: [
    //             //     { cycleClaimStatus: 1 }, // Process orders where previous cycle was claimed
    //             //     { currentCycle: 1 } // Also process new orders in their first cycle
    //             // ]
    //         });
    //         console.log('Total active orders found:', activeOrders.length);
    
    //         for (let order of activeOrders) {
    //             try {
    //                 const plan = await PlansInfo.findOne({ planId: 1 });
    //                 if (!plan) {
    //                     logConditionFailure(`Plan with planid ${order.planId} not found.`);
    //                     continue;
    //                 }
    
    //                 const roiIncome = plan.roi_income;
    //                 if (roiIncome.status !== 1) {
    //                     logConditionFailure(`ROI income not active for planid ${order.planId}.`);
    //                     continue;
    //                 }
                    
    //                 // Get order details
    //                 const { uid, amount, order_Id, added_on, capping } = order;
                    
    //                 let currentCycle = order.currentCycle || 1;
    //                 let lastIncomeDate;
                    
    //                 // For new orders (cycle 1), use added_on date
    //                 if (currentCycle === 1) {
    //                     lastIncomeDate = new Date(order.added_on);
    //                 } else {
    //                     // For subsequent cycles, use last claim date
    //                     lastIncomeDate = order.lastClaimDate ? new Date(order.lastClaimDate) : new Date(order.added_on);
    //                 }
                    
    //                 // Calculate days since last income distribution
    //                 let currentDate = new Date();
    //                 const pendingDays = Math.floor((currentDate - lastIncomeDate) / (1000 * 60 * 60 * 24));

    //                 if (pendingDays <= 0) {
    //                     console.log(`No pending days for order ${order_Id}, skipping`);
    //                     continue;
    //                 }

    //                 // Calculate current cycle duration
    //                 const cycleDuration = 10 + (currentCycle - 1); // First cycle is 10 days, then +1 for each cycle
                    
    //                 // Ensure pending days don't exceed cycle duration
    //                 const effectivePendingDays = Math.min(pendingDays, cycleDuration);
                    
    //                 console.log(`Processing order ${order_Id} - Current cycle: ${currentCycle}, Pending days: ${effectivePendingDays}/${cycleDuration}`);
                    
    //                 // For new orders, initialize cycle information
    //                 if (currentCycle === 1 && order.cycleClaimStatus === 0) {
    //                     await Orders.updateOne(
    //                         { order_Id: order_Id },
    //                         { 
    //                             $set: { 
    //                                 cycleDuration: cycleDuration,
    //                                 pendingDays: effectivePendingDays,
    //                                 cycleCompleted: false,
    //                                 nextDistributionDate: new Date(Date.now() + cycleDuration * 24 * 60 * 60 * 1000)
    //                             }
    //                         }
    //                     );
    //                     continue;
    //                 }

    //                 // Skip processing if previous cycle is not claimed
    //                 if (order.cycleClaimStatus === 0 && currentCycle > 1) {
    //                     console.log(`Order ${order_Id} has unclaimed income, skipping cycle update`);
    //                     continue;
    //                 }
                    
    //                 // Process multiple cycles if needed
    //                 const cycleResults = await this.processMultipleCycles(
    //                     uid, amount, roiIncome, capping, order_Id, effectivePendingDays, currentCycle
    //                 );
                    
    //                 if (cycleResults.length === 0) {
    //                     console.log(`No complete cycles for order ${order_Id}, no income to distribute`);
    //                     // Only update pending days if the previous cycle was claimed
    //                     if (order.cycleClaimStatus === 1) {
    //                         await Orders.updateOne(
    //                             { order_Id: order_Id },
    //                             { 
    //                                 $set: { 
    //                                     pendingDays: effectivePendingDays,
    //                                     cycleDuration: cycleDuration
    //                                 }
    //                             }
    //                         );
    //                     }
    //                     continue;
    //                 }
                    
    //                 let finalCycle = currentCycle;
    //                 let totalEarned = order.totalEarned || 0;
                    
    //                 // Create transactions for each completed cycle
    //                 for (const result of cycleResults) {
    //                     if (result.income <= 0) continue;
                        
    //                     const eligibilityResult = await LevelIncome.checkUserIncomeEligibility(uid, result.income);
    //                     const finalIncomeAmount = eligibilityResult.allowedAmount;
                        
    //                     // Update order with pending income and cycle completion status
    //                     await Orders.updateOne(
    //                         { order_Id: order_Id },
    //                         { 
    //                             $set: { 
    //                                 pendingIncome: finalIncomeAmount,
    //                                 cycleCompleted: true,
    //                                 cycleClaimStatus: 0,
    //                                 lastCycleCompletionDate: new Date(),
    //                                 totalEarned: totalEarned + finalIncomeAmount,
    //                                 pendingDays: cycleDuration, // Set pending days to cycle duration when cycle is completed
    //                                 cycleDuration: cycleDuration
    //                             }
    //                         }
    //                     );
                        
    //                     totalEarned += finalIncomeAmount;
    //                     finalCycle = result.cycle + 1;
    //                 }
                    
    //             } catch (orderError) {
    //                 console.error(`Error processing order ${order.order_Id}:`, orderError);
    //                 continue;
    //             }
    //         }
            
    //         console.log('ROI Income distribution completed at:', new Date());
    //     } catch (error) {
    //         console.error('Error in ROI income distribution:', error);
    //         errorLogger(error);
    //     }
    // }

     async roiIncome() {
        console.log('start.......')
        try {
            logConditionFailure(`ROI CLOSING STARTED AT TIME ${new Date()}`);
            const activeOrders = await Orders.find({ status: 1});
            console.log('totalorder',
                activeOrders.length
            )
            for (let order of activeOrders) {
                console.log("order", order)
                const plan = await PlansInfo.findOne({ planId:order.planId });
                if (!plan) {
                    logConditionFailure(`Plan with planid ${order.planId} not found.`);
                    continue;
                }

                const roiIncome = plan.roi_income;

                if (roiIncome.status !== 1) {
                    logConditionFailure(`ROI income not active for planid ${order.planId}.`);
                    continue;
                }
                // Validate ROI conditions
                const isValid = await validator.validateROIConditions(order.uid, order.planId, order.order_Id);
                console.log('isValid', isValid)
                if (!isValid) {
                    logConditionFailure(`ROI conditions not met for UID: ${order.uid}, order ID: ${order.order_Id}`);
                    continue;
                }
                let lastIncomeDate;
                const lastTransaction = await Transaction.findOne({ uid: order.uid, source: 'roi_income', status: 1,order_Id:order.order_Id }).sort({ time: -1 }).limit(1);
                if (lastTransaction) {
                    lastIncomeDate = new Date(lastTransaction.time);
                } else {
                    lastIncomeDate = new Date(order.added_on);
                }

                // Calculate the number of pending days using only date changes
                let currentDate = new Date();

                lastIncomeDate.setHours(0, 0, 0, 0); // Reset to start of the day
                currentDate.setHours(0, 0, 0, 0); // Reset to start of the day
                
                const pendingDays = this.calculateBusinessDays(lastIncomeDate, currentDate);
                // const pendingDays = 1;
                console.log(pendingDays, 'pending////////////////////////', lastIncomeDate, currentDate)
                
                const { uid, amount, order_Id, order_bv } = order;
                const pkg = Array.isArray(plan.packages) ? plan.packages.find(p => p.name === order.package) : null;
                const totalCapping = pkg ? pkg.total_capping : 0;
                const { income: incomeAmount, fullAmount } = await this.calculateIncome(uid, order_bv, roiIncome, totalCapping, order_Id, pendingDays);
                console.log('incomeAmount', incomeAmount)
                let activity = { amount: incomeAmount, activity_name: 'roi_income', Status: 1, to_from: uid, level: 0, order_Id, profit_Share: fullAmount, currentDate, order_amount: order_bv };
                await Action.actInternally(uid, activity);
            }
        } catch (error) {
            errorLogger(error)
        }
    }

    calculateBusinessDays(currentDate,endDate) {
        let count = 0;

        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            // Check if it's not Saturday (6) or Sunday (0)
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                count++;
            }
            // Move to the next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return count;
    }

    async calculateIncome(uid, amount, roiIncome, total_capping, order_Id, pendingDays) {
        try {
            // Fetch the user's wallet
            const userWallet = await UserWallet.findOne({ uid });
            if (!userWallet) {
                throw new Error(`User wallet not found for UID: ${uid}`);
            }

            const { income, income_type, maximum, frequency, distribution_ratio } = roiIncome;
            let dailyIncome = 0;

            // Calculate daily income based on income type and frequency
            if (income_type === 'fix') {
                if (frequency === 'Daily') {
                    dailyIncome = income;
                } else if (frequency === 'Monthly') {
                    dailyIncome = income * 12 / 365;
                } else if (frequency === 'Yearly') {
                    dailyIncome = income / 365;
                }
            } else if (income_type === 'percentage') {
                if (frequency === 'Daily') {
                    dailyIncome = (amount * income) / 100;
                } else if (frequency === 'Monthly') {
                    dailyIncome = ((amount * income) / 100) * 12 / 365;
                } else if (frequency === 'Yearly') {
                    dailyIncome = ((amount * income) / 100) / 365;
                } else if (frequency === '5days') {
                    dailyIncome = ((amount * income) / 100) / 5;
                }
            }

            // Calculate income for pending days
            let inc = dailyIncome * pendingDays;
            const fullAmount = inc; // Store the full amount before distribution

            // Apply distribution ratio for ROI income
            inc = (inc * distribution_ratio.roi / 100);

            // Find the user's ROI wallet
            const roiWallet = userWallet.wallets.find(wallet => wallet.slug === 'roi_income');
            if (!roiWallet) {
                throw new Error(`ROI wallet not found for UID: ${uid}`);
            }

            // Check if the current income plus wallet value exceeds the maximum allowed ROI income
            if ((inc + roiWallet.value) > (amount * maximum / 100)) {
                // Adjust the income if it exceeds the maximum
                inc = inc - ((inc + roiWallet.value) - (amount * maximum / 100));
            }

            // Return the calculated income and the full amount before distribution
            return { income: inc, fullAmount };

        } catch (error) {
            console.error(`Error calculating income for UID: ${uid}`, error);
            throw new Error(`Failed to calculate income: ${error.message}`);
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
                    remainingDays: remainingDays,
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
    
 
    async distributeUplineBonusForClaim(uid, claimedAmount) {
        try {
            // Get plan configuration
            const plan = await PlansInfo.findOne();
            if (!plan || !plan.upline_bonus) {
                console.log("Plan or upline bonus configuration not found");
                return;
            }
            
            const bonusConfig = plan.upline_bonus;
            if (!bonusConfig.level || !Array.isArray(bonusConfig.level)) {
                console.log("Invalid upline bonus level configuration");
                return;
            }
            
            // Get team structure
            const teamStructure = await Team.getAllTeamUIDsByLevel(uid, 2);
            console.log("Team Structure:", teamStructure);

            if (!teamStructure || Object.keys(teamStructure).length === 0) {
                console.log("No team members found for upline bonus distribution");
                return;
            }

            // Process each level in the team structure
            for (const [level, teamMembers] of Object.entries(teamStructure)) {
                const levelNumber = parseInt(level);
                
                // Find the applicable bonus configuration for this level
                const levelConfig = bonusConfig.level.find(l => l.level === levelNumber);
                if (!levelConfig) {
                    console.log(`No bonus configuration found for level ${levelNumber}`);
                    continue;
                }
                
                const bonusPercentage = levelConfig.income || 0;
                if (bonusPercentage <= 0) {
                    console.log(`No bonus amount defined for level ${levelNumber}`);
                    continue;
                }

                // Process each team member at this level
                for (const teamMemberUid of teamMembers) {
                    // Check if team member is in upline structure
                    const isInUpline = await Upline.findOne({
                        uid: teamMemberUid,
                        status: 1,
                        level: levelNumber
                    });

                    if (!isInUpline) {
                        console.log(`Team member ${teamMemberUid} not found in upline structure for level ${levelNumber}`);
                        continue;
                    }

                    // Check if bonus was already distributed
                    const alreadyDistributed = await Transaction.findOne({
                        uid: teamMemberUid,
                        to_from: uid,
                        tx_type: 'upline_income',
                        status: 1,
                        level: levelNumber
                    });

                    // if (alreadyDistributed) {
                    //     console.log(`Upline bonus already distributed for user ${teamMemberUid} at level ${levelNumber}`);
                    //     continue;
                    // }

                    const income_amount = claimedAmount * bonusPercentage / 100;
                    const activity = {
                        amount: income_amount,
                        activity_name: 'upline_income',
                        Status: 1,
                        to_from: uid,
                        level: levelNumber,
                        order_Id: null,
                        profit_Share: bonusPercentage,
                        currentDate: new Date(),
                        business: claimedAmount
                    };
                    
                    await Action.actInternally(teamMemberUid, activity);
                    console.log(`Distributed ${income_amount} to ${teamMemberUid} at level ${levelNumber}`);
                }
            }
        } catch (error) {
            console.error("Error in distributeUplineBonusForClaim:", error);
            errorLogger(error);
        }
    }

    async claimIncome(req, res) {
        try {
            const { uid } = req.user;
            const { order_Id } = req.body;

            if (!order_Id) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Order ID is required' 
                });
            }

            // Find the order
            const order = await Orders.findOne({ 
                uid, 
                order_Id,
                status: 1,
                pendingIncome: { $gt: 0 }
            });

            if (!order) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No pending income found to claim' 
                });
            }

            // Check if the user has reached their income cap
            const eligibilityResult = await LevelIncome.checkUserIncomeEligibility(uid, order.pendingIncome);
            // console.log("eligibilityResult",eligibilityResult)
            if (!eligibilityResult.eligible) {
                return res.status(400).json({
                    success: false,
                    message: 'Income cap reached. Cannot claim more income.'
                });
            }

            // Calculate next cycle duration
            const nextCycle = order.currentCycle + 1;
            const nextCycleDuration = 10 + (nextCycle - 1);

            // Create activity record for the claim
            const activity = { 
                amount: order.pendingIncome, 
                activity_name: 'roi_income', 
                Status: 1, 
                to_from: uid, 
                level: 0, 
                order_Id,
                order_Activation_date: order.added_on,
                release: 1, 
                profit_Share: order.pendingIncome, 
                order_amount: order.amount,
                income_percent: 10, 
                user_package: order.amount,
                currentDate: new Date(),
                metadata: {
                    cycle: order.currentCycle,
                    cycleDuration: order.cycleDuration,
                    pendingDays: order.pendingDays,
                    cycleCompleted: true
                }
            };
            
            // Process the claim
            await Action.actInternally(uid, activity);

            // Update order status with next cycle information
            const currentDate = new Date();
          const orderdetails= await Orders.updateOne(
                { order_Id },
                { 
                    $set: { 
                        cycleClaimStatus: 1,
                        pendingIncome: 0,
                        lastClaimDate: currentDate,
                        cycleDuration: nextCycleDuration,
                        pendingDays: 0,
                        currentCycle: nextCycle,
                        nextDistributionDate: new Date(currentDate.getTime() + nextCycleDuration * 24 * 60 * 60 * 1000)
                    }
                }
            );

            // Distribute upline bonus for the claimed amount
            await roiClosing.distributeUplineBonusForClaim(uid, order.pendingIncome);
            const plan= await PlansInfo.findOne()
            await LevelIncome.distributeROILevelIncome(uid, plan, order.pendingIncome, order.pendingIncome, currentDate,orderdetails.added_on,orderdetails.amount);


            return res.status(200).json({
                success: true,
                message: 'Income claimed successfully',
                amount: order.pendingIncome,
                cycle: order.currentCycle,
                nextCycle: nextCycle,
                nextCycleDuration: nextCycleDuration,
                totalEarned: order.totalEarned + order.pendingIncome
            });

        } catch (error) {
            console.error('Error claiming income:', error);
            errorLogger(error);
            return res.status(500).json({
                success: false,
                message: 'Error claiming income',
                error: error.message
            });
        }
    }

}

const roiClosing = new ROI();
//  roiClosing.roiIncome()
//  roiClosing.distribute_royalty_income()
//  roiClosing.distributeUplineBonusForClaim(1,10)

module.exports = roiClosing;