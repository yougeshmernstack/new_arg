import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { wellnessApi } from '../../api';

const FRANCHISE_PANEL_URL =
  process.env.REACT_APP_FRANCHISE_PANEL_URL || 'http://localhost:3002';

export default function Franchises() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingInUid, setLoggingInUid] = useState(null);

  const load = async (q = search) => {
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
        <h2>Franchises</h2>
        <Link className="btn primary" to="/franchises/create">
          Create Franchise
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
          placeholder="Search business / owner / email / mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
                <th>Business</th>
                <th>Owner</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Login</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7}>No franchises found</td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item._id || item.franchiseId}>
                    <td>{item.franchiseId}</td>
                    <td>{item.business_name}</td>
                    <td>{item.owner_name}</td>
                    <td>{item.email}</td>
                    <td>{item.mobile}</td>
                    <td>{item.status}</td>
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
