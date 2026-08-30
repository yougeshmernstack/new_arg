import { useEffect, useState } from 'react';
import { storeApi, walletApi } from '../../api';
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

function paymentStatusHint(status) {
  if (status === 'verified') return 'Admin has approved your payment.';
  if (status === 'submitted') return 'Proof submitted and waiting for review.';
  if (status === 'rejected') return 'Please correct the payment proof and re-submit.';
  return 'Pay using company account details and submit proof.';
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="5" width="8" height="8" rx="1.8" />
      <path d="M3 10V4.8A1.8 1.8 0 0 1 4.8 3H10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 7 10 3l8 4" />
      <path d="M4 8v7" />
      <path d="M8 8v7" />
      <path d="M12 8v7" />
      <path d="M16 8v7" />
      <path d="M2 17h16" />
    </svg>
  );
}

function UpiIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2v16" />
      <path d="M5 7 10 2l5 5" />
      <path d="M15 13 10 18l-5-5" />
    </svg>
  );
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore clipboard errors */
    }
  };

  return (
    <button
      type="button"
      className={`fund-copy-btn${copied ? ' is-copied' : ''}`}
      onClick={copy}
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span className="fund-copy-label">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

/**
 * Shows company bank/UPI details and UTR + proof upload for a pending order.
 */
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
        const res = await walletApi.getPaymentMethods();
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
      <div className="order-pay-shell">
        <div className="order-pay-summary">
          <div className="order-pay-summary-copy">
            <p className="muted">Amount due</p>
            <strong className="order-pay-amount">₹{Number(order?.grand_total || 0).toFixed(2)}</strong>
            <small>{paymentStatusHint(payStatus)}</small>
          </div>
          <span className="badge order-pay-status-badge">{paymentStatusLabel(payStatus)}</span>
        </div>
        {(payment.utr || payment.proofUrl) ? (
          <div className="order-pay-meta">
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
          </div>
        ) : null}

        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert success">{message}</div> : null}

        {payStatus === 'submitted' ? (
          <p className="muted order-pay-feedback">Your payment proof is under review. The order will be confirmed after admin verification.</p>
        ) : null}
        {payStatus === 'verified' ? (
          <p className="muted order-pay-feedback">Payment verified. Your order is confirmed.</p>
        ) : null}

        {canSubmit ? (
          <>
            <div className="order-pay-step-card">
              <div className="order-pay-head">
                <div>
                  <p className="fund-section-kicker">Step 1</p>
                  <h4>Pay to company account</h4>
                </div>
                <p className="muted order-pay-note">Transfer first, then submit UTR and screenshot below.</p>
              </div>
              {loadingMethods ? <p className="muted">Loading payment details...</p> : null}
              {!loadingMethods && !hasMethods ? (
                <div className="fund-empty fund-empty-sm">
                  <BankIcon />
                  <p>Company bank or UPI payment details are not configured yet. Please ask admin to add them in Payment Settings.</p>
                </div>
              ) : null}

              <div className="order-pay-methods">
                {methods.bank?.length ? (
                  <div className="fund-block order-pay-method-block">
                    <div className="fund-block-title">
                      <BankIcon />
                      <h4>Bank accounts</h4>
                    </div>
                    <div className="fund-bank-list">
                      {methods.bank.map((b, i) => (
                        <article key={`bank-${i}`} className="fund-bank-card order-pay-bank-card">
                          <div className="fund-bank-top">
                            <div>
                              <strong>{b.bankName || 'Bank'}</strong>
                              {b.holder ? <p className="order-pay-bank-holder">{b.holder}</p> : null}
                            </div>
                            {b.branch ? <span>{b.branch}</span> : null}
                          </div>
                          <dl className="fund-kv">
                            <div>
                              <dt>A/C</dt>
                              <dd>
                                <code>{b.accountNumber || '—'}</code>
                                <CopyButton value={b.accountNumber} label="account number" />
                              </dd>
                            </div>
                            <div>
                              <dt>IFSC</dt>
                              <dd>
                                <code>{b.ifsc || '—'}</code>
                                <CopyButton value={b.ifsc} label="IFSC" />
                              </dd>
                            </div>
                            <div>
                              <dt>Name</dt>
                              <dd>{b.holder || '—'}</dd>
                            </div>
                          </dl>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}

                {methods.upi?.length ? (
                  <div className="fund-block order-pay-method-block">
                    <div className="fund-block-title">
                      <UpiIcon />
                      <h4>UPI</h4>
                    </div>
                    <div className="fund-upi-grid">
                      {methods.upi.map((u, i) => (
                        <article key={`upi-${i}`} className="fund-upi-card order-pay-upi-card">
                          <div className="fund-upi-info">
                            <strong>{u.name || 'UPI'}</strong>
                            <div className="fund-upi-id">
                              <code>{u.upiId || '—'}</code>
                              <CopyButton value={u.upiId} label="UPI ID" />
                            </div>
                          </div>
                          {u.qrCodeUrl ? (
                            <img src={mediaUrl(u.qrCodeUrl)} alt={`${u.name || 'UPI'} QR`} className="fund-qr" />
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="order-pay-step-card">
              <div className="order-pay-head">
                <div>
                  <p className="fund-section-kicker">Step 2</p>
                  <h4>Submit payment proof</h4>
                </div>
                <p className="muted order-pay-note">Upload the same payment screenshot and correct transaction ID.</p>
              </div>

              <form className="form-grid order-pay-form" onSubmit={submit}>
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
                  <div className="order-pay-proof-wrap full">
                    <img src={proofPreview} alt="Proof preview" className="order-pay-proof" />
                  </div>
                ) : null}
                <div className="form-actions full">
                  <button type="submit" className="btn primary" disabled={submitting || !hasMethods}>
                    {submitting ? 'Submitting...' : 'Submit payment proof'}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
