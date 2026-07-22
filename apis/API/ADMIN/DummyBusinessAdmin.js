const Distributor = require('../../MODALS/Distributor');
const DummyBusiness = require('../../MODALS/DummyBusiness');
const { INTERNAL_SERVER_ERROR, INVALID_REQUEST } = require('../../utils/errorMessages');
const { errorLogger } = require('../../utils/logger');
const { REQUEST_SUCCESS } = require('../../utils/successMessages');

function findDistributor({ uid, username }) {
  if (uid != null && uid !== '') {
    return Distributor.findOne({ uid: Number(uid) }).select('-password');
  }
  if (username) {
    const uname = String(username).trim();
    return Distributor.findOne({
      username: { $regex: `^${uname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    }).select('-password');
  }
  return Promise.resolve(null);
}

class DummyBusinessAdmin {
  /**
   * Grant dummy BV to a single distributor (left or right).
   * Only updates that user's left_dummy_bv / right_dummy_bv — never package_bv or upline/downline.
   */
  async grantDummyBusiness(req, res) {
    try {
      const {
        uid,
        username,
        amount,
        side,
        remark = ''
      } = req.body;

      const creditAmount = Number(amount);
      if (!creditAmount || creditAmount <= 0) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'Valid amount is required' });
      }

      const sideKey = String(side || '').toLowerCase();
      if (sideKey !== 'left' && sideKey !== 'right') {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'Side must be left or right' });
      }

      const user = await findDistributor({ uid, username });
      if (!user) {
        return res.status(404).json({ message: 'User not found. Provide a valid uid or username.' });
      }

      if (user.status === 'disabled' || user.blockStatus === 1) {
        return res.status(403).json({ message: 'Cannot grant dummy business to a disabled/blocked account' });
      }

      const field = sideKey === 'left' ? 'left_dummy_bv' : 'right_dummy_bv';
      const updated = await Distributor.findOneAndUpdate(
        { uid: user.uid },
        { $inc: { [field]: creditAmount } },
        { new: true }
      ).select('uid username name left_dummy_bv right_dummy_bv');

      if (!updated) {
        return res.status(500).json({ message: 'Failed to update distributor dummy BV' });
      }

      const entry = await DummyBusiness.create({
        uid: updated.uid,
        username: updated.username || user.username || '',
        name: updated.name || user.name || '',
        side: sideKey,
        amount: Math.round(creditAmount * 100) / 100,
        remark: String(remark || ''),
        givenBy: req.user?.uid ?? null,
        givenByUsername: req.user?.username || '',
        left_dummy_bv_after: Number(updated.left_dummy_bv) || 0,
        right_dummy_bv_after: Number(updated.right_dummy_bv) || 0
      });

      return res.status(200).json({
        ...REQUEST_SUCCESS,
        message: `₹${creditAmount.toFixed(2)} ${sideKey} dummy BV granted to ${updated.username}`,
        data: {
          id: entry._id,
          uid: updated.uid,
          username: updated.username,
          name: updated.name || '',
          side: sideKey,
          amount: creditAmount,
          left_dummy_bv: Number(updated.left_dummy_bv) || 0,
          right_dummy_bv: Number(updated.right_dummy_bv) || 0,
          remark: String(remark || ''),
          createdAt: entry.createdAt
        }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  /**
   * Admin history of dummy business grants (table: dummy_business).
   */
  async getDummyBusinessHistory(req, res) {
    try {
      const {
        uid,
        username,
        side,
        limit = 100,
        page = 1
      } = req.query;

      const filter = {};

      if (uid != null && uid !== '') {
        filter.uid = Number(uid);
      } else if (username) {
        const uname = String(username).trim();
        const user = await Distributor.findOne({
          username: { $regex: `^${uname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
        }).select('uid');
        if (!user) {
          return res.status(200).json({
            success: true,
            data: [],
            pagination: { page: 1, limit: 0, total: 0 }
          });
        }
        filter.uid = user.uid;
      }

      if (side === 'left' || side === 'right') {
        filter.side = side;
      }

      const take = Math.min(200, Math.max(1, Number(limit) || 100));
      const skip = Math.max(0, (Math.max(1, Number(page) || 1) - 1) * take);

      const [rows, total] = await Promise.all([
        DummyBusiness.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
        DummyBusiness.countDocuments(filter)
      ]);

      return res.status(200).json({
        success: true,
        data: rows.map((row) => ({
          id: row._id,
          uid: row.uid,
          username: row.username,
          name: row.name,
          side: row.side,
          amount: row.amount,
          remark: row.remark || '',
          givenBy: row.givenBy,
          givenByUsername: row.givenByUsername || '',
          left_dummy_bv_after: row.left_dummy_bv_after,
          right_dummy_bv_after: row.right_dummy_bv_after,
          time: row.createdAt
        })),
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

module.exports = new DummyBusinessAdmin();
