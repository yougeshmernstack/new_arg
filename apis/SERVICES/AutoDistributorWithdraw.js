const CompanyInfo = require('../MODALS/CompanyInfo');
const kycDetails = require('../MODALS/KYC');
const Distributor = require('../MODALS/Distributor');
const Action = require('./Activity');
const { getWalletBalance } = require('../utils/panelWallet');
const { errorLogger } = require('../utils/logger');

const KYC_OK = [1, 2]; // 1=uploaded, 2=approved (reject=3 excluded)
const PANEL = 'distributor';
const MIN_AUTO_AMOUNT = 1;

async function getWithdrawalSettings() {
  let company = await CompanyInfo.findOne({});
  if (!company) {
    company = await new CompanyInfo().save();
  }

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

function allKycUploaded(kyc) {
  if (!kyc?.status) return false;
  const { pan, bank, aadhaar, nominee } = kyc.status;
  return (
    KYC_OK.includes(Number(pan)) &&
    KYC_OK.includes(Number(bank)) &&
    KYC_OK.includes(Number(aadhaar)) &&
    KYC_OK.includes(Number(nominee))
  );
}

function hasBankDetails(kyc) {
  const b = kyc?.bankDetails;
  return Boolean(b?.accountNumber && b?.ifscCode && b?.holderName);
}

/**
 * Weekly auto withdrawal: full main_wallet balance for distributors
 * who have all KYC types uploaded (pan, bank, aadhaar, nominee).
 * Amount floor is ₹1 (min_withdrawal bypassed). Pending requests do not block.
 */
async function runAutoDistributorWithdraw() {
  const summary = {
    startedAt: new Date().toISOString(),
    scanned: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  try {
    console.log('Auto distributor withdrawal started at:', new Date());

    const settings = await getWithdrawalSettings();
    if (settings.status !== 1) {
      console.log('Auto withdrawal skipped: withdrawals disabled by admin.');
      return summary;
    }

    const kycList = await kycDetails
      .find({
        'status.pan': { $in: KYC_OK },
        'status.bank': { $in: KYC_OK },
        'status.aadhaar': { $in: KYC_OK },
        'status.nominee': { $in: KYC_OK }
      })
      .lean();

    summary.scanned = kycList.length;
    console.log(`Auto withdrawal: ${kycList.length} distributors with all KYC uploaded.`);

    for (const kyc of kycList) {
      const uid = Number(kyc.uid);
      try {
        if (!allKycUploaded(kyc) || !hasBankDetails(kyc)) {
          summary.skipped += 1;
          continue;
        }

        const user = await Distributor.findOne({ uid }).select('status blockStatus').lean();
        if (!user || user.status === 'disabled' || Number(user.blockStatus) === 1) {
          summary.skipped += 1;
          continue;
        }

        let balance = await getWalletBalance(PANEL, uid, 'main_wallet');
        balance = Number(Number(balance).toFixed(2));

        if (!balance || balance < MIN_AUTO_AMOUNT) {
          summary.skipped += 1;
          continue;
        }

        const amount = Math.min(balance, settings.max_withdrawal);
        if (amount < MIN_AUTO_AMOUNT) {
          summary.skipped += 1;
          continue;
        }

        const { requestAmount, tds, adminCharge, payable } = calcCharges(amount, settings);
        if (payable <= 0) {
          summary.skipped += 1;
          continue;
        }

        const account = {
          bankName: kyc.bankDetails?.bankName || '',
          accountNumber: kyc.bankDetails?.accountNumber || '',
          ifscCode: kyc.bankDetails?.ifscCode || '',
          holderName: kyc.bankDetails?.holderName || '',
          accountType: kyc.bankDetails?.accountType || ''
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
            auto: true,
            tds_percent: settings.tds_percent,
            admin_charge_percent: settings.admin_charge_percent,
            request_amount: requestAmount,
            tds,
            admin_charge: adminCharge,
            payable
          }
        });

        if (!saved || !saved.length) {
          summary.failed += 1;
          summary.errors.push({ uid, reason: 'actInternally returned empty' });
          continue;
        }

        summary.created += 1;
        console.log(
          `Auto withdrawal created for uid ${uid}: amount=${requestAmount}, payable=${payable}, tx=${saved[0].tx_Id}`
        );
      } catch (err) {
        summary.failed += 1;
        summary.errors.push({ uid, reason: err.message || String(err) });
        errorLogger(err);
      }
    }

    console.log(
      `Auto distributor withdrawal done. created=${summary.created}, skipped=${summary.skipped}, failed=${summary.failed}`
    );
    return summary;
  } catch (error) {
    errorLogger(error);
    console.error('Error in Auto Distributor Withdrawal:', error);
    summary.errors.push({ reason: error.message || String(error) });
    return summary;
  }
}

module.exports = {
  runAutoDistributorWithdraw,
  allKycUploaded,
  hasBankDetails,
  MIN_AUTO_AMOUNT
};
