import { useEffect, useState } from 'react';
import { storeApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function paymentStatusLabel(status) {
  if (status === 'verified') return 'Verified';
  if (status === 'submitted') return 'Awaiting verification';
  if (status === 'rejected') return 'Rejected — re-submit';
  return 'Payment pending';
}

export default function OrderPaymentPanel({ order, onUpdated }) {
  const [methods, setMethods] = useState({ bank: [], upi: [] });
  const [utr, setUtr] = useState('');
  const [proof, setProof] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loadingMethods, setLoadingMethods] = useState(true);

  const payment = order?.payment || {};
  const payStatus = payment.status || 'none';
  const canSubmit =
    order?.order_status === 'pending' &&
    (payStatus === 'none' || payStatus === 'rejected');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await storeApi.getPaymentMethods();
        if (active) setMethods(res.data?.data || { bank: [], upi: [] });
      } catch {
        if (active) setMethods({ bank: [], upi: [] });
      } finally {
        if (active) setLoadingMethods(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!proof) {
      setProofPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(proof);
    setProofPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proof]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting || !canSubmit) return;
    if (!utr.trim()) {
      setError('UTR / transaction ID is required');
      return;
    }
    if (!proof) {
      setError('Payment proof image is required');
      return;
    }
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('orderId', String(order.orderId));
      fd.append('utr', utr.trim());
      fd.append('proof', proof);
      const res = await storeApi.submitOrderPayment(fd);
      setMessage(res.data?.message || 'Payment proof submitted.');
      setUtr('');
      setProof(null);
      if (typeof onUpdated === 'function') onUpdated(res.data?.data?.order);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit payment proof');
    } finally {
      setSubmitting(false);
    }
  };

  const hasMethods = Boolean(methods.bank?.length || methods.upi?.length);

  return (
    <section className="panel">
      <h3>Payment</h3>
      <p>
        Amount due: <strong>₹{Number(order?.grand_total || 0).toFixed(2)}</strong>
        {' · '}
        <span className="badge">{paymentStatusLabel(payStatus)}</span>
      </p>
      {payment.utr ? (
        <p className="muted">
          UTR: <code>{payment.utr}</code>
          {payment.remark ? ` · ${payment.remark}` : ''}
        </p>
      ) : null}
      {payment.proofUrl ? (
        <p>
          <a href={mediaUrl(payment.proofUrl)} target="_blank" rel="noreferrer">
            View submitted proof
          </a>
        </p>
      ) : null}

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      {payStatus === 'submitted' ? (
        <p className="muted">Your payment proof is under review. The order will be confirmed after admin verification.</p>
      ) : null}
      {payStatus === 'verified' ? (
        <p className="muted">Payment verified. Your order is confirmed.</p>
      ) : null}

      {canSubmit ? (
        <>
          <h4>Pay to company account</h4>
          {loadingMethods ? <p className="muted">Loading payment details...</p> : null}
          {!loadingMethods && !hasMethods ? (
            <p className="muted">No payment methods configured. Please contact admin.</p>
          ) : null}

          {(methods.bank || []).map((b, i) => (
            <div key={`bank-${i}`} className="panel" style={{ marginBottom: 12 }}>
              <strong>{b.bankName || 'Bank'}</strong>
              <p>
                A/C: <code>{b.accountNumber}</code>
                {b.ifsc ? (
                  <>
                    {' '}
                    · IFSC: <code>{b.ifsc}</code>
                  </>
                ) : null}
              </p>
              <p className="muted">{b.holder || ''}{b.branch ? ` · ${b.branch}` : ''}</p>
            </div>
          ))}

          {(methods.upi || []).map((u, i) => (
            <div key={`upi-${i}`} className="panel" style={{ marginBottom: 12 }}>
              <strong>{u.name || 'UPI'}</strong>
              <p>
                <code>{u.upiId}</code>
              </p>
              {u.qrCodeUrl ? (
                <img
                  src={mediaUrl(u.qrCodeUrl)}
                  alt="UPI QR"
                  style={{ maxWidth: 160, borderRadius: 8 }}
                />
              ) : null}
            </div>
          ))}

          <form className="form-grid" onSubmit={submit}>
            <label>
              UTR / Txn ID
              <input
                required
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="Bank / UPI reference"
              />
            </label>
            <label className="full">
              Payment screenshot
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => setProof(e.target.files?.[0] || null)}
              />
            </label>
            {proofPreview ? (
              <img
                src={proofPreview}
                alt="Proof preview"
                style={{ maxWidth: 200, borderRadius: 8 }}
              />
            ) : null}
            <div className="form-actions full">
              <button type="submit" className="btn primary" disabled={submitting || !hasMethods}>
                {submitting ? 'Submitting...' : 'Submit payment proof'}
              </button>
            </div>
          </form>
        </>
      ) : null}
    </section>
  );
}
