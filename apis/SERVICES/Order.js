const { Web3 } = require('web3');
const mongoose = require('mongoose');
const UserWallet = require('../MODALS/userWallets');
const UserData = require('../MODALS/userData');
const { errorLogger } = require('../utils/logger');
const { INTERNAL_SERVER_ERROR, INSUFFICIENT_PAYMENT, INVALID_REQUEST, INVALID_BLOCK } = require('../utils/errorMessages');
const Orders = require('../MODALS/Orders');
const Action = require('./Activity');
const { contractAbi, contractAddress } = require('../Contract');
const { REQUEST_SUCCESS } = require('../utils/successMessages');
const LevelIncome = require('./LevelIncome');
const Team = require('./UpdateTeam');
const PlansInfo = require('../MODALS/Plan');
const Transaction = require('../MODALS/transactions');
const CompanyInfo = require('../MODALS/CompanyInfo');
const axios = require('axios');
const Activity = require('../MODALS/Activity');
const getNextTxId = require('../MODALS/Counter');
const transaction = require('./Transaction');

const web3 = new Web3(
    // new Web3.providers.HttpProvider(`https://white-solemn-brook.bsc.quiknode.pro/eed031db7e16e738b9f4dff190bc3d910f564cbc`)

    new Web3.providers.HttpProvider(`https://tame-damp-grass.bsc-testnet.quiknode.pro/4a656c9f6e6f9dcebc0e97ec6fa454c8792bf8b6`)
);
const contract = new web3.eth.Contract(
    contractAbi,
    contractAddress
);

class ORDER {
    constructor() {
        this.confirmOrder = this.confirmOrder.bind(this); // Ensure `this` is bound correctly
    }
    async saveOrder(req, res) {
        try {
            const { savedtransaction, plan } = req;
            const { amount } = req.body;
            const totalAmount = savedtransaction.reduce((acc, tx) => acc + tx.amount, 0);
            if (amount > totalAmount) {
                return res.status(400).json({ ...INSUFFICIENT_PAYMENT });
            }
            const { to_from: uid, tx_Id, source, wallet_type } = savedtransaction[0];

            // Create a new order
            const myOrder = await Orders.findOne({ uid, status: 1 })
            let type = myOrder ? 'Re-purchase' : 'Purchase';

            // Calculate initial cycle duration (10 days for first cycle)
            const currentDate = new Date();
            const cycleDuration = 10;
            const nextDistributionDate = new Date(currentDate.getTime() + cycleDuration * 24 * 60 * 60 * 1000);

            const newOrder = new Orders({
                uid,
                tx_Id,
                source: wallet_type,
                amount,
                status: 1,
                type,
                package: (req.selectedPackage && req.selectedPackage.name) || undefined,
                planId: req.selectedPackage.packageId,
                order_bv: amount,
                // Initialize ROI cycle information
                currentCycle: 1,
                cycleClaimStatus: 1,
                cycleCompleted: false,
                pendingIncome: 0,
                cycleDuration: cycleDuration,
                pendingDays: 0,
                totalEarned: 0,
                nextDistributionDate: nextDistributionDate
            });

            // Save the order to the database
            const odr = await newOrder.save();
            await Team.updateBusiness(uid, amount, type)

            // Get user's sponsor to check for 2 referrals completion
            const user = await UserData.findOne({ uid });
            if (user && user.sponsor_Id) {
                // Check if this completion gives sponsor 2 referrals, then distribute level income
                await LevelIncome.distributeLevelIncomeOnReferralCompletion(
                    user.sponsor_Id,
                    uid,
                    plan.planId,
                    amount,
                    odr.order_Id
                );
            }

            // Keep bonus income distribution as is
            //await LevelIncome.distributebonusIncome(newOrder.uid, plan.planId, amount, odr.order_Id)
            res.status(200).json({
                message: 'Order saved successfully',
                order: {
                    order_Id: odr.order_Id,
                    currentCycle: odr.currentCycle,
                    cycleDuration: odr.cycleDuration,
                    nextDistributionDate: odr.nextDistributionDate
                }
            });
        } catch (error) {
            errorLogger(error);
            await Action.rejectActivity(req.savedtransaction);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    // async placeOrder(req, res, next) {
    //     try {
    //         const { orderDetail, plan } = req;
    //         const { amount,token_address,token_symbol } = req.body;
    //         // console.log(req.body);
    //         const { uid, tx_Id, source, wallet_type, amount: totalAmount } = orderDetail;
    //         if (amount > totalAmount) {
    //             return res.status(400).json({ ...INSUFFICIENT_PAYMENT });
    //         }
    //         const myOrder = await Orders.findOne({ uid, status: 1 })
    //         let type = myOrder ? 'Re-purchase' : 'Purchase';
    //         // Create a new order
    //         const newOrder = new Orders({
    //             uid,
    //             tx_Id,
    //             source,
    //             amount,
    //             status: 0,
    //             type,
    //             package: plan.package.name,
    //             planId: plan.planId,
    //             token_address,
    //             token_symbol
    //         });

    //         // Save the order to the database
    //         const odr = await newOrder.save();
    //         res.status(200).json({ ...REQUEST_SUCCESS, orderDetail: odr });
    //     } catch (error) {
    //         errorLogger(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }


    // async confirmOrder(req, res) {
    //     try {
    //         const { blockNumber } = req.body;

    //         const filter = {
    //             address: contractAddress,
    //             fromBlock: blockNumber,
    //             toBlock: blockNumber,
    //         };
    //         const events = await contract.getPastEvents('allEvents', filter);
    //         if (events.length > 0) {
    //             const event = events[0];
    //             const { orderId: eventOrderId, user, amount } = event.returnValues;
    //             const  hash  = event.transactionHash;
    //             console.log(hash)
    //             console.log(event.transactionHash)

    //             // Verify order details and update status
    //             // console.log(Number(eventOrderId), user, amount)
    //             const order = await Orders.findOne({ order_Id: Number(eventOrderId) });
    //             // console.log(order);
    //             if (!order) {
    //                 return res.status(400).json({ ...INVALID_REQUEST })
    //             }
    //             if (order.status == 1) {
    //                 return res.status(400).json({ ...INVALID_REQUEST })
    //             }
    //             if (order.amount > (Number(amount) / 1e18)) {
    //                 return res.status(400).json({ ...INSUFFICIENT_PAYMENT })
    //             }
    //             const update = await Orders.findOneAndUpdate({ order_Id: order.order_Id }, {
    //                 $set: {
    //                     status: 1,
    //                     tx_Id: Number(blockNumber),
    //                     transactionHash:String(hash)
    //                 }
    //             }, { new: true })
    //             await Team.updateBusiness(order.uid, order.amount, order.type)
    //             await LevelIncome.distributeLevelIncome(order.uid, order.planId, order.amount, order.order_Id)
    //             return res.status(200).json({ ...REQUEST_SUCCESS })
    //         } else {
    //             res.status(400).json({ ...INVALID_BLOCK });
    //         }
    //     } catch (error) {
    //         errorLogger(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }





    // new one
    async placeOrder(req, res, next) {
        try {
            const { orderDetail, plan } = req;
            const { amount } = req.body;
            // console.log(req.body);
            const { uid, tx_Id, source, wallet_type, amount: totalAmount } = orderDetail;
            if (amount > totalAmount) {
                return res.status(400).json({ ...INSUFFICIENT_PAYMENT });
            }
            const myOrder = await Orders.findOne({ uid, status: 1 })
            let type = myOrder ? 'Re-purchase' : 'Purchase';
            // Create a new order
            const newOrder = new Orders({
                uid,
                tx_Id,
                source,
                amount,
                order_bv: amount,
                status: 0,
                type,
                package: (req.selectedPackage && req.selectedPackage.name) || undefined,
                planId: plan.planId
            });

            // Save the order to the database
            const odr = await newOrder.save();
            res.status(200).json({ ...REQUEST_SUCCESS, orderDetail: odr });
        } catch (error) {
            errorLogger(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }


    // async confirmOrder(req, res) {
    //     try {
    //         const { blockNumber } = req.body;

    //         const filter = {
    //             address: contractAddress,
    //             fromBlock: blockNumber,
    //             toBlock: blockNumber,
    //         };
    //         const events = await contract.getPastEvents('allEvents', filter);
    //         if (events.length > 0) {
    //             const event = events[0];
    //             const { orderId: eventOrderId, user, amount } = event.returnValues;
    //             const hash = event.transactionHash;

    //             const order = await Orders.findOne({ order_Id: Number(eventOrderId) });
    //             if (!order) {
    //                 return res.status(400).json({ ...INVALID_REQUEST })
    //             }
    //             if (order.status == 1) {
    //                 return res.status(400).json({ ...INVALID_REQUEST })
    //             }
    //             if (order.amount > (Number(amount) / 1e18)) {
    //                 return res.status(400).json({ ...INSUFFICIENT_PAYMENT })
    //             }

    //             // Calculate bonus amount first
    //             // const bonusAmount = await this.bonusIncome(order.amount, order.uid, order.order_Id);

    //             // Update order with both status and bonus amount
    //             const update = await Orders.findOneAndUpdate(
    //                 { order_Id: order.order_Id },
    //                 {
    //                     $set: {
    //                         status: 1,
    //                         tx_Id: Number(blockNumber),
    //                         transactionHash: String(hash)
    //                     },
    //                     // $inc: {
    //                     //     amount: bonusAmount || 0
    //                     // }
    //                 },
    //                 { new: true }
    //             );

    //             // Use updated values for business and level income
    //             await Team.updateBusiness(update.uid, update.amount,update.type);
    //             await LevelIncome.distributeLevelIncome(update.uid, update.planId, update.amount, update.order_Id);

    //             return res.status(200).json({ ...REQUEST_SUCCESS });
    //         } else {
    //             res.status(400).json({ ...INVALID_BLOCK });
    //         }
    //     } catch (error) {
    //         errorLogger(error);
    //         res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    //     }
    // }

    async confirmOrder(req, res) {
        try {
            const { blockNumber } = req.body;

            const filter = {
                address: contractAddress,
                fromBlock: blockNumber,
                toBlock: blockNumber,
            };
            const events = await contract.getPastEvents('allEvents', filter);
            if (events.length > 0) {
                const event = events[0];
                const { orderId: eventOrderId, user, amount } = event.returnValues;
                const hash = event.transactionHash;
                console.log(hash)
                console.log(event.transactionHash)

                // Verify order details and update status
                // console.log(Number(eventOrderId), user, amount)
                const order = await Orders.findOne({ order_Id: Number(eventOrderId) });
                // console.log(order);
                if (!order) {
                    return res.status(400).json({ ...INVALID_REQUEST })
                }
                if (order.status == 1) {
                    return res.status(400).json({ ...INVALID_REQUEST })
                }
                if (order.amount > (Number(amount) / 1e18)) {
                    return res.status(400).json({ ...INSUFFICIENT_PAYMENT })
                }
                const update = await Orders.findOneAndUpdate({ order_Id: order.order_Id }, {
                    $set: {
                        status: 1,
                        tx_Id: Number(blockNumber),
                        transactionHash: String(hash)
                    }
                }, { new: true })
                await Team.updateBusiness(order.uid, order.amount, order.type)
                await LevelIncome.distributeLevelIncome(order.uid, order.planId, order.amount, order.order_Id)
                return res.status(200).json({ ...REQUEST_SUCCESS })
            } else {
                res.status(400).json({ ...INVALID_BLOCK });
            }
        } catch (error) {
            errorLogger(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }

    async getOrders(req, res) {
        try {
            const { uid, role } = req.user; // Assuming user information is attached to req.user
            const { page = 1, limit = 10, search, startDate, endDate, ...filters } = req.query;

            const query = {};

            // Restrict to user's own orders if not admin

            // Apply additional filters
            for (const key in filters) {
                if (!isNaN(filters[key])) {
                    query[key] = parseInt(filters[key]);
                } else if (filters[key]) {
                    query[key] = new RegExp(filters[key], 'i'); // Handle other filters
                }
            }
            query.status = { $in: [1, 2, 3] };
            if (role !== 'admin') {
                query.uid = uid;
            }

            // Date range filtering
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) {
                    query.createdAt.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
                }
                if (endDate) {
                    query.createdAt.$lt = new Date(new Date(endDate).setHours(23, 59, 59, 999));
                }
            }

            // If search term is provided, find matching users
            if (search) {
                const userSearchRegex = new RegExp(search, 'i');
                const matchingUsers = await UserData.find({
                    $or: [
                        { username: userSearchRegex },
                        { name: userSearchRegex }
                    ]
                }, 'uid');
                const matchingUserIds = matchingUsers.map(user => user.uid);

                if (role === 'admin' || role == "manager") {
                    // For admin, filter by matching user IDs
                    query.uid = { $in: matchingUserIds };
                } else {
                    // For regular users, ensure search only includes their own orders
                    query.uid = {
                        $in: matchingUserIds,
                        $eq: uid
                    };
                }
            }

            // Find orders
            const orders = await Orders.find(query)
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            const totalCount = await Orders.countDocuments(query);

            // Calculate sum of debit and credit orders
            const Sum = await Orders.aggregate([
                { $match: { ...query, status: 1 } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);


            // console.log(orders)
            let orderData = orders;

            // If role is admin, include username and name

            const userIds = orders.map(tx => tx.uid);
            const users = await UserData.find({ uid: { $in: userIds } }, 'uid username name Activation_date joining_date ');

            const [planIds, odrIds] = orders.reduce((acc, tx) => {
                acc[0].push(tx.planId);
                acc[1].push(tx.order_Id);
                return acc;
            }, [[], []]);
            const plans = await PlansInfo.find({ planId: { $in: planIds } });

            const trans = await Transaction.aggregate([
                { $match: { order_Id: { $in: odrIds }, uid: { $in: userIds } } },
                { $sort: { order_Id: -1, tx_Id: -1 } },
                { $group: { _id: "$order_Id", latestTransaction: { $first: "$$ROOT" } } },
                { $replaceRoot: { newRoot: "$latestTransaction" } }
            ]);


            const orderIncomeMap = trans.reduce((acc, transaction) => {
                acc[transaction.order_Id] = transaction.close_ord;
                return acc;
            }, {});

            const userMap = users.reduce((acc, user) => {
                acc[user.uid] = user;
                return acc;
            }, {});

            // Map planId -> packages array for lookup by order.package
            const planPackagesMap = plans.reduce((acc, plan) => {
                acc[plan.planId] = Array.isArray(plan.packages) ? plan.packages : [];
                return acc;
            }, {});
            // Optional: Build packageId -> { name, total_capping } map if packageId exists on packages
            const packageMapById = plans.reduce((acc, plan) => {
                const pkgs = Array.isArray(plan.packages) ? plan.packages : [];
                for (const pkg of pkgs) {
                    if (pkg && pkg.packageId !== undefined && pkg.packageId !== null) {
                        acc[pkg.packageId] = { name: pkg.name, total_capping: pkg.total_capping };
                    }
                }
                return acc;
            }, {});
            // console.log("userMap", userMap)


            orderData = orders.map(tx => {
                // Calculate distribution date based on activation date
                // const activationDate = userMap[tx.uid]?.Activation_date ? new Date(userMap[tx.uid].Activation_date) : null;
                // let distribution_date = null;

                // if (activationDate) {
                //     const today = new Date();
                //     today.setHours(0, 0, 0, 0); // Reset time part for accurate date comparison

                //     // Calculate days since activation
                //     const daysSinceActivation = Math.floor((today - activationDate) / (1000 * 60 * 60 * 24));

                //     if (daysSinceActivation < 7) {
                //         // If less than 7 days since activation, set to activation date + 7 days
                //         distribution_date = new Date(activationDate);
                //         distribution_date.setDate(activationDate.getDate() + 7);
                //     } else {
                //         // Calculate the next 7-day interval from activation date
                //         const weeksPassed = Math.floor(daysSinceActivation / 7);
                //         distribution_date = new Date(activationDate);
                //         distribution_date.setDate(activationDate.getDate() + ((weeksPassed + 1) * 7));
                //     }

                //     // Set time to midnight (00:00:00.000)
                //     distribution_date.setHours(0, 0, 0, 0);
                // }

                const now = new Date();
                const result = new Date(now);

                // Get current day of the week (0 = Sunday, 5 = Friday)
                const currentDay = now.getDay();
                const daysUntilFriday = (5 - currentDay + 7) % 7 || 7; // ensure it's never 0

                // Set date to next Friday
                result.setDate(now.getDate() + daysUntilFriday);

                // Set time to 5:30 AM
                result.setHours(0, 0, 0, 0);

                const distribution_date = result;
                // console.log(distribution_date);

                return {
                    ...tx.toObject(),
                    username: userMap[tx.uid]?.username,
                    name: userMap[tx.uid]?.name,
                    activation_date: userMap[tx.uid]?.Activation_date,
                    joining_date: userMap[tx.uid]?.joining_date,
                    distribution_date,
                    // Prefer mapping by packageId if tx.planId actually stores packageId, else fall back to name under planId
                    package_type: (packageMapById[tx.planId]?.name) || tx.package,
                    capping: (() => {
                        if (packageMapById[tx.planId]) return packageMapById[tx.planId].total_capping || 0;
                        return (planPackagesMap[tx.planId]?.find(p => p.name === tx.package)?.total_capping) || 0;
                    })(),
                    earned_income: orderIncomeMap[tx.order_Id] || 0,
                    pending_income: (() => {
                        const cap = packageMapById[tx.planId]?.total_capping ?? (planPackagesMap[tx.planId]?.find(p => p.name === tx.package)?.total_capping || 0);
                        return tx.amount * cap / 100 - (orderIncomeMap[tx.order_Id] || 0);
                    })(),
                    total_income: (() => {
                        const cap = packageMapById[tx.planId]?.total_capping ?? (planPackagesMap[tx.planId]?.find(p => p.name === tx.package)?.total_capping || 0);
                        return tx.amount * cap / 100;
                    })()
                };
            });

            res.status(200).json({
                success: true,
                data: orderData,
                totalRecords: totalCount,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / limit),
                Sum: Sum[0]?.total || 0,
                ...filters
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }


    async getBusinessData(req, res) {
        const { uid } = req.user
        const { startDate, endDate, maxLevels } = req.query;

        try {
            // Validate required UID field
            if (!uid) {
                return res.status(400).json({ error: 'UID is required.' });
            }

            // Default values for optional fields
            const start = startDate ? new Date(startDate) : new Date('1970-01-01'); // Default to a very early date
            const end = endDate ? new Date(endDate) : new Date(); // Default to current date
            const levels = maxLevels || 100; // Default to 10 levels if not provided

            // Calculate first level business using maxLevels = 1
            const direct_business = await Team.calculateTeamBusiness(start, end, uid, 1);

            // Calculate overall business with the provided maxLevels or default to 10
            const total_business = await Team.calculateTeamBusiness(start, end, uid, levels);

            res.json({
                direct_business,
                total_business
            });
        } catch (error) {
            errorLogger(error);
            res.status(500).json({ error: 'Internal server error.' });
        }
    };

    async coinDistribution(amount, uid, order_Id) {
        try {
            const { token_income } = await PlansInfo.findOne();
            let inc = 0;
            if (token_income.income_type === "fix") {
                inc = token_income.income;
            } else if (token_income.income_type === "percentage") {
                inc = amount * token_income.income / 100;
            }
            let activity = { amount: inc, activity_name: 'brocco_coin_wallet', Status: 1, to_from: uid, order_Id };
            await Action.actInternally(uid, activity);
        } catch (error) {
            errorLogger(error);
        }
    }

    async updateCoinPrice(req, res) {
        try {
            const { coin_buy_price } = req.body;

            if (!coin_buy_price) {
                return res.status(400).json({ error: 'coin_price is required' });
            }

            const updatedCompanyInfo = await CompanyInfo.findOneAndUpdate(
                {}, // Assuming there is only one document in the collection
                { $set: { 'coin_buy_price': coin_buy_price, updated_at: new Date() } },
                { new: true } // Return the updated document
            );

            if (!updatedCompanyInfo) {
                return res.status(404).json({ error: 'Company information not found' });
            }

            res.status(200).json({ message: 'Coin price updated successfully', companyInfo: updatedCompanyInfo });
        } catch (error) {
            res.status(500).json({ error: 'Error updating coin price' });
        }
    }

    async updateprincipalWithdrawalStatus(req, res) {
        try {
            const { status } = req.body;

            if (status === undefined || status === null) {
                return res.status(400).json({ error: 'Status is required.' });
            }

            const principalWithdrawalStatus = Number(status);
            if (principalWithdrawalStatus !== 0 && principalWithdrawalStatus !== 1) {
                return res.status(400).json({ error: 'Status must be 0 or 1.' });
            }

            const updatedCompanyInfo = await CompanyInfo.findOneAndUpdate(
                {},
                {
                    $set: {
                        'principal_withdrawal_status': principalWithdrawalStatus,
                        updated_at: new Date()
                    }
                },
                { new: true }
            );

            if (!updatedCompanyInfo) {
                return res.status(404).json({ error: 'Company information not found.' });
            }

            res.status(200).json({
                message: 'principal withdrawal status updated successfully!',
                companyInfo: updatedCompanyInfo
            });

        } catch (error) {
            console.error("Error updating principal withdrawal status:", error);
            res.status(500).json({ error: 'Error updating principal withdrawal status.' });
        }
    }

    async placeAddFund(req, res, next) {
        try {
            const { uid } = req.user;
            const { amount } = req.body;

            if (amount < 0) {
                return res.status(400).json({ ...INVALID_AMOUNT });
            }
            // const tx_count = await getNextTxId('transactionId', 1)
            const newFund = new Transaction({
                uid,
                // tx_Id: tx_count + 1,
                to_from: uid,
                tx_type: "add_fund_request",
                debit_credit: "credit",
                wallet_type: "fund_wallet",
                amount: amount,
                source: "add_fund",
                Status: 0,
            });

            // Save the order to the database
            const odr = await newFund.save();
            res.status(200).json({ ...REQUEST_SUCCESS, orderDetail: odr });
        } catch (error) {
            errorLogger(error);
            res.status(500).json({ ...INTERNAL_SERVER_ERROR });
        }
    }
    async confirmAddFund(req, res) {
        try {
            const { uid } = req.user;
            const { blockNumber, tx_id } = req.body;

            if (!blockNumber) {
                // console.log("Block number is missing in request");
                return res.status(400).json({ message: "Block number is required" });
            }


            // console.log("Received block number:", blockNumber);

            // Retrieve events from the block
            const filter = {
                address: contractAddress,
                fromBlock: blockNumber,
                toBlock: blockNumber,
            };

            const events = await contract.getPastEvents('allEvents', filter);
            // console.log("Events fetched from block:", events);

            if (events.length === 0) {
                // console.log("No events found in the specified block.");
                return res.status(400).json({ message: "No events found for the given block number" });
            }

            const event = events[0];
            console.log("srguyb", event);
            const { transactionHash, blockNumber: user_block, blockHash, event: user_type, signature } = event;
            const trans_data = {
                transactionHash,
                user_block,
                blockHash,
                user_type,
                signature
            }


            const { orderId: eventOrderId, user, amount } = event.returnValues;
            // console.log("Event details:", { eventOrderId, user, amount });

            const paid_amount = Number(amount) / 1e18;

            // Update order status
            const update = await Transaction.findOneAndUpdate(
                { tx_Id: tx_id },
                {
                    $set: {
                        status: 1,
                        tx_hash: transactionHash,
                        // block_number: blockNumber,
                    },
                },
                { new: true }
            );

            if (!update) {
                // console.log("Failed to update order with order_Id:", update.tx_Id);
                return res.status(500).json({ message: "Failed to update order" });
            }

            // console.log("Order update successful:", update);

            const userWallets = await UserWallet.aggregate([{ $match: { uid } }]);
            if (userWallets.length === 0) {
                console.log("No user wallets found");
                return;
            }

            const { wallets } = userWallets[0];
            // console.log("user_wallet", wallets);

            let fullBalance = 0;

            // Update the wallets array
            const updatedWallets = wallets.map(wallet => {
                if (wallet.slug === 'fund_wallet') {
                    fullBalance += wallet.value;
                    // Example: Deduct or update pending amount
                    wallet.value = (paid_amount || 0) + fullBalance; // Adding 100 as an example
                }
                return wallet;
            });

            // Log the updated wallets for debugging
            // console.log("Updated wallets:", updatedWallets);

            // Update the user wallet record in the database
            await UserWallet.updateOne(
                { uid },
                { $set: { wallets: updatedWallets } }
            );

            // console.log(`Updated pending amount. Full balance: ${fullBalance}`);


            // await transaction.generateFund(uid,paid_amount);

            return res.status(200).json({ message: "Order confirmed successfully" });

        } catch (error) {
            console.error("Error in confirmOrder function:", error);
            errorLogger(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    async test() {
        return 0;
        const order_details = await Orders.find({ order_Id: { $gte: 59 } });
        // const order_details = await Orders.find({ order_Id: 63 });
        for (let odr of order_details) {
            const user = await UserData.findOne({ uid: odr.uid });
            await LevelIncome.distributeLevelIncomeOnReferralCompletion(
                user.sponsor_Id,
                odr.uid,
                odr.planId,
                odr.amount,
                odr.order_Id
            );
        }
    }

}

const Order = new ORDER();
// Order.test();

// LevelIncome.distributebonusIncome(3, 1, 25, 2)
module.exports = Order;
