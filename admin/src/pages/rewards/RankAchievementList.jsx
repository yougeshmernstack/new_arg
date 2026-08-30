import { useCallback, useEffect, useState } from 'react';
import { rankRewardApi } from '../../api';
import { exportToExcel, formatExcelAmount, formatExcelDate } from '../../utils/exportExcel';

const CONFIG = {
  reward: {
    title: 'Reward Achievements',
    subtitle: 'Distributors who achieved reward ranks (matched business)',
    fetch: (params) => rankRewardApi.getRewardList(params),
    showAmount: true,
    showIncome: false,
  },
  royality: {
    title: 'Royality Achievements',
    subtitle: 'Distributors who achieved royality ranks',
    fetch: (params) => rankRewardApi.getRoyalityList(params),
    showAmount: false,
    showIncome: true,
  },
  traveling: {
    title: 'Traveling Allowance Achievements',
    subtitle: 'Distributors who achieved traveling bonus',
    fetch: (params) => rankRewardApi.getTravelingList(params),
    showAmount: false,
    showIncome: true,
  },
};

function formatNum(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

function formatTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function RankAchievementList({ type }) {
  const view = CONFIG[type] || CONFIG.reward;
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('0');
  const [filterUsername, setFilterUsername] = useState('');
  const [filterUid, setFilterUid] = useState('');
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 200 };
      if (status !== 'all') params.status = status;
      if (filterUid.trim()) params.uid = Number(filterUid.trim());
      else if (filterUsername.trim()) params.username = filterUsername.trim();

      const res = await view.fetch(params);
      setList(res.data?.data || []);
      setTotal(res.data?.total ?? res.data?.data?.length ?? 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  }, [status, filterUid, filterUsername, type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = (e) => {
    e.preventDefault();
    load();
  };

  const onClear = () => {
    setFilterUsername('');
    setFilterUid('');
    setStatus('0');
    setLoading(true);
    setError('');
    const params = { limit: 200, status: 0 };
    view
      .fetch(params)
      .then((res) => {
        setList(res.data?.data || []);
        setTotal(res.data?.total ?? res.data?.data?.length ?? 0);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load achievements'))
      .finally(() => setLoading(false));
  };

  const markDone = async (row) => {
    setActingId(row._id);
    setError('');
    try {
      await rankRewardApi.markComplete({ id: row._id });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark complete');
    } finally {
      setActingId(null);
    }
  };

  const handleExport = () => {
    const columns = [
      { header: 'Username', value: (r) => r.username || '' },
      { header: 'Name', value: (r) => r.name || '' },
      { header: 'UID', value: (r) => r.uid ?? '' },
      { header: 'Rank', value: (r) => r.rank_name || '' },
      { header: 'Required BV', value: (r) => formatExcelAmount(r.matched_business) },
      { header: 'Match BV @ Achieve', value: (r) => formatExcelAmount(r.matched_bv_at_achieve) },
    ];
    if (view.showAmount) {
      columns.push({ header: 'Amount', value: (r) => formatExcelAmount(r.reward_amount) });
    }
    if (view.showIncome) {
      columns.push({ header: 'Income %', value: (r) => r.income ?? '' });
    }
    columns.push(
      { header: 'Item', value: (r) => r.reward_item || '' },
      { header: 'Achieved At', value: (r) => formatExcelDate(r.achievedAt) },
      { header: 'Status', value: (r) => (r.status === 1 ? 'Completed' : 'Pending') },
    );
    exportToExcel({
      filename: `${type}_achievements`,
      sheetName: view.title.slice(0, 31),
      rows: list,
      columns,
    });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>{view.title}</h2>
          <p>{view.subtitle}</p>
        </div>
        <button type="button" className="btn" onClick={handleExport} disabled={loading || !list.length}>
          Export Excel
        </button>
      </div>

      <form className="toolbar" onSubmit={onSearch}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="0">Pending</option>
          <option value="1">Completed</option>
          <option value="all">All</option>
        </select>
        <input
          value={filterUsername}
          onChange={(e) => setFilterUsername(e.target.value)}
          placeholder="Filter by username"
          style={{ maxWidth: 200 }}
        />
        <input
          value={filterUid}
          onChange={(e) => setFilterUid(e.target.value)}
          placeholder="Filter by UID"
          inputMode="numeric"
          style={{ maxWidth: 120 }}
        />
        <button type="submit" className="btn">
          Search
        </button>
        <button type="button" className="btn ghost" onClick={onClear}>
          Clear
        </button>
        <button type="button" className="btn" onClick={load}>
          Refresh
        </button>
      </form>

      {error ? <div className="alert error">{error}</div> : null}
      {!loading ? <p className="muted">{total} record{total === 1 ? '' : 's'}</p> : null}

      {loading ? (
        <p>Loading...</p>
      ) : list.length === 0 ? (
        <p className="muted">No achievements yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>UID</th>
                <th>Rank</th>
                <th>Required BV</th>
                <th>Match BV @ Achieve</th>
                {view.showAmount ? <th>Amount</th> : null}
                {view.showIncome ? <th>Income %</th> : null}
                <th>Item</th>
                <th>Achieved At</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row._id}>
                  <td>
                    <strong>{row.username || '—'}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {row.name || ''}
                    </div>
                  </td>
                  <td>{row.uid}</td>
                  <td>{row.rank_name}</td>
                  <td>{formatNum(row.matched_business)}</td>
                  <td>{formatNum(row.matched_bv_at_achieve)}</td>
                  {view.showAmount ? <td>₹{formatNum(row.reward_amount)}</td> : null}
                  {view.showIncome ? <td>{row.income}%</td> : null}
                  <td>{row.reward_item || '—'}</td>
                  <td>{formatTime(row.achievedAt)}</td>
                  <td>
                    {row.status === 1 ? (
                      <span className="badge ok">Completed</span>
                    ) : (
                      <span className="badge warn">Pending</span>
                    )}
                  </td>
                  <td>
                    {row.status === 0 ? (
                      <button
                        type="button"
                        className="btn primary"
                        disabled={actingId === row._id}
                        onClick={() => markDone(row)}
                      >
                        {actingId === row._id ? '...' : 'Mark Done'}
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
