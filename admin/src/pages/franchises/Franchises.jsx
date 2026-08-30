import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { wellnessApi } from '../../api';
import { exportToExcel } from '../../utils/exportExcel';

const FRANCHISE_PANEL_URL =
  process.env.REACT_APP_FRANCHISE_PANEL_URL || 'http://localhost:3002';

function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'active') return 'ok';
  if (value === 'disabled' || value === 'inactive' || value === 'blocked') return 'danger';
  return 'warn';
}

export default function Franchises() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingInUid, setLoggingInUid] = useState(null);

  const load = async (q = appliedSearch) => {
    setLoading(true);
    setError('');
    try {
      const res = await wellnessApi.getFranchises({ search: q || undefined, limit: 50 });
      setList(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load franchises');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
    load(search.trim());
  };

  const onClear = () => {
    setSearch('');
    setAppliedSearch('');
    load('');
  };

  const handleLoginAs = async (item) => {
    if (!item.uid) {
      setLoginError('Franchise user id is missing.');
      return;
    }

    setLoginError('');
    setLoggingInUid(item.uid);
    try {
      const { data } = await wellnessApi.loginAsUser({
        uid: item.uid,
        target_role: 'franchise',
      });

      if (!data?.token) {
        throw new Error('Login token not received.');
      }

      const baseUrl = FRANCHISE_PANEL_URL.replace(/\/$/, '');
      const url = `${baseUrl}/?token=${encodeURIComponent(data.token)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setLoginError(err.response?.data?.message || err.message || 'Failed to login as franchise');
    } finally {
      setLoggingInUid(null);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Franchises</h2>
          <p className="page-sub">Manage franchise partners, status, and panel access</p>
        </div>
        <div className="toolbar" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
          <button
            type="button"
            className="btn"
            disabled={loading || !list.length}
            onClick={() =>
              exportToExcel({
                filename: 'franchises',
                sheetName: 'Franchises',
                rows: list,
                columns: [
                  { header: 'ID', value: (r) => r.franchiseId ?? '' },
                  { header: 'Business', value: (r) => r.business_name || '' },
                  { header: 'Owner', value: (r) => r.owner_name || '' },
                  { header: 'Email', value: (r) => r.email || '' },
                  { header: 'Mobile', value: (r) => r.mobile || '' },
                  { header: 'UID', value: (r) => r.uid ?? '' },
                  { header: 'Status', value: (r) => r.status || '' },
                ],
              })
            }
          >
            Export Excel
          </button>
          <Link className="btn primary" to="/franchises/create">
            Create Franchise
          </Link>
        </div>
      </div>

      <form className="toolbar" onSubmit={onSearch}>
        <input
          placeholder="Search business, owner, email, or mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search franchises"
        />
        <button type="submit" className="btn primary" disabled={loading}>
          Search
        </button>
        {appliedSearch ? (
          <button type="button" className="btn ghost" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </form>

      {error ? <div className="alert error">{error}</div> : null}
      {loginError ? <div className="alert error">{loginError}</div> : null}

      <div className="list-meta">
        <p>
          {loading
            ? 'Loading franchises...'
            : `${list.length} franchise${list.length === 1 ? '' : 's'}${
                appliedSearch ? ` for “${appliedSearch}”` : ''
              }`}
        </p>
        <button type="button" className="btn ghost sm" onClick={() => load()} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading && list.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">Loading franchises...</div>
        </div>
      ) : (
        <div className="table-wrap">
          {list.length === 0 ? (
            <div className="empty-state">
              <strong>No franchises found</strong>
              {appliedSearch
                ? 'Try a different search, or clear filters.'
                : 'Create a franchise to get started.'}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Business</th>
                  <th>Owner</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item._id || item.franchiseId}>
                    <td>
                      <span className="cell-id">#{item.franchiseId}</span>
                    </td>
                    <td>
                      <div className="cell-primary">{item.business_name || '—'}</div>
                    </td>
                    <td>{item.owner_name || '—'}</td>
                    <td>
                      <div>{item.email || '—'}</div>
                      <div className="muted-cell">{item.mobile || '—'}</div>
                    </td>
                    <td>
                      <span className={`badge ${statusTone(item.status)}`}>
                        {item.status || 'unknown'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn primary sm"
                        disabled={loggingInUid === item.uid || item.status === 'disabled'}
                        onClick={() => handleLoginAs(item)}
                      >
                        {loggingInUid === item.uid ? 'Opening...' : 'Login as'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
