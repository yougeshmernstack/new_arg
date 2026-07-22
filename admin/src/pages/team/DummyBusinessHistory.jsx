import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dummyBusinessApi } from '../../api';

function formatTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function DummyBusinessHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterUsername, setFilterUsername] = useState('');
  const [filterUid, setFilterUid] = useState('');
  const [filterSide, setFilterSide] = useState('');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (filterUid.trim()) params.uid = Number(filterUid.trim());
      else if (filterUsername.trim()) params.username = filterUsername.trim();
      if (filterSide === 'left' || filterSide === 'right') params.side = filterSide;
      const res = await dummyBusinessApi.getHistory(params);
      setHistory(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dummy business history');
    } finally {
      setLoading(false);
    }
  }, [filterUid, filterUsername, filterSide]);

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
    setFilterSide('');
    setLoading(true);
    setError('');
    dummyBusinessApi
      .getHistory({ limit: 100 })
      .then((res) => setHistory(res.data?.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dummy business history'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Dummy Business History</h2>
          <p>Who received how much dummy BV, which side, and when</p>
        </div>
        <Link className="btn primary" to="/dummy-business">
          Grant Dummy Business
        </Link>
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
        <select
          value={filterSide}
          onChange={(e) => setFilterSide(e.target.value)}
          style={{ maxWidth: 140 }}
        >
          <option value="">All sides</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
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
        <p className="muted">No dummy business records yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>UID</th>
                <th>Side</th>
                <th>Amount</th>
                <th>Remark</th>
                <th>Given by</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.username || '—'}</strong>
                    {row.name ? <div className="muted">{row.name}</div> : null}
                  </td>
                  <td>{row.uid}</td>
                  <td>{String(row.side || '').toUpperCase()}</td>
                  <td>₹{Number(row.amount || 0).toFixed(2)}</td>
                  <td>{row.remark || '—'}</td>
                  <td>{row.givenByUsername || row.givenBy || '—'}</td>
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
