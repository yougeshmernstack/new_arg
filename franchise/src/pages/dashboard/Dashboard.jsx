import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { franchiseApi } from '../../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await franchiseApi.getDashboard();
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

  if (loading) return <div className="page">Loading dashboard...</div>;
  if (error) return <div className="page alert error">{error}</div>;

  const inventory = data?.inventory || {};
  const cards = [
    { label: 'Available Stock', value: inventory.available_stock ?? 0, to: '/inventory' },
    { label: 'Purchased Stock', value: inventory.purchased_stock ?? 0, to: '/inventory' },
    { label: 'Sold Stock', value: inventory.sold_stock ?? 0, to: '/inventory' },
    { label: 'SKU Count', value: inventory.sku_count ?? 0, to: '/inventory' },
    { label: 'Unread Notifications', value: data?.unreadNotifications ?? 0, to: '/notifications' },
    { label: 'Status', value: data?.franchise?.status || '-' },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Franchise Dashboard</h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)' }}>
            {data?.franchise?.business_name || 'Franchise overview'}
          </p>
        </div>
        <Link className="btn primary" to="/inventory">
          View Inventory
        </Link>
      </div>
      <div className="stat-grid">
        {cards.map((card) => {
          const inner = (
            <>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </>
          );
          return card.to ? (
            <Link className="stat-card stat-card-link" key={card.label} to={card.to}>
              {inner}
            </Link>
          ) : (
            <div className="stat-card" key={card.label}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
