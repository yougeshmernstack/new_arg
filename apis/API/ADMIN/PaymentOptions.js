const Activity = require("../../MODALS/Activity");
const PaymentOption = require("../../MODALS/PaymentOption");
const Transaction = require("../../MODALS/transactions");
const UserData = require("../../MODALS/userData");
const Action = require("../../SERVICES/Activity");
const transaction = require("../../SERVICES/Transaction");
const { INTERNAL_SERVER_ERROR, INVALID_REQUEST } = require("../../utils/errorMessages");
const { errorLogger } = require("../../utils/logger");

class PAYMENT {
    async seedPaymentOptions(req, res) {
        try {
            const paymentOptions = new PaymentOption();

            // Save all payment options
            const result = await paymentOptions.save();

            res.status(200).json({ result });
            console.log('Payment options seeded');
        } catch (error) {
            errorLogger(error)
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    };

    async addBankDetail(req, res) {
        try {
            const { bankName, accountNumber, ifsc, holder, ac_type, branch } = req.body;
    
            if (!bankName || !accountNumber || !ifsc) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Missing required bank details.' });
            }
    
            let paymentOptions = await PaymentOption.findOne();
            
            if (!paymentOptions) {
                paymentOptions = new PaymentOption();
            }
    
            paymentOptions.manual.bank.push({
                bankName,
                accountNumber,
                ifsc,
                holder,
                ac_type,
                branch,
                status: 1 // Default to active
            });
    
            await paymentOptions.save();
    
            res.status(200).json({ message: 'Bank detail added successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    

    async deleteBankDetail(req, res) {
        try {
            const { accountNumber } = req.body;

            if (!accountNumber) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Account number is required.' });
            }

            const paymentOptions = await PaymentOption.findOne();
            if (!paymentOptions) {
                return res.status(404).json({ message: 'Payment options not found.' });
            }

            paymentOptions.manual.bank = paymentOptions.manual.bank.filter(bank => bank.accountNumber !== accountNumber);

            await paymentOptions.save();

            res.status(200).json({ message: 'Bank detail deleted successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async setDefaultBankDetail(req, res) {
        try {
            const { accountNumber } = req.body;

            if (!accountNumber) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Account number is required.' });
            }

            const paymentOptions = await PaymentOption.findOne();
            if (!paymentOptions) {
                return res.status(404).json({ message: 'Payment options not found.' });
            }

            paymentOptions.manual.bank.forEach(bank => {
                bank.status = bank.accountNumber === accountNumber ? 1 : 0;
            });

            await paymentOptions.save();

            res.status(200).json({ message: 'Default bank detail set successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async addUPIDetail(req, res) {
        try {
            const { name, upiId } = req.body;

            if (!name || !upiId) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Missing required UPI details.' });
            }

            let paymentOptions = await PaymentOption.findOne();
            
            if (!paymentOptions) {
                paymentOptions = new PaymentOption();
            }

            paymentOptions.manual.upi.push({
                name,
                upiId,
                status: 1 // Default to active
            });

            await paymentOptions.save();

            res.status(200).json({ message: 'UPI detail added successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async deleteUPIDetail(req, res) {
        try {
            const { upiId } = req.body;

            if (!upiId) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'UPI ID is required.' });
            }

            const paymentOptions = await PaymentOption.findOne();
            if (!paymentOptions) {
                return res.status(404).json({ message: 'Payment options not found.' });
            }

            paymentOptions.manual.upi = paymentOptions.manual.upi.filter(upi => upi.upiId !== upiId);

            await paymentOptions.save();

            res.status(200).json({ message: 'UPI detail deleted successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async setDefaultUPIDetail(req, res) {
        try {
            const { upiId } = req.body;

            if (!upiId) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'UPI ID is required.' });
            }

            const paymentOptions = await PaymentOption.findOne();
            if (!paymentOptions) {
                return res.status(404).json({ message: 'Payment options not found.' });
            }

            paymentOptions.manual.upi.forEach(upi => {
                upi.status = upi.upiId === upiId ? 1 : 0;
            });

            await paymentOptions.save();

            res.status(200).json({ message: 'Default UPI detail set successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async addWeb3Detail(req, res) {
        try {
            const { chain, address } = req.body;

            if (!chain || !address) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Missing required Web3 details.' });
            }

            let paymentOptions = await PaymentOption.findOne();
            
            if (!paymentOptions) {
                paymentOptions = new PaymentOption();
            }

            paymentOptions.web3.chains.push({
                chain,
                address,
                status: 1 // Default to active
            });

            await paymentOptions.save();

            res.status(200).json({ message: 'Web3 detail added successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async deleteWeb3Detail(req, res) {
        try {
            const { address } = req.body;

            if (!address) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Address is required.' });
            }

            const paymentOptions = await PaymentOption.findOne();
            if (!paymentOptions) {
                return res.status(404).json({ message: 'Payment options not found.' });
            }

            paymentOptions.web3.chains = paymentOptions.web3.chains.filter(chain => chain.address !== address);

            await paymentOptions.save();

            res.status(200).json({ message: 'Web3 detail deleted successfully.' });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async setDefaultWeb3Detail(req, res) {
        try {
            const { address } = req.body;

            if (!address) {
                return res.status(400).json({ ...INVALID_REQUEST, message: 'Address is required.' });
            }

            const paymentOptions = await PaymentOption.findOne();
            if (!paymentOptions) {
                return res.status(404).json({ message: 'Payment options not found.' });
            }

            paymentOptions.web3.chains.forEach(chain => {
                chain.status = chain.address === address ? 1 : 0;
            });

            await paymentOptions.save();

            res.status(200).json({ message: 'Default Web3 detail set successfully.' });
        } catch (error) {
            errorLogger(error);
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

}

const PaymentAction = new PAYMENT();
module.exports = PaymentAction;
