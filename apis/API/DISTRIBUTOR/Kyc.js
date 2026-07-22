const kycDetails = require('../../MODALS/KYC');
const { INTERNAL_SERVER_ERROR, INVALID_REQUEST } = require('../../utils/errorMessages');
const { errorLogger } = require('../../utils/logger');
const { REQUEST_SUCCESS } = require('../../utils/successMessages');

const KYC_TYPES = ['pan', 'bank', 'aadhaar', 'nominee'];
const STATUS = { PENDING: 0, UPLOADED: 1, APPROVED: 2, REJECTED: 3 };

function emptyKyc(uid) {
  return {
    uid,
    panDetails: null,
    bankDetails: null,
    aadhaarDetails: null,
    nomineeDetails: null,
    status: { pan: 0, bank: 0, aadhaar: 0, nominee: 0 },
    remarks: { pan: '', bank: '', aadhaar: '', nominee: '' },
    reviewedAt: {},
    reviewedBy: {},
  };
}

function fileUrl(filename) {
  return `/uploads/${filename}`;
}

function canUpload(status) {
  return status === STATUS.PENDING || status === STATUS.REJECTED || status === undefined || status === null;
}

class DistributorKyc {
  constructor() {
    this.getKyc = this.getKyc.bind(this);
    this.submitPanKyc = this.submitPanKyc.bind(this);
    this.submitBankKyc = this.submitBankKyc.bind(this);
    this.submitAadhaarKyc = this.submitAadhaarKyc.bind(this);
    this.submitNomineeKyc = this.submitNomineeKyc.bind(this);
  }

  async getOrCreate(uid) {
    let doc = await kycDetails.findOne({ uid });
    if (!doc) {
      doc = await new kycDetails({ uid }).save();
    }
    return doc;
  }

  async getKyc(req, res) {
    try {
      const { uid } = req.user;
      const doc = await kycDetails.findOne({ uid }).lean();
      if (!doc) {
        return res.status(200).json({ success: true, data: emptyKyc(uid) });
      }
      return res.status(200).json({ success: true, data: doc });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async assertUploadable(uid, type) {
    const doc = await this.getOrCreate(uid);
    const current = doc.status?.[type];
    if (!canUpload(current)) {
      const err = new Error(
        `KYC for ${type} cannot be submitted in current status. Wait for review or re-submit only after rejection.`
      );
      err.statusCode = 400;
      throw err;
    }
    return doc;
  }

  async submitPanKyc(req, res) {
    try {
      const { uid } = req.user;
      const panNumber = String(req.body.panNumber || '').trim().toUpperCase();
      if (!panNumber) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'PAN number is required.' });
      }
      if (!req.file) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'PAN document image is required.' });
      }

      const doc = await this.assertUploadable(uid, 'pan');
      doc.panDetails = { panNumber, document: fileUrl(req.file.filename) };
      doc.status.pan = STATUS.UPLOADED;
      doc.remarks.pan = '';
      doc.reviewedAt.pan = undefined;
      doc.reviewedBy.pan = undefined;
      await doc.save();

      return res.status(200).json({
        ...REQUEST_SUCCESS,
        message: 'PAN KYC submitted successfully.',
        data: doc,
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async submitBankKyc(req, res) {
    try {
      const { uid } = req.user;
      const accountNumber = String(req.body.accountNumber || '').trim();
      const ifscCode = String(req.body.ifscCode || '').trim().toUpperCase();
      const bankName = String(req.body.bankName || '').trim();
      const holderName = String(req.body.holderName || '').trim();
      const accountType = String(req.body.accountType || '').trim();

      if (!accountNumber || !ifscCode || !bankName || !holderName || !accountType) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'All bank fields are required.' });
      }
      if (!['Saving', 'Current'].includes(accountType)) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'accountType must be Saving or Current.' });
      }
      if (!req.file) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'Bank document image is required.' });
      }

      const doc = await this.assertUploadable(uid, 'bank');
      doc.bankDetails = {
        accountNumber,
        ifscCode,
        bankName,
        holderName,
        accountType,
        document: fileUrl(req.file.filename),
      };
      doc.status.bank = STATUS.UPLOADED;
      doc.remarks.bank = '';
      doc.reviewedAt.bank = undefined;
      doc.reviewedBy.bank = undefined;
      await doc.save();

      return res.status(200).json({
        ...REQUEST_SUCCESS,
        message: 'Bank KYC submitted successfully.',
        data: doc,
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async submitAadhaarKyc(req, res) {
    try {
      const { uid } = req.user;
      const aadhaarNumber = String(req.body.aadhaarNumber || '').trim();
      if (!aadhaarNumber) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'Aadhaar number is required.' });
      }
      const front = req.files?.documentFront?.[0];
      const back = req.files?.documentBack?.[0];
      if (!front || !back) {
        return res.status(400).json({
          ...INVALID_REQUEST,
          message: 'Aadhaar front and back images are required.',
        });
      }

      const doc = await this.assertUploadable(uid, 'aadhaar');
      doc.aadhaarDetails = {
        aadhaarNumber,
        documentFront: fileUrl(front.filename),
        documentBack: fileUrl(back.filename),
      };
      doc.status.aadhaar = STATUS.UPLOADED;
      doc.remarks.aadhaar = '';
      doc.reviewedAt.aadhaar = undefined;
      doc.reviewedBy.aadhaar = undefined;
      await doc.save();

      return res.status(200).json({
        ...REQUEST_SUCCESS,
        message: 'Aadhaar KYC submitted successfully.',
        data: doc,
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async submitNomineeKyc(req, res) {
    try {
      const { uid } = req.user;
      const nomineeName = String(req.body.nomineeName || '').trim();
      const relation = String(req.body.relation || '').trim();
      const mobile = String(req.body.mobile || '').trim();

      if (!nomineeName || !relation || !mobile) {
        return res.status(400).json({
          ...INVALID_REQUEST,
          message: 'Nominee name, relation and mobile are required.',
        });
      }
      if (!req.file) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'Nominee document image is required.' });
      }

      const doc = await this.assertUploadable(uid, 'nominee');
      doc.nomineeDetails = {
        nomineeName,
        relation,
        mobile,
        document: fileUrl(req.file.filename),
      };
      doc.status.nominee = STATUS.UPLOADED;
      doc.remarks.nominee = '';
      doc.reviewedAt.nominee = undefined;
      doc.reviewedBy.nominee = undefined;
      await doc.save();

      return res.status(200).json({
        ...REQUEST_SUCCESS,
        message: 'Nominee KYC submitted successfully.',
        data: doc,
      });
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }
}

module.exports = new DistributorKyc();
module.exports.KYC_TYPES = KYC_TYPES;
module.exports.STATUS = STATUS;
