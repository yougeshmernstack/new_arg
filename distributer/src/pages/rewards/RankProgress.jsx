import { useEffect, useState } from 'react';
import { rankRewardApi } from '../../api';

const CONFIG = {
  reward: {
    title: 'Reward',
    subtitle: 'Ranks unlocked by lifetime matched business',
    fetch: () => rankRewardApi.getRewardProgress(),
    showAmount: false,
    showIncome: false,
    showItem: true,
  },
  royality: {
    title: 'Royality',
    subtitle: 'Royality ranks unlocked by matched business',
    fetch: () => rankRewardApi.getRoyalityProgress(),
    showAmount: false,
    showIncome: true,
    showItem: false,
  },
  traveling: {
    title: 'Traveling Allowance',
    subtitle: 'Traveling bonus based on matched business',
    fetch: () => rankRewardApi.getTravelingProgress(),
    showAmount: false,
    showIncome: true,
    showItem: true,
  },
};

function formatNum(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

function statusBadge(rank) {
  if (!rank.achieved) return <span className="badge rank-badge">Pending</span>;
  if (rank.status === 1) return <span className="badge ok rank-badge">Done</span>;
  return <span className="badge warn rank-badge">Achieved</span>;
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
  const achieved = data?.achieved_count ?? 0;
  const total = data?.total_ranks ?? 0;
  const nextProgress = next
    ? Math.max(0, Math.min(100, Number(next.progress) || (matchedBv / (next.matched_business || 1)) * 100))
    : 100;

  return (
    <div className="page rank-page">
      <div className="page-head rank-page-head">
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
          <section className="rank-hero" aria-label="Rank summary">
            <div className="rank-hero-top">
              <div className="rank-hero-match">
                <span>Match Business</span>
                <strong>{formatNum(matchedBv)}</strong>
              </div>
              <div className="rank-hero-side">
                <div className="rank-hero-stat">
                  <span>Achieved</span>
                  <strong>
                    {achieved}/{total}
                  </strong>
                </div>
                <div className="rank-hero-stat">
                  <span>Next</span>
                  <strong>{next ? next.rank_name : 'Complete'}</strong>
                </div>
              </div>
            </div>

            {next ? (
              <div className="rank-next">
                <div className="rank-next-row">
                  <span>
                    {Math.round(nextProgress)}% to {next.rank_name}
                  </span>
                  <strong>{formatNum(next.remaining)} BV left</strong>
                </div>
                <div className="rank-bar rank-bar-lg">
                  <div className="rank-bar-fill" style={{ width: `${Math.round(nextProgress)}%` }} />
                </div>
              </div>
            ) : null}
          </section>

          <div className="table-wrap rank-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Required Match BV</th>
                  {view.showAmount ? <th>Reward Amount</th> : null}
                  {view.showIncome ? <th>Income %</th> : null}
                  {view.showItem ? <th>Item / Benefit</th> : null}
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ranks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        4 +
                        (view.showAmount ? 1 : 0) +
                        (view.showIncome ? 1 : 0) +
                        (view.showItem ? 1 : 0)
                      }
                      className="muted"
                    >
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
                      {view.showItem ? <td>{rank.reward_item || '—'}</td> : null}
                      <td>
                        <div className="rank-bar">
                          <div className="rank-bar-fill" style={{ width: `${rank.progress || 0}%` }} />
                        </div>
                        <span className="muted rank-progress-meta">
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

          <div className="rank-card-list">
            {ranks.length === 0 ? (
              <p className="muted">No ranks configured.</p>
            ) : (
              ranks.map((rank, index) => {
                const isNext = next && next.rank_id === rank.rank_id;
                return (
                  <article
                    key={rank.rank_id}
                    className={[
                      'rank-card',
                      rank.achieved ? 'rank-card-achieved' : '',
                      isNext ? 'rank-card-next' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="rank-card-top">
                      <div className="rank-card-identity">
                        <span className="rank-card-index">{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <strong>
                            {rank.rank_name}
                            {isNext ? <em className="rank-card-tag">Next</em> : null}
                          </strong>
                          {view.showItem ? (
                            <span className="muted">{rank.reward_item || '—'}</span>
                          ) : null}
                        </div>
                      </div>
                      {statusBadge(rank)}
                    </div>

                    <div className="rank-card-facts">
                      <span>
                        <b>{formatNum(rank.matched_business)}</b> BV
                      </span>
                      {view.showAmount ? (
                        <span>
                          <b>₹{formatNum(rank.reward_amount)}</b>
                        </span>
                      ) : null}
                      {view.showIncome ? (
                        <span>
                          <b>{rank.income}%</b> income
                        </span>
                      ) : null}
                      <span className="rank-card-facts-end">
                        {rank.achieved ? 'Unlocked' : `${formatNum(rank.remaining)} left`}
                      </span>
                    </div>

                    <div className="rank-card-progress">
                      <div className="rank-bar">
                        <div className="rank-bar-fill" style={{ width: `${rank.progress || 0}%` }} />
                      </div>
                      <span className="rank-card-pct">{rank.progress || 0}%</span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
