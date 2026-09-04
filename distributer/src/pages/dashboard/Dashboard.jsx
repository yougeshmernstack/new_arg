import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { distributorApi, storeApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../utils/constants';

const BANNER_WIDTH = 1200;
const BANNER_HEIGHT = 360;
const BANNER_INTERVAL_MS = 1500;

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function DashboardBannerSlider({ banners }) {
  const slides = Array.isArray(banners) ? banners : [];
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animate, setAnimate] = useState(true);
  const trackRef = useRef(null);

  useEffect(() => {
    setIndex(0);
    setAnimate(true);
  }, [count]);

  const goNext = () => {
    if (count <= 1) return;
    setAnimate(true);
    setIndex((prev) => (prev >= count ? prev : prev + 1));
  };

  const goPrev = () => {
    if (count <= 1) return;
    setAnimate(true);
    setIndex((prev) => (prev < 0 ? prev : prev - 1));
  };

  const goTo = (target) => {
    if (count <= 1) return;
    setAnimate(true);
    setIndex(target);
  };

  useEffect(() => {
    if (count <= 1 || paused) return undefined;
    const timer = window.setInterval(() => {
      setAnimate(true);
      setIndex((prev) => (prev >= count ? prev : prev + 1));
    }, BANNER_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  useEffect(() => {
    if (count <= 1) return undefined;
    const track = trackRef.current;
    if (!track) return undefined;

    const onEnd = (event) => {
      if (event.target !== track) return;
      if (index >= count) {
        setAnimate(false);
        setIndex(0);
      } else if (index < 0) {
        setAnimate(false);
        setIndex(count - 1);
      }
    };

    track.addEventListener('transitionend', onEnd);
    return () => track.removeEventListener('transitionend', onEnd);
  }, [index, count]);

  useEffect(() => {
    if (animate) return undefined;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setAnimate(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [animate, index]);

  if (count === 0) {
    return (
      <div className="dash-banner-slot dash-banner-empty" aria-label="No banners">
        <div className="dash-banner-empty-inner">
          <strong>Welcome back</strong>
          <span>Promotions and updates will appear here</span>
        </div>
      </div>
    );
  }

  const visualIndex = ((index % count) + count) % count;
  // Seamless loop: [last, ...slides, first]
  const loopSlides =
    count > 1
      ? [slides[count - 1], ...slides, slides[0]]
      : slides;
  const trackIndex = count > 1 ? index + 1 : 0;

  const renderSlide = (slide, key) => {
    const isExternal = /^https?:\/\//i.test(slide.linkUrl || '');
    const image = (
      <img
        src={mediaUrl(slide.imageUrl)}
        alt={slide.title || 'Banner'}
        width={BANNER_WIDTH}
        height={BANNER_HEIGHT}
        draggable={false}
      />
    );

    let media = image;
    if (slide.linkUrl) {
      media = isExternal ? (
        <a className="dash-banner-link" href={slide.linkUrl} target="_blank" rel="noreferrer">
          {image}
        </a>
      ) : (
        <Link className="dash-banner-link" to={slide.linkUrl}>
          {image}
        </Link>
      );
    }

    return (
      <div className="dash-banner-slide" key={key}>
        {media}
      </div>
    );
  };

  return (
    <div
      className="dash-banner-slot"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="dash-banner-frame">
        <div
          ref={trackRef}
          className={`dash-banner-track${animate ? ' is-animated' : ''}`}
          style={{ transform: `translate3d(-${trackIndex * 100}%, 0, 0)` }}
        >
          {count > 1
            ? loopSlides.map((slide, i) => renderSlide(slide, `${slide.bannerId || 'b'}-${i}`))
            : renderSlide(slides[0], slides[0].bannerId || 'solo')}
        </div>

        {count > 1 ? (
          <>
            <button
              type="button"
              className="dash-banner-nav prev"
              aria-label="Previous banner"
              onClick={goPrev}
            >
              ‹
            </button>
            <button
              type="button"
              className="dash-banner-nav next"
              aria-label="Next banner"
              onClick={goNext}
            >
              ›
            </button>
            <div className="dash-banner-dots" role="tablist" aria-label="Banner slides">
              {slides.map((slide, i) => (
                <button
                  key={slide.bannerId || i}
                  type="button"
                  role="tab"
                  aria-selected={i === visualIndex}
                  className={`dash-banner-dot${i === visualIndex ? ' is-active' : ''}`}
                  onClick={() => goTo(i)}
                  aria-label={`Go to banner ${i + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function MetricIcon({ type }) {
  const paths = {
    income: (
      <>
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
      </>
    ),
    revenue: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 3 5-6" />
      </>
    ),
    orders: (
      <>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </>
    ),
    customers: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    wallet: (
      <>
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
      </>
    ),
    bag: (
      <>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </>
    ),
    megaphone: (
      <>
        <path d="m3 11 18-5v12L3 13v-2z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </>
    ),
    leaf: (
      <>
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </>
    ),
    tree: (
      <>
        <circle cx="12" cy="5" r="2.2" />
        <circle cx="7" cy="14" r="2.2" />
        <circle cx="17" cy="14" r="2.2" />
        <path d="M12 7.2v2.6M10.2 12.2 8.4 12.8M13.8 12.2l1.8.6" />
      </>
    ),
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type]}
    </svg>
  );
}

function formatInr(value, fractionDigits = 0) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

const INCOME_COLORS = ['#0f3d2e', '#1a5c40', '#2d8a5e', '#4caf50', '#7cb342', '#a8d08d', '#c9a227'];

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

function ReferralCopyRow({ label, side, link, username }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`dash-referral-card dash-referral-card-${side}`}>
      <div className="dash-referral-card-top">
        <div className="dash-referral-card-label">
          <i aria-hidden="true">{side === 'left' ? 'L' : 'R'}</i>
          <div>
            <strong>{label}</strong>
            <small>Matching {side} placement</small>
          </div>
        </div>
        <button
          type="button"
          className={`dash-referral-copy-btn${copied ? ' is-copied' : ''}`}
          onClick={copy}
          aria-label={`Copy ${label} referral link`}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? 'Copied' : 'Copy link'}</span>
        </button>
      </div>
      <div className="dash-referral-url" title={link}>
        <code>{link}</code>
      </div>
      <div className="dash-referral-card-meta">
        <em>sponsor={username}</em>
        <em>placement={side}</em>
      </div>
    </div>
  );
}

function ReferralLinkCard({ username }) {
  const links = useMemo(() => {
    if (!username) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const base = `${origin}/register?sponsor=${encodeURIComponent(username)}`;
    return {
      left: `${base}&placement=left`,
      right: `${base}&placement=right`,
    };
  }, [username]);

  if (!username || !links) return null;

  return (
    <div className="dash-panel dash-referral-panel mb-3">
      <div className="dash-panel-head dash-referral-head">
        <div>
          <h3>Your Referral Links</h3>
          <p>Share Left or Right — new distributors join on that matching side under you</p>
        </div>
        <span className="dash-chip dash-referral-chip">
          <MetricIcon type="customers" />
          Invite
        </span>
      </div>
      <div className="dash-referral-grid">
        <ReferralCopyRow label="Left team" side="left" link={links.left} username={username} />
        <ReferralCopyRow label="Right team" side="right" link={links.right} username={username} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [data, setData] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [banners, setBanners] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const referralUsername = user?.username || profile?.username || '';

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [dashRes, ordersRes, bannersRes] = await Promise.all([
          distributorApi.getDashboard(),
          storeApi.getOrders({ limit: 5 }),
          distributorApi.getDashboardBanners().catch(() => ({ data: { data: [] } })),
        ]);
        if (!active) return;
        setData(dashRes.data?.data || null);
        setRecentOrders(ordersRes.data?.data || []);
        setBanners(bannersRes.data?.data || []);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const income = data?.income || { total: 0, items: [] };
  const incomeItems = useMemo(
    () => (Array.isArray(income.items) ? income.items : []),
    [income.items],
  );

  const chartStyle = useMemo(() => {
    const total = incomeItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    if (!total || incomeItems.length === 0) {
      return { background: 'conic-gradient(#e8f0ea 0 100%)' };
    }
    let cursor = 0;
    const stops = incomeItems.map((item, index) => {
      const pct = (Number(item.amount || 0) / total) * 100;
      const start = cursor;
      cursor += pct;
      return `${INCOME_COLORS[index % INCOME_COLORS.length]} ${start}% ${cursor}%`;
    });
    return { background: `conic-gradient(${stops.join(', ')})` };
  }, [incomeItems]);

  if (loading) {
    return (
      <div className="container-fluid px-0">
        <div className="dashboard-skeleton" aria-label="Loading dashboard" />
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger mb-0">{error}</div>;
  }

  const team = data?.team || {};
  const incomeTotal = Number(income.total || 0);
  const totalTeam = Number(team.totalTeam || 0);
  const activeTeam = Number(team.activeTeam || 0);
  const inactiveTeam = Number(team.inactiveTeam || 0);
  const directTeam = Number(team.directTeam || 0);
  const directActive = Number(team.directActive || 0);
  const directInactive = Number(team.directInactive || 0);
  const leftTeam = Number(team.leftTeam || 0);
  const leftActive = Number(team.leftActive || 0);
  const leftInactive = Number(team.leftInactive || 0);
  const rightTeam = Number(team.rightTeam || 0);
  const rightActive = Number(team.rightActive || 0);
  const rightInactive = Number(team.rightInactive || 0);
  const formattedIncome = formatInr(incomeTotal, 2);
  const binary = data?.binary || {};
  const leftBv = Number(binary.left_bv || 0);
  const rightBv = Number(binary.right_bv || 0);
  const matchBv = Number(binary.match_bv || binary.matched_bv || 0);
  const closedBv = Number(binary.closed_bv || 0);
  const leftDummyBv = Number(binary.left_dummy_bv || 0);
  const rightDummyBv = Number(binary.right_dummy_bv || 0);
  const repurchase = data?.repurchase || {};
  const repurchaseLeftBv = Number(repurchase.left_bv || 0);
  const repurchaseRightBv = Number(repurchase.right_bv || 0);
  const repurchaseMatchBv = Number(repurchase.match_bv || 0);

  const quickActions = [
    { to: '/fund-wallet', label: 'Add Funds', icon: 'wallet', tone: 'green' },
    { to: '/products', label: 'Shop Products', icon: 'bag', tone: 'mint' },
    { to: '/orders', label: 'My Orders', icon: 'list', tone: 'gold' },
    { to: '/packages', label: 'Packages', icon: 'megaphone', tone: 'violet' },
  ];

  return (
    <div className="container-fluid px-0 dash-pro">
      <div className="dash-banner-wrap mb-3">
        <DashboardBannerSlider banners={banners} />
      </div>

     

      <div className="row g-3 mb-3">
        <div className="col-12 col-xl-7">
          <div className="dash-panel dash-income-panel h-100">
            <div className="dash-panel-head">
              <div>
                <h3>Income Overview</h3>
                <p>Earnings by income type</p>
              </div>
              <span className="dash-chip">{incomeItems.length} active</span>
            </div>

            <div className="dash-income-layout">
              <div className="dash-income-main">
                <div className="dash-income-hero">
                  <div>
                    <span>Total Income</span>
                    <strong>{formattedIncome}</strong>
                  </div>
                  <div className="dash-income-hero-icon" aria-hidden="true">
                    <MetricIcon type="leaf" />
                  </div>
                </div>

                <div className="dash-income-list">
                  {incomeItems.length === 0 ? (
                    <div className="dash-empty-inline">No income types configured yet</div>
                  ) : (
                    incomeItems.map((item, index) => (
                      <Link
                        className="dash-income-row dash-income-row-link"
                        key={item.key || item.label}
                        to={`/income/${encodeURIComponent(item.key)}`}
                      >
                        <div className="dash-income-row-left">
                          <span
                            className="dash-income-dot"
                            style={{ background: INCOME_COLORS[index % INCOME_COLORS.length] }}
                          />
                          <div>
                            <strong>{item.label}</strong>
                            <small>
                              {item.count > 0
                                ? `${item.count} credit${item.count === 1 ? '' : 's'}`
                                : 'No credits yet'}
                            </small>
                          </div>
                        </div>
                        <b>{formatInr(item.amount, 2)}</b>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="dash-income-chart-wrap">
                <div className="dash-donut" style={chartStyle} aria-label="Income distribution">
                  <div className="dash-donut-hole">
                    <strong>{incomeItems.length || 0}</strong>
                    <span>Types</span>
                  </div>
                </div>
                <p className="dash-donut-caption">Income Distribution</p>
                <div className="dash-donut-legend">
                  {incomeItems.slice(0, 4).map((item, index) => (
                    <span key={item.key || item.label}>
                      <i style={{ background: INCOME_COLORS[index % INCOME_COLORS.length] }} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="dash-panel dash-team-panel h-100">
            <div className="dash-panel-head">
              <div>
                <h3>Team Overview</h3>
                <p>Live downline counts</p>
              </div>
              <Link to="/team/generation" className="dash-chip dash-chip-link">
                View team
              </Link>
            </div>

            <div className="dash-team-hero">
              <div className="dash-team-hero-copy">
                <span>Total Team</span>
                <strong>{totalTeam}</strong>
              </div>
              <div className="dash-team-hero-side">
                <div className="dash-team-pills">
                  <em className="is-active">{activeTeam} Active</em>
                  <em className="is-inactive">{inactiveTeam} Inactive</em>
                </div>
                <div className="dash-team-hero-icon" aria-hidden="true">
                  <MetricIcon type="customers" />
                </div>
              </div>
            </div>

            <div className="dash-team-legs">
              <Link to="/team/left" className="dash-team-leg left">
                <span>Left Team</span>
                <strong>{leftTeam}</strong>
                <div className="dash-team-leg-meta">
                  <em>{leftActive} active</em>
                  <em>{leftInactive} inactive</em>
                </div>
              </Link>
              <Link to="/team/right" className="dash-team-leg right">
                <span>Right Team</span>
                <strong>{rightTeam}</strong>
                <div className="dash-team-leg-meta">
                  <em>{rightActive} active</em>
                  <em>{rightInactive} inactive</em>
                </div>
              </Link>
            </div>

            <div className="dash-team-mini">
              <div className="dash-team-mini-item">
                <span>Direct</span>
                <b>{directTeam}</b>
                <small>
                  {directActive}A / {directInactive}I
                </small>
              </div>
              <div className="dash-team-mini-item">
                <span>Active</span>
                <b>{activeTeam}</b>
                <small>Full team</small>
              </div>
              <div className="dash-team-mini-item">
                <span>Inactive</span>
                <b>{inactiveTeam}</b>
                <small>Full team</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12">
          <div className="dash-panel dash-bv-panel">
            <div className="dash-panel-head">
              <div>
                <h3>Matching BV</h3>
                <p>Package purchase volume — left, right, match and dummy</p>
              </div>
              <Link to="/team/binary" className="dash-chip dash-chip-link dash-bv-link">
                <MetricIcon type="tree" />
                View matching tree
              </Link>
            </div>

            <div className="dash-bv-hero">
              <div className="dash-bv-hero-copy">
                <span>Match BV</span>
                <strong>{formatInr(matchBv, 2)}</strong>
                <small>Updates after matching closing</small>
              </div>
              <div className="dash-bv-hero-side">
                <div className="dash-bv-hero-stats">
                  <em title="Total BV deducted across all closings">
                    <b>Closed</b>
                    {formatInr(closedBv, 0)}
                  </em>
                  <em title="Total BV matched so far">
                    <b>Matched</b>
                    {formatInr(matchBv, 0)}
                  </em>
                </div>
                <div className="dash-bv-hero-icon" aria-hidden="true">
                  <MetricIcon type="tree" />
                </div>
              </div>
            </div>

            <div className="dash-bv-balance" aria-hidden="true">
              <div
                className="dash-bv-balance-left"
                style={{
                  flexGrow: Math.max(leftBv, 0.01),
                }}
              />
              <div
                className="dash-bv-balance-right"
                style={{
                  flexGrow: Math.max(rightBv, 0.01),
                }}
              />
            </div>

            <div className="dash-bv-grid">
              <div className="dash-bv-metric left">
                <div className="dash-bv-metric-top">
                  <span>Left BV</span>
                  <i className="dash-bv-metric-badge" aria-hidden="true">
                    L
                  </i>
                </div>
                <strong>{formatInr(leftBv, 2)}</strong>
                <small>Team volume</small>
              </div>
              <div className="dash-bv-metric right">
                <div className="dash-bv-metric-top">
                  <span>Right BV</span>
                  <i className="dash-bv-metric-badge" aria-hidden="true">
                    R
                  </i>
                </div>
                <strong>{formatInr(rightBv, 2)}</strong>
                <small>Team volume</small>
              </div>
              <div className="dash-bv-metric dummy left">
                <div className="dash-bv-metric-top">
                  <span>Left Dummy</span>
                  <i className="dash-bv-metric-badge" aria-hidden="true">
                    LD
                  </i>
                </div>
                <strong>{formatInr(leftDummyBv, 2)}</strong>
                <small>Carry forward</small>
              </div>
              <div className="dash-bv-metric dummy right">
                <div className="dash-bv-metric-top">
                  <span>Right Dummy</span>
                  <i className="dash-bv-metric-badge" aria-hidden="true">
                    RD
                  </i>
                </div>
                <strong>{formatInr(rightDummyBv, 2)}</strong>
                <small>Carry forward</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12">
          <div className="dash-panel dash-rp-panel">
            <div className="dash-rp-head">
              <div className="dash-rp-head-copy">
                <span className="dash-rp-tag">
                  <MetricIcon type="bag" />
                  Product BV
                </span>
                <h3>Repurchase Matching</h3>
                <p>Left &amp; right product volume — match closes separately (no dummy)</p>
              </div>
              <div className="dash-rp-match-pill" title="Pairable repurchase match BV">
                <span>Match</span>
                <strong>{formatInr(repurchaseMatchBv, 2)}</strong>
              </div>
            </div>

            <div className="dash-rp-track" aria-hidden="true">
              <div
                className="dash-rp-track-left"
                style={{ flexGrow: Math.max(repurchaseLeftBv, 0.01) }}
              />
              <div className="dash-rp-track-mid" />
              <div
                className="dash-rp-track-right"
                style={{ flexGrow: Math.max(repurchaseRightBv, 0.01) }}
              />
            </div>

            <div className="dash-rp-legs">
              <div className="dash-rp-leg dash-rp-leg-left">
                <div className="dash-rp-leg-label">
                  <i aria-hidden="true">L</i>
                  <span>Left BV</span>
                </div>
                <strong>{formatInr(repurchaseLeftBv, 2)}</strong>
                <small>Team product volume</small>
              </div>
              <div className="dash-rp-leg dash-rp-leg-match">
                <div className="dash-rp-leg-label">
                  <i aria-hidden="true">M</i>
                  <span>Match BV</span>
                </div>
                <strong>{formatInr(repurchaseMatchBv, 2)}</strong>
                <small>Ready to close</small>
              </div>
              <div className="dash-rp-leg dash-rp-leg-right">
                <div className="dash-rp-leg-label">
                  <i aria-hidden="true">R</i>
                  <span>Right BV</span>
                </div>
                <strong>{formatInr(repurchaseRightBv, 2)}</strong>
                <small>Team product volume</small>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ReferralLinkCard username={referralUsername} />

      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-7">
          <div className="dash-panel dash-orders-panel h-100">
            <div className="dash-panel-head">
              <div>
                <h3>Recent Orders</h3>
                <p>Latest ecommerce order activity</p>
              </div>
              <Link to="/orders" className="dash-chip dash-chip-link">
                View all
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="dash-orders-empty">
                <div className="dash-orders-empty-visual" aria-hidden="true">
                  <MetricIcon type="bag" />
                </div>
                <h4>No orders yet</h4>
                <p>Start shopping wellness products and your recent orders will show up here.</p>
                <Link to="/products" className="btn primary">
                  Shop Products
                </Link>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0 commerce-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th className="d-none d-sm-table-cell">Invoice</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.orderId}>
                        <td>
                          <Link to={`/orders/${order.orderId}`}>{order.order_number}</Link>
                        </td>
                        <td className="d-none d-sm-table-cell">{order.invoice_number || '—'}</td>
                        <td>{formatInr(order.grand_total || 0)}</td>
                        <td>
                          <em className={`order-status ${String(order.order_status || '').replace(/_/g, '')}`}>
                            {String(order.order_status || '').replace(/_/g, ' ')}
                          </em>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="dash-panel dash-actions-panel mb-3">
            <div className="dash-panel-head">
              <div>
                <h3>Quick Actions</h3>
                <p>Jump to everyday tasks</p>
              </div>
            </div>
            <div className="dash-quick-grid">
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to} className={`dash-quick-btn ${action.tone}`}>
                  <span className="dash-quick-icon">
                    <MetricIcon type={action.icon} />
                  </span>
                  <strong>{action.label}</strong>
                </Link>
              ))}
            </div>
          </div>

          <div className="dash-wellness-banner">
            <div className="dash-wellness-copy">
              <span>Wellness Collection</span>
              <h3>Wellness is a choice. Better life is a result.</h3>
              <Link to="/products" className="btn primary">
                Explore Products
                <MetricIcon type="arrow" />
              </Link>
            </div>
            <div className="dash-wellness-art" aria-hidden="true">
              <MetricIcon type="leaf" />
            </div>
          </div>
        </div>
      </div>

      <div className="dash-trust-bar">
        <span>
          <i className="leaf" /> 100% Natural
        </span>
        <span>
          <i className="star" /> Premium Quality
        </span>
        <span>
          <i className="coin" /> Better Earnings
        </span>
        <span>
          <i className="users" /> Stronger Together
        </span>
      </div>
    </div>
  );
}
