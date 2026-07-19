import { useEffect, useState } from 'react';
import { wellnessApi } from '../../api';

const DISTRIBUTOR_PANEL_URL =
  process.env.REACT_APP_DISTRIBUTOR_PANEL_URL || 'http://localhost:3002';

function formatPosition(position) {
  if (!position) return '—';
  return position === 'left' ? 'Left' : position === 'right' ? 'Right' : position;
}

function statusBadgeClass(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'active') return 'badge ok';
  if (value === 'disabled') return 'badge danger';
  return 'badge warn';
}

function formatStatus(status) {
  const value = String(status || 'inactive').toLowerCase();
  if (value === 'active') return 'Active';
  if (value === 'disabled') return 'Disabled';
  return 'Inactive';
}

export default function Distributors() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingInUid, setLoggingInUid] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await wellnessApi.getDistributors({
        search: search || undefined,
        status: statusFilter || undefined,
        limit: 50,
      });
      setList(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load distributors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoginAs = async (item) => {
    if (!item.uid) {
      setLoginError('Distributor user id is missing.');
      return;
    }

    setLoginError('');
    setLoggingInUid(item.uid);
    try {
      const { data } = await wellnessApi.loginAsUser({
        uid: item.uid,
        target_role: 'distributor',
      });

      if (!data?.token) {
        throw new Error('Login token not received.');
      }

      const baseUrl = DISTRIBUTOR_PANEL_URL.replace(/\/$/, '');
      const url = `${baseUrl}/?token=${encodeURIComponent(data.token)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setLoginError(err.response?.data?.message || err.message || 'Failed to login as distributor');
    } finally {
      setLoggingInUid(null);
    }
  };

  return (
    <div className="page">
      <h2>Distributors</h2>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          placeholder="Search username / name / email / mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="disabled">Disabled</option>
        </select>
        <button type="submit" className="btn">
          Search
        </button>
      </form>
      {error ? <div className="alert error">{error}</div> : null}
      {loginError ? <div className="alert error">{loginError}</div> : null}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Login</th>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Sponsor Username</th>
                <th>Sponsor Name</th>
                <th>Parent Username</th>
                <th>Parent Name</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={12}>No distributors found</td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item._id || item.distributorId}>
                    <td>{item.distributorId}</td>
                    <td>
                      <span className={statusBadgeClass(item.status)}>
                        {formatStatus(item.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn primary"
                        disabled={loggingInUid === item.uid || item.status === 'disabled'}
                        onClick={() => handleLoginAs(item)}
                      >
                        {loggingInUid === item.uid ? 'Opening...' : 'Login'}
                      </button>
                    </td>
                    <td>
                      <div>{item.username || '—'}</div>
                      <div className="muted-cell">UID {item.uid}</div>
                    </td>
                    <td>{item.name || '—'}</td>
                    <td>{item.email || '—'}</td>
                    <td>{item.mobile || '—'}</td>
                    <td>{item.sponsor_username || '—'}</td>
                    <td>{item.sponsor_name || '—'}</td>
                    <td>{item.parent_username || '—'}</td>
                    <td>{item.parent_name || '—'}</td>
                    <td>{formatPosition(item.position)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
