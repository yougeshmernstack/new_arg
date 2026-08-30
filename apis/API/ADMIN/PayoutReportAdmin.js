const Wallets = require('../../MODALS/wallets');
const Transaction = require('../../MODALS/transactions');
const Distributor = require('../../MODALS/Distributor');
const { INTERNAL_SERVER_ERROR } = require('../../utils/errorMessages');
const { errorLogger } = require('../../utils/logger');

function todayRange() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  return { todayStart, todayEnd };
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function baseIncomeMatch(slugs) {
  return {
    source: Array.isArray(slugs) ? { $in: slugs } : slugs,
    debit_credit: 'credit',
    status: { $ne: 2 },
    panel: 'distributor'
  };
}

async function loadIncomeWallets() {
  return Wallets.find({ status: 1, wallet_type: 'income' }, 'slug name')
    .sort({ id: 1 })
    .lean();
}

class PayoutReportAdmin {
  async getSummary(req, res) {
    try {
      const wallets = await loadIncomeWallets();
      const walletSlugs = wallets.map((w) => w.slug).filter(Boolean);
      const walletNameMap = Object.fromEntries(
        wallets.map((w) => [w.slug, w.name || w.slug])
      );

      if (walletSlugs.length === 0) {
        return res.status(200).json({
          status: 200,
          message: 'Payout report fetched.',
          data: {
            total: { totalAmount: 0, todayAmount: 0 },
            items: []
          }
        });
      }

      const { todayStart, todayEnd } = todayRange();

      const rows = await Transaction.aggregate([
        { $match: baseIncomeMatch(walletSlugs) },
        {
          $group: {
            _id: '$source',
            totalAmount: { $sum: '$amount' },
            transactionCount: { $sum: 1 },
            todayAmount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$time', todayStart] },
                      { $lte: ['$time', todayEnd] }
                    ]
                  },
                  '$amount',
                  0
                ]
              }
            }
          }
        }
      ]);

      const bySource = Object.fromEntries(rows.map((row) => [row._id, row]));

      const items = walletSlugs.map((slug) => {
        const hit = bySource[slug];
        return {
          slug,
          name: walletNameMap[slug] || slug,
          totalAmount: round2(hit?.totalAmount),
          todayAmount: round2(hit?.todayAmount),
          transactionCount: Number(hit?.transactionCount) || 0
        };
      });

      const total = {
        totalAmount: round2(items.reduce((sum, item) => sum + item.totalAmount, 0)),
        todayAmount: round2(items.reduce((sum, item) => sum + item.todayAmount, 0))
      };

      return res.status(200).json({
        status: 200,
        message: 'Payout report fetched.',
        data: { total, items }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }

  async getBySlug(req, res) {
    try {
      const slug = String(req.query.slug || req.params.slug || '').trim();
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(10000, Math.max(1, Number(req.query.limit) || 50));
      const { uid, username } = req.query;

      if (!slug) {
        return res.status(400).json({ status: 400, message: 'Income slug is required.' });
      }

      const catalog = await Wallets.findOne({
        slug,
        status: 1,
        wallet_type: 'income'
      }).lean();

      if (!catalog) {
        return res.status(404).json({ status: 404, message: 'Income type not found.' });
      }

      const match = baseIncomeMatch(slug);

      if (uid != null && uid !== '') {
        match.uid = Number(uid);
      } else if (username) {
        const uname = String(username).trim();
        const user = await Distributor.findOne({
          username: {
            $regex: `^${uname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            $options: 'i'
          }
        })
          .select('uid')
          .lean();

        if (!user) {
          return res.status(200).json({
            status: 200,
            message: 'Income history fetched.',
            data: {
              slug,
              label: catalog.name || slug,
              totalAmount: 0,
              todayAmount: 0,
              items: []
            },
            pagination: { page: 1, limit, total: 0, pages: 1 }
          });
        }
        match.uid = user.uid;
      }

      const { todayStart, todayEnd } = todayRange();

      const [total, rows, sumRows] = await Promise.all([
        Transaction.countDocuments(match),
        Transaction.find(match)
          .sort({ time: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .select(
            'tx_Id uid amount debit_credit source wallet_type tx_type remark time status to_from to_from_username level income_percent business order_Id metadata createdAt'
          )
          .lean(),
        Transaction.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$amount' },
              todayAmount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gte: ['$time', todayStart] },
                        { $lte: ['$time', todayEnd] }
                      ]
                    },
                    '$amount',
                    0
                  ]
                }
              }
            }
          }
        ])
      ]);

      const uids = [...new Set(rows.map((r) => Number(r.uid)).filter((n) => !Number.isNaN(n)))];
      const distributors =
        uids.length > 0
          ? await Distributor.find({ uid: { $in: uids } })
              .select('uid username name')
              .lean()
          : [];
      const byUid = Object.fromEntries(distributors.map((d) => [d.uid, d]));

      const items = rows.map((row) => {
        const dist = byUid[Number(row.uid)];
        return {
          tx_Id: row.tx_Id,
          uid: row.uid,
          username: dist?.username || row.to_from_username || '',
          name: dist?.name || '',
          amount: round2(row.amount),
          time: row.time || row.createdAt,
          remark: row.remark || '',
          level: row.level ?? null,
          status: row.status,
          order_Id: row.order_Id ?? null,
          to_from: row.to_from ?? null,
          to_from_username: row.to_from_username || '',
          income_percent: row.income_percent ?? null,
          business: row.business ?? null
        };
      });

      return res.status(200).json({
        status: 200,
        message: 'Income history fetched.',
        data: {
          slug,
          label: catalog.name || slug,
          totalAmount: round2(sumRows[0]?.totalAmount),
          todayAmount: round2(sumRows[0]?.todayAmount),
          items
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit))
        }
      });
    } catch (error) {
      errorLogger(error);
      return res.status(500).json({ ...INTERNAL_SERVER_ERROR });
    }
  }
}

module.exports = new PayoutReportAdmin();
