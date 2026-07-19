import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { paymentsApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function statusLabel(status) {
  if (status === 1) return 'Approved';
  if (status === 2) return 'Rejected';
  return 'Pending';
}

function statusClass(status) {
  if (status === 1) return 'badge ok';
  if (status === 2) return 'badge danger';
  return 'badge warn';
}

export default function FundDeposits() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState(null);
  const [remark, setRemark] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentsApi.getFundDeposits({
        status: status === 'all' ? undefined : status,
        panel: 'distributor',
      });
      setList(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load deposit requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const approve = async (id) => {
    setActingId(id);
    setError('');
    try {
      await paymentsApi.approveFundDeposit({ requestId: id, remark: remark[id] || '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Approve failed');
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id) => {
    setActingId(id);
    setError('');
    try {
      await paymentsApi.rejectFundDeposit({ requestId: id, remark: remark[id] || 'Rejected' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Reject failed');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Fund Deposits</h2>
          <p>Verify UTR and credit distributor fund wallets</p>
        </div>
        <Link className="btn ghost" to="/fund-deposit-history">
          View history
        </Link>
      </div>

      <div className="toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="0">Pending</option>
          <option value="1">Approved</option>
          <option value="2">Rejected</option>
          <option value="all">All</option>
        </select>
        <button type="button" className="btn" onClick={load}>
          Refresh
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
                <th>Date</th>
                <th>UID</th>
                <th>Amount</th>
                <th>UTR</th>
                <th>Proof</th>
                <th>Status</th>
                <th>Tx</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8}>No deposit requests</td>
                </tr>
              ) : (
                list.map((row) => {
                  const proof = row.proofUrl ? mediaUrl(row.proofUrl) : null;
                  return (
                    <tr key={row._id}>
                      <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                      <td>{row.uid}</td>
                      <td>₹{Number(row.amount || 0).toLocaleString()}</td>
                      <td><code>{row.utr}</code></td>
                      <td>
                        {proof ? (
                          <button
                            type="button"
                            className="btn ghost"
                            style={{ padding: 4 }}
                            onClick={() => setPreviewUrl(proof)}
                            title="Click to enlarge"
                          >
                            <img
                              src={proof}
                              alt="Payment proof"
                              style={{
                                width: 56,
                                height: 56,
                                objectFit: 'cover',
                                borderRadius: 6,
                                display: 'block',
                              }}
                            />
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
                      </td>
                      <td>{row.creditTxId || '—'}</td>
                      <td>
                        {row.status === 0 ? (
                          <div className="form-grid" style={{ minWidth: 220 }}>
                            <input
                              placeholder="Remark"
                              value={remark[row._id] || ''}
                              onChange={(e) =>
                                setRemark((prev) => ({ ...prev, [row._id]: e.target.value }))
                              }
                            />
                            <button
                              type="button"
                              className="btn primary"
                              disabled={actingId === row._id}
                              onClick={() => approve(row._id)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              disabled={actingId === row._id}
                              onClick={() => reject(row._id)}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          row.remark || '—'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {previewUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 16,
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <strong>Payment proof</strong>
              <div style={{ display: 'flex', gap: 8 }}>
                <a className="btn" href={previewUrl} target="_blank" rel="noreferrer">
                  Open full size
                </a>
                <button type="button" className="btn ghost" onClick={() => setPreviewUrl(null)}>
                  Close
                </button>
              </div>
            </div>
            <img
              src={previewUrl}
              alt="Payment proof full"
              style={{ maxWidth: '85vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
