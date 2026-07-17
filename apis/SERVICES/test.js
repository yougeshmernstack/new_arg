const Orders = require("../MODALS/Orders");
const PlansInfo = require("../MODALS/Plan");
const Ranks = require("../MODALS/Ranks");
const Transaction = require("../MODALS/transactions");
const UserData = require("../MODALS/userData");
const UserWallet = require("../MODALS/userWallets");
const Wallets = require("../MODALS/wallets");
const { errorLogger } = require("../utils/logger");

async function updateMainWalletValues() {
    try {
      // Step 1: Aggregate sum of amounts for each user
      const userSums = await Transaction.aggregate([
        {
          $match: {
            debit_credit: 'credit',
            wallet_type: 'main_wallet'
          }
        },
        {
          $group: {
            _id: "$uid",
            totalAmount: { $sum: "$amount" }
          }
        }
      ]);
  
      // Step 2: Update each user's main_wallet value
      for (const user of userSums) {
        await UserWallet.updateOne(
          { uid: user._id, "wallets.slug": "main_wallet" },
          {
            $set: {
              "wallets.$[elem].value": user.totalAmount
            }
          },
          {
            arrayFilters: [
              { "elem.slug": "main_wallet" }
            ]
          }
        );
      }
  
      console.log('Wallet values updated successfully.');
  
    } catch (err) {
      console.error('An error occurred:', err);
    }
  }
//  updateMainWalletValues();
  


async function updateTransactionIds() {
    try {

        const transactions = await Transaction.find({}).sort({ time: 1 }); // Fetch all transactions sorted by time
        let currentTxId = 1;
        const bulkOps = transactions.map(transaction => ({
            updateOne: {
                filter: { _id: transaction._id },
                update: { tx_Id: currentTxId++ }
            }
        }));

        if (bulkOps.length > 0) {
            await Transaction.bulkWrite(bulkOps);
            console.log('Transaction IDs updated successfully');
        } else {
            console.log('No transactions to update');
        }

    } catch (error) {
        errorLogger(error);
        console.error('Error updating transaction IDs:', error);
    }
}

async function syncWallets() {
  try {
    // Fetch all user wallets and predefined wallets
    const userWallets = await UserWallet.find({});
    const predefinedWallets = await Wallets.find({});

    // Convert predefined wallets to a map for quick lookup
    const predefinedWalletMap = Object.fromEntries(
      predefinedWallets.map(wallet => [wallet.slug, wallet])
    );

    // Process each user
    for (const user of userWallets) {
      const existingWallets = user.wallets;
      const existingSlugs = existingWallets.map(wallet => wallet.slug);

      // Find wallets that are missing for the user
      const missingWallets = predefinedWallets
        .filter(wallet => !existingSlugs.includes(wallet.slug))
        .map(wallet => ({
          wallet_status: wallet.status,
          value: 0,
          updated_on: null,
          name: wallet.name,
          wallet_type: wallet.wallet_type,
          slug: wallet.slug,
          count_in: wallet.count_in || null // Default null if not provided
        }));

      if (missingWallets.length > 0) {
        // Add missing wallets
        await UserWallet.updateOne(
          { uid: user.uid },
          { $push: { wallets: { $each: missingWallets } } }
        );
      }

      // Update names for existing wallets
      const arrayFilters = [];
      const updateObj = {};

      existingWallets.forEach((wallet, idx) => {
        const predefinedWallet = predefinedWalletMap[wallet.slug];
        if (predefinedWallet && wallet.name !== predefinedWallet.name) {
          const filterName = `elem${idx}`; // Use a generic name with index
          arrayFilters.push({ [`${filterName}.slug`]: wallet.slug });
          updateObj[`wallets.$[${filterName}].name`] = predefinedWallet.name;
        }
      });

      if (arrayFilters.length > 0) {
        await UserWallet.updateOne(
          { uid: user.uid },
          { $set: updateObj },
          { arrayFilters }
        );
      }
    }

    console.log("Wallet synchronization completed.");
  } catch (error) {
    console.error("Error during wallet synchronization:", error);
  }
}

async function updateActivationDate() {
  try {
    const orders = await Orders.find({ status: 1 });

    if (!orders.length) {
      console.log("No matching orders found.");
      return;
    }

    const bulkOperations = orders.map(order => ({
      updateMany: {
        filter: { uid: order.uid },
        update: {
          $set: {
            status: 1,
            Activation_date: new Date(order.added_on) // Ensure valid Date type
          }
        }
      }
    }));

    if (bulkOperations.length) {
      await UserData.bulkWrite(bulkOperations);
      console.log("User activation dates updated successfully.");
    } else {
      console.log("No updates were performed.");
    }
  } catch (error) {
    console.error("Error during activation date update:", error);
  }
}

async function analyzeUsersExceedingROICapping() {
  try {
    console.log("Starting ROI capping analysis...");

    // Get all users with active status
    const usersWithOrders = await UserData.find({ status: { $in: [1] } });
    console.log(`Found ${usersWithOrders.length} users with orders to analyze`);

    const usersExceedingCap = [];
    let totalExtraIncome = 0;

    for (let usersss of usersWithOrders) {
      const uid = usersss.uid;

      const userWallet = await UserWallet.findOne({ uid });
      if (!userWallet) continue;

      // Get all user orders with status 1 or 2 (for counting), but we'll only analyze those with status = 1
      const userOrders = await Orders.find({
        uid,
        status: { $in: [1, 2] }
      });

      if (!userOrders.length) continue;

      // Filter only status = 1 orders for actual analysis
      const activeOrders = userOrders.filter(order => order.status === 1);

      for (const order of activeOrders) {
        const order_Id = order.order_Id;
        const amount = order.amount;
        const planId = order.planId || 1;

        const plan = await PlansInfo.findOne({ planId });
        if (!plan) continue;

        const roiCondition = plan.roi_income;
        const { maximum: default_maximum_roi } = roiCondition;

        // Income from eligible sources
        const trans = await Transaction.aggregate([
          {
            $match: {
              status: 1,
              uid,
              source: {
                $in: [
                  'roi_income',
                  'roi_level_income',
                  'community_income',
                  'reward_income',
                  'team_royalty_income',
                  'leadership_income',
                  'salary_income'
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$amount" }
            }
          }
        ]);

        // Admin credited withdrawals
        const totalIncomeResult = await Transaction.aggregate([
          {
            $match: {
              source: 'withdrawal',
              uid,
              status: 1,
              remark: "from_admin"
            }
          },
          {
            $group: {
              _id: null,
              totalIncome: { $sum: "$amount" }
            }
          }
        ]);

        const totalAmount = (trans[0]?.totalAmount || 0) + (totalIncomeResult[0]?.totalIncome || 0);

        // Determine cap percentage
        let maximum_income = default_maximum_roi;

        const { teamSection } = userWallet;
        const level1 = teamSection.find(entry => entry.level == 1);
        const directBusiness = level1 ? level1.business : 0;

        const goldRanks = await Ranks.find({ uid, rankId: { $gte: 3 }, status: 1 });
        const hasGoldRank = goldRanks.length > 0;

        if (hasGoldRank) {
          maximum_income = 500;
        } else if (directBusiness >= 1000) {
          maximum_income = 300;
        }

        // Count all status 1 or 2 orders before or equal to current
        const orderCount = await Orders.countDocuments({
          uid,
          status: { $in: [1, 2] },
          order_Id: { $lte: order_Id }
        });

        const total_income_Capping = maximum_income * orderCount;
        const maxAllowedIncome = amount * total_income_Capping / 100;

        if (totalAmount > maxAllowedIncome) {
          const extraIncome = totalAmount - maxAllowedIncome;
          totalExtraIncome += extraIncome;

          usersExceedingCap.push({
            uid,
            username: usersss?.username || 'Unknown',
            order_Id,
            maximumIncomePercent: maximum_income,
            maxAllowedIncome: maxAllowedIncome.toFixed(2),
            actualIncome: totalAmount.toFixed(2),
            extraIncome: extraIncome.toFixed(2),
          });
        }
      }
    }

    console.log(`\n===== USERS EXCEEDING ROI CAPPING (STATUS = 1 Orders) =====`);
    console.log(`Found ${usersExceedingCap.length} entries where status=1 orders exceeded ROI cap`);
    console.log(`Total extra income earned: ${totalExtraIncome.toFixed(2)}\n`);

    if (usersExceedingCap.length > 0) {
      console.table(usersExceedingCap);
    }

    return {
      count: usersExceedingCap.length,
      totalExtraIncome: totalExtraIncome.toFixed(2),
      users: usersExceedingCap
    };

  } catch (error) {
    errorLogger(error);
    console.error('Error analyzing ROI capping:', error);
    return { error: error.message };
  }
}
async function checkUserIncomeEligibility(uid, incomingAmount) {
  try {
    const user = await UserData.findOne({ uid, status: 1 });
    if (!user) return { eligible: false, allowedAmount: 0 };

    const userWallet = await UserWallet.findOne({ uid });
    if (!userWallet) return { eligible: false, allowedAmount: 0 };

    const userOrders = await Orders.find({
      uid,
      status: { $in: [1, 2] }
    });

    if (!userOrders.length) return { eligible: false, allowedAmount: 0 };

    let totalEligibleAmount = 0;
    let allOrderIds = [];

    for (const order of userOrders) {
      if (order.status !== 1) continue;

      const planId = order.planId || 1;
      const plan = await PlansInfo.findOne({ planId });
      if (!plan) continue;

      let maxPercent = plan.roi_income?.maximum || 200; // fallback to 200%

      const { teamSection } = userWallet;
      const level1 = teamSection.find(entry => entry.level == 1);
      const directBusiness = level1 ? level1.business : 0;

      const goldRanks = await Ranks.find({ uid, rankId: { $gte: 3 }, status: 1 });
      const hasGoldRank = goldRanks.length > 0;

      if (hasGoldRank) {
        maxPercent = 500;
      } else if (directBusiness >= 1000) {
        maxPercent = 300;
      }

      const eligibleAmount = (order.amount * maxPercent) / 100;
      totalEligibleAmount += eligibleAmount;
      allOrderIds.push({ order_Id: order.order_Id, eligibleAmount, maxPercent });
    }

    // Total income from eligible sources
    const incomeResult = await Transaction.aggregate([
      {
        $match: {
          uid,
          status: 1,
          source: {
            $in: [
              'roi_income',
              'roi_level_income',
              'community_income',
              'reward_income',
              'team_royalty_income',
              'leadership_income',
              'salary_income'
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: "$amount" }
        }
      }
    ]);

    const adminWithdrawal = await Transaction.aggregate([
      {
        $match: {
          uid,
          status: 1,
          source: 'withdrawal',
          remark: 'from_admin'
        }
      },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: "$amount" }
        }
      }
    ]);

    const currentIncome = (incomeResult[0]?.totalIncome || 0) + (adminWithdrawal[0]?.totalIncome || 0);

    // If user has reached the cap
    if (currentIncome >= totalEligibleAmount) {
      // Update each order status to 2 (maxed out)
      for (const entry of allOrderIds) {
        await Orders.findOneAndUpdate(
          { uid, order_Id: entry.order_Id, status: 1 },
          { $set: { status: 2 } }
        );
      }

      console.log(`User ${uid} has reached max income cap. Orders updated.`);
      return { eligible: false, allowedAmount: 0 };
    }

    // Calculate how much income can be paid
    const remaining = totalEligibleAmount - currentIncome;

    if (incomingAmount <= remaining) {
      return { eligible: true, allowedAmount: incomingAmount };
    } else {
      return { eligible: true, allowedAmount: remaining };
    }

  } catch (error) {
    console.error("Error in checkUserIncomeEligibility:", error);
    return { eligible: false, allowedAmount: 0, error: error.message };
  }
}


// Call the function
// analyzeUsersExceedingROICapping();

// checkUserIncomeEligibility(38,100).then(result => {
//   console.log("Eligibility Result:", result);
// }
// ).catch(err => {
//   console.error("Error:", err);
// }
// );
// updateTransactionIds()
// syncWallets()
// updateActivationDate()