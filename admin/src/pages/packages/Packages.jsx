import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { commerceApi } from '../../api';

export default function Packages() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await commerceApi.getPackages({
        limit: 100,
        search: search || undefined,
      });
      setList(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleStatus = async (item) => {
    const next = item.status === 'active' ? 'inactive' : 'active';
    setBusyId(item.packageId);
    setMessage('');
    setError('');
    try {
      await commerceApi.togglePackageStatus({ packageId: item.packageId, status: next });
      setMessage(`Package marked ${next}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>Packages</h2>
        <Link className="btn primary" to="/packages/create">
          Create Package
        </Link>
      </div>

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          placeholder="Search package name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn">
          Search
        </button>
      </form>

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      {loading ? (
        <p>Loading...</p>
      ) : list.length === 0 ? (
        <p>No packages yet. Create one to activate distributors.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Amount</th>
                <th>Discounted</th>
                <th>BV</th>
                <th>PV</th>
                <th>Products</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.packageId}>
                  <td>{item.packageId}</td>
                  <td>
                    <strong>{item.name}</strong>
                    {item.description ? (
                      <div className="muted">{String(item.description).slice(0, 80)}</div>
                    ) : null}
                  </td>
                  <td>₹{Number(item.amount || 0).toFixed(2)}</td>
                  <td>₹{Number(item.discounted_amount ?? item.price ?? 0).toFixed(2)}</td>
                  <td>{item.bv ?? 0}</td>
                  <td>{item.pv ?? 0}</td>
                  <td>{(item.items || []).length}</td>
                  <td>
                    <span className={`badge ${item.status === 'active' ? 'ok' : ''}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="actions">
                    <Link className="btn ghost" to={`/packages/${item.packageId}/edit`}>
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={busyId === item.packageId || item.status === 'disabled'}
                      onClick={() => toggleStatus(item)}
                    >
                      {item.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
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
