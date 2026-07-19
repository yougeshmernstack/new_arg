import { useEffect, useState } from 'react';
import { distributorApi } from '../../api';

const VIEWS = {
  direct: {
    title: 'Direct Team',
    subtitle: 'Distributors you personally sponsored',
    fetch: (params) => distributorApi.getDirectTeam(params),
  },
  generation: {
    title: 'Generation Team',
    subtitle: 'Your full downline across all levels',
    fetch: (params) => distributorApi.getGenerationTeam(params),
  },
};

export default function TeamList({ type }) {
  const view = VIEWS[type] || VIEWS.direct;
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const fetchTeam = type === 'generation'
      ? distributorApi.getGenerationTeam
      : distributorApi.getDirectTeam;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchTeam({ search: query || undefined, limit: 100 });
        if (!active) return;
        setList(res.data?.data || []);
        setTotal(res.data?.pagination?.total ?? res.data?.data?.length ?? 0);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load team');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [type, query]);

  const showLevel = type === 'generation';

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
          {total} member{total === 1 ? '' : 's'}
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
                {showLevel ? <th>Level</th> : null}
                <th>Sponsor</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={showLevel ? 9 : 8}>No team members found</td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item._id || item.uid}>
                    <td>{item.uid}</td>
                    <td>{item.username}</td>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td>{item.mobile}</td>
                    {showLevel ? <td>{item.level ?? '—'}</td> : null}
                    <td>{item.sponsor_username || item.sponsor_Id || '—'}</td>
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
