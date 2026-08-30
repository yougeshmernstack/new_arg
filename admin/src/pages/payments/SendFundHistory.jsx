import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { paymentsApi } from '../../api';
import { exportToExcel, formatExcelAmount, formatExcelDate } from '../../utils/exportExcel';

function formatTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function SendFundHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterUsername, setFilterUsername] = useState('');
  const [filterUid, setFilterUid] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (filterUid.trim()) params.uid = Number(filterUid.trim());
      else if (filterUsername.trim()) params.username = filterUsername.trim();
      const res = await paymentsApi.getSendFundHistory(params);
      setHistory(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load send fund history');
    } finally {
      setLoading(false);
    }
  }, [filterUid, filterUsername]);

  useEffect(() => {
    loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial load only

  const onSearch = (e) => {
    e.preventDefault();
    loadHistory();
  };

  const onClear = () => {
    setFilterUsername('');
    setFilterUid('');
    setLoading(true);
    setError('');
    paymentsApi
      .getSendFundHistory({ limit: 100 })
      .then((res) => setHistory(res.data?.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load send fund history'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Send Fund History</h2>
          <p>All admin fund credits to distributor wallets</p>
        </div>
        <div className="toolbar" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
          <button
            type="button"
            className="btn"
            onClick={() =>
              exportToExcel({
                filename: 'send_fund_history',
                sheetName: 'Send Fund',
                rows: history,
                columns: [
                  { header: 'Tx ID', value: (r) => r.tx_Id ?? '' },
                  { header: 'Username', value: (r) => r.username || '' },
                  { header: 'Name', value: (r) => r.name || '' },
                  { header: 'UID', value: (r) => r.uid ?? '' },
                  { header: 'Amount', value: (r) => formatExcelAmount(r.amount) },
                  { header: 'Remark', value: (r) => r.remark || '' },
                  { header: 'Sent By', value: (r) => r.sentByUsername || r.sentBy || '' },
                  { header: 'Time', value: (r) => formatExcelDate(r.time) },
                ],
              })
            }
            disabled={loading || !history.length}
          >
            Export Excel
          </button>
          <Link className="btn primary" to="/send-fund">
            Send Fund
          </Link>
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
        <button type="button" className="btn" onClick={loadHistory}>
          Refresh
        </button>
      </form>

      {error ? <div className="alert error">{error}</div> : null}

      {loading ? (
        <p>Loading history...</p>
      ) : history.length === 0 ? (
        <p className="muted">No send fund records yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>User</th>
                <th>UID</th>
                <th>Amount</th>
                <th>Remark</th>
                <th>Sent by</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.tx_Id}>
                  <td>{row.tx_Id}</td>
                  <td>
                    <strong>{row.username || '—'}</strong>
                    {row.name ? <div className="muted">{row.name}</div> : null}
                  </td>
                  <td>{row.uid}</td>
                  <td>₹{Number(row.amount || 0).toFixed(2)}</td>
                  <td>{row.remark || '—'}</td>
                  <td>{row.sentByUsername || row.sentBy || '—'}</td>
                  <td>{formatTime(row.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
