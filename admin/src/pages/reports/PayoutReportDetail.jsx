import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { payoutReportApi } from '../../api';

function formatAmount(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function statusLabel(status) {
  if (status === 1) return 'Credited';
  if (status === 2) return 'Rejected';
  return 'Pending';
}

function statusTone(status) {
  if (status === 1) return 'ok';
  if (status === 2) return 'danger';
  return 'warn';
}

export default function PayoutReportDetail() {
  const { slug } = useParams();
  const [label, setLabel] = useState(slug || '');
  const [totalAmount, setTotalAmount] = useState(0);
  const [todayAmount, setTodayAmount] = useState(0);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [filterUsername, setFilterUsername] = useState('');
  const [filterUid, setFilterUid] = useState('');
  const [appliedUsername, setAppliedUsername] = useState('');
  const [appliedUid, setAppliedUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 50 };
      if (appliedUid.trim()) params.uid = Number(appliedUid.trim());
      else if (appliedUsername.trim()) params.username = appliedUsername.trim();

      const res = await payoutReportApi.getBySlug(slug, params);
      const data = res.data?.data || {};
      setLabel(data.label || slug);
      setTotalAmount(data.totalAmount || 0);
      setTodayAmount(data.todayAmount || 0);
      setItems(Array.isArray(data.items) ? data.items : []);
      setPagination(res.data?.pagination || { page: 1, limit: 50, total: 0, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load income history');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [slug, page, appliedUid, appliedUsername]);

  useEffect(() => {
    load();
  }, [load]);

  const onSearch = (e) => {
    e.preventDefault();
    setAppliedUsername(filterUsername);
    setAppliedUid(filterUid);
    setPage(1);
  };

  const onClear = () => {
    setFilterUsername('');
    setFilterUid('');
    setAppliedUsername('');
    setAppliedUid('');
    setPage(1);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>{label}</h2>
          <p className="page-sub">Transaction history for this income type</p>
        </div>
        <Link className="btn ghost" to="/payout-report">
          ← Back
        </Link>
      </div>

      <div className="payout-detail-stats">
        <div className="stat-card">
          <span>Total</span>
          <strong>₹{formatAmount(totalAmount)}</strong>
        </div>
        <div className="stat-card">
          <span>Today</span>
          <strong>₹{formatAmount(todayAmount)}</strong>
        </div>
      </div>

      <form className="toolbar" onSubmit={onSearch}>
        <input
          value={filterUsername}
          onChange={(e) => setFilterUsername(e.target.value)}
          placeholder="Filter by username"
          style={{ maxWidth: 220 }}
        />
        <input
          value={filterUid}
          onChange={(e) => setFilterUid(e.target.value)}
          placeholder="Filter by UID"
          inputMode="numeric"
          style={{ maxWidth: 140 }}
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

      {loading ? (
        <p>Loading income history...</p>
      ) : items.length === 0 ? (
        <p className="muted">No transactions for this income type.</p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>UID</th>
                  <th>Username</th>
                  <th>Amount</th>
                  <th>Level</th>
                  <th>Remark</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.tx_Id || `${row.uid}-${row.time}`}>
                    <td>{formatTime(row.time)}</td>
                    <td>{row.uid}</td>
                    <td>
                      <strong>{row.username || '—'}</strong>
                      {row.name ? <div className="muted">{row.name}</div> : null}
                    </td>
                    <td>₹{formatAmount(row.amount)}</td>
                    <td>{row.level != null ? row.level : '—'}</td>
                    <td>{row.remark || '—'}</td>
                    <td>
                      <span className={`badge ${statusTone(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 ? (
            <div className="toolbar" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="muted">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
              <button
                type="button"
                className="btn"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
