const connection = require("../connections");
const UserData = require("../MODALS/userData");
const UserWallet = require("../MODALS/userWallets");
const form_validator = require("../utils/form-validators");
const Team = require("./UpdateTeam");
const Orders = require("../MODALS/Orders"); // MongoDB Order model
const { errorLogger } = require('../utils/logger');
const PlansInfo = require("../MODALS/Plan");
const transaction = require("./Transaction");
const Transaction = require("../MODALS/transactions");

async function transferOrders() {
    try {
        // Fetch all orders from MySQL
        connection.query('SELECT * FROM orders', async (err, orders) => {
            if (err) {
                console.error('Error fetching orders:', err);
                return;
            }

            for (const order of orders) {
                try {
                    // Find username in MySQL users table by u_code
                    const [userResult] = await new Promise((resolve, reject) => {
                        connection.query('SELECT username FROM users WHERE id = ?', [order.u_code], (err, result) => {
                            if (err) return reject(err);
                            resolve(result);
                        });
                    });

                    if (userResult) {
                        const username = userResult.username;

                        // Resolve plan and package for this order amount against new schema
                        const allPlans = await PlansInfo.find({});
                        let resolvedPlanId = 1;
                        let resolvedPackageName = undefined;
                        for (const pl of allPlans) {
                            const pkgs = Array.isArray(pl.packages) ? pl.packages : [];
                            const match = pkgs.find(p => order.order_amount >= p.min_amount && order.order_amount <= p.max_amount);
                            if (match) {
                                resolvedPlanId = pl.planId;
                                resolvedPackageName = match.name;
                                break;
                            }
                        }
                        // Find the user in MongoDB by username
                        const userData = await UserData.findOne({ username: username });
                        if (userData) {
                            const newOrder = new Orders({
                                uid: userData.uid,
                                tx_Id: order.tx_user_id,
                                source: order.order_address, // assuming this is the source
                                type: order.tx_type === 'Purchase' ? 'Purchase' : 'Re-purchase',
                                amount: order.order_amount,
                                status: order.status,
                                order_bv: order.order_amount,
                                planId: resolvedPlanId, // plan matched by package range
                                package: resolvedPackageName
                            });

                            const odr = await newOrder.save();
                            await Team.updateBusiness(odr.uid, odr.order_bv, odr.type)
                            console.log(`Order ${order.id} transferred successfully.`);
                        } else {
                            console.warn(`User with username ${username} not found in MongoDB.`);
                        }
                    } else {
                        console.warn(`User with u_code ${order.u_code} not found in MySQL users table.`);
                    }
                } catch (saveError) {
                    errorLogger(saveError);
                    console.error(`Error processing order ${order.id}:`, saveError);
                }
            }
        });
    } catch (error) {
        console.error('Error transferring orders:', error);
    }
}

// Example usage
// transferOrders();

async function transferData() {
    try {
        // Query to fetch all users
        connection.query('SELECT * FROM users', async (err, rows) => {
            if (err) {
                console.error('Error fetching users:', err);
                return;
            }

            // Count existing users in MongoDB
            let totalUsers = await UserData.countDocuments();
            const password = await form_validator.hashPassword('Test@123');

            // Iterate through each user and transfer their data to MongoDB
            for (const user of rows) {
                totalUsers++;
                const newUser = new UserData({
                    name: user.name,
                    email: user.email,
                    mobile: user.mobile,
                    password: password,  // Assuming passwords are already hashed
                    roles: ['user'],
                    uid: totalUsers,
                    username: user.username,
                    pancard: user.pan_no,
                    sponsor_Id: user.u_sponsor < user.id ? user.u_sponsor : 1,
                    joining_date: new Date(user.added_on),
                    kycStatus: {
                        bank: 0,  // Defaulting KYC status to 0 (pending)
                        pan: 0,
                        birthProof: 0
                    },
                    disabled_activities: []  // Assuming no disabled activities initially
                });

                try {
                    await newUser.save();
                    const wallet = new UserWallet({ uid: newUser.uid });
                    await wallet.save();
                    await Team.updateTeam(newUser.uid);
                    console.log(`User ${user.id} transferred successfully.`);
                } catch (saveError) {
                    console.error(`Error saving user ${user.id} to MongoDB:`, saveError);
                }
            }
        });
    } catch (error) {
        console.error('Error transferring data:', error);
    }
}

// Example usage
// transferData();
async function transferTransactions() {
    try {
        connection.query('SELECT * FROM transaction', async (err, rows) => {
            if (err) {
                console.error('Error fetching transaction:', err);
                return;
            }
            for (const trans of rows) {
                const {u_code,tx_u_code,tx_type,debit_credit,source,wallet_type,amount,remark,tx_record,status} = trans
                const [userResult] = await new Promise((resolve, reject) => {
                    connection.query('SELECT username FROM users WHERE id = ?', [u_code], (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    });
                });
               if (userResult) {
                const userData = await UserData.findOne({ username: userResult.username });
                if (userData) {
                    const transactionData = [{
                        uid:userData.uid,
                        to_from:tx_u_code?tx_u_code:1,
                        level:source=='level'?tx_record:source=='direct'?1:null,
                        tx_type: tx_type=='admin_credit'?'income':tx_type=='topup'?'expense':tx_type=='fund_request'?'add_fund':tx_type,
                        debit_credit,
                        wallet_type:wallet_type=='passive_wallet'?'roi_income':wallet_type=='level_wallet'?'roi_level_income':wallet_type,
                        amount: amount,
                        source: source=='direct'?'direct_income':source=='passive'?'roi_income':source=='level'?'roi_level_income':source=='reward'?'reward':source==null?tx_type:source,
                        Status:status,
                        order_Id:source=='passive_wallet'?tx_record:null
                    }];
                    await transaction.insert(transactionData);
                    console.log(`transaction ${trans.id} transferred successfully.`)
                } else {
                    console.warn(`User with username ${userResult.username} not found in MongoDB.`);
                }
               } else {
                console.warn(`User with u_code ${trans.u_code} not found in MySQL users table.`);
               }
            }
        })
    } catch (error) {
        console.log(error)
    }
}
// transferTransactions()
async function subtractBusinessAndIncome() {
    try {
            const allOrders = await Orders.find({order_Id:{$in:[1022,1023]}});
        for (const odr of allOrders) {
            const { uid, amount, type, planId, order_Id, order_bv } = odr;
            const { level_income, packages } = await PlansInfo.findOne({ planId });

            // Subtract business
            const businessDelta = amount - order_bv;
            console.log(`Subtracting business for UID: ${uid}, Amount: ${businessDelta}, Type: ${type}`);
            await Team.subtractBusiness(uid, businessDelta, type);

            // Process transactions related to the order
            const allTrans = await Transaction.find({ order_Id, status: 1,source:'level_income' });

            for (const trans of allTrans) {
                const { uid: t_uid, amount: t_amount, level, source, wallet_type: slug } = trans;

                // Calculate the income to be subtracted
                const incomeToSubtract = (order_bv * level_income.level[level-1].income / 100);

                if (incomeToSubtract > 0) {
                    // Update the transaction amount
                    trans.amount -= incomeToSubtract;

                    // Log the updated transaction amount
                    console.log(`Updated Transaction Amount for UID: ${t_uid}, Order ID: ${order_Id}, New Amount: ${trans.amount}`);

                    // Update the user's wallet
                    const userWallet = await UserWallet.findOne({ uid: t_uid, 'wallets.slug': slug }, { 'wallets.$': 1 });
                    if (userWallet) {
                        let newValue = Number(userWallet.wallets[0].value) - incomeToSubtract;

                        if (newValue < 0) {
                            throw new Error(`Insufficient funds in wallet: ${slug}`);
                        }

                        // Log the wallet update
                        console.log(`Updating Wallet for UID: ${t_uid}, Wallet Slug: ${slug}, New Value: ${newValue}`);

                        await UserWallet.findOneAndUpdate(
                            { uid: t_uid, 'wallets.slug': slug },
                            { $set: { 'wallets.$.value': newValue } },
                            { new: true }
                        );
                    }

                    // Update the source wallet if applicable
                    if (source) {
                        const sourceWallets = await UserWallet.findOne({ uid: t_uid, 'wallets.slug': source }, { 'wallets.$': 1 });
                        if (sourceWallets) {
                            let newValueSrc = Number(sourceWallets.wallets[0].value) - incomeToSubtract;

                            if (newValueSrc < 0) {
                                throw new Error(`Insufficient funds in source wallet: ${source}`);
                            }

                            // Log the source wallet update
                            console.log(`Updating Source Wallet for UID: ${t_uid}, Wallet Slug: ${source}, New Value: ${newValueSrc}`);

                            await UserWallet.findOneAndUpdate(
                                { uid: t_uid, 'wallets.slug': source },
                                { $set: { 'wallets.$.value': newValueSrc } },
                                { new: true }
                            );
                        }
                    }

                    // Save the updated transaction
                    await trans.save();
                }
            }
        }
    } catch (error) {
        // Log the error
        errorLogger(error);
    }
}

async function subtractIncome_for_inactive_users() {
    try {
        // Get all inactive users
        let inactiveUsers = await UserData.find({ status: 0 }, { uid: 1 })
            .then(users => users.map(user => user.uid));
        
        if (!inactiveUsers.length) {
            console.log('No inactive users found');
            return { success: true, updatedCount: 0 };
        }
        
        // Find all transactions for inactive users
        let allTrans = await Transaction.find({ 
            uid: { $in: inactiveUsers },
            source: { $in: ['roi_level_income'] }
        });
        
        console.log(`Found ${allTrans.length} transactions to update for inactive users`);
        
        let updatedCount = 0;
        
        // Update transactions and wallets
        for (const trans of allTrans) {
            const { uid: t_uid, amount: t_amount, source, tx_Id, wallet_type: slug } = trans;

            if (t_amount > 0) {
                // Set transaction amount to zero
                trans.amount = 0;
                console.log(`Setting Transaction Amount to 0 for UID: ${t_uid}, txid: ${tx_Id}`);

                // Update the wallet that received the income
                if (slug) {
                    const userWallet = await UserWallet.findOne({ uid: t_uid, 'wallets.slug': slug }, { 'wallets.$': 1 });
                    if (userWallet) {
                        let newValue = Number(userWallet.wallets[0].value) - t_amount;

                        if (newValue < 0) {
                            console.log(`Insufficient funds in wallet: ${slug}, setting to 0`);
                            newValue = 0;
                        }

                        console.log(`Updating Wallet for UID: ${t_uid}, Wallet Slug: ${slug}, New Value: ${newValue}`);

                        await UserWallet.findOneAndUpdate(
                            { uid: t_uid, 'wallets.slug': slug },
                            { $set: { 'wallets.$.value': newValue } },
                            { new: true }
                        );
                    }
                }

                // Update source wallet
                if (source) {
                    const sourceWallets = await UserWallet.findOne({ uid: t_uid, 'wallets.slug': source }, { 'wallets.$': 1 });
                    if (sourceWallets) {
                        let newValueSrc = Number(sourceWallets.wallets[0].value) - t_amount;
                        
                        if (newValueSrc < 0) {
                            console.log(`Warning: Source wallet ${source} for UID: ${t_uid} would go negative, setting to 0`);
                            newValueSrc = 0;
                        }
                        
                        console.log(`Updating Source Wallet for UID: ${t_uid}, Wallet Slug: ${source}, New Value: ${newValueSrc}`);
                        
                        await UserWallet.findOneAndUpdate(
                            { uid: t_uid, 'wallets.slug': source },
                            { $set: { 'wallets.$.value': newValueSrc } },
                            { new: true }
                        );
                    }
                }

                // Save the updated transaction
                await trans.save();
                updatedCount++;
            }
        }
        
        return { success: true, updatedCount };
    } catch (error) {
        errorLogger(error);
        return { success: false, error: error.message };
    }
}


async function subtractIncome() {
    try {
       
            const allTrans = await Transaction.find({ 
                // status: 1, 
                //  uid: { $in: [38,95 ,104 ,212,336 ,378 ,394 ,577] },
                time:{$gte:new Date('2026-03-30T10:18:29.549+00:00')},
                //  uid: { $in: [38] },
                //  source: {$in:['matching_income', 'roi_level_income','community_income','reward_income','team_royalty_income','leadership_income','salary_income']}
                   
            });
            
console.log(allTrans.length)
return
            for (const trans of allTrans) {
                const { uid: t_uid, amount: t_amount, level, source, wallet_type: slug,tx_Id } = trans;

                // Calculate the income to be subtracted
                const incomeToSubtract = t_amount;

                    // Update the transaction amount
                    trans.amount -= incomeToSubtract;

                    // Log the updated transaction amount
                    console.log(`Updated Transaction Amount for UID: ${t_uid}txid ${tx_Id}, New Amount: ${trans.amount}`);

                    // Update the user's wallet
                    const userWallet = await UserWallet.findOne({ uid: t_uid, 'wallets.slug': slug }, { 'wallets.$': 1 });
                    if (userWallet) {
                        let newValue = Number(userWallet.wallets[0].value) - incomeToSubtract;

                        // if (newValue < 0) {
                        //     console.log(`Insufficient funds in wallet: ${slug}`);
                        //     continue;
                        // }

                        // Log the wallet update
                        console.log(`Updating Wallet for UID: ${t_uid}, Wallet Slug: ${slug}, New Value: ${newValue}`);

                        await UserWallet.findOneAndUpdate(
                            { uid: t_uid, 'wallets.slug': slug },
                            { $set: { 'wallets.$.value': newValue } },
                            { new: true }
                        );
                    }

                    // Update the source wallet if applicable
                    if (source) {
                        const sourceWallets = await UserWallet.findOne({ uid: t_uid, 'wallets.slug': source }, { 'wallets.$': 1 });
                        if (sourceWallets) {
                            let newValueSrc = Number(sourceWallets.wallets[0].value) - incomeToSubtract;

                            // if (newValueSrc < 0) {
                            //     console.log(`Insufficient funds in source wallet: ${source}`);
                            //     continue;
                            // }

                            // Log the source wallet update
                            console.log(`Updating Source Wallet for UID: ${t_uid}, Wallet Slug: ${source}, New Value: ${newValueSrc}`);

                            await UserWallet.findOneAndUpdate(
                                { uid: t_uid, 'wallets.slug': source },
                                { $set: { 'wallets.$.value': newValueSrc } },
                                { new: true }
                            );
                        }
                    }

                    // Save the updated transaction
                    await trans.save();
                
            }
    } catch (error) {
        // Log the error
        errorLogger(error);
    }
}

async function processUserIncomeSubtraction(uid, amountToSubtract) {
    try {
      console.log(`Processing UID: ${uid} with amount: ${amountToSubtract}`);
      let remainingAmountToSubtract = amountToSubtract;
      
      // Get transactions for this specific user
      const allTrans = await Transaction.find({ 
        status: 1, 
        uid: uid, 
        source: { $in: [
          'roi_income', 
          'roi_level_income', 
          'community_income', 
          'reward_income', 
          'team_royalty_income', 
          'leadership_income', 
          'salary_income'
        ]}
      }).sort({ _id: -1 });
      
      console.log(`Found ${allTrans.length} transactions for UID: ${uid}`);
      
      for (const trans of allTrans) {
        if (remainingAmountToSubtract <= 0) break;
        
        const { uid: t_uid, level, source, wallet_type: slug, tx_Id, amount } = trans;
        
        // Skip if transaction amount is not enough
        if (amount <= 0) {
          console.log(`Skipping Transaction ${tx_Id}: Zero or negative amount`);
          continue;
        }
        
        // Determine amount to subtract from this transaction
        const amountToSubtractFromTrans = Math.min(amount, remainingAmountToSubtract);
        
        // Subtract from transaction
        trans.amount -= amountToSubtractFromTrans;
        remainingAmountToSubtract -= amountToSubtractFromTrans;
        
        console.log(`Updated Transaction for UID: ${t_uid}, TxID: ${tx_Id}, Subtracted: ${amountToSubtractFromTrans}, New Amount: ${trans.amount}`);
        
        // Update primary wallet
        const userWallet = await UserWallet.findOne({ uid: t_uid, 'wallets.slug': slug }, { 'wallets.$': 1 });
        if (userWallet) {
          let newValue = Number(userWallet.wallets[0].value) - amountToSubtractFromTrans;
          console.log(`Updating Wallet for UID: ${t_uid}, Slug: ${slug}, New Value: ${newValue}`);
          await UserWallet.findOneAndUpdate(
            { uid: t_uid, 'wallets.slug': slug },
            { $set: { 'wallets.$.value': newValue } },
            { new: true }
          );
        }
        
        // Optionally update source wallet if it's different from slug
        if (source && source !== slug) {
          const sourceWallets = await UserWallet.findOne({ uid: t_uid, 'wallets.slug': source }, { 'wallets.$': 1 });
          if (sourceWallets) {
            let newValueSrc = Number(sourceWallets.wallets[0].value) - amountToSubtractFromTrans;
            console.log(`Updating Source Wallet for UID: ${t_uid}, Slug: ${source}, New Value: ${newValueSrc}`);
            await UserWallet.findOneAndUpdate(
              { uid: t_uid, 'wallets.slug': source },
              { $set: { 'wallets.$.value': newValueSrc } },
              { new: true }
            );
          }
        }
        
        // Save updated transaction
        await trans.save();
      }
      
      if (remainingAmountToSubtract > 0) {
        console.log(`Warning: Could not subtract full amount for UID: ${uid}. Remaining: ${remainingAmountToSubtract}`);
        return { success: false, remainingAmount: remainingAmountToSubtract };
      } else {
        console.log(`Successfully subtracted full amount of ${amountToSubtract} for UID: ${uid}`);
        return { success: true, remainingAmount: 0 };
      }
    } catch (error) {
      console.error(`Error processing UID: ${uid}:`, error);
      errorLogger(error);
      return { success: false, error: error.message };
    }
  }
  
  // Main function that accepts arrays of UIDs and amounts
  async function subtractIncome_new(uidsAndAmounts = []) {
    try {
      // Default data if nothing is passed
      if (!uidsAndAmounts || uidsAndAmounts.length === 0) {
        uidsAndAmounts = [
            { uid: 38, amount: 278.05 },
            { uid: 95, amount: 25.99 },
            { uid: 104, amount: 77.42 },
            { uid: 212, amount: 81.15 },
            { uid: 336, amount: 74.24 },
            { uid: 378, amount: 143.86 },
            { uid: 394, amount: 254.03 },
            { uid: 577, amount: 23.98 }
        ];
      }
      
      console.log(`Starting subtraction process for ${uidsAndAmounts.length} users`);
      
      const results = [];
      
      // Process each UID and amount pair
      for (const { uid, amount } of uidsAndAmounts) {
        const result = await processUserIncomeSubtraction(uid, amount);
        results.push({ uid, ...result });
      }
      
      console.log("Subtraction process completed:", results);
      return results;
      
    } catch (error) {
      console.error("Main function error:", error);
      errorLogger(error);
      return { success: false, error: error.message };
    }
  }
  
  // Example usage:
//   subtractIncome_new();


// subtractIncome_for_inactive_users()
// subtractIncome()
