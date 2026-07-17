const Activity = require("../../MODALS/Activity");
const axios = require('axios');
const qs = require('qs');
const Transaction = require("../../MODALS/transactions");
const AdvanceInfo = require("../../MODALS/advanceInfo.js");
const UserPaymentOption = require("../../MODALS/UserPaymentOption");
const { INTERNAL_SERVER_ERROR } = require("../../utils/errorMessages");
const { errorLogger } = require("../../utils/logger");
const { REQUEST_SUCCESS } = require("../../utils/successMessages");
const Action = require("../../SERVICES/Activity");
const UserWallet = require("../../MODALS/userWallets.js");
const UserData = require("../../MODALS/userData.js");

class WITHDRAWAL {
    async approve(req, res) {
       
        try {
            const { requestIds,tx_hash="mannual approval" } = req.body;
    
            if (!Array.isArray(requestIds) || requestIds.length === 0) {
                return res.status(400).json({ error: "Invalid or missing requestIds" });
            }
    
            // Approve withdrawals by setting status to 1
            const update = await Transaction.updateMany(
                { tx_Id: { $in: requestIds }, source: 'withdrawal' },
                { $set: { 
                    status: 1 ,
                    tx_hash
                } }
            );
            // console.log(update);
    
            if (update.modifiedCount === 0) {
                return res.status(404).json({ error: "No transactions found or already approved." });
            }
    
            // Fetch the transactions after updating
            const approvedTransactions = await Transaction.find({ tx_Id: { $in: requestIds }, source: 'withdrawal' });
    
            for (const trans of approvedTransactions) {
                const { uid, Re_purchase_wallet,amount } = trans; // Ensure TDS is defined
    
                if (amount > 0) {
                    await UserWallet.updateOne(
                        { uid, "wallets.slug": "total_withdrawal" },
                        { $inc: { "wallets.$.value": amount } } 
                    );
                }
            }
    
            res.status(200).json({ message: "Withdrawals approved successfully." });
        } catch (error) {
            console.error("Error in approve function:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
    
    // async reject(req,res){
    //     console.log(req.body)
    //     try {
    //         const {requestIds}=req.body;
    //         const update = await Transaction.updateMany({tx_Id:{$in:requestIds},source:'withdraw'},{$set:{status:2}})
    //         console.log(update)
    //         res.status(200).json({...REQUEST_SUCCESS})
    //     } catch (error) {
    //        errorLogger(error)
    //        res.status(500).json({...INTERNAL_SERVER_ERROR})
    //     }
    // }


    // new
    async reject(req, res) {
        console.log(req.body);
        try {
            await Action.rollback(req, res, () => {
                return res.status(200).json({ ...REQUEST_SUCCESS });
            })
        } catch (error) {
            errorLogger(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async sendCrypPaymentTransfer(req, res) {
        try {
            const { tx_Id } = req.body; // The transaction ID provided in the request
            // Retrieve the transaction from the database using the provided tx_Id and status=0
            const transaction = await Transaction.findOne({ tx_Id, status: 0 });

            if (!transaction) {
                return res.status(404).json({ message: 'Transaction not found or already processed' });
            }

            // Get amount and recipient wallet address from the transaction object
            const { amount, account: { address: recipientWallet } } = transaction;

            // console.log("addres: ", recipientWallet);
            // Prepare the data for the SendCryp API for transfer
            const transferData = {
                api_key: process.env.SendCryp_API_KEY, // Replace with actual API key
                action: "transfer",
                payment_amount: amount, // Amount from the transaction
                token: "USDT-BEP20", // Token type
                network: "BSC", // Network type
                to_address: recipientWallet // Wallet address from the transaction
            };

            const SendCrypUrl = process.env.SendCryp_API_URL; // SendCryp API URL

            // Make API request to initiate the transfer
            const response = await axios.post(
                SendCrypUrl,
                qs.stringify(transferData),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }
                }
            );

            // Handle the API response
            const { success, message } = response.data; // Rename this variable from `res` to `response.data`

            if (success) {
                // If the transfer is successful, update the transaction status
                transaction.status = 1; // Mark as completed
                transaction.tx_hash = message; // Store transaction hash for record-keeping

                const updatedTransaction = await transaction.save();

                return res.status(201).json({
                    ...REQUEST_SUCCESS,
                    updatedTransaction,
                    message: `Successfully transferred ${amount} to ${recipientWallet}`
                });
            } else {
                return res.status(400).json({ message: `Transfer Failed: ${response.data.message}` });
            }
        } catch (error) {
            errorLogger(error);
            console.error(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }


    async getAdvanceInfo(req, res) {
        try {
            // Fetch the advance info data (assuming only one document in this collection)
            const advanceInfoData = await AdvanceInfo.findOne();
    
            if (!advanceInfoData) {
                return res.status(404).json({
                    success: false,
                    message: "Advance info not found."
                });
            }
    
            // Return the advance info data
            res.status(200).json({
                success: true,
                data: advanceInfoData
            });
        } catch (error) {
            console.error("Error fetching advance info:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error.",
                error: error.message
            });
        }
    };
    

    async updateWithdrawalLimits(req, res) {
        try {
            const { role } = req.user;
            const { walletType, minWithdrawal, maxWithdrawal, tds, service_tax } = req.body;
    
            // Role check: Only allow admin to update withdrawal limits
            if (role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Unauthorized access' });
            }
    
            // Validate input data
            if (!walletType || !['main_wallet'].includes(walletType)) {
                return res.status(400).json({ success: false, message: 'Invalid wallet type' });
            }
    
            if (minWithdrawal === undefined || maxWithdrawal === undefined) {
                return res.status(400).json({ success: false, message: 'Both minWithdrawal and maxWithdrawal are required' });
            }
            
            if (tds === undefined || service_tax === undefined) {
                return res.status(400).json({ success: false, message: 'Both tds and service_tax are required' });
            }
    
            // Validate that minWithdrawal is less than maxWithdrawal
            if (Number(minWithdrawal) >= Number(maxWithdrawal)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Minimum withdrawal amount must be less than maximum withdrawal amount' 
                });
            }
    
            // Fetch the current advance info
            const advanceInfo = await AdvanceInfo.findOne();
            if (!advanceInfo) {
                return res.status(404).json({ success: false, message: 'Advance info not found' });
            }
    
            // Update the withdrawal limits based on wallet type
            advanceInfo.withdrawal[walletType].min_withdrawal = Number(minWithdrawal);
            advanceInfo.withdrawal[walletType].max_withdrawal = Number(maxWithdrawal);
            advanceInfo.withdrawal[walletType].service_tax = Number(service_tax);
            advanceInfo.withdrawal[walletType].TDS = Number(tds); // Note: Using TDS (uppercase) as in the data structure
    
            // Save the updated advance info
            await advanceInfo.save();
    
            res.status(200).json({
                success: true,
                message: `Withdrawal limits updated for ${walletType}`,
                data: {
                    walletType,
                    min_withdrawal: Number(minWithdrawal),
                    max_withdrawal: Number(maxWithdrawal),
                    service_tax: Number(service_tax),
                    TDS: Number(tds)
                },
            });
        } catch (error) {
            console.error('Error updating withdrawal limits:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    async mannual_release_income(req, res) {
        try {
            const { requestIds, income, target_wallet="main_wallet" } = req.body;
    
            // Validate required fields
            if (!Array.isArray(requestIds) || requestIds.length === 0) {
                return res.status(400).json({ error: "Invalid or missing requestIds" });
            }
            if (!Array.isArray(income) || income.length === 0) {
                return res.status(400).json({ error: "Invalid or missing income sources" });
            }
            if (!target_wallet || typeof target_wallet !== "string") {
                return res.status(400).json({ error: "Invalid or missing target wallet" });
            }

            
            if ( target_wallet !== "main_wallet") {
                return res.status(400).json({ 
                    error: "correct target wallet" 
                });
            }
    
            // Fetch transactions based on requestIds (tx_Id)
            console.log("Fetching transactions for tx_Ids:", requestIds);
            const transactions = await Transaction.find({
                tx_Id: { $in: requestIds },
                source: { $in: income },
                release: 0, // Ensure transaction has not been released
            });
    
            if (!transactions || transactions.length === 0) {
                return res.status(404).json({ error: "No transactions found for the given tx_Ids." });
            }
    
            // Process each transaction
            for (const trans of transactions) {
                const { uid, tx_Id, amount, debit_credit } = trans;
                console.log(`Processing Transaction ${tx_Id} for User ${uid}:`);
    
                // Fetch user wallet
                const userWallet = await UserWallet.findOne({ uid });
                if (!userWallet) {
                    console.log(`No wallet found for User ${uid}`);
                    continue; // Skip if no wallet found
                }
    
                const walletSlugs = userWallet.wallets.map(w => w.slug);
                if (!walletSlugs.includes(target_wallet)) {
                    console.log(`User ${uid} does not have target wallet: ${target_wallet}`);
                    continue; // Skip if target wallet does not exist
                }
    
                // Get the current value of the target wallet
                const targetWalletData = userWallet.wallets.find(w => w.slug === target_wallet);
                const currentValue = Number(targetWalletData?.value || 0);
                const transactionAmount = Number(amount);
    
                if (isNaN(currentValue) || isNaN(transactionAmount)) {
                    console.log(`Invalid value for User ${uid}: currentValue (${currentValue}), transactionAmount (${transactionAmount})`);
                    continue; // Skip this transaction if values are invalid
                }
    
                // Calculate new value
                let newTransferValue = debit_credit === 'credit'
                    ? currentValue + transactionAmount
                    : currentValue - transactionAmount;
                console.log(`New value for ${target_wallet} (User ${uid}): ${newTransferValue}`);
    
                // Update the wallet value
                await UserWallet.updateOne(
                    { uid, 'wallets.slug': target_wallet },
                    { $set: { 'wallets.$.value': newTransferValue } }
                );
    
                // Mark the transaction as released
                await Transaction.updateOne(
                    { 
                    tx_Id: trans.tx_Id
                 },
                     { 
                        $set: { release: 1 ,wallet_type:target_wallet, remark:"income released from admin" }
                     });
                console.log(`Transaction ${tx_Id} released for User ${uid}`);
            }
    
            res.status(200).json({ message: "Wallet release process completed successfully." });
        } catch (error) {
            console.error("Error in release_income:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    // old
    // async autoReleaseIncome() {
    //     try {
    //         console.log("Automated Income Release Started: ", new Date());
    
    //         // Define income sources
    //         const incomeSources = ["roi_income", "roi_level_income", "reward_income"];
    
    //         // Fetch pending transactions
    //         const transactions = await Transaction.find({
    //             source: { $in: incomeSources },
    //             release: 0, // Not released yet
    //         });
    
    //         if (!transactions.length) {
    //             console.log("No pending transactions found for release.");
    //             return;
    //         }
    //         const today = new Date(); // Define today's date

    //         for (const trans of transactions) {
    //             const { uid, tx_Id, amount, debit_credit } = trans;
    
    //             console.log(`Processing Transaction ${tx_Id} for User ${uid}`);

    //             const user = await UserData.findOne({ uid , status: 1 });
            
    //             if (!user) {
    //                 console.log(`User not found: ${uid}`);
    //                 continue;
    //             }

    //         if (!user.Activation_date) {
    //             console.log(`User ${uid} is not activated, skipping.`);
    //             continue;
    //         }

    //         // Calculate the difference in days from activation
    //         const activationDate = new Date(user.Activation_date);
    //         const daysSinceActivation = Math.floor((today - activationDate) / (1000 * 60 * 60 * 24));

    //         if (daysSinceActivation < 7) {
    //             console.log(`User ${uid} activated ${daysSinceActivation} days ago. Income release blocked.`);
    //             continue;
    //         }
            
    //             // Fetch user wallet
    //             const userWallet = await UserWallet.findOne({ uid });
    //             if (!userWallet) {
    //                 console.log(`Wallet not found for User ${uid}`);
    //                 continue;
    //             }
    
    //             // Check if user has main_wallet
    //             const mainWallet = userWallet.wallets.find(w => w.slug === "main_wallet");
    //             if (!mainWallet) {
    //                 console.log(`User ${uid} does not have a main wallet`);
    //                 continue;
    //             }
    
    //             const currentValue = Number(mainWallet.value || 0);
    //             const transactionAmount = Number(amount);
    
    //             if (isNaN(currentValue) || isNaN(transactionAmount)) {
    //                 console.log(`Invalid amount for User ${uid}: ${transactionAmount}`);
    //                 continue;
    //             }
    
    //             // Calculate new wallet value
    //             const newWalletValue = debit_credit === 'credit'
    //                 ? currentValue + transactionAmount
    //                 : currentValue - transactionAmount;
    
    //             // Update the wallet value
    //             await UserWallet.updateOne(
    //                 { uid, 'wallets.slug': 'main_wallet' },
    //                 { $set: { 'wallets.$.value': newWalletValue } }
    //             );
    
    //             // Mark transaction as released
    //             await Transaction.updateOne(
    //                 { tx_Id },
    //                 { $set: { release: 1, wallet_type: "main_wallet" } }
    //             );
    
    //             console.log(`Transaction ${tx_Id} released for User ${uid}`);
    //         }
    
    //         console.log("Automated Income Release Completed.");
    //     } catch (error) {
    //         console.error("Error in autoReleaseIncome:", error);
    //     }
    // }

    async autoReleaseIncome() {
        try {
            console.log("Automated Income Release Started: ", new Date());
    
            // Define income sources
            const incomeSources = ["roi_income", "roi_level_income", "reward_income","community_income"];
    
            // Fetch pending transactions
            const transactions = await Transaction.find({
                source: { $in: incomeSources },
                release: 0, // Not released yet
            });
    
            if (!transactions.length) {
                console.log("No pending transactions found for release.");
                return;
            }
            
            for (const trans of transactions) {
                const { uid, tx_Id, amount, debit_credit } = trans;
    
                console.log(`Processing Transaction ${tx_Id} for User ${uid}`);

                const userWallet = await UserWallet.findOne({ uid });
                if (!userWallet) {
                    console.log(`Wallet not found for User ${uid}`);
                    continue;
                }
    
                // Check if user has main_wallet
                const mainWallet = userWallet.wallets.find(w => w.slug === "main_wallet");
                if (!mainWallet) {
                    console.log(`User ${uid} does not have a main wallet`);
                    continue;
                }
    
                const currentValue = Number(mainWallet.value || 0);
                const transactionAmount = Number(amount);
    
                if (isNaN(currentValue) || isNaN(transactionAmount)) {
                    console.log(`Invalid amount for User ${uid}: ${transactionAmount}`);
                    continue;
                }
    
                // Calculate new wallet value
                const newWalletValue = debit_credit === 'credit'
                    ? currentValue + transactionAmount
                    : currentValue - transactionAmount;
    
                // Update the wallet value
                await UserWallet.updateOne(
                    { uid, 'wallets.slug': 'main_wallet' },
                    { $set: { 'wallets.$.value': newWalletValue } }
                );
    
                // Mark transaction as released
                await Transaction.updateOne(
                    { tx_Id },
                    { $set: { release: 1, wallet_type: "main_wallet" } }
                );
    
                console.log(`Transaction ${tx_Id} released for User ${uid}`);
            }
    
            console.log("Automated Income Release Completed.");
        } catch (error) {
            console.error("Error in autoReleaseIncome:", error);
        }
    }

    async reverseReleasedIncome() {
        try {
            console.log("Automated Income Reversal Started: ", new Date());
    
            // Define income sources
            const incomeSources = ["roi_income", "roi_level_income", "reward_income"];
    
            // Get today's date without time (for accurate filtering)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
    
            // Fetch released transactions for today
            const transactions = await Transaction.find({
                source: { $in: incomeSources },
                release: 1,
                time: { $gte: today } // Ensure the transaction happened today
            });
    
            console.log("ransactions.length",transactions.length)

            // return

            if (!transactions.length) {
                console.log("No released transactions found for reversal.");
                return;
            }
    
            for (const trans of transactions) {
                const { uid, tx_Id, amount, debit_credit } = trans;
    
                console.log(`Reversing Transaction ${tx_Id} for User ${uid}`);
    
                const userWallet = await UserWallet.findOne({ uid });
    
                if (!userWallet) {
                    console.log(`Wallet not found for User ${uid}`);
                    continue;
                }
    
                const mainWallet = userWallet.wallets.find(w => w.slug === "main_wallet");
                if (!mainWallet) {
                    console.log(`User ${uid} does not have a main wallet`);
                    continue;
                }
    
                const currentValue = Number(mainWallet.value || 0);
                const transactionAmount = Number(amount);
    
                if (isNaN(currentValue) || isNaN(transactionAmount)) {
                    console.log(`Invalid amount for User ${uid}: ${transactionAmount}`);
                    continue;
                }
    
                // Ensure enough balance before deducting
                if (debit_credit === 'credit' && currentValue < transactionAmount) {
                    console.log(`User ${uid} has insufficient balance (${currentValue}) for reversal.`);
                    continue;
                }
    
                // Reverse the wallet value
                const newWalletValue = debit_credit === 'credit'
                    ? currentValue - transactionAmount
                    : currentValue + transactionAmount;
    
                // Update wallet value only if the balance is sufficient
                await UserWallet.updateOne(
                    { uid, 'wallets.slug': 'main_wallet' },
                    { $set: { 'wallets.$.value': newWalletValue } }
                );
    
                // Mark transaction as not released
                await Transaction.updateOne(
                    { tx_Id },
                    { $set: { release: 0 } }
                );
    
                console.log(`Transaction ${tx_Id} reversed for User ${uid}`);
            }
    
            console.log("Automated Income Reversal Completed.");
        } catch (error) {
            console.error("Error in reverseReleasedIncome:", error);
        }
    }
    
    

}
const withdrawal = new WITHDRAWAL();
// withdrawal.autoReleaseIncome()
module.exports = withdrawal;