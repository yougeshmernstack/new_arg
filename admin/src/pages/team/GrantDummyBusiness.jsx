import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dummyBusinessApi } from '../../api';

export default function GrantDummyBusiness() {
  const [username, setUsername] = useState('');
  const [uid, setUid] = useState('');
  const [amount, setAmount] = useState('');
  const [side, setSide] = useState('left');
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
    if (side !== 'left' && side !== 'right') {
      setError('Select left or right side');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    setLastResult(null);

    try {
      const payload = {
        amount: creditAmount,
        side,
        remark: remark.trim(),
      };
      if (uid.trim()) payload.uid = Number(uid.trim());
      if (username.trim()) payload.username = username.trim();

      const res = await dummyBusinessApi.grant(payload);
      const data = res.data?.data || null;
      setLastResult(data);
      setSuccess(res.data?.message || 'Dummy business granted successfully');
      setAmount('');
      setRemark('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to grant dummy business');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Dummy Business</h2>
          <p>
            Grant left/right dummy BV to a distributor. Visible only on that user’s Binary BV panel — not
            shared with upline or downline.
          </p>
        </div>
        <Link className="btn ghost" to="/dummy-business-history">
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
          Side
          <select value={side} onChange={(e) => setSide(e.target.value)} disabled={submitting}>
            <option value="left">Left Dummy</option>
            <option value="right">Right Dummy</option>
          </select>
        </label>
        <label>
          Amount (BV)
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
            {submitting ? 'Granting...' : 'Grant Dummy Business'}
          </button>
        </div>
      </form>

      {lastResult ? (
        <section className="panel" style={{ maxWidth: 560, marginTop: 16 }}>
          <h3>Last grant</h3>
          <p>
            <strong>{lastResult.username}</strong>
            {lastResult.name ? ` (${lastResult.name})` : ''} · UID {lastResult.uid}
          </p>
          <p>
            Side: <strong>{String(lastResult.side || '').toUpperCase()}</strong> · Amount:{' '}
            <strong>₹{Number(lastResult.amount || 0).toFixed(2)}</strong>
          </p>
          <p>
            Left Dummy now: <strong>₹{Number(lastResult.left_dummy_bv || 0).toFixed(2)}</strong>
          </p>
          <p>
            Right Dummy now: <strong>₹{Number(lastResult.right_dummy_bv || 0).toFixed(2)}</strong>
          </p>
          <p>
            <Link to="/dummy-business-history">Open full history →</Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
