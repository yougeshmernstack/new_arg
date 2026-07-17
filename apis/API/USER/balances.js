const { INTERNAL_SERVER_ERROR } = require("authenticate-utils/errorMessages");
const UserWallet = require("../../MODALS/userWallets");
const UserData = require("../../MODALS/userData");
const Transaction = require("../../MODALS/transactions");
const Orders = require("../../MODALS/Orders");
const { errorLogger } = require("../../utils/logger");
const versionService = require("../../SERVICES/VersionService");
const LevelIncome = require("../../SERVICES/LevelIncome");


class BALANCE {
    
    async getAllWallets(req, res) {
        try {
            const { uid } = req.user;
    
            // Fetch user wallets
            await versionService.correctWalletValues(uid)
            const wallets = await UserWallet.aggregate([
                { $match: { uid } },
                { $unwind: '$wallets' },
                { $match: { 'wallets.wallet_status': 1 } },
                { $group: { _id: '$_id', wallets: { $push: '$wallets' } } }
            ]);
    
            // Fetch total income
            const sumWallets = await UserWallet.aggregate([
                { $match: { uid } },
                { $unwind: '$wallets' },
                { $match: { 'wallets.wallet_status': 1, 'wallets.wallet_type': 'income' } },
                { $group: { _id: '$_id', totalIncome: { $sum: '$wallets.value' } } }
            ]);
    
            // Fetch working income
            const workingincome = await UserWallet.aggregate([
                { $match: { uid } },
                { $unwind: '$wallets' },
                { 
                    $match: { 
                        'wallets.wallet_status': 1, 
                        $or: [{ 'wallets.slug': 'roi_income' }] 
                    } 
                },
                { $group: { _id: '$_id', working: { $sum: '$wallets.value' } } }
            ]);
    
            // Fetch non-working income
            const non_workingincome = await UserWallet.aggregate([
                { $match: { uid } },
                { $unwind: '$wallets' },
                { $match: { 'wallets.wallet_status': 1, 'wallets.slug': 'roi_income' } },
                { $group: { _id: '$_id', nonworking: { $sum: '$wallets.value' } } }
            ]);
    
            // Define the sorting order (Updated)
            const walletOrder = [
                'roi_income',
                'roi_level_income',
                'level_income',
                'upline_income',
                'royalty_income',
                'bonus_income'
            ];
    
            // Sort wallets based on the predefined order
            const walletsWithIndex = wallets[0]?.wallets
                .map(wallet => ({
                    ...wallet,
                    index: walletOrder.indexOf(wallet.name)
                }))
                .sort((a, b) => a.index - b.index) || [];
    
            // Prepare response
            const response = {
                wallets: walletsWithIndex,
                totalIncome: sumWallets[0]?.totalIncome || 0,
                working_income_required: 0,
                nonworking_income_required: 0,
                working_income: workingincome[0]?.working || 0,
                nonworking_income: non_workingincome[0]?.nonworking || 0,
            };
    
            res.status(200).json(response);
        } catch (error) {
            errorLogger(error);
            // console.log(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getTeamSection(req, res) {
        try {
            const { uid } = req.user;
            // console.log(uid);
    
            const userWallet = await UserWallet.findOne({ uid });
    
            if (!userWallet) {
                return res.status(404).json({ message: 'User wallet not found' });
            }
    
            const { teamSection } = userWallet;
    
            // Initialize sum object
            const sum = { 
                total_team: 0, 
                active_team: 0, 
                business: 0, 
                levelbusiness: 0,
                direct_business: teamSection.length > 0 ? teamSection[0].business || 0 : 0,
                today_business: 0,
                weekly_business: 0 
            };
    
            if (teamSection.length > 0) {
                teamSection.forEach(level => {
                    sum.total_team += level.total_team || 0;
                    sum.active_team += level.active_team || 0;
                    sum.business += level.business || 0;
                    sum.levelbusiness = level.business || 0;
                });
            }
    
            // Function to fetch all downline members recursively
            async function getTeamMembers(uids) {
                let team = await UserData.find({ sponsor_Id: { $in: uids } }).select('uid');
                let teamIds = team.map(user => user.uid);
    
                if (teamIds.length > 0) {
                    let subTeam = await getTeamMembers(teamIds); // Recursive call for deeper levels
                    teamIds = [...teamIds, ...subTeam];
                }
    
                return teamIds;
            }
    
            // Step 1: Get all team members recursively
            const teamMemberIds = await getTeamMembers([uid]);
    
            if (teamMemberIds.length > 0) {
                // Step 2: Find today's date in UTC format
                const today = new Date();
                today.setUTCHours(0, 0, 0, 0);
    
                const tomorrow = new Date(today);
                tomorrow.setUTCDate(today.getUTCDate() + 1);
    
                // Step 3: Calculate last 7 days range excluding today
                const weekStart = new Date(today);
                weekStart.setUTCDate(today.getUTCDate() - 7); // 7 days before today
    
                const weekEnd = new Date(today);
                weekEnd.setUTCDate(today.getUTCDate()); // Yesterday (before today starts)
                weekEnd.setUTCHours(23, 59, 59, 999);
    
                // Step 4: Fetch today's orders
                const todayOrders = await Orders.find({
                    uid: { $in: teamMemberIds },
                    added_on: { $gte: today, $lt: tomorrow },
                    status: 1
                });
    
                // console.log("teamMemberIds",teamMemberIds)
                // Step 5: Fetch weekly orders (last 7 days excluding today)
                const weeklyOrders = await Orders.find({
                    uid: { $in: teamMemberIds },
                    added_on: { $gte: weekStart, $lt: weekEnd },
                    status: 1
                });
    
                // Step 6: Fetch all-time business (total business from orders)
                const totalBusinessOrders = await Orders.find({
                    uid: { $in: teamMemberIds },
                    status: 1
                });
    
                // Step 7: Sum the amounts
                sum.today_business = todayOrders.reduce((acc, order) => acc + order.amount, 0);
                sum.weekly_business = weeklyOrders.reduce((acc, order) => acc + order.amount, 0);
                sum.business = totalBusinessOrders.reduce((acc, order) => acc + order.amount, 0); // Fix business calculation
            }
    
            
            res.status(200).json({ teamSection, sum });
    
        } catch (error) {
            errorLogger(error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
    
    
    async checkBusinessAchievement_for_booster(req, res) {
        try {
            const { uid } = req.user;
    
            // Fetch user wallet with team section
            const userWallet = await UserWallet.findOne({ uid });
            if (!userWallet) {
                return res.status(404).json({ message: "User wallet not found" });
            }
    
            // Fetch user activation date from userdatas table
            const userData = await UserData.findOne({ uid });
            if (!userData) {
                return res.status(404).json({ message: "User data not found" });
            }
    
            const { teamSection } = userWallet;
            const { Activation_date , booster_income} = userData;
    
            // Default values for business calculations
            let level1Business = 0;
            let level2Business = 0;
            let totalTeamL1 = 0;
            let activeTeamL1 = 0;
            let totalTeamL2 = 0;
            let activeTeamL2 = 0;
            const total_business_required = 10000; // Target business for achievement
    
            // Ensure `teamSection` exists and is an array
            if (Array.isArray(teamSection) && teamSection.length > 0) {
                // Check Level 1 Business
                const level1 = teamSection.find(entry => entry.level === 1);
                if (level1) {
                    level1Business = level1.business || 0;
                    totalTeamL1 = level1.total_team || 0;
                    activeTeamL1 = level1.active_team || 0;
                }
    
                // Check Level 2 Business
                const level2 = teamSection.find(entry => entry.level === 2);
                if (level2) {
                    level2Business = level2.business || 0;
                    totalTeamL2 = level2.total_team || 0;
                    activeTeamL2 = level2.active_team || 0;
                }
            }
    
            // Calculate total business and remaining required business
            const total_business = level1Business + level2Business;
            const pending_business = Math.max(total_business_required - total_business, 0);
            const achieved = total_business >= total_business_required; // Check achievement condition
    
            // If business is achieved, update user data
            if (achieved && booster_income==0) {
                await UserData.updateOne(
                    { uid },
                    {
                        $set: {
                            booster_income: 1,
                            booster_income_achieved_Date: new Date() // Set current date
                        }
                    }
                );
                // console.log(`Booster income updated for UID: ${uid}`);
            }
    
            // Response Object
            const response = {
                total_business_required,
                total_business,
                pending_business,
                totalTeamL1,
                activeTeamL1,
                totalTeamL2,
                activeTeamL2,
                achieved,
                level1Business,
                level2Business,
                Activation_date // Include user's activation date
            };
    
            res.status(200).json(response);
        } catch (error) {
            console.error("Error in checkBusinessAchievement:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }

    // New endpoint to check user income eligibility using existing function
    async checkIncomeEligibility(req, res) {
        try {
            // const { uid } = req.user;
            const { uid } = req.body;
            const { amount } = req.query; // Optional amount to check

            // Validate input
            const checkAmount = amount ? parseFloat(amount) : 0;
            if (checkAmount < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Amount must be a positive number"
                });
            }

            // Use the existing checkUserIncomeEligibility function from LevelIncome service
            const eligibilityResult = await LevelIncome.checkUserIncomeEligibility(uid, checkAmount);

            const response = {
                success: true,
                eligible: eligibilityResult.eligible,
                allowedAmount: eligibilityResult.allowedAmount,
                requestedAmount: checkAmount,
                message: eligibilityResult.eligible 
                    ? `User is eligible for income. Maximum allowed: ${eligibilityResult.allowedAmount}` 
                    : "User has reached income cap or is not eligible"
            };

            if (eligibilityResult.error) {
                response.error = eligibilityResult.error;
            }

            res.status(200).json(response);

        } catch (error) {
            errorLogger(error);
            res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message
            });
        }
    }
    
  

    async resetAllUsersUtilityIncome() {
        try {
            // Update only users who have 'utility_income' in wallets
            const result = await UserWallet.updateMany(
                { "wallets.slug": "utility_income" }, // Filter users having utility_income wallet
                { $set: { "wallets.$[elem].value": 0 } }, // Set utility_income value to 0
                { arrayFilters: [{ "elem.slug": "utility_income" }] } // Apply update only to utility_income
            );
    
            console.log(`Reset utility_income wallet values to 0 for ${result.modifiedCount} users.`);
        } catch (error) {
            console.error("Error resetting utility income for all users:", error);
        }
    }
    

    
    // script for update utility income
    async updateAllUsersUtilityIncome() {
        try {
            // Step 1: Aggregate total Re_purchase_wallet per UID from transactions table where source is 'withdrawal'
            const aggregatedTransactions = await Transaction.aggregate([
                { $match: { source: "withdrawal" } },
                { $group: { _id: "$uid", totalRePurchaseWallet: { $sum: "$Re_purchase_wallet" } } }
            ]);
    
            console.log(`Processing ${aggregatedTransactions.length} users...`);
    
            for (const { _id: uid, totalRePurchaseWallet } of aggregatedTransactions) {
                if (totalRePurchaseWallet <= 0) {
                    console.log(`No valid Re_purchase_wallet amount for UID: ${uid}`);
                    continue;
                }
    
                // Step 2: Find the user's wallet
                const userWallet = await UserWallet.findOne({ uid });
    
                if (!userWallet) {
                    console.log(`User wallet not found for UID: ${uid}`);
                    continue;
                }
    
                // Step 3: Update the utility_income wallet
                let updated = false;
                userWallet.wallets = userWallet.wallets.map(wallet => {
                    if (wallet.slug === "utility_income") {
                        wallet.value += totalRePurchaseWallet;
                        updated = true;
                    }
                    return wallet;
                });
    
                if (!updated) {
                    console.log(`Utility Income wallet not found for UID: ${uid}`);
                    continue;
                }
    
                // Step 4: Save the updated wallet
                await userWallet.save();
                console.log(`Updated utility_income wallet for UID ${uid} with value: ${totalRePurchaseWallet}`);
            }
    
            console.log("All users processed successfully.");
        } catch (error) {
            console.error("Error updating utility income for all users:", error);
        }
    }
    
    async  resetAllUsersSelfInvestment() {
        try {
            // Step 1: Find all user wallets
            const allUserWallets = await UserWallet.find();
    
            console.log(`Processing ${allUserWallets.length} users...`);
    
            for (const userWallet of allUserWallets) {
                let updated = false;
    
                // Step 2: Update existing self_investment wallet if found
                userWallet.wallets = userWallet.wallets.map(wallet => {
                    if (wallet.slug === "self_investment") {
                        wallet.value = 0; // Reset investment to zero
                        updated = true;
                    }
                    return wallet;
                });
    
                // Step 3: Save only if an update was made
                if (updated) {
                    await userWallet.save();
                    console.log(`Reset self_investment wallet for UID: ${userWallet.uid}`);
                }
            }
    
            console.log("All users' self_investment wallets have been reset to zero.");
        } catch (error) {
            console.error("Error resetting self investment for all users:", error);
        }
    }
    
    async  updateAllUsersSelfInvestment() {
        try {
            // Step 1: Get distinct UIDs from orders table
            const uniqueUsers = await Orders.find().lean(); // Using lean() for better performance
    
            console.log(`Processing ${uniqueUsers.length} users...`);
    
            for (const userOrder of uniqueUsers) {
                const uid = userOrder.uid; // Correct variable reference
    
                // Step 2: Fetch all orders for the user
                const orders = await Orders.find({ uid ,status:1}).lean();
    
                // Step 3: Sum the investment amounts
                const totalInvestment = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
    
                // Step 4: Find the user's wallet
                const userWallet = await UserWallet.findOne({ uid });
    
                if (!userWallet) {
                    console.log(`User wallet not found for UID: ${uid}`);
                    continue;
                }
    
                // Step 5: Update the self_investment wallet
                let updated = false;
                userWallet.wallets = userWallet.wallets.map(wallet => {
                    if (wallet.slug === "self_investment") {
                        wallet.value = totalInvestment;
                        updated = true;
                    }
                    return wallet;
                });
    
                // If self_investment wallet doesn't exist, add it
                if (!updated) {
                    userWallet.wallets.push({ slug: "self_investment", value: totalInvestment });
                    console.log(`Created self_investment wallet for UID: ${uid}`);
                }
    
                // Step 6: Save the updated wallet
                await userWallet.save();
                console.log(`Updated self_investment wallet for UID ${uid} with value: ${totalInvestment}`);
            }
    
            console.log("All users processed successfully.");
        } catch (error) {
            console.error("Error updating self investment for all users:", error);
        }
    }
    
}

const balance = new BALANCE();
// balance.resetAllUsersUtilityIncome()
// balance.resetAllUsersSelfInvestment()
// balance.updateAllUsersSelfInvestment()
// balance.updateAllUsersUtilityIncome()
module.exports = balance;
