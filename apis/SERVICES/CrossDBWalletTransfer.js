const mongoose = require('mongoose'); 
const db2 = require('../connection_gaming_db');
const { errorLogger, activityLogger } = require("../utils/logger");
const { INTERNAL_SERVER_ERROR } = require("../utils/errorMessages");
const UserData = require('../MODALS/userData');
const UserWallet = require('../MODALS/userWallets');
const Transaction = require('../MODALS/transactions');
const getNextTxId = require('../MODALS/Counter');

class CrossDatabaseTransfer {
 
  async transferFunds(req, res) {
    try {
      const { uid: senderUid } = req.user;
      console.log(req.user); 
      const { amount, username: recipientUsername, wallet_type:source_wallet} = req.body;
      console.log(req.body); 

      if(amount < 0){
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid amount',
          error: 'Amount must be a positive number'
        });
      }
      if (!recipientUsername) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing  username',
          error: ' username is required'
        });
      }

      if (source_wallet !== 'gaming_wallet' && source_wallet !== 'working_wallet') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid source wallet',
          error: 'Source wallet must be either gaming_wallet or working_wallet'
        });
      }

      let numericAmount = Number(amount);
      const companyInfo = await db2.collection('companyinfos').findOne();
      console.log("companyInfo", companyInfo);
      
      // Calculate token amount based on USDT amount and coin price
      const tokenAmount = numericAmount / companyInfo.coin_buy_price;
      console.log("tokenAmount", tokenAmount);

      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid amount',
          error: 'Amount must be a positive number'
        });
      }

      // Validate input parameters
      if (!recipientUsername) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing amount or recipient',
          error: 'Amount and recipient username are required for the transfer'
        });
      }
      
      const senderUser = await UserData.findOne({ uid: senderUid });
      if (!senderUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'Sender not found',
          error: 'Your account could not be found in the system'
        });
      }

      const senderWalletDoc = await UserWallet.findOne({ uid: senderUid });
      if (!senderWalletDoc) {
        return res.status(404).json({ 
          success: false, 
          message: 'Wallet not found',
          error: 'Your wallet could not be found in the system'
        });
      }

      const sourceWallet = senderWalletDoc.wallets.find(w => w.slug === source_wallet);
      if (!sourceWallet) {
        return res.status(404).json({ 
          success: false, 
          message: 'Source wallet not found',
          error: `The ${source_wallet} wallet could not be found in your account`
        });
      }

      if (sourceWallet.value < numericAmount) {
        return res.status(400).json({ 
          success: false, 
          message: 'Insufficient USDT balance',
          error: `Your ${source_wallet} wallet has insufficient USDT balance for this transfer`
        });
      }

      const currentBalance = sourceWallet.value;
      const newBalance = currentBalance - numericAmount;

      // Get recipient's user data and wallet from db2
      const recipientUser = await db2.collection('userdatas').findOne({ username: recipientUsername });
      if (!recipientUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'Recipient not found',
          error: `User "${recipientUsername}" could not be found in the gaming system`
        });
      }

      const recipientWallet = await db2.collection('userwallets').findOne({ uid: recipientUser.uid });
      if (!recipientWallet) {
        return res.status(404).json({ 
          success: false, 
          message: 'Recipient wallet not found',
          error: `The recipient's wallet could not be found in the system`
        });
      }

      const recipientFundWallet = recipientWallet.wallets.find(w => w.slug === 'fund_wallet');
      if (!recipientFundWallet) {
        return res.status(404).json({ 
          success: false, 
          message: 'Recipient fund wallet not found',
          error: 'The recipient does not have a fund wallet'
        });
      }

      const recipientCurrentBalance = recipientFundWallet.value;
      const recipientNewBalance = recipientCurrentBalance + tokenAmount;

      // Get transaction IDs
      const senderTxId = await getNextTxId('transactionId');
      const lastTransaction = await db2.collection('counters').findOneAndUpdate(
        { ID: 'transactionId' },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true } // use 'returnDocument', not 'new'
      );
      console.log("lastTransaction", lastTransaction);
      const recipientTxId =lastTransaction.seq 
      // Task 1: Create sender transaction history for USDT deduction
      const senderTransaction = new Transaction({
        uid: senderUid,
        to_from: recipientUser.uid,
        to_from_username: recipientUsername,
        stake_order_Id: null,
        tx_type: 'transfer',
        debit_credit: 'debit',
        source: 'fund_transfer_to_game',
        wallet_type: source_wallet,
        level_distribution_status: 0,
        amount: numericAmount,
        tx_charge: 0,
        status: 1,
        open_ord: 0,
        close_ord: 0,
        open_src: currentBalance,
        close_src: newBalance,
        overall_open: -currentBalance,
        overall_close: -newBalance,
        time: new Date(),
      });

      try {
        await senderTransaction.save();
      } catch (error) {
        errorLogger(error);
        return res.status(500).json({ 
          success: false, 
          message: 'Transfer failed',
          error: 'Failed to create transaction history. Transfer aborted.'
        });
      }

      // Task 2: Deduct USDT from source wallet
      console.log('Attempting to deduct USDT from source wallet:', {
        senderUid,
        source_wallet,
        numericAmount,
        currentBalance
      });

      // First verify the current balance again before deduction
      const verifyWallet = await UserWallet.findOne({
        uid: senderUid,
        'wallets.slug': source_wallet
      });
      
      console.log('Wallet before deduction:', verifyWallet);

      if (!verifyWallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found',
          error: 'Could not verify wallet before deduction'
        });
      }

      const verifyBalance = verifyWallet.wallets.find(w => w.slug === source_wallet).value;
      console.log('Verified balance before deduction:', verifyBalance);

      if (verifyBalance < numericAmount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient USDT balance',
          error: 'Balance verification failed before deduction'
        });
      }

      // Perform the USDT deduction
      const deductResult = await UserWallet.updateOne(
        { 
          uid: senderUid,
          'wallets.slug': source_wallet,
          'wallets.value': { $gte: numericAmount }
        },
        { 
          $inc: { 'wallets.$[wallet].value': -numericAmount }
        },
        {
          arrayFilters: [{ 'wallet.slug': source_wallet }]
        }
      );

      console.log('Deduction result:', deductResult);

      if (deductResult.modifiedCount === 0) {
        await Transaction.deleteOne({ tx_Id: senderTransaction.tx_Id });
        return res.status(500).json({ 
          success: false, 
          message: 'Transfer failed',
          error: 'Failed to deduct USDT from your wallet. Please try again later.'
        });
      }

      // Verify the deduction was successful
      const updatedWallet = await UserWallet.findOne({
        uid: senderUid,
        'wallets.slug': source_wallet
      });

      console.log('Wallet after deduction:', updatedWallet);

      if (!updatedWallet) {
        await Transaction.deleteOne({ tx_Id: senderTransaction.tx_Id });
        return res.status(500).json({
          success: false,
          message: 'Transfer failed',
          error: 'Could not verify wallet after deduction'
        });
      }

      const updatedBalance = updatedWallet.wallets.find(w => w.slug === source_wallet).value;
      console.log('Updated balance after deduction:', updatedBalance);

      if (Math.abs(updatedBalance - (currentBalance - numericAmount)) > 0.01) {
        // If balance doesn't match expected value, rollback
        await UserWallet.updateOne(
          { 
            uid: senderUid,
            'wallets.slug': source_wallet
          },
          { 
            $inc: { 'wallets.$[wallet].value': numericAmount }
          },
          {
            arrayFilters: [{ 'wallet.slug': source_wallet }]
          }
        );
        await Transaction.deleteOne({ tx_Id: senderTransaction.tx_Id });
        return res.status(500).json({
          success: false,
          message: 'Transfer failed',
          error: 'Balance verification failed after deduction'
        });
      }

      // Task 3: Add tokens to recipient wallet
      const addResult = await db2.collection('userwallets').updateOne(
        { 
          uid: recipientUser.uid,
          'wallets.slug': 'fund_wallet'
        },
        { 
          $inc: { 'wallets.$[wallet].value': tokenAmount }
        },
        {
          arrayFilters: [{ 'wallet.slug': 'fund_wallet' }]
        }
      );

      if (addResult.modifiedCount === 0) {
        // If adding failed, refund the sender and delete transaction history
        await UserWallet.updateOne(
          { 
            uid: senderUid,
            'wallets.slug': source_wallet
          },
          { 
            $inc: { 'wallets.$[wallet].value': numericAmount }
          },
          {
            arrayFilters: [{ 'wallet.slug': source_wallet }]
          }
        );
        await Transaction.deleteOne({ tx_Id: senderTransaction.tx_Id });
        return res.status(500).json({ 
          success: false, 
          message: 'Transfer failed',
          error: 'Failed to add tokens to recipient wallet. The USDT has been refunded to your wallet.'
        });
      }

      // Task 4: Create recipient transaction history for token credit
      const recipientTransaction = await db2.collection('transactions').insertOne({
        tx_Id: recipientTxId,
        uid: recipientUser.uid,
        to_from: senderUid,
        to_from_username: senderUser.username,
        stake_order_Id: null,
        tx_type: 'transfer',
        debit_credit: 'credit',
        source: 'fund_transfer_from_game',
        wallet_type: 'fund_wallet',
        level_distribution_status: 0,
        amount: tokenAmount,
        tx_charge: 0,
        status: 1,
        open_ord: 0,
        close_ord: 0,
        open_src: recipientCurrentBalance,
        close_src: recipientNewBalance,
        overall_open: recipientCurrentBalance,
        overall_close: recipientNewBalance,
        time: new Date(),
      });

      if (!recipientTransaction.insertedId) {
        // If recipient history fails, refund the sender and delete both transaction histories
        await UserWallet.updateOne(
          { 
            uid: senderUid,
            'wallets.slug': source_wallet
          },
          { 
            $inc: { 'wallets.$[wallet].value': numericAmount }
          },
          {
            arrayFilters: [{ 'wallet.slug': source_wallet }]
          }
        );
        await db2.collection('userwallets').updateOne(
          { 
            uid: recipientUser.uid,
            'wallets.slug': 'fund_wallet'
          },
          { 
            $inc: { 'wallets.$[wallet].value': -tokenAmount }
          },
          {
            arrayFilters: [{ 'wallet.slug': 'fund_wallet' }]
          }
        );
        await Transaction.deleteOne({ tx_Id: senderTransaction.tx_Id });
        return res.status(500).json({ 
          success: false, 
          message: 'Transfer failed',
          error: 'Failed to record recipient transaction history. The transfer has been rolled back.'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Transfer completed successfully',
        data: {
          usdtAmount: numericAmount,
          tokenAmount: tokenAmount,
          recipient: recipientUsername,
          transactionId: senderTransaction.tx_Id,
          timestamp: new Date(),
          sourceWallet: source_wallet,
          sourceBalance: newBalance,
          recipientBalance: recipientNewBalance
        }
      });
      
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ 
        success: false, 
        message: 'Transfer failed',
        error: 'An unexpected error occurred during the transfer. Please try again later.',
        systemError: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async checkUserInGamingDB(req, res) {
    try {
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing username',
          error: 'Username is required to check user existence'
        });
      }

      // Check in gaming database (db2)
      const user = await db2.collection('userdatas').findOne({ username });
      
      if (user) {
        return res.status(200).json({
          success: true,
          message: 'User found',
          data: {
            username: user.username,
            name: user.name,
            uid: user.uid,
            status: user.status
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'User not found',
          error: `User "${username}" does not exist in the gaming system`
        });
      }
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ 
        success: false, 
        message: 'Check failed',
        error: 'An error occurred while checking user existence',
        systemError: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

const crossDatabaseTransfer = new CrossDatabaseTransfer();
module.exports = crossDatabaseTransfer;
