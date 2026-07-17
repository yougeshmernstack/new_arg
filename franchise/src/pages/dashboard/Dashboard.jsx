import { useEffect, useState } from 'react';
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
    { label: 'Available Stock', value: inventory.available_stock ?? 0 },
    { label: 'Purchased Stock', value: inventory.purchased_stock ?? 0 },
    { label: 'Sold Stock', value: inventory.sold_stock ?? 0 },
    { label: 'SKU Count', value: inventory.sku_count ?? 0 },
    { label: 'Unread Notifications', value: data?.unreadNotifications ?? 0 },
    { label: 'Status', value: data?.franchise?.status || '-' },
  ];

  return (
    <div className="page">
      <h2>Franchise Dashboard</h2>
      <p style={{ margin: 0, color: 'var(--muted)' }}>
        {data?.franchise?.business_name || 'Franchise overview'}
      </p>
      <div className="stat-grid">
        {cards.map((card) => (
          <div className="stat-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
