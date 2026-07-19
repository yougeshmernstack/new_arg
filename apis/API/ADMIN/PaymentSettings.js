const PaymentOption = require('../../MODALS/PaymentOption');
const FundDepositRequest = require('../../MODALS/FundDepositRequest');
const Distributor = require('../../MODALS/Distributor');
const Transaction = require('../../MODALS/transactions');
const Action = require('../../SERVICES/Activity');
const { getWalletBalance } = require('../../utils/panelWallet');
const { INTERNAL_SERVER_ERROR, INVALID_REQUEST } = require('../../utils/errorMessages');
const { errorLogger } = require('../../utils/logger');
const { REQUEST_SUCCESS } = require('../../utils/successMessages');

async function getOrCreatePaymentOption() {
  let doc = await PaymentOption.findOne();
  if (!doc) {
    doc = await new PaymentOption({
      manual: { status: 1, upi: [], bank: [] },
      api: { status: 0, providers: [] },
      web3: { status: 0, chains: [] }
    }).save();
  }
  return doc;
}

class PaymentSettings {
  async getPaymentSettings(req, res) {
    try {
      const options = await getOrCreatePaymentOption();
      return res.status(200).json({ success: true, data: options });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async updatePaymentSettings(req, res) {
    try {
      const { bank, upi, manualStatus } = req.body;
      const options = await getOrCreatePaymentOption();

      if (Array.isArray(bank)) {
        options.manual.bank = bank.map((b) => ({
          bankName: b.bankName || '',
          accountNumber: b.accountNumber || '',
          ifsc: b.ifsc || '',
          holder: b.holder || '',
          ac_type: b.ac_type || 'savings',
          branch: b.branch || '',
          status: b.status === 0 ? 0 : 1
        }));
      }

      if (Array.isArray(upi)) {
        options.manual.upi = upi.map((u) => ({
          name: u.name || '',
          upiId: u.upiId || '',
          qrCodeUrl: u.qrCodeUrl || null,
          status: u.status === 0 ? 0 : 1
        }));
      }

      if (manualStatus !== undefined) {
        options.manual.status = Number(manualStatus) ? 1 : 0;
      }

      await options.save();
      return res.status(200).json({ ...REQUEST_SUCCESS, data: options });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async uploadPaymentQr(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'QR image is required' });
      }
      const relative = `/uploads/payments/${req.file.filename}`;
      return res.status(200).json({
        success: true,
        data: { url: relative, filename: req.file.filename }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async getFundDeposits(req, res) {
    try {
      const { status, panel = 'distributor' } = req.query;
      const filter = { panel };
      if (status !== undefined && status !== '' && status !== 'all') {
        filter.status = Number(status);
      }
      const requests = await FundDepositRequest.find(filter).sort({ createdAt: -1 }).limit(200);
      return res.status(200).json({ success: true, data: requests });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async approveFundDeposit(req, res) {
    try {
      const { requestId, remark } = req.body;
      if (!requestId) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'requestId is required' });
      }

      const deposit = await FundDepositRequest.findById(requestId);
      if (!deposit) {
        return res.status(404).json({ message: 'Deposit request not found' });
      }
      if (deposit.status !== 0) {
        return res.status(400).json({ message: 'Request is not pending' });
      }

      const saved = await Action.actInternally(deposit.uid, {
        amount: Number(deposit.amount),
        activity_name: 'add_fund',
        Status: 1,
        to_from: 'admin',
        panel: deposit.panel || 'distributor',
        release: 1,
        reqest_tx_Id: deposit.utr,
        proofUrl: deposit.proofUrl || null,
        metadata: {
          utr: deposit.utr,
          depositRequestId: String(deposit._id)
        }
      });

      if (!saved || !saved.length) {
        return res.status(500).json({
          message: 'Failed to credit fund wallet. Check add_fund activity and wallet setup.'
        });
      }

      deposit.status = 1;
      deposit.remark = remark || deposit.remark || '';
      deposit.reviewedBy = req.user?.uid || null;
      deposit.reviewedAt = new Date();
      deposit.creditTxId = saved[0].tx_Id;
      await deposit.save();

      return res.status(200).json({
        ...REQUEST_SUCCESS,
        message: 'Deposit approved and fund wallet credited',
        data: deposit
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async rejectFundDeposit(req, res) {
    try {
      const { requestId, remark } = req.body;
      if (!requestId) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'requestId is required' });
      }

      const deposit = await FundDepositRequest.findById(requestId);
      if (!deposit) {
        return res.status(404).json({ message: 'Deposit request not found' });
      }
      if (deposit.status !== 0) {
        return res.status(400).json({ message: 'Request is not pending' });
      }

      deposit.status = 2;
      deposit.remark = remark || 'Rejected';
      deposit.reviewedBy = req.user?.uid || null;
      deposit.reviewedAt = new Date();
      await deposit.save();

      return res.status(200).json({
        ...REQUEST_SUCCESS,
        message: 'Deposit request rejected',
        data: deposit
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  /**
   * Admin credits fund wallet of any distributor via add_fund activity.
   * Body: { uid? | username?, amount, remark?, panel? }
   */
  async sendFund(req, res) {
    try {
      const {
        uid,
        username,
        amount,
        remark = '',
        panel = 'distributor'
      } = req.body;

      const creditAmount = Number(amount);
      if (!creditAmount || creditAmount <= 0) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'Valid amount is required' });
      }

      if (panel !== 'distributor') {
        return res.status(400).json({
          ...INVALID_REQUEST,
          message: 'Only distributor panel is supported for send fund currently'
        });
      }

      let user = null;
      if (uid != null && uid !== '') {
        user = await Distributor.findOne({ uid: Number(uid) }).select('-password');
      } else if (username) {
        const uname = String(username).trim();
        user = await Distributor.findOne({
          username: { $regex: `^${uname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
        }).select('-password');
      }

      if (!user) {
        return res.status(404).json({ message: 'User not found. Provide a valid uid or username.' });
      }

      if (user.status === 'disabled' || user.blockStatus === 1) {
        return res.status(403).json({ message: 'Cannot credit fund to a disabled/blocked account' });
      }

      const saved = await Action.actInternally(user.uid, {
        amount: creditAmount,
        activity_name: 'add_fund',
        Status: 1,
        to_from: 'admin',
        panel: 'distributor',
        release: 1,
        metadata: {
          type: 'admin_send_fund',
          remark: String(remark || ''),
          sentBy: req.user?.uid || null,
          sentByUsername: req.user?.username || null,
          recipientUsername: user.username || '',
          recipientName: user.name || ''
        }
      });

      if (!saved || !saved.length) {
        return res.status(500).json({
          message: 'Failed to credit fund wallet. Check add_fund activity and wallet setup.'
        });
      }

      const balance = await getWalletBalance('distributor', user.uid, 'fund_wallet');

      return res.status(200).json({
        ...REQUEST_SUCCESS,
        message: `₹${creditAmount.toFixed(2)} credited to ${user.username}'s fund wallet`,
        data: {
          uid: user.uid,
          username: user.username,
          name: user.name || '',
          amount: creditAmount,
          balance,
          tx_Id: saved[0].tx_Id,
          remark: String(remark || '')
        }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  /**
   * History of admin send-fund credits (add_fund + metadata.type=admin_send_fund).
   */
  async getSendFundHistory(req, res) {
    try {
      const {
        uid,
        username,
        limit = 100,
        page = 1
      } = req.query;

      const filter = {
        source: 'add_fund',
        to_from: 'admin',
        panel: 'distributor',
        status: 1,
        'metadata.type': 'admin_send_fund'
      };

      if (uid != null && uid !== '') {
        filter.uid = Number(uid);
      } else if (username) {
        const uname = String(username).trim();
        const user = await Distributor.findOne({
          username: { $regex: `^${uname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
        }).select('uid');
        if (!user) {
          return res.status(200).json({ success: true, data: [], pagination: { page: 1, limit: 0, total: 0 } });
        }
        filter.uid = user.uid;
      }

      const take = Math.min(200, Math.max(1, Number(limit) || 100));
      const skip = Math.max(0, (Math.max(1, Number(page) || 1) - 1) * take);

      const [rows, total] = await Promise.all([
        Transaction.find(filter).sort({ time: -1, tx_Id: -1 }).skip(skip).limit(take).lean(),
        Transaction.countDocuments(filter)
      ]);

      const uids = [...new Set(rows.map((r) => r.uid).filter(Boolean))];
      const distributors = uids.length
        ? await Distributor.find({ uid: { $in: uids } }).select('uid username name').lean()
        : [];
      const byUid = Object.fromEntries(distributors.map((d) => [d.uid, d]));

      const data = rows.map((tx) => {
        const dist = byUid[tx.uid] || {};
        return {
          tx_Id: tx.tx_Id,
          uid: tx.uid,
          username: dist.username || tx.metadata?.recipientUsername || '',
          name: dist.name || tx.metadata?.recipientName || '',
          amount: Number(tx.amount) || 0,
          wallet_type: tx.wallet_type,
          remark: tx.metadata?.remark || tx.remark || '',
          sentBy: tx.metadata?.sentBy || null,
          sentByUsername: tx.metadata?.sentByUsername || null,
          time: tx.time || tx.createdAt,
          status: tx.status
        };
      });

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          page: Math.max(1, Number(page) || 1),
          limit: take,
          total
        }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }
}

module.exports = new PaymentSettings();
