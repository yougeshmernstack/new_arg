import { useEffect, useState } from 'react';
import { walletApi } from '../../api';
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

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
      <path d="M3 10h18" />
      <path d="M16 14.5h2" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 10.5V18" />
      <path d="M9.5 10.5V18" />
      <path d="M14.5 10.5V18" />
      <path d="M19 10.5V18" />
      <path d="M3.5 18h17" />
    </svg>
  );
}

function UpiIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M7 15.5 10.2 9l2.3 4.2L14.8 9l3.2 6.5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5.5" y="5.5" width="7" height="7" rx="1.2" />
      <path d="M10.5 5.5V4.2A1.2 1.2 0 0 0 9.3 3H4.2A1.2 1.2 0 0 0 3 4.2v5.1A1.2 1.2 0 0 0 4.2 10.5H5.5" />
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

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
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

const TABS = [
  { id: 'pay', label: 'Pay' },
  { id: 'submit', label: 'Submit' },
  { id: 'history', label: 'History' },
];

export default function FundWallet() {
  const [balance, setBalance] = useState(0);
  const [methods, setMethods] = useState({ bank: [], upi: [] });
  const [deposits, setDeposits] = useState([]);
  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [proof, setProof] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mobileTab, setMobileTab] = useState('pay');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [walletRes, methodsRes, depositsRes] = await Promise.all([
        walletApi.getFundWallet(),
        walletApi.getPaymentMethods(),
        walletApi.getFundDeposits(),
      ]);
      setBalance(Number(walletRes.data?.data?.balance || 0));
      setMethods(methodsRes.data?.data || { bank: [], upi: [] });
      setDeposits(depositsRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load fund wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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
    if (!proof) {
      setError('Payment proof image is required');
      setMobileTab('submit');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('amount', amount);
      fd.append('utr', utr.trim());
      fd.append('proof', proof);
      await walletApi.submitFundDeposit(fd);
      setSuccess('Deposit request submitted. Admin will verify your UTR.');
      setAmount('');
      setUtr('');
      setProof(null);
      e.target.reset?.();
      setMobileTab('history');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit deposit');
      setMobileTab('submit');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = deposits.filter((d) => Number(d.status) === 0).length;
  const hasMethods = Boolean(methods.bank?.length || methods.upi?.length);

  if (loading) {
    return (
      <div className="page fund-page">
        <div className="fund-hero fund-hero-skeleton" aria-hidden="true" />
        <div className="fund-layout">
          <div className="fund-card fund-card-skeleton" />
          <div className="fund-card fund-card-skeleton" />
        </div>
      </div>
    );
  }

  const paymentSection = (
    <section className={`fund-card fund-panel-pay${mobileTab === 'pay' ? ' is-active' : ''}`}>
      <div className="fund-card-head">
        <div>
          <p className="fund-section-kicker">Step 1</p>
          <h3>Payment details</h3>
          <p className="fund-section-lead">Transfer, then note your UTR.</p>
        </div>
      </div>

      {!hasMethods ? (
        <div className="fund-empty">
          <BankIcon />
          <p>No payment methods configured yet. Please contact admin.</p>
        </div>
      ) : null}

      {methods.bank?.length ? (
        <div className="fund-block">
          <div className="fund-block-title">
            <BankIcon />
            <h4>Bank</h4>
          </div>
          <div className="fund-bank-list">
            {methods.bank.map((b, i) => (
              <article key={`bank-${i}`} className="fund-bank-card">
                <div className="fund-bank-top">
                  <strong>{b.bankName || 'Bank'}</strong>
                  {b.branch ? <span>{b.branch}</span> : null}
                </div>
                <dl className="fund-kv">
                  <div>
                    <dt>A/C</dt>
                    <dd>
                      <code>{b.accountNumber}</code>
                      <CopyButton value={b.accountNumber} label="account number" />
                    </dd>
                  </div>
                  <div>
                    <dt>IFSC</dt>
                    <dd>
                      <code>{b.ifsc}</code>
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
        <div className="fund-block">
          <div className="fund-block-title">
            <UpiIcon />
            <h4>UPI</h4>
          </div>
          <div className="fund-upi-grid">
            {methods.upi.map((u, i) => (
              <article key={`upi-${i}`} className="fund-upi-card">
                <div className="fund-upi-info">
                  <strong>{u.name || 'UPI'}</strong>
                  <div className="fund-upi-id">
                    <code>{u.upiId}</code>
                    <CopyButton value={u.upiId} label="UPI ID" />
                  </div>
                </div>
                {u.qrCodeUrl ? (
                  <img
                    src={mediaUrl(u.qrCodeUrl)}
                    alt={`${u.name || 'UPI'} QR code`}
                    className="fund-qr"
                  />
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="btn primary fund-mobile-next"
        onClick={() => setMobileTab('submit')}
      >
        Next: Submit deposit
      </button>
    </section>
  );

  const submitSection = (
    <section className={`fund-card fund-submit-card fund-panel-submit${mobileTab === 'submit' ? ' is-active' : ''}`}>
      <div className="fund-card-head">
        <div>
          <p className="fund-section-kicker">Step 2</p>
          <h3>Submit deposit</h3>
          <p className="fund-section-lead">Amount, UTR & proof.</p>
        </div>
      </div>

      <form className="fund-form" onSubmit={submit}>
        <div className="fund-form-row">
          <label>
            Amount (₹)
            <input
              type="number"
              min="1"
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
            />
          </label>
          <label>
            UTR / Txn ID
            <input
              required
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="Reference number"
            />
          </label>
        </div>
        <label className="fund-file-label">
          Payment proof *
          <div className={`fund-file-drop${proof ? ' has-file' : ''}`}>
            <input
              type="file"
              accept="image/*"
              required
              onChange={(e) => setProof(e.target.files?.[0] || null)}
            />
            {proofPreview ? (
              <img src={proofPreview} alt="Proof preview" className="fund-proof-preview" />
            ) : (
              <div className="fund-file-hint">
                <span>Tap to upload</span>
                <small>JPG or PNG</small>
              </div>
            )}
          </div>
          {proof ? <em className="fund-file-name">{proof.name}</em> : null}
        </label>
        <button type="submit" className="btn primary fund-submit-btn" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit for approval'}
        </button>
      </form>
    </section>
  );

  const historySection = (
    <section className={`fund-card fund-history-card fund-panel-history${mobileTab === 'history' ? ' is-active' : ''}`}>
      <div className="fund-card-head">
        <div>
          <p className="fund-section-kicker">History</p>
          <h3>Deposit requests</h3>
        </div>
        <span className="fund-count-chip">{deposits.length}</span>
      </div>

      {deposits.length === 0 ? (
        <div className="fund-empty fund-empty-sm">
          <p>No deposits yet.</p>
        </div>
      ) : (
        <>
          <div className="fund-history-list" aria-label="Deposit history">
            {deposits.map((row) => (
              <article key={row._id} className="fund-history-item">
                <div className="fund-history-top">
                  <strong>₹{Number(row.amount || 0).toLocaleString('en-IN')}</strong>
                  <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
                </div>
                <div className="fund-history-meta">
                  <code>{row.utr}</code>
                  <time>
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                        })
                      : '—'}
                  </time>
                </div>
                {row.remark ? <p className="fund-history-remark">{row.remark}</p> : null}
              </article>
            ))}
          </div>

          <div className="table-wrap fund-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>UTR</th>
                  <th>Status</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((row) => (
                  <tr key={`t-${row._id}`}>
                    <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                    <td className="fund-amount-cell">₹{Number(row.amount || 0).toLocaleString('en-IN')}</td>
                    <td><code>{row.utr}</code></td>
                    <td>
                      <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
                    </td>
                    <td>{row.remark || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );

  return (
    <div className="page fund-page">
      <header className="fund-hero">
        <div className="fund-hero-copy">
          <p className="fund-eyebrow">Wallet</p>
          <h2>Fund Wallet</h2>
          <p className="fund-lead">
            Pay via bank/UPI, then submit UTR with proof for approval.
          </p>
        </div>
        <div className="fund-balance-chip" aria-live="polite">
          <span>Balance</span>
          <strong>₹{Number(balance).toLocaleString('en-IN')}</strong>
          {pendingCount > 0 ? (
            <em>{pendingCount} pending</em>
          ) : (
            <em>Ready</em>
          )}
        </div>
        <div className="fund-hero-aside" aria-hidden="true">
          <span className="fund-hero-orb" />
          <WalletIcon />
        </div>
      </header>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <nav className="fund-tabs" aria-label="Fund wallet sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`fund-tab${mobileTab === tab.id ? ' active' : ''}`}
            onClick={() => setMobileTab(tab.id)}
          >
            {tab.label}
            {tab.id === 'history' && pendingCount > 0 ? (
              <i className="fund-tab-dot" aria-hidden="true" />
            ) : null}
          </button>
        ))}
      </nav>

      <div className="fund-layout">
        {paymentSection}
        {submitSection}
      </div>

      {historySection}
    </div>
  );
}
