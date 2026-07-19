import { useState } from 'react';
import { Link } from 'react-router-dom';
import { paymentsApi } from '../../api';

export default function SendFund() {
  const [username, setUsername] = useState('');
  const [uid, setUid] = useState('');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastResult, setLastResult] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const creditAmount = Number(amount);
    if (!creditAmount || creditAmount <= 0) {
      setError('Enter a valid amount greater than 0');
      return;
    }
    if (!username.trim() && !uid.trim()) {
      setError('Enter username or uid');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    setLastResult(null);

    try {
      const payload = {
        amount: creditAmount,
        remark: remark.trim(),
        panel: 'distributor',
      };
      if (uid.trim()) payload.uid = Number(uid.trim());
      if (username.trim()) payload.username = username.trim();

      const res = await paymentsApi.sendFund(payload);
      const data = res.data?.data || null;
      setLastResult(data);
      setSuccess(res.data?.message || 'Fund credited successfully');
      setAmount('');
      setRemark('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send fund');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Send Fund</h2>
          <p>Credit any distributor’s fund wallet using add_fund activity</p>
        </div>
        <Link className="btn ghost" to="/send-fund-history">
          View history
        </Link>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <form className="form-grid panel" onSubmit={onSubmit} style={{ maxWidth: 560 }}>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Distributor username"
            disabled={submitting}
          />
        </label>
        <label>
          UID (optional)
          <input
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="Numeric uid"
            inputMode="numeric"
            disabled={submitting}
          />
        </label>
        <label>
          Amount (₹)
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={submitting}
          />
        </label>
        <label className="full">
          Remark
          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Optional note"
            disabled={submitting}
          />
        </label>
        <div className="form-actions full">
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send Fund'}
          </button>
        </div>
      </form>

      {lastResult ? (
        <section className="panel" style={{ maxWidth: 560, marginTop: 16 }}>
          <h3>Last credit</h3>
          <p>
            <strong>{lastResult.username}</strong>
            {lastResult.name ? ` (${lastResult.name})` : ''} · UID {lastResult.uid}
          </p>
          <p>
            Credited: <strong>₹{Number(lastResult.amount || 0).toFixed(2)}</strong>
          </p>
          <p>
            New fund wallet balance: <strong>₹{Number(lastResult.balance || 0).toFixed(2)}</strong>
          </p>
          <p className="muted">Tx ID: {lastResult.tx_Id}</p>
          <p>
            <Link to="/send-fund-history">Open full history →</Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
