const Activity = require("../../MODALS/Activity");
const advance_info = require("../../MODALS/advanceInfo");
const Orders = require("../../MODALS/Orders");
const Transaction = require("../../MODALS/transactions");
const UserData = require("../../MODALS/userData");
const UserPaymentOption = require("../../MODALS/UserPaymentOption");
const UserWallet = require("../../MODALS/userWallets");
const Action = require("../../SERVICES/Activity");
const OTPService = require("../../SERVICES/OTPService");
const { INVALID_AMOUNT, INSUFFICIENT_FUND, INTERNAL_SERVER_ERROR } = require("../../utils/errorMessages");
const { errorLogger } = require("../../utils/logger");
const moment = require('moment-timezone');
const CompanyInfo = require("../../MODALS/CompanyInfo");

class WITHDRAW {
  constructor() {
    this.withdraw = this.withdraw.bind(this);
    this.withdraw_new = this.withdraw_new.bind(this);
    this.withdrawal_validation = this.withdrawal_validation.bind(this);
  }

  // Validation middleware for withdrawal
  // async withdrawal_validation(req, res, next) {
  //   try {
  //     const { uid } = req.user;
  //     const { amount, paymentMethod, account, wallet_name } = req.body;
  //     // console.log("object", amount, paymentMethod, account, wallet_name)
  //     // Validate required fields
  //     if (!amount || !paymentMethod || !account) {
  //       return res.status(400).json({
  //         message: 'Amount, payment method, and account are required fields.',
  //       });
  //     }

  //     // Get current time in IST (Indian Standard Time)
  //     const now = moment.tz('Asia/Kolkata');  // 'Asia/Kolkata' is the time zone for IST
  //     const currentHour = now.hours();  // Get the hour in IST
  //     console.log("currentHour in IST:", currentHour);

  //     // Check if the current time is between 12:00 AM and 12:00 PM IST
  //     if (currentHour < 0 || currentHour >= 12) {
  //       return res.status(400).json({
  //         message: 'Withdrawals are allowed only between 12:00 AM and 12:00 PM IST.',
  //       });
  //     }

  //     if (amount <= 0) {
  //       return res.status(400).json({
  //         message: 'The withdrawal amount must be greater than zero.',
  //       });
  //     }

  //      // Check if amount is a multiple of 10
  //     if (amount % 10 !== 0) {
  //       return res.status(400).json({
  //         message: 'Withdrawal amount must be in multiples of $10.',
  //       });
  //     }

  //     // Fetch advance info for withdrawal conditions
  //     const advanceInfo = await advance_info.findOne();

  //     // Check if wallet_name is valid and retrieve relevant wallet info
  //     const walletConfig = advanceInfo.withdrawal[wallet_name];
  //     if (!walletConfig) {
  //       return res.status(400).json({ message: 'Invalid wallet name.' });
  //     }

  //     // Check withdrawal limits
  //     if (amount < walletConfig.min_withdrawal || amount > walletConfig.max_withdrawal) {
  //       return res.status(400).json({
  //         message: `Withdrawal amount must be between ${walletConfig.min_withdrawal} and ${walletConfig.max_withdrawal}.`,
  //       });
  //     }

  //     // Check if withdrawal date restrictions apply
  //     if (walletConfig.withdrawal_dates.checkRequired == 1) {
  //       const currentDay = new Date().getDate();
  //       if (!walletConfig.withdrawal_dates.dates.includes(currentDay)) {
  //         return res.status(400).json({
  //           message: `You can only withdraw from ${wallet_name} on the following dates: ${walletConfig.withdrawal_dates.dates.join(', ')}`,
  //         });
  //       }
  //     }

  //     // Fetch user payment options
  //     const paymentOptions = await UserPaymentOption.findOne({ uid });
  //     if (!paymentOptions) {
  //       return res.status(400).json({
  //         message: 'Payment details are required to make a withdrawal. Please add your payment details first.',
  //       });
  //     }

  //     // Find the relevant account details based on payment method
  //     let accountDetails;
  //     switch (paymentMethod) {
  //       case 'bank':
  //         accountDetails = paymentOptions.bank.find((item) => item.accountNumber === account);
  //         break;
  //       case 'upi':
  //         accountDetails = paymentOptions.upi.find((item) => item.upiId === account);
  //         break;
  //       case 'web3':
  //         accountDetails = paymentOptions.web3.find((item) => item.address === account);
  //         break;
  //       default:
  //         return res.status(400).json({ message: 'Invalid payment method selected.' });
  //     }

  //     console.log("accountDetails", accountDetails)

  //     if (!accountDetails) {
  //       return res.status(400).json({ message: 'Wrong account details.' });
  //     }

  //     // Set account details in request object for use in the next middleware
  //     req.account = accountDetails;

  //     // Check if OTP is required for this withdrawal
  //     if (walletConfig.otpRequired === 1) {
  //       await OTPService.verifyOTP(req, res, () => {
  //         next()
  //       });

  //     } else {
  //       next()
  //     }
  //   } catch (error) {
  //     errorLogger(error); // Log the actual error
  //     return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
  //   }
  // }

  // // Main withdrawal method after validation
  // async withdraw_new(req, res, next) {
  //   try {
  //     const { uid } = req.user;
  //     const { amount, wallet_name } = req.body;

  //     // Check if user has already made a withdrawal today
  //     const withdrawalToday = await Transaction.findOne({
  //       uid: uid,
  //       source: 'withdrawal',
  //       $expr: {
  //         $eq: [
  //           { $dateToString: { format: "%Y-%m-%d", date: "$time" } },
  //           { $dateToString: { format: "%Y-%m-%d", date: new Date() } }
  //         ]
  //       }
  //     });

  //     if (withdrawalToday) {
  //       return res.status(400).json({ message: 'Only one withdrawal is allowed per day.' });
  //     }

  //     const advanceInfo = await advance_info.findOne();
  //     const daily_limit = advanceInfo.withdrawal[wallet_name];
  //     // console.log("data_new",daily_limit);
  //     // console.log("data_new",daily_limit);
  //     const sumOfAmount = await Transaction.aggregate([
  //       {
  //         $match: {
  //           uid: uid,
  //           source: 'withdrawal',
  //           $expr: {
  //             $eq: [
  //               { $dateToString: { format: "%Y-%m-%d", date: "$time" } },
  //               { $dateToString: { format: "%Y-%m-%d", date: new Date() } }
  //             ]
  //           }
  //         }
  //       },
  //       { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
  //     ]);

  //     let ttl = 0;
  //     if (sumOfAmount.length > 0) {
  //       ttl = sumOfAmount[0].totalAmount;
  //     }
  //     // console.log("ttl",ttl)
  //     if ((ttl + amount) >= daily_limit.max_withdrawal) {
  //       const pending_limit = daily_limit.max_withdrawal - ttl;
  //       return res.status(400).json({ message: 'Daily limit reached. You can withdraw up to:' + pending_limit });
  //     }
  //     // Check if the wallet name is valid for this activity
  //     const activity = await Activity.findOne({ name: 'withdrawal' });
  //     if (!activity) {
  //       return res.status(400).json({ message: 'Activity not found.' });
  //     }

  //     const validWalletNames = activity.use_wallet.map((wallet) => wallet.wallet_name);
  //     if (!validWalletNames.includes(wallet_name)) {
  //       return res.status(400).json({ message: 'Invalid wallet name.' });
  //     }

  //     // Find the user data
  //     const user = await UserData.findOne({ uid });
  //     if (!user) {
  //       return res.status(400).json({ message: 'User not found.' });
  //     }

  //     if(user.status === 0){
  //       return res.status(400).json({ message: 'user cannot widthraw because user blocked'})
  //     }

  //     // Set activity details for the next middleware
  //     activity.use_wallet = [{ wallet_name, percentage: 100 }];
  //     req.activity = {
  //       amount,
  //       activity,
  //       breakFunction: true,
  //       Status: 0,
  //       to_from: 1,
  //       uid,
  //       release: 1,
  //       account: req.account, // Account details from validation step
  //     };

  //     // Proceed to the next middleware
  //     return next();
  //   } catch (error) {
  //     errorLogger(error);
  //     return res.status(500).json({ message: 'Internal server error.' });
  //   }
  // }

  // // Final withdrawal method that includes both validation and OTP process
  // async withdraw(req, res, next) {
  //   console.log('ajksdkjl')
  //   try {
  //     // Execute the validation and then proceed with the withdrawal process
  //     await this.withdrawal_validation(req, res, async () => {
  //       await this.withdraw_new(req, res, next);
  //     });
  //   } catch (error) {
  //     console.log("error In withdrwaw", error)
  //     errorLogger(error);
  //     return res.status(500).json({ message: 'Internal server error.' });
  //   }
  // }


  // new one for withdrawal
  async withdrawal_validation(req, res, next) {
    try {
      const { uid } = req.user;
      const { amount, paymentMethod, account, wallet_name } = req.body;

      // Validate required fields
      if (!amount || !paymentMethod || !account) {
        return res.status(400).json({
          message: 'Amount, payment method, and account are required fields.',
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          message: 'The withdrawal amount must be greater than zero.',
        });
      }

      // Fetch advance info for withdrawal conditions
      const advanceInfo = await advance_info.findOne();
      const walletConfig = advanceInfo?.withdrawal[wallet_name];
      console.log("walletConfig", walletConfig);

      if (!walletConfig) {
        return res.status(400).json({ message: 'Invalid wallet name.' });
      }

      // Check withdrawal limits
      if (
        amount < walletConfig.min_withdrawal ||
        amount > walletConfig.max_withdrawal
        // !walletConfig.withdrawl_amount.includes(amount)
      ) {
        return res.status(400).json({
          // message: `Withdrawal amount must be between ${walletConfig.min_withdrawal} and ${walletConfig.max_withdrawal}, and must be one of the allowed amounts: ${walletConfig.withdrawl_amount.join(", ")}.`,
          message: `Withdrawal amount must be between ${walletConfig.min_withdrawal} and ${walletConfig.max_withdrawal}.`,
        });
      }

      // Check if the user has already withdrawn today
      // const lastWithdrawal = await Transaction.find({ uid, tx_type: "withdrawal", status: "0" });
      // console.log("lastWithdrawal", lastWithdrawal);
      // if (lastWithdrawal.length > 0) {
      //   return res.status(400).json({
      //     message: 'You can only withdraw once per allowed day.',
      //   });
      // }

      // Check if withdrawal date restrictions apply
      if (walletConfig.withdrawal_dates.checkRequired == 1) {
        const currentDay = new Date().getDate();
        if (!walletConfig.withdrawal_dates.dates.includes(currentDay)) {
          return res.status(400).json({
            message: `You can only withdraw from ${wallet_name} on the following dates: ${walletConfig.withdrawal_dates.dates.join(', ')}`,
          });
        }
      }

      // Fetch user payment options
      const paymentOptions = await UserPaymentOption.findOne({ uid });
      if (!paymentOptions) {
        return res.status(400).json({
          message: 'Payment details are required to make a withdrawal. Please add your payment details first.',
        });
      }

      // Find the relevant account details based on payment method
      let accountDetails;
      switch (paymentMethod) {
        case 'bank':
          accountDetails = paymentOptions.bank.find((item) => item.accountNumber === account);
          break;
        case 'upi':
          accountDetails = paymentOptions.upi.find((item) => item.upiId === account);
          break;
        case 'web3':
          accountDetails = paymentOptions.web3.find((item) => item.address === account);
          break;
        default:
          return res.status(400).json({ message: 'Invalid payment method selected.' });
      }

      if (!accountDetails) {
        return res.status(400).json({ message: 'Wrong account details.' });
      }

      // Set account details in request object for use in the next middleware
      req.account = accountDetails;

      // Check if OTP is required for this withdrawal
      if (walletConfig.otpRequired === 1) {
        await OTPService.verifyOTP(req, res, () => {
          next();
        });
      } else {
        next();
      }
    } catch (error) {
      errorLogger(error); // Log the actual error
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  // Main withdrawal method after validation
  async withdraw_new(req, res, next) {
    try {
      const { uid } = req.user;
      const { amount, wallet_name } = req.body;

      // Check if the wallet name is valid for this activity
      const activity = await Activity.findOne({ name: 'withdrawal' });
      if (!activity) {
        return res.status(400).json({ message: 'Activity not found.' });
      }

      const validWalletNames = activity.use_wallet.map((wallet) => wallet.wallet_name);
      if (!validWalletNames.includes(wallet_name)) {
        return res.status(400).json({ message: 'Invalid wallet name.' });
      }

      // Find the user data
      const user = await UserData.findOne({ uid });
      if (!user) {
        return res.status(400).json({ message: 'User not found.' });
      }

      // Set activity details for the next middleware
      activity.use_wallet = [{ wallet_name, percentage: 100 }];
      req.activity = {
        amount,
        activity,
        breakFunction: true,
        Status: 0,
        to_from: 1,
        uid,
        account: req.account, // Account details from validation step
      };

      // Proceed to the next middleware
      return next();
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  }

  // Final withdrawal method that includes both validation and OTP process
  async withdraw(req, res, next) {
    try {
      // Execute the validation and then proceed with the withdrawal process
      await this.withdrawal_validation(req, res, async () => {
        await this.withdraw_new(req, res, next);
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  }



  // for user cancel their own withdrawal request
  async cancelWithdrawalRequest(req, res) {
    try {
      const { tx_Id } = req.body; // Expecting the transaction ID from the request body

      // Find the withdrawal request by its transaction ID and ensure it's in a "pending" status
      const transaction = await Transaction.findOne({ tx_Id, status: 0, source: 'withdraw' });
      if (!transaction) {
        return res.status(400).json({ message: 'Withdrawal request not found or cannot be canceled.' });
      }

      // Log the entire transaction object for debugging
      // console.log('Transaction found:', transaction);

      const { uid, amount, wallet_type } = transaction; // Assuming the transaction stores the user's ID and withdrawal amount

      // Find the user's wallet based on the uid
      const userWallet = await UserWallet.findOne({ uid });
      if (!userWallet) {
        return res.status(404).json({ message: 'User wallet not found.' });
      }

      // Find the wallet that matches the walletType (main_wallet, roi_income, roi_level_income)
      const wallet = userWallet.wallets.find(w => w.slug === wallet_type);
      if (!wallet) {
        return res.status(404).json({ message: 'Specified wallet not found for user.' });
      }

      // console.log('Wallet found:', wallet);

      // Add the withdrawn amount back to the wallet
      wallet.value += amount;

      // Save the updated user wallet
      await userWallet.save();

      // Update the status of the withdrawal request to 'canceled' (status: 3)
      await Transaction.updateOne({ tx_Id }, { $set: { status: 2 } });

      return res.status(200).json({ message: 'Withdrawal request canceled and funds restored successfully.' });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }



  // new with rollback function
  //   async cancelWithdrawalRequest(req, res) {
  //     try {
  //         const { tx_Id } = req.body; // Expecting the transaction ID from the request body

  //         // Find the withdrawal request by its transaction ID and ensure it's in a "pending" status
  //         const transaction = await Transaction.findOne({ tx_Id, status: 0, source: 'withdraw' });
  //         if (!transaction) {
  //             return res.status(400).json({ message: 'Withdrawal request not found or cannot be canceled.' });
  //         }

  //         // Use Action.rollback to handle fund retrieval and other actions
  //         await Action.rollback(req, res, async () => {
  //             try {
  //                 // Update the status of the withdrawal request to 'canceled' (status: 3)
  //                 const result = await Transaction.updateOne({ tx_Id }, { $set: { status: 3 } });

  //                 // Check if the update was successful
  //                 if (result.nModified === 0) {
  //                     return res.status(400).json({ message: 'Failed to cancel withdrawal request.' });
  //                 }

  //                 return res.status(200).json({ message: 'Withdrawal request canceled successfully.' });
  //             } catch (err) {
  //                 errorLogger(err);
  //                 return res.status(500).json({ message: 'Error updating withdrawal request.' });
  //             }
  //         });

  //     } catch (error) {
  //         errorLogger(error);
  //         return res.status(500).json({ message: 'Internal server error.' });
  //     }
  // }


  async principal_withdrawal(req, res, next) {
    try {
      const { uid } = req.user;

      const companyInfo = await CompanyInfo.findOne({});
      if (!companyInfo) {
        return res.status(500).json({
          success: false,
          message: 'Company information not found. Cannot determine principal withdrawal status.'
        });
      }

      if (companyInfo.principal_withdrawal_status === 0) {
        return res.status(403).json({
          success: false,
          message: 'Principal withdrawal is currently not active. Please try again later.'
        });
      }

      const users = await UserData.findOne({ uid, status: 1 });
      if (!users) {
        return res.status(400).json({
          success: false,
          message: 'User account not found or inactive. Please contact support if you believe this is an error.'
        });
      }

      // Get the latest active order
      const activeOrder = await Orders.findOne({
        uid,
        status: 1
      }).sort({ order_Id: -1 });

      if (!activeOrder) {
        return res.status(400).json({
          success: false,
          message: 'No active investment found. Please ensure you have an active investment before withdrawing.'
        });
      }

      const check_order = await Orders.findOne({
        uid,
        status: 3
      })
      if (check_order) {
        return res.status(400).json({ success: false, message: "You have already withdrawn your principal amount" });
      }


      let order_Sum = await Orders.aggregate([
        {
          $match: { uid, status: 1 }
        },
        {
          $group: { _id: null, total_amount: { $sum: "$amount" } }
        }
      ]);

      let principal_amount = order_Sum[0]?.total_amount || 0;

      const incomeResult = await Transaction.aggregate([
        {
          $match: {
            uid,
            status: 1,
            source: {
              $in: [
                'roi_income',
                'roi_level_income',
                'level_income',
                'upline_income',
                'royalty_income'
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

      let currentIncome = (incomeResult[0]?.totalIncome || 0);
      let final_Amount = principal_amount - currentIncome

      if (final_Amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'No principal amount available for withdrawal. Your current earnings have already covered your principal investment.'
        });
      }

      const activity = await Activity.findOne({ name: 'principal_withdrawal' });
      if (!activity) {
        return res.status(400).json({
          success: false,
          message: 'System configuration error. Please try again later or contact support.'
        });
      }

      req.activity = {
        amount: final_Amount,
        activity,
        breakFunction: false,
        Status: 1,
        to_from: 1,
        uid
      };
      req.last_principal_withdrawal_amount = currentIncome;
      req.activeOrderId = activeOrder._id; // Pass the active order ID to the next function

      next();
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred. Please try again later or contact support.'
      });
    }
  }

  async update_order_after_withdrawal(req, res) {
    try {
      const { uid } = req.user;
      const { last_principal_withdrawal_amount, activeOrderId } = req;

      if (!activeOrderId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid withdrawal request. Please try again.'
        });
      }

      // Update only the specific order being withdrawn from
      await Orders.updateMany(
        { uid },
        {
          $set: {
            status: 3,
            pendingIncome: 0,
            claimStatus: 1,
            principal_withdrawn: true,
            last_principal_withdrawal_amount,
            withdrawal_date: new Date()
          }
        }
      );

      // Subtract self investment from user's wallet
      const userWallet = await UserWallet.findOne({ uid });
      if (userWallet) {
        const selfInvestmentWallet = userWallet.wallets.find(w => w.slug === 'self_investment');
        if (selfInvestmentWallet) {
          selfInvestmentWallet.value -= last_principal_withdrawal_amount;
          await userWallet.save();
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Principal withdrawal successful! Your funds will be processed according to our withdrawal policy.',
        data: {
          amount: last_principal_withdrawal_amount,
          timestamp: new Date(),
          orderId: activeOrderId
        }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while processing your withdrawal. Please contact support if the issue persists.'
      });
    }
  }

  async auto_withdraw_request(uid, wallet_name) {
    try {
      // Get user wallet and check balance
      const userWallet = await UserWallet.findOne({ uid });
      if (!userWallet) {
        throw new Error('User wallet not found');
      }

      // Get user data for additional checks
      const userData = await UserData.findOne({ uid });
      if (!userData) {
        throw new Error('User data not found');
      }

      if (userData.status === 0) {
        throw new Error('User is blocked');
      }

      // Get the wallet
      const wallet = userWallet.wallets.find(w => w.slug === wallet_name);
      if (!wallet) {
        throw new Error(`Wallet ${wallet_name} not found for user`);
      }

      // Check if user has sufficient balance
      if (wallet.value <= 0) {
        throw new Error('Insufficient balance for withdrawal');
      }
      const advanceInfo = await advance_info.findOne();
      if (!advanceInfo) {
        throw new Error('Withdrawal configuration not found');
      }

      const walletConfig =  advanceInfo.withdrawal.main_wallet;
      if (!walletConfig || walletConfig.status !== 1) {
        throw new Error('Auto withdrawals are not enabled');
      }
      const amount = wallet.value;
      const TDS = (amount * walletConfig.TDS) / 100;
      const tx_charge = (amount * walletConfig.service_tax) / 100;
      const withdrawAmount = amount - tx_charge - TDS;

      const activity = await Activity.findOne({ name: 'withdrawal' });
      if (!activity) {
        throw new Error('Activity not found');
      }

      // Check if the wallet_name exists in the use_wallet array
      const walletExists = activity.use_wallet.some(w => w.wallet_name === wallet_name);
      if (!walletExists) {
        throw new Error('Wallet name does not exist in use_wallet');
      }

      const paymentOptions = await UserPaymentOption.findOne({ uid });
      if (!paymentOptions || !paymentOptions.upi || paymentOptions.upi.length === 0) {
        throw new Error('Payment details are required to make a withdrawal. Please add your payment details first');
      }

      // Get the first web3 payment option
      const web3Payment = paymentOptions.upi[0];
      if (!web3Payment || !web3Payment.upiId) {
        throw new Error('Invalid upiId payment address');
      }

      // Create activity data for actInternally
      const activityData = {
        amount: amount,
        withdrawal_amount: withdrawAmount,
        
        activity_name: 'withdrawal',
        Status: 0, // Set to 0 for pending status
        to_from: uid,
        TDS,
        tx_charge,
        account: web3Payment,
        status: 1,
        release: 1,
        pancard: userData.pancard || null
      };

      // Call the action service internally
      await Action.actInternally(uid, activityData);

      return {
        success: true,
        message: 'Auto withdrawal processed successfully',
        amount: withdrawAmount
      };

    } catch (error) {
      console.log("error",error)
      errorLogger(`Error in auto_withdraw_request for user ${uid}: ${error.message}`);
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  // Function to check and process auto withdrawals for all eligible users
  async process_auto_withdrawals() {
    try {
      // Get withdrawal configuration
      const advanceInfo = await advance_info.findOne();
      if (!advanceInfo) {
        throw new Error('Withdrawal configuration not found');
      }

      const walletConfig = advanceInfo.withdrawal.main_wallet;
      if (!walletConfig || walletConfig.status !== 1) {
        throw new Error('Auto withdrawals are not enabled');
      }

      // Find users with balance above minimum withdrawal amount
      const eligibleUsers = await UserWallet.find({
        wallets: {
          $elemMatch: {
            slug: 'main_wallet',
            value: { $gte: walletConfig.min_withdrawal }
          }
        }
      });

      console.log(`Found ${eligibleUsers.length} users eligible for auto withdrawal`);

      for (const userWallet of eligibleUsers) {
        try {
          // Get user data to check status
          const userData = await UserData.findOne({ uid: userWallet.uid });
          if (!userData || userData.status === 0) {
            console.log(`Skipping user ${userWallet.uid}: User is blocked or not found`);
            continue;
          }

          // Check if user has web3 payment option
          const paymentOptions = await UserPaymentOption.findOne({ uid: userWallet.uid });
          if (!paymentOptions || paymentOptions.upi.length === 0) {
            console.log(`Skipping user ${userWallet.uid}: No upi payment option found`);
            continue;
          }

          // Check withdrawal date restrictions
          if (walletConfig.withdrawal_dates.checkRequired === 1) {
            const currentDay = new Date().getDate();
            if (!walletConfig.withdrawal_dates.dates.includes(currentDay)) {
              console.log(`Skipping user ${userWallet.uid}: Not a valid withdrawal date`);
              continue;
            }
          }

          // Check daily withdrawal limit
          const sumOfAmount = await Transaction.aggregate([
            {
              $match: {
                uid: userWallet.uid,
                source: 'withdrawal',
                $expr: {
                  $eq: [
                    { $dateToString: { format: "%Y-%m-%d", date: "$time" } },
                    { $dateToString: { format: "%Y-%m-%d", date: new Date() } }
                  ]
                }
              }
            },
            { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
          ]);

          const dailyTotal = sumOfAmount.length > 0 ? sumOfAmount[0].totalAmount : 0;
          const mainWallet = userWallet.wallets.find(w => w.slug === 'main_wallet');

          if (dailyTotal + mainWallet.value > walletConfig.max_withdrawal) {
            console.log(`Skipping user ${userWallet.uid}: Would exceed daily withdrawal limit`);
            continue;
          }

          // Process the withdrawal
          await this.auto_withdraw_request(userWallet.uid, 'main_wallet');
        } catch (error) {
          console.error(`Failed to process auto withdrawal for user ${userWallet.uid}:`, error);
          // Continue with next user even if one fails
          continue;
        }
      }

    } catch (error) {
      errorLogger(`Error in process_auto_withdrawals: ${error}`);
      throw error;
    }
  }

}
const withdraw = new WITHDRAW();
// withdraw.process_auto_withdrawals();
module.exports = withdraw;
