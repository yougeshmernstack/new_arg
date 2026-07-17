const { INVALID_USERNAME } = require("authenticate-utils/errorMessages");
const Activity = require("../../MODALS/Activity");
const PlansInfo = require("../../MODALS/Plan");
const UserData = require("../../MODALS/userData");
const Transactions = require("../../MODALS/transactions");
const Orders = require("../../MODALS/Orders");
const { PACKAGE_NAME_REQUIRED, WRONG_PACKAGE_SELECTED, INTERNAL_SERVER_ERROR } = require("../../utils/errorMessages");
const { errorLogger } = require("../../utils/logger");
const UserWallet = require("../../MODALS/userWallets");
const Ranks = require("../../MODALS/Ranks");
const Team = require("../../SERVICES/UpdateTeam");

class TOPUP {
  
//     async getAllPackage(req, res) {
//         try {
//             const { uid } = req.user; 
    
//             const packages = await PlansInfo.findOne({ buy_status: 1 }).sort({ 'package.min_amount': 1 });
    
//             const sumWallets = await UserWallet.aggregate([
//                 { $match: { uid } },
//                 { $unwind: '$wallets' },
//                 { 
//                     $match: { 
//                         'wallets.wallet_status': 1, 
//                         'wallets.wallet_type': 'income',
//                         'wallets.slug': { $ne: 'bonus_income' }  
//                     } 
//                 },
//                 { 
//                     $group: { 
//                         _id: '$_id', 
//                         totalIncome: { $sum: '$wallets.value' } 
//                     } 
//                 }
//             ]);
            

//             const totalOrderAmountResult = await Orders.aggregate([
//                 { $match: { uid ,
                    
//                 status: { $in: [1,2] }
//                 }}, 
//                 { $group: { _id: null, totalOrderAmount: { $sum: "$amount" } } }
//             ]);
    
//             // Extract values or set to 0 if no data found
//             const totalIncome = (sumWallets[0]?.totalIncome || 0)
           
//             const totalOrderAmount = totalOrderAmountResult.length > 0 ? totalOrderAmountResult[0].totalOrderAmount : 0;
    
            
//             const userWallet = await UserWallet.findOne({ uid });
            
//             const { teamSection } = userWallet;

// // Check for admin-set capping first
// const user = await UserData.findOne({ uid });
// let capping = 0; // Default capping value
// if (user.capping_set_admin && user.capping_set_admin > 0) {
//     // If admin has set a capping greater than 0, use it directly with highest priority
//      capping = user.capping_set_admin;
//     console.log(`Admin set capping detected: ${user.capping_set_admin}, using this as final capping value`);
// } else {
//     // Only check other conditions if no admin capping is set or it's zero
    
//     // Get level 1 business volume
//     const level1 = teamSection.find(entry => entry.level == 1);
//     const level1Business = level1 ? level1.business : 0;

//     const possibleCappings = [200];

//     if (user.enable_gaming_wallet === 1 && user.enable_gaming_wallet_Date) {
       
//         possibleCappings.push(500);
//         console.log(`Level 1 business volume is ${level1Business}, adding capping value 3`);
//     }


//     // Select the highest capping value from conditions
//      capping = Math.max(...possibleCappings);
//     console.log(`Using highest capping value: ${capping}`);
// }
            
//             const totalCappedAmount = totalOrderAmount * capping/100;
            
//             // Check if totalIncome is >= 90% of totalCappedAmount
//             const ninetyPercentOfCapped = totalCappedAmount * 0.9;
//             const needsRetopup = totalIncome >= ninetyPercentOfCapped;
            
//             return res.status(200).json({ 
//                 packages, 
//                 totalIncome, 
//                 totalOrderAmount, 
//                 totalCappedAmount,
//                 needsRetopup,
//                 message: needsRetopup ? 'Your income is nearing its limit. Please repurchase a package now to continue earning without interruption.' : null
//             });
//         } catch (error) {
//             errorLogger(error);
//             return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
//         }
//     }


    // new
    async getAllPackage(req, res) {
        try {
            // Query to filter packages with status 1 and sort by min_amount
            const packages = await PlansInfo.find();
                // .sort({ 'package.min_amount': 1 });
            
            console.log("Packages:", packages);
            return res.status(200).json({ packages });
        } catch (error) {
            // Log the error and return a 500 status
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async topupWithFund(req, res, next) {
        try {
            const { uid } = req.user;
            const { amount, pacakge_name, username, wallet_name } = req.body;
           const { uid: toUser } = await UserData.findOne({ username: new RegExp(`^${username}$`, 'i') });

            if (!toUser) {
                return res.status(400).json({ ...INVALID_USERNAME });
            }


            const user = await UserData.findOne({ uid });
            if (wallet_name === "working_wallet" && (!user.enable_gaming_wallet || user.enable_gaming_wallet !== 1)) {
                return res.status(400).json({ message: 'You are not eligible for Gaming Wallet Activation.' });
            }

            const activity = await Activity.findOne({ name: 'topup' });
            if (!activity) {
                return res.status(400).json({ message: 'Activity not found' });
            }

            // Configure wallet settings based on wallet_name
            let walletConfig = [
                {
                    wallet_name: 'fund_wallet',
                    percentage: 100
                }
            ];
            
            if (wallet_name === "working_wallet") {
                walletConfig = [
                    {
                        wallet_name: 'fund_wallet',
                        percentage: 100
                    },
                    {
                        wallet_name: 'working_wallet',
                        percentage: 0
                    }
                ];
            
        }
            const updatedActivity = {
                ...activity.toObject(),
                use_wallet: walletConfig
            };

            req.activity = {
                amount,
                activity: updatedActivity,
                breakFunction: false,
                Status: 1,
                to_from: toUser,
                uid
            };

            next();
            return;
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    async request(req, res, next) {
        try {
            const { uid } = req.user;
            const { amount, pacakge_name } = req.body;

            req.orderDetail = { amount, source: 'dap', tx_Id: 0, uid };
            req.status = 0;
            next();
        } catch (error) {
            errorLogger(error)
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR })
        }
    }

    async getBusinessByDateRange(req, res) {
        const { fromDate, toDate, maxLevels = 10 } = req.query;
        const { uid } = req.user;
    
        if (!uid) {
            return res.status(400).json({ error: 'uid is required' });
        }
    
        try {
            let start, end;
    
            if (fromDate && toDate) {
                start = new Date(fromDate);
                start.setHours(0, 0, 0, 0); // Start of the day
    
                end = new Date(toDate);
                end.setHours(23, 59, 59, 999); // End of the day
            } else {
                // Default to current month
                const now = new Date();
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                start.setHours(0, 0, 0, 0);
    
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                end.setHours(23, 59, 59, 999);
            }
    
            const business = await Team.calculateTeamBusiness(start, end, uid, parseInt(maxLevels));
    
            res.json({
                uid,
                fromDate: start.toISOString(),
                toDate: end.toISOString(),
                maxLevels: parseInt(maxLevels),
                business
            });
    
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Something went wrong' });
        }
    }
    
    

}
const topup = new TOPUP();
module.exports = topup;