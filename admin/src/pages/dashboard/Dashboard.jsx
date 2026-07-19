import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    { label: 'Low Stock', value: data?.low_stock ?? 0, to: '/inventory?stock=low' },
    { label: 'Out of Stock', value: data?.out_of_stock ?? 0, to: '/inventory?stock=out' },
    { label: 'Pending Orders', value: data?.pending_orders ?? 0, to: '/orders/franchise' },
    { label: 'Delivered Orders', value: data?.delivered_orders ?? 0, to: '/orders/franchise' },

    { label: 'Revenue', value: Number(data?.revenue || 0).toFixed(2) },
  ];

  return (
    <div className="page">
      <h2>Wellness Dashboard</h2>
      <div className="stat-grid">
        {cards.map((card) => (
          <div key={card.label} className="stat-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            {card.to ? (
              <Link className="stat-link" to={card.to}>
                View
              </Link>
            ) : null}
          </div>
        ))}
      </div>

      <div className="detail-grid">
        <section className="panel">
          <h3>Low stock products</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {(data?.low_stock_products || []).length === 0 ? (
                  <tr>
                    <td colSpan={3}>None</td>
                  </tr>
                ) : (
                  (data?.low_stock_products || []).map((p) => (
                    <tr key={p.productId}>
                      <td>{p.product_name}</td>
                      <td>{p.sku}</td>
                      <td>{p.stock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h3>Out of stock products</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {(data?.out_of_stock_products || []).length === 0 ? (
                  <tr>
                    <td colSpan={3}>None</td>
                  </tr>
                ) : (
                  (data?.out_of_stock_products || []).map((p) => (
                    <tr key={p.productId}>
                      <td>{p.product_name}</td>
                      <td>{p.sku}</td>
                      <td>{p.stock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
