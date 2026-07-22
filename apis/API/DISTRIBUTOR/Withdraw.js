const CompanyInfo = require('../../MODALS/CompanyInfo');
const kycDetails = require('../../MODALS/KYC');
const Transaction = require('../../MODALS/transactions');
const Distributor = require('../../MODALS/Distributor');
const Action = require('../../SERVICES/Activity');
const { getWalletBalance } = require('../../utils/panelWallet');
const { INTERNAL_SERVER_ERROR, INVALID_REQUEST, INSUFFICIENT_FUND } = require('../../utils/errorMessages');
const { errorLogger } = require('../../utils/logger');
const { REQUEST_SUCCESS } = require('../../utils/successMessages');

const KYC_APPROVED = 2;
const PANEL = 'distributor';

async function getWithdrawalSettings() {
  let company = await CompanyInfo.findOne({});
  if (!company) {
    company = await new CompanyInfo().save();
  }

  // Backfill defaults on older documents missing withdrawal block
  if (!company.withdrawal || company.withdrawal.tds_percent == null) {
    company.withdrawal = {
      status: company.withdrawal?.status ?? 1,
      tds_percent: company.withdrawal?.tds_percent ?? 2,
      admin_charge_percent: company.withdrawal?.admin_charge_percent ?? 5,
      min_withdrawal: company.withdrawal?.min_withdrawal ?? 100,
      max_withdrawal: company.withdrawal?.max_withdrawal ?? 1e18
    };
    await company.save();
  }

  const w = company.withdrawal;
  return {
    status: Number(w.status ?? 1),
    tds_percent: Number(w.tds_percent ?? 2),
    admin_charge_percent: Number(w.admin_charge_percent ?? 5),
    min_withdrawal: Number(w.min_withdrawal ?? 100),
    max_withdrawal: Number(w.max_withdrawal ?? 1e18)
  };
}

function calcCharges(amount, settings) {
  const requestAmount = Number(amount);
  const tds = Number(((requestAmount * settings.tds_percent) / 100).toFixed(2));
  const adminCharge = Number(((requestAmount * settings.admin_charge_percent) / 100).toFixed(2));
  const payable = Number((requestAmount - tds - adminCharge).toFixed(2));
  return { requestAmount, tds, adminCharge, payable };
}

function kycGate(kyc) {
  if (!kyc) {
    return {
      locked: true,
      reason: 'Submit your KYC to unlock withdrawals.',
      kycStatus: { pan: 0, bank: 0, aadhaar: 0, nominee: 0 },
      bankDetails: null
    };
  }

  const status = {
    pan: Number(kyc.status?.pan ?? 0),
    bank: Number(kyc.status?.bank ?? 0),
    aadhaar: Number(kyc.status?.aadhaar ?? 0),
    nominee: Number(kyc.status?.nominee ?? 0)
  };

  // Bank KYC must be approved for payout; otherwise withdrawal stays locked
  if (status.bank !== KYC_APPROVED) {
    let reason = 'Withdrawal is locked until your Bank KYC is approved.';
    if (status.bank === 0) reason = 'Submit your Bank KYC to unlock withdrawals.';
    else if (status.bank === 1) reason = 'Your Bank KYC is under review. Withdrawal will unlock after approval.';
    else if (status.bank === 3) reason = 'Your Bank KYC was rejected. Re-submit KYC to unlock withdrawals.';
    return { locked: true, reason, kycStatus: status, bankDetails: kyc.bankDetails || null };
  }

  return {
    locked: false,
    reason: null,
    kycStatus: status,
    bankDetails: kyc.bankDetails || null
  };
}

class DistributorWithdraw {
  constructor() {
    this.getWithdrawInfo = this.getWithdrawInfo.bind(this);
    this.requestWithdraw = this.requestWithdraw.bind(this);
    this.getWithdrawHistory = this.getWithdrawHistory.bind(this);
  }

  async getWithdrawInfo(req, res) {
    try {
      const { uid } = req.user;
      const [settings, balance, kyc] = await Promise.all([
        getWithdrawalSettings(),
        getWalletBalance(PANEL, uid, 'main_wallet'),
        kycDetails.findOne({ uid }).lean()
      ]);

      const gate = kycGate(kyc);
      const preview = calcCharges(1000, settings);

      return res.status(200).json({
        success: true,
        data: {
          balance,
          locked: gate.locked || settings.status !== 1,
          lockReason:
            settings.status !== 1
              ? 'Withdrawals are temporarily disabled by admin.'
              : gate.reason,
          kycStatus: gate.kycStatus,
          bankDetails: gate.bankDetails,
          settings: {
            tds_percent: settings.tds_percent,
            admin_charge_percent: settings.admin_charge_percent,
            min_withdrawal: settings.min_withdrawal,
            max_withdrawal: settings.max_withdrawal,
            status: settings.status
          },
          previewExample: {
            requestAmount: 1000,
            tds: preview.tds,
            adminCharge: preview.adminCharge,
            payable: preview.payable
          }
        }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async requestWithdraw(req, res) {
    try {
      const { uid } = req.user;
      const amount = Number(req.body.amount);

      if (!amount || amount <= 0 || Number.isNaN(amount)) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'Enter a valid withdrawal amount.' });
      }

      const settings = await getWithdrawalSettings();
      if (settings.status !== 1) {
        return res.status(400).json({ message: 'Withdrawals are temporarily disabled by admin.' });
      }

      if (amount < settings.min_withdrawal || amount > settings.max_withdrawal) {
        return res.status(400).json({
          message: `Withdrawal amount must be between ${settings.min_withdrawal} and ${settings.max_withdrawal}.`
        });
      }

      const user = await Distributor.findOne({ uid }).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'Distributor not found.' });
      }
      if (user.status === 'disabled' || Number(user.blockStatus) === 1) {
        return res.status(403).json({ message: 'Your account is blocked. Withdrawal is not allowed.' });
      }

      const kyc = await kycDetails.findOne({ uid }).lean();
      const gate = kycGate(kyc);
      if (gate.locked) {
        return res.status(403).json({ message: gate.reason, locked: true });
      }

      const balance = await getWalletBalance(PANEL, uid, 'main_wallet');
      if (balance < amount) {
        return res.status(400).json({ ...INSUFFICIENT_FUND, message: 'Insufficient main wallet balance.' });
      }

      const { requestAmount, tds, adminCharge, payable } = calcCharges(amount, settings);
      if (payable <= 0) {
        return res.status(400).json({ message: 'Payable amount after charges must be greater than zero.' });
      }

      const account = {
        bankName: gate.bankDetails?.bankName || '',
        accountNumber: gate.bankDetails?.accountNumber || '',
        ifscCode: gate.bankDetails?.ifscCode || '',
        holderName: gate.bankDetails?.holderName || '',
        accountType: gate.bankDetails?.accountType || ''
      };

      const saved = await Action.actInternally(uid, {
        amount: requestAmount,
        activity_name: 'withdrawal',
        Status: 0,
        to_from: 'admin',
        panel: PANEL,
        release: 1,
        TDS: tds,
        tx_charge: adminCharge,
        withdrawal_amount: payable,
        account,
        pancard: kyc?.panDetails?.panNumber || null,
        metadata: {
          tds_percent: settings.tds_percent,
          admin_charge_percent: settings.admin_charge_percent,
          request_amount: requestAmount,
          tds,
          admin_charge: adminCharge,
          payable
        }
      });

      if (!saved || !saved.length) {
        return res.status(500).json({
          message: 'Failed to create withdrawal request. Check balance and try again.'
        });
      }

      const tx = saved[0];
      return res.status(200).json({
        ...REQUEST_SUCCESS,
        message: 'Withdrawal request submitted successfully.',
        data: {
          tx_Id: tx.tx_Id,
          amount: requestAmount,
          tds,
          admin_charge: adminCharge,
          payable,
          status: 0,
          account
        }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async getWithdrawHistory(req, res) {
    try {
      const { uid } = req.user;
      const { status, page = 1, limit = 20 } = req.query;
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

      const filter = {
        uid: Number(uid),
        panel: PANEL,
        source: 'withdrawal'
      };
      if (status !== undefined && status !== '' && status !== 'all') {
        filter.status = Number(status);
      }

      const [rows, total] = await Promise.all([
        Transaction.find(filter)
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
        Transaction.countDocuments(filter)
      ]);

      const data = rows.map((tx) => ({
        tx_Id: tx.tx_Id,
        amount: Number(tx.amount || 0),
        tds: Number(tx.TDS || 0),
        admin_charge: Number(tx.tx_charge || 0),
        payable: Number(tx.withdrawal_amount || 0),
        status: Number(tx.status ?? 0),
        remark: tx.remark || '',
        account: tx.account || null,
        createdAt: tx.createdAt || tx.time,
        reviewedAt: tx.updatedAt
      }));

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
}

module.exports = new DistributorWithdraw();
