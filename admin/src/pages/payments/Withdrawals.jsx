import { useEffect, useState } from 'react';
import { withdrawalApi } from '../../api';

function formatInr(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
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

export default function Withdrawals() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState(null);
  const [remark, setRemark] = useState({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await withdrawalApi.getWithdrawals({
        status: status === 'all' ? undefined : status,
      });
      setList(res.data?.data || []);
    } catch (err) {
      const apiMsg = err.response?.data?.message;
      const details = err.response?.data?.details;
      setError(
        apiMsg
          ? details
            ? `${apiMsg} (${details})`
            : apiMsg
          : err.message === 'Network Error'
            ? 'Cannot reach API server. Make sure API is running on port 6500.'
            : err.message || 'Failed to load withdrawals'
      );
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const approve = async (txId) => {
    setActingId(txId);
    setError('');
    try {
      await withdrawalApi.approveWithdrawal({
        tx_Id: txId,
        remark: remark[txId] || 'Approved',
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Approve failed');
    } finally {
      setActingId(null);
    }
  };

  const reject = async (txId) => {
    if (!window.confirm('Reject this withdrawal? Full request amount will be credited back to main wallet.')) {
      return;
    }
    setActingId(txId);
    setError('');
    try {
      await withdrawalApi.rejectWithdrawal({
        tx_Id: txId,
        remark: remark[txId] || 'Rejected',
      });
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
          <h2>Withdrawals</h2>
          <p>Review distributor main-wallet withdrawal requests (TDS + admin charges)</p>
        </div>
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
                <th>User</th>
                <th>Request</th>
                <th>TDS</th>
                <th>Admin</th>
                <th>Payable</th>
                <th>Bank</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={9}>No withdrawal requests</td>
                </tr>
              ) : (
                list.map((row) => (
                  <tr key={row.tx_Id}>
                    <td>
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString()
                        : '—'}
                    </td>
                    <td>
                      <div><strong>{row.username || row.uid}</strong></div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        UID {row.uid}{row.name ? ` · ${row.name}` : ''}
                      </div>
                    </td>
                    <td>{formatInr(row.amount)}</td>
                    <td>{formatInr(row.tds)}</td>
                    <td>{formatInr(row.admin_charge)}</td>
                    <td><strong>{formatInr(row.payable)}</strong></td>
                    <td>
                      {row.account ? (
                        <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                          <div>{row.account.bankName || '—'}</div>
                          <code>{row.account.accountNumber || '—'}</code>
                          <div>{row.account.ifscCode || ''}</div>
                          <div>{row.account.holderName || ''}</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className={statusClass(row.status)}>
                        {statusLabel(row.status)}
                      </span>
                      {row.remark && row.status !== 0 ? (
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                          {row.remark}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {row.status === 0 ? (
                        <div className="form-grid" style={{ minWidth: 220 }}>
                          <input
                            placeholder="Remark"
                            value={remark[row.tx_Id] || ''}
                            onChange={(e) =>
                              setRemark((prev) => ({
                                ...prev,
                                [row.tx_Id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="btn primary"
                            disabled={actingId === row.tx_Id}
                            onClick={() => approve(row.tx_Id)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn ghost"
                            disabled={actingId === row.tx_Id}
                            onClick={() => reject(row.tx_Id)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12 }}>Tx #{row.tx_Id}</span>
                      )}
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
