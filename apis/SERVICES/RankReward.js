const PlansInfo = require('../MODALS/Plan');
const RankAchievement = require('../MODALS/RankAchievement');
const Distributor = require('../MODALS/Distributor');
const { getConsumedBv } = require('./BinaryMatching');
const { errorLogger } = require('../utils/logger');

const TYPES = ['reward', 'royality', 'traveling_bonus'];

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function planTiers(plan, type) {
  const list = plan?.[type];
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => Number(a.matched_business) - Number(b.matched_business));
}

/**
 * Check & create achievements for one distributor against plan tiers.
 * Condition: lifetime matched BV >= tier.matched_business
 */
async function checkAndAchieveForUid(uid, options = {}) {
  const myUid = Number(uid);
  if (!myUid) return { achieved: [] };

  const plan = options.plan
    || (await PlansInfo.ensurePlanData?.())
    || (await PlansInfo.findOne({ planId: 1 }));
  if (!plan) return { achieved: [] };

  const dist = options.distributor
    || (await Distributor.findOne({ uid: myUid }).select('uid username name').lean());
  if (!dist) return { achieved: [] };

  const consumed = await getConsumedBv(myUid);
  const matchedBv = round2(consumed.matched || 0);

  const types = options.types || TYPES;
  const newlyAchieved = [];

  for (const type of types) {
    const tiers = planTiers(plan, type);
    for (const tier of tiers) {
      const need = Number(tier.matched_business) || 0;
      if (need <= 0 || matchedBv < need) continue;

      const rankId = Number(tier.rank_id);
      const existing = await RankAchievement.findOne({
        uid: myUid,
        type,
        rank_id: rankId
      }).lean();
      if (existing) continue;

      try {
        const doc = await RankAchievement.create({
          uid: myUid,
          username: dist.username || '',
          name: dist.name || '',
          type,
          rank_id: rankId,
          rank_name: tier.rank_name || '',
          matched_business: need,
          matched_bv_at_achieve: matchedBv,
          reward_amount: Number(tier.reward_amount) || 0,
          income: Number(tier.income) || 0,
          reward_item: tier.reward_item || '',
          status: 0,
          achievedAt: new Date()
        });
        newlyAchieved.push(doc.toObject());
      } catch (err) {
        // Duplicate key = already achieved (race) — ignore
        if (err?.code !== 11000) {
          errorLogger(err);
        }
      }
    }
  }

  return { matchedBv, achieved: newlyAchieved };
}

/**
 * Build progress view for distributor: all tiers + achievement status.
 */
async function getProgressForUid(uid, type) {
  if (!TYPES.includes(type)) {
    throw new Error('Invalid type');
  }

  const myUid = Number(uid);
  const plan = (await PlansInfo.ensurePlanData?.()) || (await PlansInfo.findOne({ planId: 1 }));
  const tiers = planTiers(plan, type);
  const consumed = await getConsumedBv(myUid);
  const matchedBv = round2(consumed.matched || 0);

  const achievements = await RankAchievement.find({ uid: myUid, type })
    .lean();
  const byRank = achievements.reduce((acc, a) => {
    acc[a.rank_id] = a;
    return acc;
  }, {});

  const ranks = tiers.map((tier) => {
    const need = Number(tier.matched_business) || 0;
    const ach = byRank[Number(tier.rank_id)];
    const achieved = Boolean(ach);
    const progress = need > 0 ? Math.min(100, round2((matchedBv / need) * 100)) : 0;
    const remaining = Math.max(0, round2(need - matchedBv));

    return {
      rank_id: Number(tier.rank_id),
      rank_name: tier.rank_name || '',
      matched_business: need,
      reward_amount: Number(tier.reward_amount) || 0,
      income: Number(tier.income) || 0,
      reward_item: tier.reward_item || '',
      achieved,
      status: ach?.status ?? null,
      achievedAt: ach?.achievedAt || null,
      matched_bv_at_achieve: ach?.matched_bv_at_achieve ?? null,
      progress,
      remaining
    };
  });

  const achievedCount = ranks.filter((r) => r.achieved).length;
  const next = ranks.find((r) => !r.achieved) || null;

  return {
    type,
    matched_bv: matchedBv,
    achieved_count: achievedCount,
    total_ranks: ranks.length,
    next_rank: next,
    ranks
  };
}

/**
 * Admin list of achievements for a type.
 */
async function listAchievements({ type, status, uid, username, limit = 100, skip = 0 } = {}) {
  if (!TYPES.includes(type)) {
    throw new Error('Invalid type');
  }

  const filter = { type };
  if (status !== undefined && status !== '' && status !== 'all') {
    filter.status = Number(status);
  }
  if (uid != null && uid !== '') {
    filter.uid = Number(uid);
  }
  if (username) {
    const uname = String(username).trim();
    filter.username = { $regex: `^${uname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
  }

  const [data, total] = await Promise.all([
    RankAchievement.find(filter)
      .sort({ achievedAt: -1 })
      .skip(Number(skip) || 0)
      .limit(Math.min(Number(limit) || 100, 500))
      .lean(),
    RankAchievement.countDocuments(filter)
  ]);

  return { data, total, filter: { type, status: filter.status ?? 'all' } };
}

module.exports = {
  TYPES,
  checkAndAchieveForUid,
  getProgressForUid,
  listAchievements,
  planTiers
};
