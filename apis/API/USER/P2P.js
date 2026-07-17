const Activity = require("../../MODALS/Activity");
const UserData = require("../../MODALS/userData");
const Action = require("../../SERVICES/Activity");
const { INTERNAL_SERVER_ERROR } = require("../../utils/errorMessages");
const { errorLogger } = require("../../utils/logger");
const UserWallet = require('../../MODALS/userWallets');
const Transaction = require("../../MODALS/transactions");
const getNextTxId = require("../../MODALS/Counter");

class P2P{
    async fundTransfer(req,res,next){
        try {
            const {uid:from}=req.user;
            const {amount,username}=req.body;
            const user = await UserData.findOne({ username });
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }
    
            const to = user.uid;
            const activity = await Activity.findOne({ name: 'fund_transfer' });
           req.activity  = { amount, activity,Status:1,to_from:to,level:0 ,order_Id:0, breakFunction:false,uid:from };
            next();
        } catch (error) {
            errorLogger(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    async recieveFund(req,res,next){
     try {
           const {uid:from}=req.user;
           const {amount,username}=req.body;
           const user = await UserData.findOne({ username });
           if (!user) {
               return res.status(404).json({ message: 'User not found.' });
           }
   
           const to = user.uid;
           const activity = await Activity.findOne({ name: 'add_fund' });
          req.activity  = { amount, activity,Status:1,to_from:from,level:0 ,order_Id:0, breakFunction:true,uid:to };
           next()
     } catch (error) {
        errorLogger(error);
        return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
     }
    }
    async transferNonWorkingToFundWallet(req, res) {
        try {
            const { uid } = req.user;
            let { amount } = req.body;

            amount = parseFloat(amount);

            // Basic validation for amount
            if (amount <= 0) {
                return res.status(400).json({ message: 'Transfer amount must be positive.' });
            }

            const MIN_TRANSFER_LIMIT = 5;
            if (amount < MIN_TRANSFER_LIMIT) {
                return res.status(400).json({ message: `Transfer amount must be at least $${MIN_TRANSFER_LIMIT}.` });
            }

            const source_wallet_slug = 'main_wallet';
            const target_wallet_slug = 'fund_wallet';
            const note = `Funds transferred from ${source_wallet_slug} to ${target_wallet_slug}`;

            // --- Step 1: Fetch Activity for Transaction Logging ---
            const activity = await Activity.findOne({ name: 'fund_convert' });
            if (!activity) {
                return res.status(404).json({ message: 'Activity "fund_convert" not found. Please define it.' });
            }

            // --- Step 2: Fetch User Wallets and Validate ---
            const userWallet = await UserWallet.findOne({ uid });
            if (!userWallet) {
                return res.status(404).json({ message: 'User wallet not found.' });
            }

            const sourceWallet = userWallet.wallets.find(wallet => wallet.slug === source_wallet_slug);
            const targetWallet = userWallet.wallets.find(wallet => wallet.slug === target_wallet_slug);

            if (!sourceWallet) {
                return res.status(404).json({ message: `Source wallet (${source_wallet_slug}) not found for the user.` });
            }
            if (!targetWallet) {
                return res.status(404).json({ message: `Target wallet (${target_wallet_slug}) not found for the user.` });
            }

            if (sourceWallet.value < amount) {
                return res.status(400).json({ message: 'Insufficient funds in non-working wallet.' });
            }

            // --- Step 3: Get Transaction IDs ---
            const tx_count_fordebit = await getNextTxId('transactionId', 1);
            const tx_count_forcredit = await getNextTxId('transactionId', 1);

            // --- Step 4: Create Transaction Documents ---
            const sourceTransaction = new Transaction({
                tx_Id: tx_count_fordebit,
                // note: `Debit from ${source_wallet_slug}: ${note}`,
                tx_type: activity.name, // Use the specific activity name
                source: activity.name,
                wallet_type: source_wallet_slug,
                debit_credit: 'debit',
                amount: amount,
                status: 1, // Assuming 1 means successful/completed
                to_from: uid, // Initiator of the transaction
                uid: uid,     // User whose wallet is affected
                tx_charge: 0  // Assuming no charge for this internal transfer
            });

            const targetTransaction = new Transaction({
                tx_Id: tx_count_forcredit,
                // note: `Credit to ${target_wallet_slug}: ${note}`,
                tx_type: activity.name, // Use the specific activity name
                source: activity.name,
                wallet_type: target_wallet_slug,
                debit_credit: 'credit',
                amount: amount, // Assuming 1:1 transfer for this specific case
                status: 1,
                to_from: uid, // Initiator of the transaction
                uid: uid,     // User whose wallet is affected
                tx_charge: 0
            });

            // --- Step 5: Save Transactions and Update Wallets Atomically (using Promise.all) ---
            // This ensures that both transactions are saved and the wallet balances are updated
            // before the response is sent.
            await Promise.all([
                sourceTransaction.save(),
                targetTransaction.save()
            ]);

            // Update wallet balances in memory
            sourceWallet.value -= amount;
            targetWallet.value += amount;

            // Save the updated user wallet document
            await userWallet.save();

            // --- Step 6: Send Success Response ---
            return res.status(200).json({
                message: `Funds successfully transferred`,
                data: {
                    transactions: {
                        debit: sourceTransaction,
                        credit: targetTransaction
                    },
                    updatedWalletBalances: userWallet.wallets.map(w => ({ slug: w.slug, value: w.value }))
                }
            });

        } catch (error) {
            console.error("Error during non-working wallet to fund wallet transfer:", error);
            errorLogger(error);
            return res.status(500).json({
                message: 'An unexpected error occurred during fund transfer. Please try again later.',
                error: error.message
            });
        }
    }
    
}
module.exports = new P2P();