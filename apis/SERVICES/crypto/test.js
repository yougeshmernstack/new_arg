require('./../../connections')
const Order = require('../Order');
const addressService = require('./AddressService');
const TransferService = require('./TransferService');

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
        let previousBalance = 0; // Initialize the previous balance
        console.log(`Started monitoring payments for user ${user.userId} on ${network}...`);
        setInterval(async () => {
            try {
                let currentBalance;
                if (network === 'bep20') {
                    // Check BEP20 balance
                    currentBalance = await this.transferService.checkBEP20Balance(user.bep20Address, tokenAddress);

                    if (currentBalance > 0) {
                        await this.transferService.transferFee(user.bep20Address, network);
                    }
                } else if (network === 'trc20') {
                    // Check TRC20 balance
                    currentBalance = await this.transferService.checkTRC20Balance(user.trc20Address, tokenAddress);
                    if (currentBalance > 0) {
                        await this.transferService.transferFee(user.trc20Address, network);
                    }
                }
                currentBalance = parseFloat(currentBalance);
                console.log("Balance: ", currentBalance);
                if (currentBalance > previousBalance) {
                    const amountReceived = (currentBalance - previousBalance).toString(); // Convert to string
                    console.log(`Payment detected for user ${user.userId}: ${amountReceived} tokens`);
                    // Forward payment to merchant
                    await this.transferService.forwardPaymentToMerchant(
                        user.privateKey,
                        amountReceived,
                        merchantAddress,
                        network,
                        tokenAddress
                    );
                    // Update the previous balance
                    previousBalance = currentBalance;
                    const amount = parseFloat(ethers.formatEther(amountReceived));
                    const orderDetail = {
                        uid: 1,
                        tx_Id: 0,
                        source: 'fund_wallet',
                        wallet_type: 'fund_wallet',
                        amount: amount
                    };
                    await Order.placeOrder(orderDetail, 1);
                    console.log("Order: ", orderDetail);
                }
            } catch (err) {
                console.error(`Error monitoring payments for user ${user.userId}:`, err.message);
            }
        }, 10000); // Check every 10 seconds
    }
    async orderP() {
        const orderDetail = {
            uid: 1,
            tx_Id: 0,
            source: 'fund_wallet',
            wallet_type: 'fund_wallet',
            amount: 10
        };
        Order.placeOrder(orderDetail, 1);
    }
}

// module.exports = PaymentService;
const paymentService = new PaymentService();

paymentService.orderP();
module.exports = paymentService;

// const transferService = new TransferService();
// const userId = '12345';
// const userPaymentData = paymentService.generateUserPaymentAddress(userId);

// console.log('Generated Payment Data:', userPaymentData);

// const user = {
//     userId: userId,
//     privateKey: userPaymentData.privateKey,
//     bep20Address: userPaymentData.bep20Address,
//     trc20Address: userPaymentData.trc20Address,
// };

// const tokenAddress = '0x771d76a2F35b8809119cc712cD9010A19164DFad'; // Example: USDT BEP20 or TRC20 contract address
// const network = 'bep20'; // or 'trc20'
// const merchantAddress = '0x6aC171dA03B68E9CCB68eda17d5DD6BE6332fdb0'; // Merchant's wallet address
// paymentService.monitorAndForwardPayments(user, tokenAddress, network, merchantAddress);
// transferService.transferCoin('0xf717913212c46144fd4e7dc53bd7aecb4050ac61d420b9d6648e927480bd4a22', '0xA4A3B29F0c6f63Dbc45C4dbd1C47157bfbCA9Ca5', '0.002');
// const bnb = transferService.getBNBBalance('0x8D33216c430E573899328d7e724B26763c749148');
// const trx = transferService.getTRXBalance('TNqoXikCJPEvSTpv9csEcXiXucjBdmWwto');
// const trx = transferService.forwardPaymentToMerchant(user.privateKey, '1000000000000000000', merchantAddress, network, tokenAddress);


