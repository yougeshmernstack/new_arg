import { useEffect, useState } from 'react';
import { wellnessApi, commerceApi } from '../../api';
import { exportToExcel, formatExcelAmount, fetchAllForExport } from '../../utils/exportExcel';

const DISTRIBUTOR_PANEL_URL =
  process.env.REACT_APP_DISTRIBUTOR_PANEL_URL || 'http://localhost:3002';

const PAGE_LIMIT = 20;
const FALLBACK_PACKAGE_BVS = [2500, 5000];

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

function cell(value) {
  const text = String(value ?? '').trim();
  return text || '—';
}

export default function Distributors() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [packageFilter, setPackageFilter] = useState('');
  const [appliedPackage, setAppliedPackage] = useState('');
  const [packageBvOptions, setPackageBvOptions] = useState(FALLBACK_PACKAGE_BVS);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingInUid, setLoggingInUid] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = async (
    pageNum = page,
    searchValue = appliedSearch,
    statusValue = appliedStatus,
    packageValue = appliedPackage
  ) => {
    setLoading(true);
    setError('');
    try {
      const res = await wellnessApi.getDistributors({
        search: searchValue || undefined,
        status: statusValue || undefined,
        package_bv: packageValue || undefined,
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
      setError(err.response?.data?.message || 'Failed to load distributors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await commerceApi.getPackages({ limit: 100, status: 'active' });
        const packages = res.data?.data || [];
        const bvs = [
          ...new Set(
            packages
              .map((pkg) => Number(pkg.bv))
              .filter((bv) => Number.isFinite(bv) && bv > 0)
          ),
        ].sort((a, b) => a - b);
        if (!cancelled && bvs.length) {
          setPackageBvOptions(bvs);
        }
      } catch {
        // keep fallback BV options
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    load(page, appliedSearch, appliedStatus, appliedPackage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, appliedSearch, appliedStatus, appliedPackage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedSearch(search.trim());
    setAppliedStatus(statusFilter);
    setAppliedPackage(packageFilter);
    setPage(1);
  };

  const handleReset = () => {
    setSearch('');
    setStatusFilter('');
    setPackageFilter('');
    setAppliedSearch('');
    setAppliedStatus('');
    setAppliedPackage('');
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const rows = await fetchAllForExport(async (pageNum, limit) => {
        const res = await wellnessApi.getDistributors({
          search: appliedSearch || undefined,
          status: appliedStatus || undefined,
          package_bv: appliedPackage || undefined,
          page: pageNum,
          limit,
        });
        const pagination = res.data?.pagination || {};
        return {
          rows: res.data?.data || [],
          total: pagination.total,
          pages: pagination.pages,
        };
      }, 100);

      exportToExcel({
        filename: 'distributors',
        sheetName: 'Distributors',
        rows,
        columns: [
          { header: 'Sr. No.', value: (_r, i) => i + 1 },
          { header: 'ID', value: (r) => r.distributorId ?? '' },
          { header: 'Status', value: (r) => formatStatus(r.status) },
          { header: 'Username', value: (r) => r.username || '' },
          { header: 'UID', value: (r) => r.uid ?? '' },
          { header: 'Name', value: (r) => r.name || '' },
          { header: 'Package', value: (r) => r.highest_package_name || r.package_name || '' },
          {
            header: 'Package BV',
            value: (r) => formatExcelAmount(r.highest_package_bv || r.package_bv || 0),
          },
          { header: 'Email', value: (r) => r.email || '' },
          { header: 'Mobile', value: (r) => r.mobile || '' },
          { header: 'Sponsor Username', value: (r) => r.sponsor_username || '' },
          { header: 'Sponsor Name', value: (r) => r.sponsor_name || '' },
          { header: 'Parent Username', value: (r) => r.parent_username || '' },
          { header: 'Parent Name', value: (r) => r.parent_name || '' },
          { header: 'Position', value: (r) => formatPosition(r.position) },
        ],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to export distributors');
    } finally {
      setExporting(false);
    }
  };

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

  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="page distributors-page">
      <div className="page-head distributors-head">
        <h2>Distributors</h2>
      </div>

      <form className="distributors-filters" onSubmit={handleSearch}>
        <input
          placeholder="Search ID / username / name / email / mobile"
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
        <select
          value={packageFilter}
          onChange={(e) => setPackageFilter(e.target.value)}
          aria-label="Filter by package"
        >
          <option value="">All packages</option>
          {packageBvOptions.map((bv) => (
            <option key={bv} value={String(bv)}>
              BV {Number(bv).toLocaleString('en-IN')}
            </option>
          ))}
        </select>
        <div className="distributors-filter-actions">
          <button type="submit" className="btn primary">
            Search
          </button>
          <button type="button" className="btn" onClick={handleReset}>
            Reset
          </button>
          <button type="button" className="btn" onClick={handleExport} disabled={loading || exporting || !pagination.total}>
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </form>

      {error ? <div className="alert error">{error}</div> : null}
      {loginError ? <div className="alert error">{loginError}</div> : null}

      {loading ? (
        <p className="muted">Loading distributors…</p>
      ) : (
        <>
          <div className="list-meta">
            <p>
              Showing <strong>{from}</strong>–<strong>{to}</strong> of{' '}
              <strong>{pagination.total}</strong> distributors
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
                  <th>Package</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Sponsor</th>
                  <th>Parent</th>
                  <th>Pos</th>
                  <th>Login</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="distributors-empty-cell">
                      No distributors found
                    </td>
                  </tr>
                ) : (
                  list.map((item, index) => (
                    <tr key={item._id || item.distributorId}>
                      <td>{from + index}</td>
                      <td>
                        <div className="distributors-user">
                          <strong>{item.distributorId || '—'}</strong>
                          <span>{cell(item.name)}</span>
                        </div>
                      </td>
                      <td>
                        <span className={statusBadgeClass(item.status)}>
                          {formatStatus(item.status)}
                        </span>
                      </td>
                      <td>
                        <div className="distributors-user">
                          <strong>{cell(item.username)}</strong>
                          <span>UID {item.uid || '—'}</span>
                        </div>
                      </td>
                      <td>{cell(item.name)}</td>
                      <td>
                        <div className="distributors-user">
                          <strong>
                            {cell(item.highest_package_name || item.package_name)}
                          </strong>
                          <span>
                            {Number(item.highest_package_bv || item.package_bv || 0) > 0
                              ? `BV ${Number(item.highest_package_bv || item.package_bv || 0).toFixed(2)}`
                              : 'No package'}
                          </span>
                        </div>
                      </td>
                      <td className="distributors-email">{cell(item.email).toLowerCase()}</td>
                      <td>{cell(item.mobile)}</td>
                      <td>
                        <div className="distributors-user">
                          <strong>{cell(item.sponsor_username)}</strong>
                          <span>{cell(item.sponsor_name)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="distributors-user">
                          <strong>{cell(item.parent_username)}</strong>
                          <span>{cell(item.parent_name)}</span>
                        </div>
                      </td>
                      <td>{formatPosition(item.position)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn primary distributors-login-btn"
                          disabled={loggingInUid === item.uid || item.status === 'disabled'}
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
