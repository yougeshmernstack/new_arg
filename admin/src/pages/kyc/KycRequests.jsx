import { useEffect, useState } from 'react';
import { kycApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function statusLabel(status) {
  if (status === 1) return 'Uploaded';
  if (status === 2) return 'Approved';
  if (status === 3) return 'Rejected';
  return 'Pending';
}

function statusClass(status) {
  if (status === 1) return 'badge warn';
  if (status === 2) return 'badge ok';
  if (status === 3) return 'badge danger';
  return 'badge';
}

function typeLabel(type) {
  const map = { pan: 'PAN', bank: 'Bank', aadhaar: 'Aadhaar', nominee: 'Nominee' };
  return map[type] || type;
}

function detailsSummary(type, details) {
  if (!details) return '—';
  if (type === 'pan') return details.panNumber || '—';
  if (type === 'bank') return `${details.holderName || ''} · ${details.accountNumber || ''}`.trim() || '—';
  if (type === 'aadhaar') return details.aadhaarNumber || '—';
  if (type === 'nominee') return `${details.nomineeName || ''} (${details.relation || ''})`.trim() || '—';
  return '—';
}

function docPaths(type, details) {
  if (!details) return [];
  if (type === 'aadhaar') {
    return [details.documentFront, details.documentBack].filter(Boolean);
  }
  return details.document ? [details.document] : [];
}

export default function KycRequests() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('1');
  const [type, setType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingKey, setActingKey] = useState(null);
  const [remark, setRemark] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await kycApi.getKycList({
        status: status === 'all' ? undefined : status,
        type: type === 'all' ? undefined : type,
      });
      setList(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load KYC requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type]);

  const rowKey = (row) => `${row.uid}-${row.type}`;

  const approve = async (row) => {
    const key = rowKey(row);
    setActingKey(key);
    setError('');
    try {
      await kycApi.approveKyc({
        uid: row.uid,
        type: row.type,
        remark: remark[key] || '',
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Approve failed');
    } finally {
      setActingKey(null);
    }
  };

  const reject = async (row) => {
    const key = rowKey(row);
    setActingKey(key);
    setError('');
    try {
      await kycApi.rejectKyc({
        uid: row.uid,
        type: row.type,
        remark: remark[key] || 'Rejected',
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Reject failed');
    } finally {
      setActingKey(null);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>KYC Requests</h2>
          <p>Review distributor PAN, Bank, Aadhaar and Nominee KYC</p>
        </div>
      </div>

      <div className="toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="1">Uploaded</option>
          <option value="2">Approved</option>
          <option value="3">Rejected</option>
          <option value="0">Pending</option>
          <option value="all">All</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All types</option>
          <option value="pan">PAN</option>
          <option value="bank">Bank</option>
          <option value="aadhaar">Aadhaar</option>
          <option value="nominee">Nominee</option>
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
                <th>Updated</th>
                <th>Distributor</th>
                <th>Type</th>
                <th>Details</th>
                <th>Documents</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7}>No KYC requests</td>
                </tr>
              ) : (
                list.map((row) => {
                  const key = rowKey(row);
                  const docs = docPaths(row.type, row.details).map(mediaUrl);
                  const dist = row.distributor;
                  return (
                    <tr key={key}>
                      <td>{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '—'}</td>
                      <td>
                        <div>{dist?.name || '—'}</div>
                        <code>{dist?.username || row.uid}</code>
                      </td>
                      <td>{typeLabel(row.type)}</td>
                      <td>{detailsSummary(row.type, row.details)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {docs.length === 0
                            ? '—'
                            : docs.map((url) => (
                                <button
                                  key={url}
                                  type="button"
                                  className="btn ghost"
                                  style={{ padding: 4 }}
                                  onClick={() => setPreviewUrl(url)}
                                  title="Click to enlarge"
                                >
                                  <img
                                    src={url}
                                    alt="KYC document"
                                    style={{
                                      width: 56,
                                      height: 56,
                                      objectFit: 'cover',
                                      borderRadius: 6,
                                      display: 'block',
                                    }}
                                  />
                                </button>
                              ))}
                        </div>
                      </td>
                      <td>
                        <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
                      </td>
                      <td>
                        {row.status === 1 ? (
                          <div className="form-grid" style={{ minWidth: 220 }}>
                            <input
                              placeholder="Remark"
                              value={remark[key] || ''}
                              onChange={(e) =>
                                setRemark((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                            />
                            <button
                              type="button"
                              className="btn primary"
                              disabled={actingKey === key}
                              onClick={() => approve(row)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              disabled={actingKey === key}
                              onClick={() => reject(row)}
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
          <img
            src={previewUrl}
            alt="KYC preview"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }}
          />
        </div>
      ) : null}
    </div>
  );
}
