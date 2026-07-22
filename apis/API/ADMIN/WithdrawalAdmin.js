const Transaction = require('../../MODALS/transactions');
const Distributor = require('../../MODALS/Distributor');
const Action = require('../../SERVICES/Activity');
const { getWalletBalance, updatePanelWalletValue } = require('../../utils/panelWallet');
const { INTERNAL_SERVER_ERROR, INVALID_REQUEST } = require('../../utils/errorMessages');
const { errorLogger } = require('../../utils/logger');
const { REQUEST_SUCCESS } = require('../../utils/successMessages');

const PANEL = 'distributor';

class WithdrawalAdmin {
  constructor() {
    this.getWithdrawals = this.getWithdrawals.bind(this);
    this.approveWithdrawal = this.approveWithdrawal.bind(this);
    this.rejectWithdrawal = this.rejectWithdrawal.bind(this);
  }

  async getWithdrawals(req, res) {
    try {
      const { status, uid, page = 1, limit = 50 } = req.query;
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));

      const filter = {
        panel: PANEL,
        source: 'withdrawal'
      };
      if (status !== undefined && status !== '' && status !== 'all') {
        filter.status = Number(status);
      }
      if (uid !== undefined && uid !== '') {
        filter.uid = Number(uid);
      }

      const [rows, total] = await Promise.all([
        Transaction.find(filter)
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
        Transaction.countDocuments(filter)
      ]);

      const uids = [...new Set(rows.map((r) => r.uid))];
      const users = await Distributor.find({ uid: { $in: uids } })
        .select('uid username name mobile email')
        .lean();
      const userMap = Object.fromEntries(users.map((u) => [u.uid, u]));

      const data = rows.map((tx) => {
        const user = userMap[tx.uid] || {};
        return {
          tx_Id: tx.tx_Id,
          uid: tx.uid,
          username: user.username || '',
          name: user.name || '',
          mobile: user.mobile || '',
          amount: Number(tx.amount || 0),
          tds: Number(tx.TDS || 0),
          admin_charge: Number(tx.tx_charge || 0),
          payable: Number(tx.withdrawal_amount || 0),
          status: Number(tx.status ?? 0),
          remark: tx.remark || '',
          account: tx.account || null,
          pancard: tx.pancard || null,
          tx_hash: tx.tx_hash || null,
          metadata: tx.metadata || null,
          createdAt: tx.createdAt || tx.time,
          updatedAt: tx.updatedAt
        };
      });

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.max(1, Math.ceil(total / limitNum))
        }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async approveWithdrawal(req, res) {
    try {
      const { tx_Id, remark, tx_hash } = req.body;
      if (!tx_Id) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'tx_Id is required' });
      }

      const tx = await Transaction.findOne({
        tx_Id: Number(tx_Id),
        source: 'withdrawal',
        panel: PANEL
      });

      if (!tx) {
        return res.status(404).json({ message: 'Withdrawal request not found.' });
      }
      if (Number(tx.status) !== 0) {
        return res.status(400).json({ message: 'Request is not pending.' });
      }

      tx.status = 1;
      tx.remark = remark || tx.remark || 'Approved';
      if (tx_hash) tx.tx_hash = String(tx_hash);

      await tx.save();

      // Track lifetime withdrawal on distributor wallet
      try {
        const current = await getWalletBalance(PANEL, tx.uid, 'total_withdrawal');
        await updatePanelWalletValue(PANEL, tx.uid, 'total_withdrawal', current + Number(tx.amount || 0));
      } catch (trackErr) {
        errorLogger(trackErr);
      }

      return res.status(200).json({
        ...REQUEST_SUCCESS,
        message: 'Withdrawal approved successfully.',
        data: {
          tx_Id: tx.tx_Id,
          amount: Number(tx.amount || 0),
          tds: Number(tx.TDS || 0),
          admin_charge: Number(tx.tx_charge || 0),
          payable: Number(tx.withdrawal_amount || 0),
          status: 1
        }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async rejectWithdrawal(req, res) {
    try {
      const { tx_Id, remark } = req.body;
      if (!tx_Id) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'tx_Id is required' });
      }

      const tx = await Transaction.findOne({
        tx_Id: Number(tx_Id),
        source: 'withdrawal',
        panel: PANEL
      });

      if (!tx) {
        return res.status(404).json({ message: 'Withdrawal request not found.' });
      }
      if (Number(tx.status) !== 0) {
        return res.status(400).json({ message: 'Request is not pending.' });
      }

      const refundAmount = Number(tx.amount || 0);
      if (refundAmount <= 0) {
        return res.status(400).json({ message: 'Invalid withdrawal amount to refund.' });
      }

      // Credit full requested amount back to main wallet
      const refunded = await Action.actInternally(tx.uid, {
        amount: refundAmount,
        activity_name: 'withdrawal_refund',
        Status: 1,
        to_from: 'admin',
        panel: PANEL,
        release: 1,
        reqest_tx_Id: String(tx.tx_Id),
        metadata: {
          refund_of_tx_Id: tx.tx_Id,
          reason: remark || 'Rejected'
        }
      });

      if (!refunded || !refunded.length) {
        return res.status(500).json({
          message: 'Failed to refund main wallet. Rejection aborted.'
        });
      }

      tx.status = 2;
      tx.remark = remark || 'Rejected';
      await tx.save();

      return res.status(200).json({
        ...REQUEST_SUCCESS,
        message: 'Withdrawal rejected and full amount credited back to main wallet.',
        data: {
          tx_Id: tx.tx_Id,
          amount: refundAmount,
          tds: Number(tx.TDS || 0),
          admin_charge: Number(tx.tx_charge || 0),
          payable: Number(tx.withdrawal_amount || 0),
          status: 2,
          refund_tx_Id: refunded[0].tx_Id
        }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }
}

module.exports = new WithdrawalAdmin();
