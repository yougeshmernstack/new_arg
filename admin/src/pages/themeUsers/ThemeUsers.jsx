import { useEffect, useState } from 'react';
import { wellnessApi } from '../../api';
import { exportToExcel, fetchAllForExport } from '../../utils/exportExcel';

const THEME_SITE_URL = process.env.REACT_APP_THEME_SITE_URL || 'https://arogyagreenlife.com';
const PAGE_LIMIT = 20;

function cell(value) {
  const text = String(value ?? '').trim();
  return text || '—';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadgeClass(status, blockStatus) {
  if (Number(blockStatus) === 1) return 'badge danger';
  if (Number(status) === 1) return 'badge ok';
  return 'badge warn';
}

function formatStatus(status, blockStatus) {
  if (Number(blockStatus) === 1) return 'Blocked';
  if (Number(status) === 1) return 'Active';
  return 'Inactive';
}

export default function ThemeUsers() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingInUid, setLoggingInUid] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = async (pageNum = page, searchValue = appliedSearch) => {
    setLoading(true);
    setError('');
    try {
      const res = await wellnessApi.getThemeUsers({
        search: searchValue || undefined,
        page: pageNum,
        limit: PAGE_LIMIT,
      });
      setList(res.data?.data || []);
      const next = res.data?.pagination || {};
      setPagination({
        page: Number(next.page) || pageNum,
        limit: Number(next.limit) || PAGE_LIMIT,
        total: Number(next.total) || 0,
        pages: Math.max(1, Number(next.pages) || 1),
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load theme users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page, appliedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, appliedSearch]);

  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
    setPage(1);
  };

  const handleReset = () => {
    setSearch('');
    setAppliedSearch('');
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const rows = await fetchAllForExport(async (pageNum, limit) => {
        const res = await wellnessApi.getThemeUsers({
          search: appliedSearch || undefined,
          page: pageNum,
          limit,
        });
        const paginationMeta = res.data?.pagination || {};
        return {
          rows: res.data?.data || [],
          total: paginationMeta.total,
          pages: paginationMeta.pages,
        };
      }, 100);

      exportToExcel({
        filename: 'theme-users',
        sheetName: 'Theme Users',
        rows,
        columns: [
          { header: 'Sr. No.', value: (_r, i) => i + 1 },
          { header: 'ID', value: (r) => r.themeUserId ?? '' },
          { header: 'UID', value: (r) => r.uid ?? '' },
          { header: 'Username', value: (r) => r.username || '' },
          { header: 'Name', value: (r) => r.name || '' },
          { header: 'Email', value: (r) => r.email || '' },
          { header: 'Mobile', value: (r) => r.mobile || '' },
          { header: 'Status', value: (r) => formatStatus(r.status, r.blockStatus) },
          { header: 'Joined', value: (r) => formatDate(r.joining_date || r.createdAt) },
          { header: 'Last Activity', value: (r) => formatDate(r.lastActivity) },
        ],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export theme users');
    } finally {
      setExporting(false);
    }
  };

  const handleLoginAs = async (item) => {
    if (!item.uid) {
      setLoginError('Theme user id is missing.');
      return;
    }

    setLoginError('');
    setLoggingInUid(item.uid);
    try {
      const { data } = await wellnessApi.loginAsUser({
        uid: item.uid,
        target_role: 'theme',
      });

      if (!data?.token) {
        throw new Error('Login token not received.');
      }

      const baseUrl = THEME_SITE_URL.replace(/\/$/, '');
      const url = `${baseUrl}/shop?token=${encodeURIComponent(data.token)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setLoginError(err.response?.data?.message || err.message || 'Failed to login as theme user');
    } finally {
      setLoggingInUid(null);
    }
  };

  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="page distributors-page">
      <div className="page-head distributors-head">
        <h2>Theme Users</h2>
        <p className="muted" style={{ margin: 0 }}>
          IDs registered from the public website (theme storefront).
        </p>
      </div>

      <form className="distributors-filters" onSubmit={handleSearch}>
        <input
          placeholder="Search ID / UID / username / name / email / mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="distributors-filter-actions">
          <button type="submit" className="btn primary">
            Search
          </button>
          <button type="button" className="btn" onClick={handleReset}>
            Reset
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleExport}
            disabled={loading || exporting || !pagination.total}
          >
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </form>

      {error ? <div className="alert error">{error}</div> : null}
      {loginError ? <div className="alert error">{loginError}</div> : null}

      {loading ? (
        <p className="muted">Loading theme users…</p>
      ) : (
        <>
          <div className="list-meta">
            <p>
              Showing <strong>{from}</strong>–<strong>{to}</strong> of{' '}
              <strong>{pagination.total}</strong> theme users
            </p>
          </div>

          <div className="table-wrap distributors-table-wrap">
            <table className="distributors-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Joined</th>
                  <th>Login</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="distributors-empty-cell">
                      No theme users found
                    </td>
                  </tr>
                ) : (
                  list.map((item, index) => (
                    <tr key={item._id || item.themeUserId || item.uid}>
                      <td>{from + index}</td>
                      <td>
                        <div className="distributors-user">
                          <strong>{item.themeUserId ?? '—'}</strong>
                          <span>UID {item.uid ?? '—'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={statusBadgeClass(item.status, item.blockStatus)}>
                          {formatStatus(item.status, item.blockStatus)}
                        </span>
                      </td>
                      <td>
                        <strong>{cell(item.username)}</strong>
                      </td>
                      <td>{cell(item.name)}</td>
                      <td className="distributors-email">{cell(item.email).toLowerCase()}</td>
                      <td>{cell(item.mobile)}</td>
                      <td>{formatDate(item.joining_date || item.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn primary distributors-login-btn"
                          disabled={loggingInUid === item.uid || Number(item.blockStatus) === 1}
                          onClick={() => handleLoginAs(item)}
                        >
                          {loggingInUid === item.uid ? '…' : 'Login'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 ? (
            <div className="toolbar distributors-pagination">
              <button
                type="button"
                className="btn"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="muted">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                type="button"
                className="btn"
                disabled={page >= pagination.pages || loading}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
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
