const RankRewardService = require('../../SERVICES/RankReward');
const { INTERNAL_SERVER_ERROR } = require('../../utils/errorMessages');
const { errorLogger } = require('../../utils/logger');
const { REQUEST_SUCCESS } = require('../../utils/successMessages');

class DistributorRankReward {
  constructor() {
    this.getRewardProgress = this.getRewardProgress.bind(this);
    this.getRoyalityProgress = this.getRoyalityProgress.bind(this);
    this.getTravelingProgress = this.getTravelingProgress.bind(this);
  }

  async progress(req, res, type) {
    try {
      const uid = Number(req.user?.uid);
      if (!uid) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Refresh achievements on view so newly crossed thresholds show up
      await RankRewardService.checkAndAchieveForUid(uid, { types: [type] });
      const data = await RankRewardService.getProgressForUid(uid, type);

      return res.status(200).json({ ...REQUEST_SUCCESS, data });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  getRewardProgress(req, res) {
    return this.progress(req, res, 'reward');
  }

  getRoyalityProgress(req, res) {
    return this.progress(req, res, 'royality');
  }

  getTravelingProgress(req, res) {
    return this.progress(req, res, 'traveling_bonus');
  }
}

module.exports = new DistributorRankReward();
