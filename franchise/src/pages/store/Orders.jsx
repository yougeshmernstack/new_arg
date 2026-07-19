import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { storeApi } from '../../api';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatStatus(status) {
  return String(status || '').replace(/_/g, ' ');
}

function statusBadgeClass(status) {
  if (status === 'pending') return 'badge warn';
  if (status === 'confirmed' || status === 'packed') return 'badge ok';
  if (status === 'shipped' || status === 'in_transit' || status === 'out_for_delivery') {
    return 'badge info';
  }
  if (status === 'delivered') return 'badge success';
  if (status === 'cancelled' || status === 'returned' || status === 'refunded') {
    return 'badge danger';
  }
  return 'badge';
}

function statusHint(item) {
  if (item.order_status === 'pending') return 'Waiting for admin confirmation';
  if (item.franchise_stock_credited) return 'Stock added to your inventory';
  if (item.order_status === 'cancelled') return 'Order cancelled';
  return '';
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Orders() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await storeApi.getOrders({ limit: 50 });
        if (active) setList(res.data?.data || []);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load purchase history');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return list;
    if (filter === 'shipped') {
      return list.filter((item) =>
        ['shipped', 'in_transit', 'out_for_delivery'].includes(item.order_status)
      );
    }
    return list.filter((item) => item.order_status === filter);
  }, [list, filter]);

  const summary = useMemo(() => {
    const totalSpend = list.reduce((sum, item) => sum + Number(item.grand_total || 0), 0);
    return {
      total: list.length,
      pending: list.filter((item) => item.order_status === 'pending').length,
      credited: list.filter((item) => item.franchise_stock_credited).length,
      spend: totalSpend,
    };
  }, [list]);

  return (
    <div className="page purchase-page">
      <div className="page-head">
        <div>
          <h2>Purchase History</h2>
          <p className="page-sub">Track stock orders placed from Products and Cart</p>
        </div>
        <Link className="btn primary" to="/products">
          Buy Stock
        </Link>
      </div>

      {!loading && list.length > 0 ? (
        <div className="stat-grid purchase-stats">
          <div className="stat-card">
            <span>Total Orders</span>
            <strong>{summary.total}</strong>
          </div>
          <div className="stat-card">
            <span>Pending Confirm</span>
            <strong>{summary.pending}</strong>
          </div>
          <div className="stat-card">
            <span>Stock Credited</span>
            <strong>{summary.credited}</strong>
          </div>
          <div className="stat-card">
            <span>Total Spend</span>
            <strong>₹{summary.spend.toFixed(0)}</strong>
          </div>
        </div>
      ) : null}

      {!loading && list.length > 0 ? (
        <div className="purchase-filters" role="tablist" aria-label="Filter by status">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.value || 'all'}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              className={`filter-chip${filter === item.value ? ' active' : ''}`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <div className="alert error">{error}</div> : null}

      {loading ? (
        <div className="purchase-empty">
          <p>Loading purchase history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="purchase-empty">
          <h3>{list.length === 0 ? 'No stock purchases yet' : 'No orders in this filter'}</h3>
          <p className="muted">
            {list.length === 0
              ? 'Browse products, add them to cart, and checkout to request stock.'
              : 'Try another status filter to see more orders.'}
          </p>
          {list.length === 0 ? (
            <Link className="btn primary" to="/products">
              Browse Products
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="purchase-list">
          {filtered.map((item) => {
            const hint = statusHint(item);
            const itemCount = (item.items || []).reduce(
              (sum, row) => sum + Number(row.quantity || 0),
              0
            );
            return (
              <article key={item.orderId} className="purchase-card">
                <div className="purchase-card-main">
                  <div className="purchase-card-top">
                    <div>
                      <h3>{item.order_number}</h3>
                      <p className="muted">
                        Invoice {item.invoice_number || '—'}
                        {itemCount > 0 ? ` · ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}
                      </p>
                    </div>
                    <span className={statusBadgeClass(item.order_status)}>
                      {formatStatus(item.order_status)}
                    </span>
                  </div>
                  {hint ? <p className="purchase-hint">{hint}</p> : null}
                  <div className="purchase-meta">
                    <div>
                      <span className="meta-label">Date</span>
                      <strong>{formatDate(item.created_date)}</strong>
                    </div>
                    <div>
                      <span className="meta-label">Amount</span>
                      <strong className="purchase-amount">
                        ₹{Number(item.grand_total || 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="purchase-card-actions">
                  <Link className="btn primary" to={`/orders/${item.orderId}`}>
                    View details
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
