import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { payoutReportApi } from '../../api';

function formatAmount(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PayoutReport() {
  const navigate = useNavigate();
  const [total, setTotal] = useState({ totalAmount: 0, todayAmount: 0 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await payoutReportApi.getSummary();
      const data = res.data?.data || {};
      setTotal(data.total || { totalAmount: 0, todayAmount: 0 });
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payout report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Payout Report</h2>
          <p className="page-sub">
            Income by type — totals and today. Select a card for transaction history.
          </p>
        </div>
        <button type="button" className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      {loading ? (
        <p className="muted">Loading payout report...</p>
      ) : (
        <div className="payout-layout">
          <div className="payout-hero">
            <div className="payout-hero-copy">
              <span className="payout-hero-label">Total income</span>
              <strong className="payout-hero-amount">₹{formatAmount(total.totalAmount)}</strong>
              <p className="payout-hero-note">Across all income types</p>
            </div>
            <div className="payout-hero-today">
              <span className="payout-hero-label">Today</span>
              <strong>₹{formatAmount(total.todayAmount)}</strong>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="muted">No income types configured.</p>
          ) : (
            <div className="payout-grid">
              {items.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  className="payout-card payout-card-item"
                  onClick={() => navigate(`/payout-report/${item.slug}`)}
                >
                  <div className="payout-card-top">
                    <h3>{item.name || item.slug}</h3>
                    <span className="payout-card-arrow" aria-hidden="true">
                      →
                    </span>
                  </div>
                  <div className="payout-metrics">
                    <div>
                      <strong>₹{formatAmount(item.totalAmount)}</strong>
                      <span>Total</span>
                    </div>
                    <div>
                      <strong>₹{formatAmount(item.todayAmount)}</strong>
                      <span>Today</span>
                    </div>
                  </div>
                  <span className="payout-card-cta">View details</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
