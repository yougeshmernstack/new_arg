import { useEffect, useState } from 'react';
import { wellnessApi } from '../../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await wellnessApi.getDashboard();
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

  const cards = [
    { label: 'Franchises', value: data?.franchises ?? 0 },
    { label: 'Distributors', value: data?.distributors ?? 0 },
    { label: 'Theme Users', value: data?.theme_users ?? 0 },
    { label: 'Packages', value: data?.packages ?? 0 },
    { label: 'Products', value: data?.products ?? 0 },
    { label: 'Orders', value: data?.orders ?? 0 },
  ];

  return (
    <div className="page">
      <h2>Wellness Dashboard</h2>
      <div className="stat-grid">
        {cards.map((card) => (
          <div key={card.label} className="stat-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
