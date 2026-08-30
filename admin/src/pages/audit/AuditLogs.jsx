import { useEffect, useState } from 'react';
import { wellnessApi } from '../../api';
import { exportToExcel, formatExcelDate } from '../../utils/exportExcel';

export default function AuditLogs() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await wellnessApi.getAuditLogs({ limit: 50 });
        if (active) setList(res.data?.data || []);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load audit logs');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <h2>Audit Logs</h2>
        <button
          type="button"
          className="btn"
          disabled={loading || !list.length}
          onClick={() =>
            exportToExcel({
              filename: 'audit_logs',
              sheetName: 'Audit Logs',
              rows: list,
              columns: [
                { header: 'Action', value: (r) => r.action || '' },
                { header: 'Actor', value: (r) => r.actor_uid ?? '' },
                { header: 'Target', value: (r) => r.target_uid || r.target_id || '' },
                { header: 'Role', value: (r) => r.target_role || r.actor_role || '' },
                {
                  header: 'Date',
                  value: (r) => formatExcelDate(r.createdAt || r.created_date),
                },
              ],
            })
          }
        >
          Export Excel
        </button>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
                <th>Role</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5}>No logs found</td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item._id}>
                    <td>{item.action}</td>
                    <td>{item.actor_uid}</td>
                    <td>{item.target_uid || item.target_id}</td>
                    <td>{item.target_role || item.actor_role}</td>
                    <td>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : item.created_date
                          ? new Date(item.created_date).toLocaleString()
                          : '-'}
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
