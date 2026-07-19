import { useEffect, useMemo, useState } from 'react';
import { distributorApi } from '../../api';

const VIEWS = {
  left: {
    title: 'Left Team',
    subtitle: 'Distributors placed under your left binary leg',
  },
  right: {
    title: 'Right Team',
    subtitle: 'Distributors placed under your right binary leg',
  },
};

export default function BinaryLegList({ side }) {
  const view = VIEWS[side] || VIEWS.left;
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await distributorApi.getBinaryLegs();
        if (!active) return;
        const data = res.data?.data || {};
        setMembers(side === 'right' ? data.right || [] : data.left || []);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load team');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [side]);

  const filtered = useMemo(() => {
    if (!query) return members;
    const regex = new RegExp(query, 'i');
    return members.filter(
      (row) =>
        regex.test(row.username || '') ||
        regex.test(row.name || '') ||
        regex.test(row.email || '') ||
        regex.test(row.mobile || '')
    );
  }, [members, query]);

  return (
    <div className="page">
      <div className="page-head">
        <h2>{view.title}</h2>
        <p className="page-sub">{view.subtitle}</p>
      </div>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
      >
        <input
          placeholder="Search name / username / email / mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn">
          Search
        </button>
      </form>
      {error ? <div className="alert error">{error}</div> : null}
      {!loading && !error ? (
        <p className="team-count">
          {filtered.length} member{filtered.length === 1 ? '' : 's'}
        </p>
      ) : null}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>UID</th>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Parent</th>
                <th>Position</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>No team members found</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item._id || item.uid}>
                    <td>{item.uid}</td>
                    <td>{item.username}</td>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td>{item.mobile}</td>
                    <td>{item.parent_Id ?? '—'}</td>
                    <td>{item.position || '—'}</td>
                    <td>
                      <span className="badge">{item.status}</span>
                    </td>
                    <td>
                      {item.joining_date
                        ? new Date(item.joining_date).toLocaleDateString()
                        : '—'}
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
