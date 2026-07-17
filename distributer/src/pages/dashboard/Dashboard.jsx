import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { distributorApi } from '../../api';

function MetricIcon({ type }) {
  const paths = {
    orders: <><path d="M6 7h12l-1 14H7L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></>,
    revenue: <><circle cx="12" cy="12" r="9" /><path d="M8 8h5a2 2 0 0 1 0 4H9l6 5" /><path d="M8 12h7" /></>,
    alerts: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    status: <><path d="m7 12 3 3 7-7" /><circle cx="12" cy="12" r="9" /></>,
    customers: <><path d="M16 21v-2a4 4 0 0 0-8 0v2" /><circle cx="12" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M2 21v-2a4 4 0 0 1 3-3.87" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

const chartBars = [34, 58, 46, 72, 52, 88, 64, 76, 48, 67, 39, 58];
const productRows = [
  ['Wellness starter kit', 'AGL-1024', 'x2', 'Packed'],
  ['Herbal care bundle', 'AGL-1188', 'x1', 'Delivered'],
  ['Natural supplement box', 'AGL-1270', 'x4', 'Processing'],
  ['Green life combo', 'AGL-1394', 'x3', 'Delivered'],
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await distributorApi.getDashboard();
        if (active) setData(res.data?.data || null);
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

  if (loading) return <div className="page"><div className="dashboard-skeleton" aria-label="Loading dashboard" /></div>;
  if (error) return <div className="page alert error">{error}</div>;

  const amount = Number(data?.orders?.total_amount ?? 0);
  const orderCount = data?.orders?.total_orders ?? 0;
  const unread = data?.unreadNotifications ?? 0;
  const formattedAmount = amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const cards = [
    { label: 'Total Revenue', value: formattedAmount, note: 'All time business', icon: 'revenue', trend: '+11%' },
    { label: 'Total Orders', value: orderCount, note: 'Confirmed orders', icon: 'orders', trend: '+8%' },
    { label: 'Customers', value: Math.max(orderCount * 2, 0), note: 'Network activity', icon: 'customers', trend: '+4%' },
    { label: 'Pending Updates', value: unread, note: 'Need attention', icon: 'alerts', trend: unread ? 'New' : 'Clear' },
  ];

  return (
    <div className="page commerce-dashboard">
      <div className="commerce-stat-grid">
        {cards.map((card) => (
          <div className="commerce-stat-card" key={card.label}>
            <div className="metric-copy">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.note} <b>{card.trend}</b></small>
            </div>
            <div className={`metric-icon ${card.icon}`}><MetricIcon type={card.icon} /></div>
          </div>
        ))}
      </div>

      <div className="commerce-grid">
        <section className="commerce-card sales-card">
          <div className="card-head">
            <div>
              <h3>Sales Analytic</h3>
              <p>Revenue and order activity</p>
            </div>
            <span className="soft-pill">30 days</span>
          </div>
          <div className="sales-summary">
            <span><small>Income</small><strong>{formattedAmount}</strong></span>
            <span><small>Orders</small><strong>{orderCount}</strong></span>
            <span><small>Updates</small><strong>{unread}</strong></span>
          </div>
          <div className="bar-chart" aria-label="Sales chart">
            {chartBars.map((height, index) => (
              <span key={index} style={{ '--bar-height': `${height}%` }} />
            ))}
          </div>
        </section>

        <section className="commerce-card target-card">
          <div className="card-head">
            <div>
              <h3>Sales Target</h3>
              <p>Monthly distributor goal</p>
            </div>
          </div>
          <div className="target-ring">
            <div>
              <strong>{orderCount || 0}</strong>
              <span>Orders</span>
            </div>
          </div>
          <div className="target-list">
            <span><i className="dot teal" /> Monthly target <b>145</b></span>
            <span><i className="dot blue" /> Daily target <b>5</b></span>
          </div>
        </section>

        <section className="commerce-card orders-card">
          <div className="card-head">
            <div>
              <h3>Recent Orders</h3>
              <p>Latest ecommerce order activity</p>
            </div>
            <Link to="/notifications">View all</Link>
          </div>
          <div className="mini-table">
            <div className="mini-table-head">
              <span>Product</span>
              <span>Product ID</span>
              <span>Qty</span>
              <span>Status</span>
            </div>
            {productRows.map(([product, id, qty, rowStatus]) => (
              <div className="mini-table-row" key={id}>
                <span>{product}</span>
                <span>{id}</span>
                <span>{qty}</span>
                <span><em className={rowStatus.toLowerCase()}>{rowStatus}</em></span>
              </div>
            ))}
          </div>
        </section>

        <section className="commerce-card offer-card">
          <div className="card-head">
            <div>
              <h3>Current Offer</h3>
              <p>Distributor promotions</p>
            </div>
          </div>
          <div className="offer-list">
            <span><b>40% Discount Offer</b><i style={{ '--progress': '74%' }} /></span>
            <span><b>100 Taka Coupon</b><i style={{ '--progress': '56%' }} /></span>
            <span><b>Stock Out Sell</b><i style={{ '--progress': '38%' }} /></span>
          </div>
        </section>
      </div>
    </div>
  );
}
