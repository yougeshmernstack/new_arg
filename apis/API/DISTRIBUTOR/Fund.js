const PaymentOption = require('../../MODALS/PaymentOption');
const FundDepositRequest = require('../../MODALS/FundDepositRequest');
const DistributorWallet = require('../../MODALS/DistributorWallet');
const {
  ensurePanelWallet,
  ensureWalletSlug,
  getWalletBalance
} = require('../../utils/panelWallet');
const { INTERNAL_SERVER_ERROR, INVALID_REQUEST } = require('../../utils/errorMessages');
const { errorLogger } = require('../../utils/logger');
const { REQUEST_SUCCESS } = require('../../utils/successMessages');

class DistributorFund {
  async getPaymentMethods(req, res) {
    try {
      const options = await PaymentOption.findOne();
      if (!options || !options.manual?.status) {
        return res.status(200).json({
          success: true,
          data: { bank: [], upi: [] }
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          bank: (options.manual.bank || []).filter((b) => b.status),
          upi: (options.manual.upi || []).filter((u) => u.status)
        }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async getFundWallet(req, res) {
    try {
      const { uid } = req.user;
      await ensurePanelWallet(DistributorWallet, uid);
      await ensureWalletSlug(DistributorWallet, uid, 'fund_wallet');
      const balance = await getWalletBalance('distributor', uid, 'fund_wallet');
      const walletDoc = await DistributorWallet.findOne({ uid }).lean();

      return res.status(200).json({
        success: true,
        data: {
          balance,
          wallets: walletDoc?.wallets || []
        }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async submitFundDeposit(req, res) {
    try {
      const { uid } = req.user;
      const { amount, utr } = req.body;

      const numAmount = Number(amount);
      const cleanUtr = String(utr || '').trim();

      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'Valid amount is required' });
      }
      if (!cleanUtr) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'UTR ID is required' });
      }
      if (!req.file) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'Payment proof image is required' });
      }

      const existing = await FundDepositRequest.findOne({ utr: cleanUtr });
      if (existing) {
        return res.status(400).json({ message: 'This UTR has already been submitted' });
      }

      const proofUrl = `/uploads/payments/${req.file.filename}`;

      await ensurePanelWallet(DistributorWallet, uid);
      await ensureWalletSlug(DistributorWallet, uid, 'fund_wallet');

      const deposit = await new FundDepositRequest({
        uid,
        panel: 'distributor',
        amount: numAmount,
        utr: cleanUtr,
        proofUrl,
        status: 0
      }).save();

      return res.status(201).json({
        ...REQUEST_SUCCESS,
        message: 'Deposit request submitted. Waiting for admin approval.',
        data: deposit
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(400).json({ message: 'This UTR has already been submitted' });
      }
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async getFundDeposits(req, res) {
    try {
      const { uid } = req.user;
      const requests = await FundDepositRequest.find({ uid, panel: 'distributor' })
        .sort({ createdAt: -1 })
        .limit(100);
      return res.status(200).json({ success: true, data: requests });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }
}

module.exports = new DistributorFund();
