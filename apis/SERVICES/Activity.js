const advance_info = require('../MODALS/advanceInfo');
const Activity = require('../MODALS/Activity');
const Transaction = require('../MODALS/transactions');
const UserData = require('../MODALS/userData');
const UserWallet = require('../MODALS/userWallets');
const { ACTIVITY_NOT_ACTIVE, INTERNAL_SERVER_ERROR, INSUFFICIENT_FUND } = require('../utils/errorMessages');
const { errorLogger, logConditionFailure, logRollback } = require('../utils/logger');
const { REQUEST_SUCCESS } = require('../utils/successMessages');
const transaction = require('./Transaction'); 
const queueManager = require('./TransactionQueue');

class ACTIVITY {
    
    
    async act(req, res, next) {
        try {
            const transaction = require('./Transaction');
            const { role } = req.user;
            const { amount, activity, breakFunction, Status, uid, to_from, note, account = null,release = 1, token_address=null,
                token_symbol=null , TDS=0} = req.activity;
           
            const user = await UserData.findOne({ uid });
    
            if (!activity || activity.status === 0) {
                return res.status(200).json({ ...ACTIVITY_NOT_ACTIVE });
            }


            const hasRequiredRole = activity.allowed_roles.includes("user");
            const isDisallowed = user.disabled_activities.includes(activity.act_id);
            
            if (isDisallowed) {
                logConditionFailure(`activity not found  role for this user`)
                return res.status(400).json({ message: "activity not found  role for this user" });
            }
    
            const walletNames = activity.use_wallet.map(wallet => wallet.wallet_name);
    
            const userWallets = await UserWallet.aggregate([
                { $match: { uid } },
                { $unwind: '$wallets' },
                { $match: { 'wallets.slug': { $in: walletNames } } },
                { $group: { _id: '$_id', wallets: { $push: '$wallets' } } }
            ]);
    
            if (userWallets.length === 0) {
                return res.status(400).json({ ...INSUFFICIENT_FUND });
            }
    
            const { wallets } = userWallets[0];
    
            const fullBalance = wallets.reduce((total, wallet) => {
                const walletInfo = activity.use_wallet.find(w => w.wallet_name === wallet.slug);
                if (walletInfo) {
                    return total + wallet.value;
                }
                return total;
            }, 0);
    
            const balance = parseFloat(fullBalance).toFixed(5);
            // console.log("balance",balance)
            const hasEnoughFunds = activity.use_wallet.every(wallet => {
                // console.log("wallet",wallet)
                const requiredAmount = amount * (wallet.percentage / 100);
                const correspondingWallet = wallets.find(w => w.slug === wallet.wallet_name);
                // console.log("correspondingWallet",correspondingWallet.value)
                return correspondingWallet && correspondingWallet.value >= requiredAmount;
            });
            if ((!hasEnoughFunds && activity.debit_credit === 'debit')) {
                return res.status(400).json({ ...INSUFFICIENT_FUND });
            } else {
                // Fetch withdrawal configuration from advance_info
                const advanceInfo = await advance_info.findOne();
                const walletConfig = advanceInfo?.withdrawal?.main_wallet;
    
                if (!walletConfig) {
                    return res.status(500).json({ message: 'Withdrawal configuration not found.' });
                }
    
                const serviceTaxPercentage = walletConfig.service_tax || 0;
                // const tdsPercentage = walletConfig.TDS || 0;
    
                // Calculate charges, TDS, and withdrawal amount
                let withdrawal_amount = 0;
                let tx_charge = 0;
                // let TDS = 0;
    
                if (activity.name === 'withdrawal') {
                    tx_charge = (amount * serviceTaxPercentage) / 100;
                    // TDS = (amount * tdsPercentage) / 100;
                    // withdrawal_amount = amount - tx_charge - TDS;
                    withdrawal_amount = amount - tx_charge;
                }
    
                // Process the transaction
                const transactionData = activity.use_wallet.map(wallet => ({
                    uid,
                    to_from,
                    note,
                    tx_type: activity.type,
                    debit_credit: activity.debit_credit,
                    wallet_type: wallet.wallet_name,
                    amount: amount * (wallet.percentage / 100),
                    source: activity.name,
                    Status,
                    TDS,
                    account,
                    withdrawal_amount,
                    tx_charge,
                    Re_purchase_wallet:TDS,
                    token_address,
                    token_symbol,
                    release,
                    ...(activity.name === 'withdrawal' && user.pancard ? { pancard: user.pancard } : {})
                }));
    
                const saved = await transaction.insert(transactionData);
                req.savedtransaction = saved;
                req.status = 1;
    
                return breakFunction ? res.status(200).json({ ...REQUEST_SUCCESS }) : next();
            }
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    
    async actInternally(uid, activity) {
        try {
            const transaction = require('./Transaction');
            const user = await UserData.findOne({ uid });
            logConditionFailure(`here....actvity called for uid ${uid}`)
            const { amount, activity_name, Status, to_from, level, order_Id=0,profit_Share=0 ,withdrawal_amount=0, TDS = 0,tx_charge = 0, account = null, release = 1, currentDate,business=0,order_amount ,income_percent=0,user_package,order_Activation_date,user_joining_date,metadata=null,rankId=null,pancard=null} = activity;


            const activityDetails = await Activity.findOne({ name: activity_name });

            if (!activityDetails || activityDetails.status === 0) {
                console.log("activity not found",activity_name)
                logConditionFailure(`activity not found`)
                return;
            }

            const hasRequiredRole = activityDetails.allowed_roles.includes("user");
            const isDisallowed = user.disabled_activities.includes(activityDetails.act_id);
            // console.log("hasRequiredRole",hasRequiredRole)
            // console.log("isDisallowed",isDisallowed)
            if (isDisallowed) {
                logConditionFailure(`activity not found  role for this user ...`)
                return;
            }
            if (!hasRequiredRole) {
                logConditionFailure(`activity not found  role for this user`)
                return;
            }

            const walletNames = activityDetails.use_wallet.map(wallet => wallet.wallet_name);

            const userWallets = await UserWallet.aggregate([
                { $match: { uid } },
                { $unwind: '$wallets' },
                { $match: { 'wallets.slug': { $in: walletNames } } },
                { $group: { _id: '$_id', wallets: { $push: '$wallets' } } }
            ]);

            if (userWallets.length === 0) {
                logConditionFailure(`userwallet not  found`)

                return;
            }

            const { wallets } = userWallets[0];

            const fullBalance = wallets.reduce((total, wallet) => {
                const walletInfo = activityDetails.use_wallet.find(w => w.wallet_name === wallet.slug);
                if (walletInfo) {
                    return total + wallet.value;
                }
                return total;
            }, 0);

            const balance = parseFloat(fullBalance).toFixed(5);
            const hasEnoughFunds = activityDetails.use_wallet.every(wallet => {
                const requiredAmount = amount * (wallet.percentage / 100);
                const correspondingWallet = wallets.find(w => w.slug === wallet.wallet_name);
                return correspondingWallet && correspondingWallet.value >= requiredAmount;
            });
            
            if (!hasEnoughFunds && activityDetails.debit_credit === 'debit') {
                logConditionFailure(`balance not enough for activity ${activityDetails.name}`)
                return;
            } else {
                // Use pancard from activity parameter, fallback to user.pancard for withdrawal
                const userPancard = activity_name === 'withdrawal' ? (pancard || user.pancard || null) : null;
                
                const transactionData = activityDetails.use_wallet.map(wallet => ({
                    uid,
                    to_from: to_from,
                    level,
                    tx_type: activityDetails.name,
                    debit_credit: activityDetails.debit_credit,
                    wallet_type: wallet.wallet_name,
                    amount: amount * (wallet.percentage / 100),
                    source: activityDetails.name,
                    Status,
                    business,
                    order_amount,
                    order_Id,
                    release,
                    TDS,
                    time:currentDate,
                    account,
                    tx_charge,
                    withdrawal_amount,
                    income_percent,
                    user_package,
                    order_Activation_date,
                    user_joining_date,
                    metadata,
                    rankId,
                    ...(userPancard ? { pancard: userPancard } : {})
                }));
                // console.log("transactionData",transactionData)
                await transaction.insert(transactionData);
            }
        } catch (error) {
            errorLogger(error);
            return;
        }
    }

    async rollback(req,res,callback) {
        try {
            const { requestIds, reason } = req.body;
            // Find all transactions with the provided tx_Ids
            const transactions = await Transaction.find({ tx_Id: { $in: requestIds }});
    
            if (!transactions || transactions.length === 0) {
                logRollback(`No transactions found for the provided tx_Ids: ${requestIds}`);
                return res.status(404).json({ message: 'Transactions not found.' });
            }
    
            // Loop through each transaction to apply rollback logic
            for (let originalTransaction of transactions) {
                const { uid } = originalTransaction;
    
                // Check if the transaction has already been rolled back
                if (originalTransaction.status == 2) {
                    logRollback(`Transaction already rolled back: ${originalTransaction.tx_Id}`);
                    continue; // Skip already rolled back transactions
                }
    
                // Calculate refund amount including any transaction charge
                const refundAmount = originalTransaction.amount;
    
                // Find the wallet to be refunded
                const userWallet = await UserWallet.findOne(
                    { uid, 'wallets.slug': originalTransaction.wallet_type },
                    { 'wallets.$': 1 }
                );
                
                // Find the source wallet
                const sourceWallet = await UserWallet.findOne(
                    { uid, 'wallets.slug': originalTransaction.source },
                    { 'wallets.$': 1 }
                );
    
                if (!userWallet) {
                    logRollback(`Wallet not found for user: ${uid}, wallet_type: ${originalTransaction.wallet_type}`);
                    continue;
                }
    
                // Calculate the new wallet values
                let newValue;
                let newValueSrc;
    
                if (originalTransaction.debit_credit === 'credit') {
                    newValue = Number(userWallet.wallets[0].value) - Number(refundAmount);
                    if (sourceWallet) {
                        newValueSrc = Number(sourceWallet.wallets[0].value) - Number(refundAmount);
                    }
                } else {
                    newValue = Number(userWallet.wallets[0].value) + Number(refundAmount);
                    if (sourceWallet) {
                        newValueSrc = Number(sourceWallet.wallets[0].value) + Number(refundAmount);
                    }
                }
    
                // Update the user's wallet with the new balance
                await UserWallet.findOneAndUpdate(
                    { uid, 'wallets.slug': originalTransaction.wallet_type },
                    { $set: { 'wallets.$.value': newValue } },
                    { new: true }
                );
    
                // Update the source wallet if it exists
                if (sourceWallet) {
                    await UserWallet.findOneAndUpdate(
                        { uid, 'wallets.slug': originalTransaction.source },
                        { $set: { 'wallets.$.value': newValueSrc } },
                        { new: true }
                    );
                }
    
                // Update the transaction status to rolled back (status = 2)
                originalTransaction.status = 2;
                originalTransaction.remark = reason;
                originalTransaction.tx_type= 'rollback';
                await originalTransaction.save();
    
                // Log rollback action
                logRollback(`Rollback successful for transaction: ${originalTransaction.tx_Id}, amount: ${refundAmount}`);
            }
    
            // Return success response after processing all transactions
            return callback();
    
        } catch (error) {
            logRollback(`Rollback failed for transactions: ${tx_Ids}. Error: ${error.message}`);
            errorLogger(error);
            throw new Error('Internal server error');
        }
    }


    async disabaleEnableActivity(req, res) {
        try {
            const { username, act_ids, action } = req.body;
            console.log(req.body);
            const { role } = req.user; 
    
            if (role !== 'admin') {
                return res.status(403).json({ success: false, message: "You don't have permission to block or unblock users." });
            }
    
            // Validate input
            if (!username || !act_ids || !Array.isArray(act_ids) || act_ids.length === 0 || !action) {
                return res.status(400).json({ success: false, message: 'Username, activity IDs, and action are required.' });
            }
    
            // Find the user
            const user = await UserData.findOne({ username });
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found.' });
            }
     
            // Process each activity ID based on the action
            const errors = [];
            const successMessages = [];
    
            if (action === 'disable') {
                // Loop through each activity to disable
                for (let act_id of act_ids) {
                    if (user.disabled_activities.includes(act_id)) {
                        errors.push(`Activity ${act_id} is already disabled.`);
                    } else {
                        user.disabled_activities.push(act_id);
                        successMessages.push(`Activity ${act_id} disabled successfully.`);
                    }
                }
            // } else if (action === 'enable') {
            //     // Loop through each activity to enable
            //     for (let act_id of act_ids) {
            //         if (!user.disabled_activities.includes(act_id)) {
            //             errors.push(`Activity ${act_id} is not disabled.`);
            //         } else {
            //             user.disabled_activities = user.disabled_activities.filter(activity => activity !== act_id);
            //             successMessages.push(`Activity ${act_id} enabled successfully.`);
            //         }
            //     }
        } else if (action === 'enable') {
            for (let act_id of act_ids) {
                if (!user.disabled_activities.includes(act_id.toString())) {
                    errors.push(`Activity ${act_id} is not disabled.`);
                } else {
                    user.disabled_activities = user.disabled_activities.filter(activity => activity.toString() !== act_id.toString());
                    successMessages.push(`Activity ${act_id} enabled successfully.`);
                }
            }
        
        
            } else {
                return res.status(400).json({ success: false, message: 'Invalid action. Use "disable" or "enable".' });
            }
    
            // Save the user if any changes were made
            if (successMessages.length > 0) {
                await user.save();
            }
    
            // Prepare the response
            return res.status(200).json({
                success: true,
                messages: [...successMessages, ...errors]
            });
    
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ success: false, message: 'An error occurred while toggling the activities.' });
        }
    }
    
    async disableActivity_user(req, res) {
        try {
            const { uid, role } = req.user; // Assuming user information is attached to req.user
            const { page = 1, limit = 10, search, startDateJoining, endDateJoining, startDateActive, endDateActive, ...filters } = req.query;

            const query = {};

            // Restrict to user's own transactions if not admin

            // Apply additional filters
            for (const key in filters) {
                if (!isNaN(filters[key])) {
                    query[key] = parseInt(filters[key]);
                } else if (filters[key]) {
                    query[key] = new RegExp(filters[key], 'i'); // Handle other filters
                }
            }

            if (role !== 'admin') {
                query.uid = uid;
            }

            // Date range filtering
            if (startDateJoining || endDateJoining) {
                query.joining_date = {};
                if (startDateJoining) {
                    query.joining_date.$gte = new Date(new Date(startDateJoining).setHours(0, 0, 0, 0));
                }
                if (endDateJoining) {
                    query.joining_date.$lt = new Date(new Date(endDateJoining).setHours(23, 59, 59, 999));
                }
            }

            if (startDateActive || endDateActive) {
                query.joining_date = {};
                if (startDateActive) {
                    query.Activation_date.$gte = new Date(new Date(startDateActive).setHours(0, 0, 0, 0));
                }
                if (endDateActive) {
                    query.Activation_date.$lt = new Date(new Date(endDateActive).setHours(23, 59, 59, 999));
                }
            }

            // If search term is provided, find matching users
            if (search) {
                const userSearchRegex = new RegExp(search, 'i');
                const matchingUsers = await UserData.find({
                    $or: [
                        { user_name: userSearchRegex },
                        { name: userSearchRegex }
                    ]
                }, 'uid');
                const matchingUserIds = matchingUsers.map(user => user.uid);

                 if (role === 'admin' ||  role !== "manager") {
                    // For admin, filter by matching user IDs
                    query.uid = { $in: matchingUserIds };
                } else {
                    // For regular users, ensure search only includes their own transactions
                    query.uid = {
                        $in: matchingUserIds,
                        $eq: uid
                    };
                }
            }

            // Find transactions
            const users = await UserData.find({
                ...query,
                disabled_activities: { $ne: [] }
            })
                // .skip((page - 1) * limit)
                // .limit(parseInt(limit))
                // .sort({ createdAt: -1 });

                .sort({ uid: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit));

            const usersWithDetails = await Promise.all(users.map(async user => {
                // const walletValues = await fetchWalletValues(user.uid);
                const activity_disable = user.disabled_activities;
                const activities = await Activity.find(
                    {
                        act_id: { $in: activity_disable }  // Find activities where act_id is in the activity_disable array
                    },
                    'name description type'  // Corrected syntax to select fields
                );

                const sponsor = await UserData.findOne({ uid: user.sponsor_Id }, 'username name');
                return {
                    ...user._doc,
                    activities,
                    // ...walletValues,
                    sponsor_username: sponsor ? sponsor.username : null,
                    sponsor_name: sponsor ? sponsor.name : null
                };
            }));


            const totalCount = await UserData.countDocuments({
                ...query,
                disabled_activities: { $ne: [] }
            });
            res.status(200).json({
                success: true,
                data: usersWithDetails,
                totalRecords: totalCount,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / limit),
                ...filters
            });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ success: false, message: 'An error occurred while disabling the activity.' });
        }
    }

    async getAllActivities(req, res) {
        try {
            // Fetch all activities from the database
            const activities = await Activity.find({
                name: { $nin: ['direct_income', 'fund_transfer', 'add_fund','utility_income','level_income'] }
            })
            // const activities = await Activity.findOne({ allowed_roles: { $in: [ 'user'] }});

            if (!activities.length) {
                return res.status(200).json({ success: true, activities: [], message: 'No activities found.' });
            }

            return res.status(200).json({ success: true, activities });
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ success: false, message: 'An error occurred while fetching activities.' });
        }
    }

}

const Action = new ACTIVITY();
module.exports = Action;
