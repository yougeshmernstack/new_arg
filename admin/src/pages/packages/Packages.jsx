import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { commerceApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function formatMoney(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

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
        <div>
          <h2>Packages</h2>
          <p className="page-sub">
            {loading ? 'Loading…' : `${list.length} package${list.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Link className="btn primary" to="/packages/create">
          Create Package
        </Link>
      </div>

      <form
        className="toolbar packages-toolbar"
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
        <p className="muted">Loading packages…</p>
      ) : list.length === 0 ? (
        <div className="panel packages-empty">
          <h3>No packages yet</h3>
          <p className="muted">Create a package to activate distributors.</p>
          <Link className="btn primary" to="/packages/create">
            Create Package
          </Link>
        </div>
      ) : (
        <div className="packages-grid">
          {list.map((item) => {
            const thumb = item.images?.[0];
            const productCount = (item.items || []).length;
            const busy = busyId === item.packageId;
            const statusClass =
              item.status === 'active' ? 'ok' : item.status === 'disabled' ? 'danger' : 'warn';

            return (
              <article key={item.packageId} className="package-card">
                <div className="package-card-media">
                  {thumb ? (
                    <img src={mediaUrl(thumb)} alt={item.name} />
                  ) : (
                    <div className="package-card-placeholder">No image</div>
                  )}
                  <span className={`badge ${statusClass}`}>{item.status}</span>
                </div>

                <div className="package-card-body">
                  <div className="package-card-title">
                    <span className="package-card-id">#{item.packageId}</span>
                    <h3>{item.name}</h3>
                  </div>

                  <div className="package-card-metrics">
                    <div>
                      <span>List</span>
                      <strong>{formatMoney(item.amount)}</strong>
                    </div>
                    <div>
                      <span>Discounted</span>
                      <strong>{formatMoney(item.discounted_amount ?? item.price)}</strong>
                    </div>
                    <div>
                      <span>BV</span>
                      <strong>{item.bv ?? 0}</strong>
                    </div>
                    <div>
                      <span>PV</span>
                      <strong>{item.pv ?? 0}</strong>
                    </div>
                  </div>

                  <p className="package-card-meta">
                    {productCount} product{productCount === 1 ? '' : 's'} in package
                    {Array.isArray(item.images) && item.images.length
                      ? ` · ${item.images.length} image${item.images.length === 1 ? '' : 's'}`
                      : ''}
                  </p>
                </div>

                <div className="package-card-actions">
                  <Link className="btn primary" to={`/packages/${item.packageId}/edit`}>
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={busy || item.status === 'disabled'}
                    onClick={() => toggleStatus(item)}
                  >
                    {busy ? 'Updating…' : item.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
