const Activity = require("../MODALS/Activity");
const Transaction = require("../MODALS/transactions");
const UserData = require("../MODALS/userData");
const UserWallet = require("../MODALS/userWallets");
const { errorLogger } = require("../utils/logger");
const transaction = require("./Transaction");
const { v4: uuidv4 } = require('uuid'); 
class GAME {
    async play_game(req, res) {
        console.log("ACTION", req.body)
        const newTransactionId = uuidv4();
        // const client = req.client;
        try {
            // client.send(JSON.stringify({balance:100}));
            const action = req.body.action === 'bet' ? 'bet' : req.body.action === 'win' ? 'win' : req.body.action === 'balance' ? 'bet' : req.body.action === 'refund' ? 'bet' : 'bet';
            const { use_wallet, status, debit_credit,name:activityName } = await Activity.findOne({ name: action });
            const walletNames = use_wallet.map(wallet => wallet.wallet_name);
            const { player_id, amount:amt, type, currency, transaction_id, bet_transaction_id, rollback_transactions } = req.body;
            const { uid } = await UserData.findOne({ username: player_id });
            const userWallets = await UserWallet.aggregate([
                { $match: { uid } }, // Match documents with the specified uid
                { $unwind: '$wallets' }, // Deconstruct the wallets array
                { $match: { 'wallets.slug': { $in: walletNames } } }, // Match wallets with the specified slugs
                { $group: { _id: '$_id', wallets: { $push: '$wallets' } } } // Group the matching wallets back into an array
            ]);
            const { wallets } = userWallets[0];
            const fullBalance = wallets.reduce((total, wallet) => {
                const walletInfo = use_wallet.find(w => w.wallet_name === wallet.slug);
                if (walletInfo) {
                    const allowedAmount = wallet.value * (walletInfo.percentage / 100);
                    return total + allowedAmount;
                }
                return total;
            }, 0);
            const overallTransaction = await Transaction.findOne({ uid, status: 1 }).sort({ tx_Id: -1 });
            console.log('overall_close',overallTransaction.overall_close,overallTransaction.tx_Id)
            const overall_close = overallTransaction?.overall_close || 0;
            const balance = parseFloat(overall_close);
            const amount = parseFloat(amt);
            // console.log("balance",balance);
            const hasEnoughFunds = use_wallet.every(wallet => {
                const requiredAmount = amount * (wallet.percentage / 100);
                const correspondingWallet = wallets.find(w => w.slug === wallet.wallet_name);
                return correspondingWallet && correspondingWallet.value >= requiredAmount;
            });

            switch (req.body.action) {
                case 'balance':
                    try {
                        console.log(uid, req.body.action, balance)
                        if (uid) {
                            // client.send(JSON.stringify({balance}));
                            res.status(200).json({
                                balance: balance
                            });
                        } else {
                            console.log(req.body.action, "user not found")
                            res.status(200).json({
                                error_code: "INTERNAL_ERROR",
                                error_description: "something went wrong"
                            })
                        }
                        break;
                    } catch (error) {
            errorLogger(error)
                        console.log("balance error", error)
                        res.status(200).json({
                            error_code: "INTERNAL_ERROR",
                            error_description: "something went wrong"
                        });
                        break;
                    }

                case 'bet':
                    console.log('balance before bet',amount,balance)
                    if (parseFloat(amount) > parseFloat(balance)) {
                        console.log('balance if amount greter then balance',amount,balance)
                        res.status(200).json({
                            "error_code": "INSUFFICIENT_FUNDS",
                            "error_description": "Not enough money to continue playing"
                        });
                        break;
                    }
                    try {
                        const trans = await Transaction.findOne({ bet_tx_Id: transaction_id, status: 1, tx_type: type });
                        if(amount<=0){
                            res.status(200).json({
                                balance: (Number(balance)),
                                transaction_id:newTransactionId
                            });
                            break;
                        }
                       if (!trans) {
                         const transactionData = use_wallet.map(wallet => ({
                             uid,
                             to_from: 'gamepitara',
                             tx_type: type,
                             debit_credit,
                             wallet_type: wallet.wallet_name,
                             amount: amount * (wallet.percentage / 100),
                             source:activityName,
                             currency,
                             Status:1,
                             bet_tx_Id: transaction_id
                         }));
                         const saved = await transaction.insert(transactionData);
                         console.log('savedtransaction bet',saved[0]._id.toString(),saved[0].status,saved[0].tx_Id)
                         if (!saved && status == 0) {
                             res.status(200).json({
                                 "error_code": "INTERNAL_ERROR",
                                 "error_description": "something went wrong"
                             });
                             break;
                         }
                        //  client.send(JSON.stringify({balance:(Number(balance) - Number(amount))}));
                         console.log("after bet", saved[0].overall_close)
                         res.status(200).json({
                             balance:saved[0].overall_close,
                             transaction_id:saved[0]._id.toString()
                         });
                         break;
                       } else {
                        console.log("after bet not debit", (Number(balance)))
                        // client.send(JSON.stringify({balance}));
                        res.status(200).json({
                            balance: (Number(balance)),
                            transaction_id:trans._id.toString()
                        });
                        break;
                       }
                    } catch (error) {
            errorLogger(error)
                        res.status(200).json({
                            "error_code": "INTERNAL_ERROR",
                            "error_description": "something went wrong"
                        });
                        break;
                    }

                case 'win':
                    if(amount<=0){
                        res.status(200).json({
                            balance: (Number(balance)),
                            transaction_id:newTransactionId
                        });
                        break;
                    }
                    if (amount >= 0) {
                        try {
                            const trans = await Transaction.findOne({ bet_tx_Id: transaction_id, status: 1, tx_type: type })
                            if (!trans && amount>0) {
                                const transactionData = use_wallet.map(wallet => ({
                                    uid,
                                    to_from: "gamepitara",
                                    tx_type: type,
                                    debit_credit,
                                    wallet_type: wallet.wallet_name,
                                    amount: amount * (wallet.percentage / 100),
                                    source:activityName,
                                    currency,
                                    Status:1,
                                    bet_tx_Id: transaction_id
                                }));
                                const saved = await transaction.insert(transactionData);
                                if (!saved && status == 0) {
                                    res.status(200).json({
                                        "error_code": "INTERNAL_ERROR",
                                        "error_description": "something went wrong"
                                    });
                                    break;
                                }
                                console.log('after win', saved[0].overall_close,saved[0].status,saved[0].tx_Id)
                                console.log('savedtransaction win',saved[0]._id.toString())
                                // client.send(JSON.stringify({balance:(Number(balance) + Number(amount))}));
                                res.status(200).json({
                                    balance:saved[0].overall_close,
                                    transaction_id: saved[0]._id.toString()
                                });
                            } else {
                                console.log('after win not credit', (Number(balance)))
                                // client.send(JSON.stringify({balance}));
                                res.status(200).json({
                                    balance: (Number(balance)),
                                    transaction_id: trans._id.toString()
                                });
                            }
                            break;
                        } catch (error) {
            errorLogger(error)
                            res.status(200).json({
                                "error_code": "INTERNAL_ERROR",
                                "error_description": "something went wrong"
                            });
                            break;
                        }
                    }
                  
                    break;

                case 'refund':
                    try {
                        let debit_credit = "credit";
                        const trans = await Transaction.findOne({ bet_tx_Id: bet_transaction_id,status:{$ne:2} ,tx_type:{$ne:'win'} });
                        const duplicate = await Transaction.findOne({ bet_tx_Id: bet_transaction_id,status:2 });
                        if(duplicate){
                            res.status(200).json({
                                balance: (Number(balance)),
                                transaction_id:duplicate._id.toString()
                            });
                            break;
                        }

                        if (!trans) {
                            // client.send(JSON.stringify({balance}));
                            res.status(200).json({
                                balance: Number(balance),
                                transaction_id: bet_transaction_id
                            });
                            break;
                        }
                       
                        const updates = await transaction.update({ bet_tx_Id: bet_transaction_id }, { status: 0, debit_credit });
                        if (updates) {
                            const overallTransaction = await Transaction.findOne({ uid, status: 1 }).sort({ tx_Id: -1 });
                            const overall_close = overallTransaction?.overall_close || 0;
                            const balance = parseFloat(overall_close);
                            const amt = debit_credit == 'debit' ? (Number(balance) - Number(amount)) : (Number(balance) + Number(amount))
                            console.log('after refund',debit_credit,updates[0].overall_close)
                            // client.send(JSON.stringify({balance:amt}));
                            res.status(200).json({
                                balance: balance,
                                transaction_id: newTransactionId
                            });
                            break;
                        }
                        res.status(200).json({
                            "error_code": "INTERNAL_ERROR",
                            "error_description": "something went wrong"
                        });
                        break;
                    } catch (error) {
            errorLogger(error)
                        res.status(200).json({
                            "error_code": "INTERNAL_ERROR",
                            "error_description": "something went wrong"
                        });
                        break;
                    }

                case 'rollback':
                    try {
                        // Fetch the transactions to be rolled back
                        console.log('balance before rallback',balance,rollback_transactions)
                        const rollbackTxIds = rollback_transactions.map(tx => tx.transaction_id);
                        const transactionsToRollback = await Transaction.find({ bet_tx_Id: { $in: rollbackTxIds },status:1 });
                        // If transactions exist, cancel them and update balances
                        if (transactionsToRollback && transactionsToRollback.length > 0) {
                            let totalRollbackAmount = 0;
                            for (const tx of transactionsToRollback) {
                                if (tx.debit_credit === 'debit') {
                                    totalRollbackAmount += tx.amount;
                                } else if (tx.debit_credit === 'credit') {
                                    totalRollbackAmount -= tx.amount;
                                }
                                const updates = await transaction.update({ bet_tx_Id: tx.bet_tx_Id }, { status: 0, debit_credit: tx.debit_credit==='debit'?"credit":'debit'});
                            }

                            // Update user's balance
                            const newBalance = parseFloat(balance) + parseFloat(totalRollbackAmount);
                            console.log('balance after rollback',newBalance)
                            const overallTransaction = await Transaction.findOne({ uid, status: 1 }).sort({ tx_Id: -1 });
                            const overall_close = overallTransaction?.overall_close || 0;
                            const lastBalance = parseFloat(overall_close);
                            // client.send(JSON.stringify({balance:newBalance}));
                            res.status(200).json({
                                balance: lastBalance,
                                transaction_id: transaction_id,
                                rollback_transactions: rollbackTxIds
                            });
                        } else {
                            // If no matching transactions, just respond with success
                            // client.send(JSON.stringify({balance}));
                            res.status(200).json({
                                balance: balance,
                                transaction_id: transaction_id,
                                rollback_transactions: rollbackTxIds
                            });
                        }
                        break;
                    } catch (error) {
            errorLogger(error)
                        console.log('rollback errr',error)
                        res.status(200).json({
                            "error_code": "INTERNAL_ERROR",
                            "error_description": "something went wrong"
                        });
                        break;
                    }

                default:
                    res.status(200).json({
                        error_code: 'INVALID_ACTION',
                        error_description: 'Invalid action'
                    });
                    break;
            }
        } catch (error) {
            errorLogger(error)
            console.log(error);
            res.status(200).json({
                error_code: 'INTERNAL_ERROR',
                error_description: 'something went wrong'
            });
        }
    }
    async play_game1(req, res) {
        try {
            const { action, amount, transaction_id, rollback_transactions } = req.body;
            const balance = 1000; // Static balance
            const staticTransactionId = "static_tx_id"; // Static transaction ID

            switch (action) {
                case 'balance':
                    return res.status(200).json({ balance });

                case 'bet':
                    if (amount > balance) {
                        return res.status(200).json({
                            "error_code": "INSUFFICIENT_FUNDS",
                            "error_description": "Not enough money to continue playing"
                        });
                    }
                    return res.status(200).json({
                        balance: balance - amount,
                        transaction_id: staticTransactionId
                    });

                case 'win':
                    if (amount >= 0) {
                        return res.status(200).json({
                            balance: balance + amount,
                            transaction_id: staticTransactionId
                        });
                    }
                    return res.status(200).json({
                        balance: balance + amount,
                        transaction_id
                    });

                case 'refund':
                    return res.status(200).json({
                        balance: balance + amount,
                        transaction_id: staticTransactionId
                    });

                case 'rollback':
                    const rollbackTransactionIds = rollback_transactions.map(tx => tx.transaction_id);
                    return res.status(200).json({
                        balance: balance,
                        transaction_id: staticTransactionId,
                        rollback_transactions: rollbackTransactionIds
                    });

                default:
                    return res.status(200).json({
                        error_code: 'INVALID_ACTION',
                        error_description: 'Invalid action'
                    });
            }
        } catch (error) {
            errorLogger(error)
            console.error(error);
            return res.status(500).json({
                error_code: 'INTERNAL_ERROR',
                error_description: 'Something went wrong'
            });
        }
    }
}

const runGame = new GAME();
module.exports = runGame;
