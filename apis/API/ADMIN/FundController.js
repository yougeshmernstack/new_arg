const Activity = require("../../MODALS/Activity");
const PlansInfo = require("../../MODALS/Plan");
const Transaction = require("../../MODALS/transactions");
const UserData = require("../../MODALS/userData");
const Action = require("../../SERVICES/Activity");
const transaction = require("../../SERVICES/Transaction");
const { INTERNAL_SERVER_ERROR, INVALID_REQUEST } = require("../../utils/errorMessages");
const { errorLogger } = require("../../utils/logger");
class FUNDS{
    async allPaymentRequest(req,res){
        try {
            // Fetch all payment requests from the database
            const paymentRequests = await Transaction.find({tx_type: 'add_fund'});
    
            // Send the payment requests as a response
            res.status(200).json({ paymentRequests });
        } catch (error) {
            errorLogger(error)
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    async approvePaymentRequests(req, res) {
        try {
            const { requestIds } = req.body;
    
            // console.log(req.body)
            // Validate request
            if (!Array.isArray(requestIds) || requestIds.length === 0) {
                return res.status(400).json({ ...INVALID_REQUEST});
            }
    
            // Update the status of the specified payment requests
            const transactions = await Transaction.find({tx_Id: { $in: requestIds } ,status:0});
            for (let index = 0; index < transactions.length; index++) {
                const {tx_Id} = transactions[index];
                await transaction.updateWallet(tx_Id,1);
            }
          
            // Send success response
            res.status(200).json({ message: 'Payment requests approved successfully.' });
        } catch (error) {
            errorLogger(error)
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    async rejectPaymentRequests(req, res) {
        try {
            const { requestIds } = req.body;
    
            // Validate request
            if (!Array.isArray(requestIds) || requestIds.length === 0) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Request IDs must be provided in an array.' });
            }
    
            // Update the status of the specified payment requests to 'rejected'
            await Transaction.updateMany(
                { tx_Id: { $in: requestIds },status:0 },
                { $set: { status: 2 } }
            );
    
            // Send success response
            res.status(200).json({ message: 'Payment requests rejected successfully.' });
        } catch (error) {
            errorLogger(error)
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    async generateFund(req,res){
        try {
            const { uid } = req.user;
            const { amount, username, wallet_name } = req.body;
            
            // Find the user by username
            const user = await UserData.findOne({ username });
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }
    
            const userId = user.uid;
    
            // Find the generate_fund activity
            const activity = await Activity.findOne({ name: 'generate_fund' });
            if (!activity) {
                return res.status(404).json({ message: 'Activity not found.' });
            }
    
            // Check if the wallet_name exists in the use_wallet array
            const walletExists = activity.use_wallet.some(wallet => wallet.wallet_name === wallet_name);
            if (!walletExists) {
                return res.status(400).json({ message: 'Wallet name does not exist in use_wallet.' });
            }
    
            // Set the wallet to 100%
            activity.use_wallet = [{
                wallet_name,
                percentage: 100
            }];
            req.activity = {amount,activity,breakFunction:true,Status:1,to_from:uid,uid:userId};
            await Action.act(req, res, () => {});
        } catch (error) {
            errorLogger(error);
        res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    async retrieveFund(req,res){
        try {
            const { uid } = req.user;
            const { amount, username, wallet_name } = req.body;
            
            // Find the user by username
            const user = await UserData.findOne({ username });
            console.log("users",user);
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }
    
            const userId = user.uid;
    
            // Find the generate_fund activity
            const activity = await Activity.findOne({ name: 'retrieve_fund' });
            if (!activity) {
                return res.status(404).json({ message: 'Activity not found.' });
            }
    
            // Check if the wallet_name exists in the use_wallet array
            const walletExists = activity.use_wallet.some(wallet => wallet.wallet_name === wallet_name);
            if (!walletExists) {
                return res.status(400).json({ message: 'Wallet name does not exist in use_wallet.' });
            }
    
            // Set the wallet to 100%
            activity.use_wallet = [{
                wallet_name,
                percentage: 100
            }];
            req.activity = {amount,activity,breakFunction:true,Status:1,to_from:uid,uid:userId};
            await Action.act(req, res, () => {});
        } catch (error) {
            errorLogger(error);
        res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    async retrieve_wallets(req,res){
        try{
            const activity = await Activity.findOne({ name: 'retrieve_fund' });
            // console.log("wallet",activity.use_wallet);
            if (!activity) {
                return res.status(404).json({ message: 'Activity not found.' });
            }
            res.status(200).json({data:activity.use_wallet});
        }catch{
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
const Funds = new FUNDS()
module.exports = Funds;