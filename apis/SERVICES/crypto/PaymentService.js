require('./../../connections')
require('dotenv').config();
const Order = require('../Order');
const addressService = require('./AddressService');
const TransferService = require('./TransferService');
const Orders = require('../../MODALS/Orders');
const transaction = require('../Transaction');
const UserWallet = require('../../MODALS/userWallets');
const LevelIncome = require('../LevelIncome');
const TeamService = require('../UpdateTeam');
const Action = require('../Activity');

class PaymentService {
    constructor() {
        this.transferService = new TransferService(); // For transferring funds
    }

    /**
     * Generate payment addresses for a user
     * @param {string} userId - Unique user identifier
     * @returns {object} Generated address data
     */
    async generateUserPaymentAddress(userId) {
        const addressData = addressService.generateAddressesAndPrivateKey();
        const userData = {
            userId,
            privateKey: addressData.privateKey,
            bep20Address: addressData.bep20Address,
            trc20Address: addressData.trc20Address,
        };

        console.log(`Generated payment addresses for user ${userId}:`, userData);
        return userData;
    }

    /**
     * Monitor user address for payments and forward funds to the merchant
     * @param {object} user - User data (private key and addresses)
     * @param {string} tokenAddress - Token contract address (e.g., USDT)
     * @param {string} network - Blockchain network ('bep20' or 'trc20')
     * @param {string} merchantAddress - Merchant's wallet address
     * @returns {void}
     */
    async monitorAndForwardPayments(user, tokenAddress, network, merchantAddress) {
        console.log("user",user);
        console.log("tokenAddress",tokenAddress);
        console.log("network",network);
        console.log("merchantAddress",merchantAddress);
        let previousBalance = BigInt(0); // Store as BigInt
        console.log(`Started monitoring payments for user ${user.userId} on ${network}...`);
        const uid = user.userId;
        let tryCount = 0;
        const maxTries = 30;

        const intervalId = setInterval(async () => {
            try {
                tryCount++;
                if (tryCount > maxTries) {
                    console.log(`Stopping monitoring for user ${user.userId} after ${maxTries} tries.`);
                    clearInterval(intervalId);
                    return;
                }
                console.log("111111111", user.bep20Address);
                console.log("2222222", tokenAddress);
                let currentBalance;
                if (network === 'bep20') {
                    currentBalance = await this.transferService.checkBEP20Balance(user.bep20Address, tokenAddress);
                    console.log("BEP20 Balance:", currentBalance);
                } else if (network === 'trc20') {
                    currentBalance = await this.transferService.checkTRC20Balance(user.trc20Address, tokenAddress);
                }

                if (!currentBalance) {
                    console.log(`Could not retrieve balance for user ${user.userId}`);
                    return;
                }

                currentBalance = BigInt(currentBalance); // Ensure it's always a BigInt
                console.log("Balance:", currentBalance.toString());
                console.log("previousBalance:", previousBalance.toString());

                if (currentBalance > previousBalance) {
                    const amountReceived = currentBalance - previousBalance;
                    console.log(`Payment detected for user ${user.userId}: ${amountReceived.toString()} tokens`);

                    // Transfer fee before processing the order
                    await this.transferService.transferFee(
                        network === 'bep20' ? user.bep20Address : user.trc20Address,
                        network
                    );
                    // console.log("1111111",user.privateKey);
                    // console.log("2222",amountReceived);
                    // console.log("333333",merchantAddress);
                    // console.log("44444",network);
                    // console.log("5555",tokenAddress);

                    // Forward payment to merchant
                    let receipt = await this.transferService.forwardPaymentToMerchant(
                        user.privateKey,
                        amountReceived,
                        merchantAddress,
                        network,
                        tokenAddress
                    );

                    console.log("Receipt:", receipt);

                    // Convert amountReceived to decimal format
                    const amount = Number(amountReceived) / 1e18;

                    // const orderDetail = {
                    //     uid: user.userId,
                    //     tx_Id: 0,
                    //     source: 'fund_wallet',
                    //     wallet_type: 'fund_wallet',
                    //     amount: amount
                    // };

                    const activity = { amount: amount, activity_name: "generate_fund", Status: 1, to_from: uid, uid };
                    await Action.actInternally(uid, activity);

                }


            } catch (err) {
                console.error(`Error monitoring payments for user ${user.userId}:`, err.message);
                clearInterval(intervalId); // Stop if a critical error occurs
            }
        }, 10000);
    }
}

const paymentService = new PaymentService();
module.exports = paymentService;