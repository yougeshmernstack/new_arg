const RankRewardService = require('../../SERVICES/RankReward');
const RankAchievement = require('../../MODALS/RankAchievement');
const { INTERNAL_SERVER_ERROR, INVALID_REQUEST } = require('../../utils/errorMessages');
const { errorLogger } = require('../../utils/logger');
const { REQUEST_SUCCESS } = require('../../utils/successMessages');

const TYPES = RankRewardService.TYPES;

class RankRewardAdmin {
  constructor() {
    this.getRewardList = this.getRewardList.bind(this);
    this.getRoyalityList = this.getRoyalityList.bind(this);
    this.getTravelingList = this.getTravelingList.bind(this);
    this.markComplete = this.markComplete.bind(this);
  }

  async list(req, res, type) {
    try {
      if (!TYPES.includes(type)) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'Invalid type' });
      }

      const { status, uid, username, limit, skip } = req.query;
      const result = await RankRewardService.listAchievements({
        type,
        status,
        uid,
        username,
        limit,
        skip
      });

      return res.status(200).json({
        ...REQUEST_SUCCESS,
        data: result.data,
        total: result.total
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  getRewardList(req, res) {
    return this.list(req, res, 'reward');
  }

  getRoyalityList(req, res) {
    return this.list(req, res, 'royality');
  }

  getTravelingList(req, res) {
    return this.list(req, res, 'traveling_bonus');
  }

  async markComplete(req, res) {
    try {
      const { id, remark = '' } = req.body;
      if (!id) {
        return res.status(400).json({ ...INVALID_REQUEST, message: 'id is required' });
      }

      const updated = await RankAchievement.findByIdAndUpdate(
        id,
        {
          $set: {
            status: 1,
            remark: String(remark || ''),
            reviewedAt: new Date(),
            reviewedBy: req.user?.uid ?? null
          }
        },
        { new: true }
      ).lean();

      if (!updated) {
        return res.status(404).json({ message: 'Achievement not found' });
      }

      return res.status(200).json({
        ...REQUEST_SUCCESS,
        message: 'Marked as completed',
        data: updated
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }
}

module.exports = new RankRewardAdmin();
