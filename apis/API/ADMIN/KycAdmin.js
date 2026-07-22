const kycDetails = require('../../MODALS/KYC');
const Distributor = require('../../MODALS/Distributor');
const { INTERNAL_SERVER_ERROR, INVALID_REQUEST } = require('../../utils/errorMessages');
const { errorLogger } = require('../../utils/logger');
const { REQUEST_SUCCESS } = require('../../utils/successMessages');

const KYC_TYPES = ['pan', 'bank', 'aadhaar', 'nominee'];
const STATUS = { PENDING: 0, UPLOADED: 1, APPROVED: 2, REJECTED: 3 };

const DETAILS_KEY = {
  pan: 'panDetails',
  bank: 'bankDetails',
  aadhaar: 'aadhaarDetails',
  nominee: 'nomineeDetails',
};

class KycAdmin {
  constructor() {
    this.getKycList = this.getKycList.bind(this);
    this.getKyc = this.getKyc.bind(this);
    this.approveKyc = this.approveKyc.bind(this);
    this.rejectKyc = this.rejectKyc.bind(this);
  }

  async distributorMap(uids) {
    const list = await Distributor.find({ uid: { $in: uids } })
      .select('uid username name mobile')
      .lean();
    return list.reduce((acc, d) => {
      acc[d.uid] = d;
      return acc;
    }, {});
  }

  async getKycList(req, res) {
    try {
      const { status, type } = req.query;
      const kycType = type && KYC_TYPES.includes(type) ? type : null;
      const statusFilter =
        status !== undefined && status !== '' && status !== 'all' ? Number(status) : null;

      const docs = await kycDetails.find().sort({ updatedAt: -1 }).limit(500).lean();
      const uids = docs.map((d) => d.uid);
      const distMap = await this.distributorMap(uids);

      const rows = [];
      for (const doc of docs) {
        const types = kycType ? [kycType] : KYC_TYPES;
        for (const t of types) {
          const st = doc.status?.[t] ?? STATUS.PENDING;
          if (statusFilter !== null && st !== statusFilter) continue;
          // Skip pure pending with no details unless filtering for pending explicitly
          if (st === STATUS.PENDING && !doc[DETAILS_KEY[t]]) continue;

          rows.push({
            uid: doc.uid,
            type: t,
            status: st,
            remark: doc.remarks?.[t] || '',
            details: doc[DETAILS_KEY[t]] || null,
            reviewedAt: doc.reviewedAt?.[t] || null,
            reviewedBy: doc.reviewedBy?.[t] || null,
            updatedAt: doc.updatedAt,
            createdAt: doc.createdAt,
            distributor: distMap[doc.uid] || null,
          });
        }
      }

      rows.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

      return res.status(200).json({ success: true, data: rows });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async getKyc(req, res) {
    try {
      const uid = Number(req.query.uid);
      if (!uid) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'uid is required.' });
      }

      const doc = await kycDetails.findOne({ uid }).lean();
      const distributor = await Distributor.findOne({ uid })
        .select('uid username name mobile email')
        .lean();

      if (!doc) {
        return res.status(200).json({
          success: true,
          data: {
            uid,
            distributor,
            panDetails: null,
            bankDetails: null,
            aadhaarDetails: null,
            nomineeDetails: null,
            status: { pan: 0, bank: 0, aadhaar: 0, nominee: 0 },
            remarks: { pan: '', bank: '', aadhaar: '', nominee: '' },
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: { ...doc, distributor },
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async approveKyc(req, res) {
    try {
      const uid = Number(req.body.uid);
      const type = String(req.body.type || '').trim();
      const remark = String(req.body.remark || '').trim();

      if (!uid || !KYC_TYPES.includes(type)) {
        return res.status(400).json({
          ...INVALID_REQUEST,
          message: 'uid and valid type (pan|bank|aadhaar|nominee) are required.',
        });
      }

      const doc = await kycDetails.findOne({ uid });
      if (!doc) {
        return res.status(404).json({ message: 'KYC record not found.' });
      }
      if (doc.status[type] !== STATUS.UPLOADED) {
        return res.status(400).json({ message: 'Only uploaded KYC can be approved.' });
      }

      doc.status[type] = STATUS.APPROVED;
      doc.remarks[type] = remark || 'Approved';
      doc.reviewedAt[type] = new Date();
      doc.reviewedBy[type] = req.user?.uid || null;
      await doc.save();

      return res.status(200).json({
        ...REQUEST_SUCCESS,
        message: `${type} KYC approved.`,
        data: doc,
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async rejectKyc(req, res) {
    try {
      const uid = Number(req.body.uid);
      const type = String(req.body.type || '').trim();
      const remark = String(req.body.remark || '').trim();

      if (!uid || !KYC_TYPES.includes(type)) {
        return res.status(400).json({
          ...INVALID_REQUEST,
          message: 'uid and valid type (pan|bank|aadhaar|nominee) are required.',
        });
      }

      const doc = await kycDetails.findOne({ uid });
      if (!doc) {
        return res.status(404).json({ message: 'KYC record not found.' });
      }
      if (doc.status[type] !== STATUS.UPLOADED) {
        return res.status(400).json({ message: 'Only uploaded KYC can be rejected.' });
      }

      doc.status[type] = STATUS.REJECTED;
      doc.remarks[type] = remark || 'Rejected';
      doc.reviewedAt[type] = new Date();
      doc.reviewedBy[type] = req.user?.uid || null;
      await doc.save();

      return res.status(200).json({
        ...REQUEST_SUCCESS,
        message: `${type} KYC rejected.`,
        data: doc,
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }
}

module.exports = new KycAdmin();
