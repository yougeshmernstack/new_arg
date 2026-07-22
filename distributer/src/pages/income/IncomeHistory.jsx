import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { distributorApi } from '../../api';

function formatInr(value, fractionDigits = 2) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

function formatDate(value) {
  if (!value) return { day: '—', time: '' };
  const d = new Date(value);
  return {
    day: d.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function statusLabel(status) {
  if (status === 1) return 'Credited';
  if (status === 2) return 'Rejected';
  return 'Pending';
}

function statusTone(status) {
  if (status === 1) return 'ok';
  if (status === 2) return 'danger';
  return 'warn';
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="m5.6 5.6 2.8 2.8" />
      <path d="m15.6 15.6 2.8 2.8" />
      <path d="m18.4 5.6-2.8 2.8" />
      <path d="m8.4 15.6-2.8 2.8" />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9h16" />
      <path d="M4 15h16" />
      <path d="M10 3 8 21" />
      <path d="M16 3l-2 18" />
    </svg>
  );
}

export default function IncomeHistory() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [slug]);

  useEffect(() => {
    if (!slug) return undefined;
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await distributorApi.getIncomeHistory({ slug, page, limit: 50 });
        if (!active) return;
        setData(res.data?.data || null);
        setPagination(res.data?.pagination || { page: 1, pages: 1, total: 0 });
      } catch (err) {
        if (active) {
          setData(null);
          setError(err.response?.data?.message || 'Failed to load income history');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, page]);

  const items = Array.isArray(data?.items) ? data.items : [];
  const label = data?.label || String(slug || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  const creditCount = Number(data?.creditCount || 0);
  const creditedTotal = Number(data?.creditedTotal || 0);
  const balance = Number(data?.balance || 0);

  return (
    <div className="page ih-page">
      <header className="ih-hero">
        <div className="ih-hero-copy">
          <Link to="/" className="ih-back">
            <ArrowLeftIcon />
            Dashboard
          </Link>
          <p className="ih-eyebrow">Income ledger</p>
          <h2>{label}</h2>
          <p className="ih-lead">Every credit for this income type, with source and status.</p>
        </div>
        <div className="ih-hero-aside" aria-hidden="true">
          <span className="ih-hero-orb" />
          <LeafIcon />
        </div>
      </header>

      {error ? <div className="alert error">{error}</div> : null}

      {loading ? (
        <div className="ih-skeleton-grid" aria-hidden="true">
          <div className="ih-skeleton ih-skeleton-hero" />
          <div className="ih-skeleton" />
          <div className="ih-skeleton" />
          <div className="ih-skeleton ih-skeleton-list" />
        </div>
      ) : null}

      {!loading && !error && data ? (
        <>
          <section className="ih-stats" aria-label="Income summary">
            <div className="ih-stat-hero">
              <div>
                <span>Total credited</span>
                <strong>{formatInr(creditedTotal)}</strong>
                <em>
                  {creditCount > 0
                    ? `${creditCount} credit${creditCount === 1 ? '' : 's'} recorded`
                    : 'No credits yet'}
                </em>
              </div>
              <div className="ih-stat-hero-icon">
                <LeafIcon />
              </div>
            </div>

            <div className="ih-stat-card">
              <span className="ih-stat-icon">
                <WalletIcon />
              </span>
              <div>
                <span>Wallet balance</span>
                <strong>{formatInr(balance)}</strong>
              </div>
            </div>

            <div className="ih-stat-card">
              <span className="ih-stat-icon is-gold">
                <SparkIcon />
              </span>
              <div>
                <span>Credits</span>
                <strong>{creditCount}</strong>
              </div>
            </div>
          </section>

          <section className="ih-panel">
            <div className="ih-panel-head">
              <div>
                <h3>Credit history</h3>
                <p>Newest credits first</p>
              </div>
              <span className="ih-chip">
                {pagination.total || items.length} entr{(pagination.total || items.length) === 1 ? 'y' : 'ies'}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="ih-empty">
                <span className="ih-empty-icon">
                  <HashIcon />
                </span>
                <strong>No credits yet</strong>
                <p>When this income type is earned, each credit will appear here.</p>
              </div>
            ) : (
              <ul className="ih-timeline">
                {items.map((item, index) => {
                  const when = formatDate(item.time || item.createdAt);
                  const from = item.to_from_username || item.to_from || 'System';
                  const tone = statusTone(item.status);
                  return (
                    <li
                      className="ih-entry"
                      key={item.tx_Id || item._id}
                      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                    >
                      <div className="ih-entry-rail" aria-hidden="true">
                        <span className={`ih-entry-dot is-${tone}`} />
                      </div>
                      <div className="ih-entry-card">
                        <div className="ih-entry-top">
                          <div className="ih-entry-amount">
                            <strong>{formatInr(item.amount)}</strong>
                            <span className={`ih-status is-${tone}`}>{statusLabel(item.status)}</span>
                          </div>
                          <div className="ih-entry-when">
                            <strong>{when.day}</strong>
                            <span>{when.time}</span>
                          </div>
                        </div>
                        <div className="ih-entry-meta">
                          <span>
                            <em>Tx</em> #{item.tx_Id ?? '—'}
                          </span>
                          <span>
                            <em>From</em> {from}
                          </span>
                          {item.level != null && item.level !== '' ? (
                            <span>
                              <em>Level</em> {item.level}
                            </span>
                          ) : null}
                          {item.remark ? (
                            <span className="ih-entry-remark">
                              <em>Note</em> {item.remark}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {pagination.pages > 1 ? (
              <div className="ih-pager">
                <button
                  type="button"
                  className="btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  type="button"
                  className="btn"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
