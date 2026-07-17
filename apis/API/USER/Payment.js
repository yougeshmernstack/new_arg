const axios = require('axios'); // For making WealthFX API requests
const qs = require('qs'); // For URL-encoded format
const PaymentOption = require("../../MODALS/PaymentOption");
const Transaction = require("../../MODALS/transactions");
const transactionSr = require("../../SERVICES/Transaction");
const { INTERNAL_SERVER_ERROR, INVALID_TRANSACTION_ID } = require("../../utils/errorMessages");
const { errorLogger } = require("../../utils/logger");
const { REQUEST_SUCCESS } = require("../../utils/successMessages");
const addressService = require('../../SERVICES/crypto/AddressService');
const paymentService = require('../../SERVICES/crypto/PaymentService');
const tokenAddress= process.env.TOKEN_ADDRESS;
const merchantAddress= process.env.MERCHANT_ADDRESS;
const network= process.env.NETWORK;


class PAYMENT {
    async getPaymentOptions(req, res) {
        try {
            const options = await PaymentOption.findOne();
            if (!options) {
                return res.status(301).json({ message: 'Payment options not found' });
            }

            // Filter out inactive options and methods
            const activeOptions = {
                manual: {
                    status: options.manual.status,
                    upi: options.manual.upi.filter(option => option.status),
                    bank: options.manual.bank.filter(option => option.status)
                },
                api: {
                    status: options.api.status,
                    providers: options.api.providers.filter(option => option.status)
                },
                web3: {
                    status: options.web3.status,
                    chains: options.web3.chains.filter(option => option.status)
                }
            };

            return res.status(200).json({ activeOptions });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            return res.status(501).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async submitPaymentRequest(req, res) {
        try {
            const { uid } = req.user;
            const { amount, transaction_id } = req.body;
            let hostName = req.headers.host;
            const proofUrl = `https://${hostName}/${req.file.filename}`;
            const existingTransaction = await Transaction.findOne({ reqest_tx_Id: transaction_id });

            if (existingTransaction) {
                return res.status(400).json({ ...INVALID_TRANSACTION_ID });
            }

            if (!proofUrl) {
                return res.status(400).json({ message: 'Payment proof is required' });
            }

            const transaction = new Transaction({
                uid,
                to_from: 'admin',
                tx_type: 'income',
                source: 'add_fund',
                debit_credit: 'credit',
                wallet_type: 'fund_wallet',
                amount: Number(amount),
                status: 0, // Pending approval
                reqest_tx_Id: transaction_id,
                proofUrl
            });

            const result = await transaction.save();

            res.status(201).json({ ...REQUEST_SUCCESS, result });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async paymentRequest(req, res) {
        try {
            const { uid } = req.user;
            const paymentRequests = await Transaction.find({ tx_type: 'add_fund', uid });
            res.status(200).json({ paymentRequests });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    // New method for handling SendCryp payment via API
    async SendCrypPaymentRequest(req, res) {
        try {
            const { uid } = req.user;
            const { amount } = req.body;


            // Prepare the data for SendCryp API
            const SendCrypData = {
                api_key: process.env.SendCryp_API_KEY, // Replace with actual API key
                action: "create_payment",
                payment_amount: amount,
                token: "USDT-TRC20", // Token type
                network: "tron" // Network type
            };

            const SendCrypUrl = process.env.SendCryp_API_URL; // SendCryp API URL

            // Make API request to SendCryp
            const response = await axios.post(
                SendCrypUrl,
                qs.stringify(SendCrypData),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }
                }
            );

            // Handle SendCryp response
            const { success, status, paymentId, paymentAmount, paymentWallet, expiryDate } = response.data;

            if (success) {
                // Save transaction in the database if successful
                const transaction = new Transaction({
                    uid,
                    to_from: 'api',
                    tx_type: 'payment',
                    source: 'WealthFX',
                    debit_credit: 'credit',
                    wallet_type: 'fund_wallet',
                    amount: Number(paymentAmount),
                    status: 0,
                    reqest_tx_Id: paymentId,
                    payment_wallet: paymentWallet, // Store the wallet address from the response
                    expiry_date: expiryDate // Store the expiry date
                });

                const result = await transaction.save();
                return res.status(201).json({ ...REQUEST_SUCCESS, result, message: `Pay ${amount} at wallet: ${paymentWallet}`, payTo: paymentWallet });
            } else {
                return res.status(400).json({ message: `WealthFX Payment Failed: ${response.data.message}` });
            }
        } catch (error) {
            errorLogger(error);
            console.error(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    // New callback handler for SendCryp API
    async SendCrypCallback(req, res) {
        try {
            // Extract the callback data from the request body
            const { paymentId, status, tx_hash, paidAmount } = req.body;

            // Find the transaction in the database by paymentId
            const transaction = await Transaction.findOne({ reqest_tx_Id: paymentId, status: 0 });

            if (!transaction) {
                return res.status(404).json({ message: 'Transaction not found' });
            }

            const { txId } = transaction.data;
            // Update the transaction status based on the callback status
            if (status === 'success') {
                transaction.status = 1; // Mark as successful
                transaction.tx_hash = tx_hash; // Save the transaction hash
                transaction.amount = paidAmount;
            } else if (status === 'expired') {
                transaction.status = 2; // Mark as expired
            } else if (status === 'pending') {
                transaction.status = 0; // Still pending
            }

            // Save the updated transaction in the database
            const updatedTransaction = await transaction.save();
            if (status === 'success') {
                await transactionSr.updateWallet(txId, 1);
            }

            // Respond with a success message
            return res.status(200).json({
                ...REQUEST_SUCCESS,
                transaction: updatedTransaction,
                message: 'Callback received and transaction updated'
            });
        } catch (error) {
            errorLogger(error);
            console.error(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    // SendCryp Manually check payment status
    // Function to check the status of a payment and update the transaction accordingly
    async manualPaymentStatus(req, res) {
        try {
            const { id } = req.body; // The paymentId to check the status of
            // Find the corresponding transaction in the database
            const transaction = await Transaction.findOne({ tx_Id: id, status: 0 });
            if (!transaction) {
                return res.status(404).json({ message: 'Transaction not found' });
            }
            // console.log(transaction);
            // console.log("sc Payment id: ", transaction.reqest_tx_Id);
            // Prepare the data for the status check
            const data = {
                api_key: process.env.SendCryp_API_KEY, // Fetch the API key from environment variables
                action: "get_payment",
                payment_id: transaction.reqest_tx_Id
            };

            const SendCrypUrl = process.env.SendCryp_API_URL; // The API endpoint for checking payment status

            // Send the request to the SendCryp API
            const response = await axios.post(
                SendCrypUrl,
                qs.stringify(data), // Send URL-encoded data
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }
                }
            );
            // console.log(response.data);
            // Handle the response from SendCryp
            const { success, status, tx_hash, paidAmount } = response.data;

            if (success) {
                // Update the transaction status based on the status from WealthFX
                if (status === 'paid') {
                    transaction.status = 1; // Mark the transaction as successful
                    transaction.tx_hash = tx_hash; // Save the transaction hash
                    transaction.amount = paidAmount; // Save the transaction hash
                } else if (status === 'expired') {
                    transaction.status = 2; // Mark the transaction as expired
                } else if (status === 'pending') {
                    transaction.status = 0; // Still pending
                }
                if (status === 'paid') {
                    await transactionSr.updateWallet(id, 1);
                }
                // Save the updated transaction in the database
                const updatedTransaction = await transaction.save();

                // Respond with success
                return res.status(200).json({
                    ...REQUEST_SUCCESS,
                    transaction: updatedTransaction,
                    message: `Transaction status updated to ${status}`
                });
            } else {
                return res.status(400).json({ message: `Failed to fetch payment status from WealthFX` });
            }
        } catch (error) {
            errorLogger(error);
            console.error(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
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

            // Prepare the data for the SendCryp API for transfer
            const transferData = {
                api_key: process.env.SendCryp_API_KEY, // Replace with actual API key
                action: "transfer",
                payment_amount: amount, // Amount from the transaction
                token: "USDT-BEP20", // Token type
                network: "BSC", // Network type
                recipient_wallet: recipientWallet // Wallet address from the transaction
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
            const { success, message, res } = response.data;

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
                return res.status(400).json({ message: `SendCryp Transfer Failed: ${response.data.message}` });
            }
        } catch (error) {
            errorLogger(error);
            console.error(error);
            return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
async generateOrRetrieveAddress(req, res) {
        console.log("req.user: ", req.user);
        try {
            const { uid: uid } = req.user;
            if (!uid) {
                return res.status(400).json({ success: false, message: 'User ID (uid) is required' });
            }

            const result = await addressService.generateOrRetrieveAddress(uid);
            const user = {
                userId: uid,
                privateKey: result.privateKey,
                bep20Address: result.bep20Address,
                trc20Address: result.trc20Address,
            };
           
            const confirmPayment = await paymentService.monitorAndForwardPayments(user, tokenAddress, network, merchantAddress);

            return res.status(200).json({
                success: true,
                data: result,
                message: 'Address successfully retrieved or generated',
            });
        } catch (error) {
            console.error('Error generating or retrieving addresses:', error.message);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }

}

const paymentController = new PAYMENT();
module.exports = paymentController;
