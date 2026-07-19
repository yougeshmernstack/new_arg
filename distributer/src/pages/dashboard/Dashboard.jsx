import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { distributorApi, storeApi } from '../../api';

function MetricIcon({ type }) {
  const paths = {
    orders: <><path d="M9 5h6" /><path d="M8 5v2h8V5" /><path d="M7 7h10v14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7z" /><path d="M10 12h4" /><path d="M10 16h4" /></>,
    revenue: <><circle cx="12" cy="12" r="9" /><path d="M8 8h5a2 2 0 0 1 0 4H9l6 5" /><path d="M8 12h7" /></>,
    alerts: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    customers: <><path d="M16 21v-2a4 4 0 0 0-8 0v2" /><circle cx="12" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M2 21v-2a4 4 0 0 1 3-3.87" /></>,
    income: <><path d="M6 3h12" /><path d="M6 8h12" /><path d="M6 13h3" /><path d="M9 13c6.667 0 6.667-10 0-10" /><path d="m6 13 8.5 8" /></>,
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

const chartBars = [34, 58, 46, 72, 52, 88, 64, 76, 48, 67, 39, 58];

// Set true later to bring Sales Analytic back
const SHOW_SALES_ANALYTIC = false;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [dashRes, ordersRes] = await Promise.all([
          distributorApi.getDashboard(),
          storeApi.getOrders({ limit: 5 }),
        ]);
        if (!active) return;
        setData(dashRes.data?.data || null);
        setRecentOrders(ordersRes.data?.data || []);
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

  const amount = Number(data?.orders?.total_amount ?? 0);
  const orderCount = data?.orders?.total_orders ?? 0;
  const unread = data?.unreadNotifications ?? 0;
  const team = data?.team || {};
  const income = data?.income || { total: 0, items: [] };
  const incomeItems = Array.isArray(income.items) ? income.items : [];
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
  const formattedAmount = formatInr(amount);
  const formattedIncome = formatInr(incomeTotal, 2);
  const binary = data?.binary || {};
  const leftBv = Number(binary.left_bv || 0);
  const rightBv = Number(binary.right_bv || 0);
  const matchBv = Number(binary.match_bv || 0);
  const leftDummyBv = Number(binary.left_dummy_bv || 0);
  const rightDummyBv = Number(binary.right_dummy_bv || 0);

  const cards = [
    { label: 'Total Revenue', value: formattedAmount, note: 'All time business', icon: 'revenue', trend: '+11%' },
    { label: 'Total Income', value: formattedIncome, note: `${incomeItems.length} income type${incomeItems.length === 1 ? '' : 's'}`, icon: 'income', trend: null },
    { label: 'Total Orders', value: orderCount, note: 'Confirmed orders', icon: 'orders', trend: '+8%' },
    { label: 'Total Team', value: totalTeam, note: `${activeTeam} active · ${inactiveTeam} inactive`, icon: 'customers', trend: null },
  ];

  return (
    <div className="container-fluid px-0 commerce-dashboard">
      <div className="row g-2 g-md-3 mb-3">
        {cards.map((card) => (
          <div className="col-6 col-xl-3" key={card.label}>
            <div className="card commerce-stat-card h-100 border-0 shadow-sm">
              <div className="card-body d-flex align-items-start justify-content-between gap-2 p-3">
                <div className="metric-copy flex-grow-1 min-w-0">
                  <span className="d-block text-muted small">{card.label}</span>
                  <strong className="d-block text-truncate">{card.value}</strong>
                  <small className="d-block text-muted">
                    {card.note}
                    {card.trend ? (
                      <>
                        {' '}
                        <b className="trend-up">{card.trend}</b>
                      </>
                    ) : null}
                  </small>
                </div>
                <div className={`metric-icon ${card.icon} flex-shrink-0`}>
                  <MetricIcon type={card.icon} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-2 g-md-3 mb-3">
        <div className="col-12">
          <div className="card commerce-card binary-bv-card border-0 shadow-sm">
            <div className="card-body">
              <div className="mb-3 d-flex justify-content-between align-items-start gap-2">
                <div>
                  <h3 className="h6 mb-1">Binary BV</h3>
                  <p className="text-muted small mb-0">Left, right, match and dummy volume</p>
                </div>
                <Link to="/team/binary" className="soft-pill text-decoration-none">View binary tree</Link>
              </div>

              <div className="binary-bv-grid">
                <div className="binary-bv-metric left">
                  <span>Left BV</span>
                  <strong>{formatInr(leftBv, 2)}</strong>
                  <small>Team volume</small>
                </div>
                <div className="binary-bv-metric match">
                  <span>Match BV</span>
                  <strong>{formatInr(matchBv, 2)}</strong>
                  <small>Pairable volume</small>
                </div>
                <div className="binary-bv-metric right">
                  <span>Right BV</span>
                  <strong>{formatInr(rightBv, 2)}</strong>
                  <small>Team volume</small>
                </div>
              </div>

              <div className="binary-bv-dummy-grid">
                <div className="binary-bv-dummy-item">
                  <span>Left Dummy BV</span>
                  <strong>{formatInr(leftDummyBv, 2)}</strong>
                </div>
                <div className="binary-bv-dummy-item">
                  <span>Right Dummy BV</span>
                  <strong>{formatInr(rightDummyBv, 2)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-2 g-md-3">
        {/* Sales Analytic — hidden for now; unhide via SHOW_SALES_ANALYTIC when needed */}
        {SHOW_SALES_ANALYTIC ? (
          <div className="col-12 col-lg-8">
            <div className="card commerce-card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                  <div>
                    <h3 className="h6 mb-1">Sales Analytic</h3>
                    <p className="text-muted small mb-0">Revenue and order activity</p>
                  </div>
                  <span className="soft-pill">30 days</span>
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-12 col-sm-4">
                    <div className="sales-pill">
                      <small>Income</small>
                      <strong>{formattedIncome}</strong>
                    </div>
                  </div>
                  <div className="col-12 col-sm-4">
                    <div className="sales-pill">
                      <small>Orders</small>
                      <strong>{orderCount}</strong>
                    </div>
                  </div>
                  <div className="col-12 col-sm-4">
                    <div className="sales-pill">
                      <small>Updates</small>
                      <strong>{unread}</strong>
                    </div>
                  </div>
                </div>
                <div className="bar-chart" aria-label="Sales chart">
                  {chartBars.map((height, index) => (
                    <span key={index} style={{ '--bar-height': `${height}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className={SHOW_SALES_ANALYTIC ? 'col-12 col-lg-4' : 'col-12 col-lg-8'}>
          <div className="card commerce-card income-overview-card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="mb-3 d-flex justify-content-between align-items-start gap-2">
                <div>
                  <h3 className="h6 mb-1">Income Overview</h3>
                  <p className="text-muted small mb-0">Earnings by income type</p>
                </div>
                <span className="soft-pill">{incomeItems.length} active</span>
              </div>

              <div className="income-hero">
                <div>
                  <span>Total income</span>
                  <strong>{formattedIncome}</strong>
                </div>
                <div className="income-hero-icon" aria-hidden="true">
                  <MetricIcon type="income" />
                </div>
              </div>

              <div className="income-type-list">
                {incomeItems.length === 0 ? (
                  <div className="income-type-empty text-muted">No income types configured</div>
                ) : (
                  incomeItems.map((item) => (
                    <div className="income-type-row" key={item.key}>
                      <div className="income-type-copy">
                        <span>{item.label}</span>
                        <small>
                          {item.count > 0
                            ? `${item.count} credit${item.count === 1 ? '' : 's'}`
                            : 'No credits yet'}
                        </small>
                      </div>
                      <strong>{formatInr(item.amount, 2)}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card commerce-card team-overview-card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="mb-3 d-flex justify-content-between align-items-start gap-2">
                <div>
                  <h3 className="h6 mb-1">Team Overview</h3>
                  <p className="text-muted small mb-0">Live downline counts</p>
                </div>
                <Link to="/team/generation" className="soft-pill text-decoration-none">View team</Link>
              </div>

              <div className="team-hero">
                <div>
                  <span>Total team</span>
                  <strong>{totalTeam}</strong>
                </div>
                <div className="team-hero-split">
                  <em>{activeTeam} active</em>
                  <em>{inactiveTeam} inactive</em>
                </div>
              </div>

              <div className="team-legs">
                <Link to="/team/left" className="team-leg left">
                  <span className="team-leg-label">Left team</span>
                  <strong>{leftTeam}</strong>
                  <div className="team-leg-meta">
                    <em>{leftActive} active</em>
                    <em>{leftInactive} inactive</em>
                  </div>
                </Link>
                <Link to="/team/right" className="team-leg right">
                  <span className="team-leg-label">Right team</span>
                  <strong>{rightTeam}</strong>
                  <div className="team-leg-meta">
                    <em>{rightActive} active</em>
                    <em>{rightInactive} inactive</em>
                  </div>
                </Link>
              </div>

              <div className="team-mini-stats">
                <div>
                  <span>Direct</span>
                  <b>{directTeam}</b>
                  <small>{directActive}A / {directInactive}I</small>
                </div>
                <div>
                  <span>Active</span>
                  <b>{activeTeam}</b>
                  <small>Full team</small>
                </div>
                <div>
                  <span>Inactive</span>
                  <b>{inactiveTeam}</b>
                  <small>Full team</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card commerce-card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                <div>
                  <h3 className="h6 mb-1">Recent Orders</h3>
                  <p className="text-muted small mb-0">Latest ecommerce order activity</p>
                </div>
                <Link to="/orders" className="soft-pill text-decoration-none">View all</Link>
              </div>

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
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-muted py-3">No orders yet</td>
                      </tr>
                    ) : (
                      recentOrders.map((order) => (
                        <tr key={order.orderId}>
                          <td>{order.order_number}</td>
                          <td className="d-none d-sm-table-cell">{order.invoice_number || '—'}</td>
                          <td>₹{Number(order.grand_total || 0).toFixed(0)}</td>
                          <td>
                            <em className={`order-status ${String(order.order_status || '').replace(/_/g, '')}`}>
                              {String(order.order_status || '').replace(/_/g, ' ')}
                            </em>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
