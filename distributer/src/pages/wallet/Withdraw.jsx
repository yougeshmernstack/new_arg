import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { walletApi } from '../../api';

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

function calcBreakdown(amount, settings) {
  const requestAmount = Number(amount) || 0;
  const tdsPct = Number(settings?.tds_percent || 0);
  const adminPct = Number(settings?.admin_charge_percent || 0);
  const tds = Number(((requestAmount * tdsPct) / 100).toFixed(2));
  const adminCharge = Number(((requestAmount * adminPct) / 100).toFixed(2));
  const payable = Number((requestAmount - tds - adminCharge).toFixed(2));
  return { requestAmount, tds, adminCharge, payable };
}

export default function Withdraw() {
  const [info, setInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const infoRes = await walletApi.getWithdrawInfo();
      setInfo(infoRes.data?.data || null);
      try {
        const histRes = await walletApi.getWithdrawHistory({
          status: statusFilter === 'all' ? undefined : statusFilter,
        });
        setHistory(histRes.data?.data || []);
      } catch (histErr) {
        setHistory([]);
        setError(histErr.response?.data?.message || 'Failed to load withdrawal history');
      }
    } catch (err) {
      setInfo(null);
      setHistory([]);
      setError(err.response?.data?.message || 'Failed to load withdrawal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const breakdown = useMemo(
    () => calcBreakdown(amount, info?.settings),
    [amount, info?.settings]
  );

  const locked = info ? Boolean(info.locked) : true;
  const settings = info?.settings || {};

  const submit = async (e) => {
    e.preventDefault();
    if (!info || locked) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await walletApi.requestWithdraw({ amount: Number(amount) });
      setSuccess(res.data?.message || 'Withdrawal request submitted.');
      setAmount('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !info) {
    return (
      <div className="page">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Withdraw</h2>
          <p>Claim income from your Main Wallet. TDS and admin charges apply.</p>
        </div>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <div className="fund-layout" style={{ marginTop: 8 }}>
        <section className="fund-card">
          <div className="fund-card-head">
            <div>
              <p className="fund-section-kicker">Main Wallet</p>
              <h3>Available balance</h3>
            </div>
            <div className="fund-balance-chip">
              <span>Balance</span>
              <strong>{formatInr(info?.balance)}</strong>
            </div>
          </div>

          {!info ? (
            <div className="alert error" style={{ marginTop: 12 }}>
              Could not load withdrawal details. Check API server and refresh.
            </div>
          ) : locked ? (
            <div className="alert error" style={{ marginTop: 12 }}>
              {info.lockReason || 'Withdrawal is locked.'}
              {info.kycStatus?.bank !== 2 ? (
                <div style={{ marginTop: 8 }}>
                  <Link className="btn ghost" to="/kyc">
                    Go to KYC
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="alert success" style={{ marginTop: 12 }}>
              Bank KYC approved. You can request a withdrawal.
            </div>
          )}

          {info?.bankDetails ? (
            <dl className="fund-kv" style={{ marginTop: 16 }}>
              <div>
                <dt>Bank</dt>
                <dd>{info.bankDetails.bankName || '—'}</dd>
              </div>
              <div>
                <dt>A/C</dt>
                <dd><code>{info.bankDetails.accountNumber || '—'}</code></dd>
              </div>
              <div>
                <dt>IFSC</dt>
                <dd><code>{info.bankDetails.ifscCode || '—'}</code></dd>
              </div>
              <div>
                <dt>Holder</dt>
                <dd>{info.bankDetails.holderName || '—'}</dd>
              </div>
            </dl>
          ) : null}

          <form onSubmit={submit} style={{ marginTop: 20 }}>
            <label className="field">
              <span>Enter amount</span>
              <input
                type="number"
                min={settings.min_withdrawal || 0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min ${settings.min_withdrawal || 100}`}
                disabled={locked || submitting}
                required
              />
            </label>

            <div className="fund-block" style={{ marginTop: 16 }}>
              <h4>Charge breakdown</h4>
              <dl className="fund-kv">
                <div>
                  <dt>Request</dt>
                  <dd>{formatInr(breakdown.requestAmount)}</dd>
                </div>
                <div>
                  <dt>TDS ({settings.tds_percent ?? 2}%)</dt>
                  <dd>− {formatInr(breakdown.tds)}</dd>
                </div>
                <div>
                  <dt>Admin ({settings.admin_charge_percent ?? 5}%)</dt>
                  <dd>− {formatInr(breakdown.adminCharge)}</dd>
                </div>
                <div>
                  <dt>You receive</dt>
                  <dd><strong>{formatInr(breakdown.payable)}</strong></dd>
                </div>
              </dl>
            </div>

            <button
              type="submit"
              className="btn primary"
              style={{ marginTop: 16, width: '100%' }}
              disabled={locked || submitting || !amount}
            >
              {submitting ? 'Submitting...' : 'Request Withdrawal'}
            </button>
          </form>
        </section>

        <section className="fund-card">
          <div className="fund-card-head">
            <div>
              <p className="fund-section-kicker">History</p>
              <h3>Your requests</h3>
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="0">Pending</option>
              <option value="1">Approved</option>
              <option value="2">Rejected</option>
            </select>
          </div>

          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>TDS</th>
                  <th>Admin</th>
                  <th>Payable</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No withdrawal requests yet</td>
                  </tr>
                ) : (
                  history.map((row) => (
                    <tr key={row.tx_Id}>
                      <td>
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString()
                          : '—'}
                      </td>
                      <td>{formatInr(row.amount)}</td>
                      <td>{formatInr(row.tds)}</td>
                      <td>{formatInr(row.admin_charge)}</td>
                      <td>{formatInr(row.payable)}</td>
                      <td>
                        <span className={statusClass(row.status)}>
                          {statusLabel(row.status)}
                        </span>
                        {row.remark ? (
                          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                            {row.remark}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
