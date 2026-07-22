import { useEffect, useState } from 'react';
import { rankRewardApi } from '../../api';

const CONFIG = {
  reward: {
    title: 'Reward',
    subtitle: 'Achieve ranks based on your lifetime matched business',
    fetch: () => rankRewardApi.getRewardProgress(),
    showAmount: true,
    showIncome: false,
  },
  royality: {
    title: 'Royality',
    subtitle: 'Royality ranks unlocked by matched business',
    fetch: () => rankRewardApi.getRoyalityProgress(),
    showAmount: false,
    showIncome: true,
  },
  traveling: {
    title: 'Traveling Allowance',
    subtitle: 'Traveling bonus based on matched business',
    fetch: () => rankRewardApi.getTravelingProgress(),
    showAmount: false,
    showIncome: true,
  },
};

function formatNum(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

function statusBadge(rank) {
  if (!rank.achieved) return <span className="badge">Pending</span>;
  if (rank.status === 1) return <span className="badge ok">Completed</span>;
  return <span className="badge warn">Achieved</span>;
}

export default function RankProgress({ type }) {
  const view = CONFIG[type] || CONFIG.reward;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await view.fetch();
        if (!active) return;
        setData(res.data?.data || null);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load ranks');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const ranks = data?.ranks || [];
  const matchedBv = data?.matched_bv ?? 0;
  const next = data?.next_rank;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>{view.title}</h2>
          <p className="page-sub">{view.subtitle}</p>
        </div>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="rank-summary">
            <div className="rank-summary-card">
              <span className="muted">Your Match Business</span>
              <strong>{formatNum(matchedBv)}</strong>
            </div>
            <div className="rank-summary-card">
              <span className="muted">Achieved</span>
              <strong>
                {data?.achieved_count ?? 0} / {data?.total_ranks ?? 0}
              </strong>
            </div>
            {next ? (
              <div className="rank-summary-card">
                <span className="muted">Next: {next.rank_name}</span>
                <strong>{formatNum(next.remaining)} BV left</strong>
              </div>
            ) : null}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Required Match BV</th>
                  {view.showAmount ? <th>Reward Amount</th> : null}
                  {view.showIncome ? <th>Income %</th> : null}
                  <th>Item / Benefit</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ranks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      No ranks configured.
                    </td>
                  </tr>
                ) : (
                  ranks.map((rank) => (
                    <tr key={rank.rank_id} className={rank.achieved ? 'rank-row-achieved' : ''}>
                      <td>
                        <strong>{rank.rank_name}</strong>
                      </td>
                      <td>{formatNum(rank.matched_business)}</td>
                      {view.showAmount ? <td>₹{formatNum(rank.reward_amount)}</td> : null}
                      {view.showIncome ? <td>{rank.income}%</td> : null}
                      <td>{rank.reward_item || '—'}</td>
                      <td style={{ minWidth: 140 }}>
                        <div className="rank-bar">
                          <div className="rank-bar-fill" style={{ width: `${rank.progress || 0}%` }} />
                        </div>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {rank.progress || 0}%
                          {!rank.achieved ? ` · ${formatNum(rank.remaining)} left` : ''}
                        </span>
                      </td>
                      <td>{statusBadge(rank)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
