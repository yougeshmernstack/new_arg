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
  if (status === 'delivered') return 'badge ok';
  if (status === 'cancelled' || status === 'returned' || status === 'refunded') {
    return 'badge danger';
  }
  return 'badge';
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

function formatDateShort(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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
        if (active) setError(err.response?.data?.message || 'Failed to load orders');
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

  return (
    <div className="page orders-page">
      <header className="orders-hero">
        <div className="orders-hero-copy">
          <p className="orders-eyebrow">Order history</p>
          <h2>My Orders</h2>
          <p className="orders-lead">Track purchases, invoices, and delivery status</p>
        </div>
        <Link className="btn primary orders-hero-cta" to="/products">
          Shop again
        </Link>
      </header>

      {error ? <div className="alert error">{error}</div> : null}

      {!loading && list.length > 0 ? (
        <div className="orders-filters" role="tablist" aria-label="Filter orders">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.value || 'all'}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              className={`orders-filter-chip${filter === item.value ? ' active' : ''}`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="orders-empty">
          <p>Loading orders...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="orders-empty">
          <h3>{list.length === 0 ? 'No orders yet' : 'No orders in this filter'}</h3>
          <p className="muted">
            {list.length === 0
              ? 'Browse products or packages to place your first order.'
              : 'Try another status to see more orders.'}
          </p>
          {list.length === 0 ? (
            <Link className="btn primary" to="/products">
              Browse products
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          {/* Mobile-first card list */}
          <div className="orders-card-list">
            {filtered.map((item) => (
              <article key={item.orderId} className="order-history-card">
                <div className="order-history-top">
                  <div className="order-history-ids">
                    <strong>{item.order_number}</strong>
                    <span>Invoice {item.invoice_number || '—'}</span>
                  </div>
                  <span className={statusBadgeClass(item.order_status)}>
                    {formatStatus(item.order_status)}
                  </span>
                </div>
                <div className="order-history-row">
                  <div>
                    <span className="order-meta-label">Date</span>
                    <em>{formatDateShort(item.created_date)}</em>
                  </div>
                  <div className="order-history-amount">
                    <span className="order-meta-label">Total</span>
                    <strong>₹{Number(item.grand_total || 0).toFixed(2)}</strong>
                  </div>
                </div>
                <Link className="btn primary order-history-cta" to={`/orders/${item.orderId}`}>
                  Track order
                </Link>
              </article>
            ))}
          </div>

          {/* Desktop table */}
          <div className="table-wrap orders-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Invoice #</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={`desk-${item.orderId}`}>
                    <td>{item.order_number}</td>
                    <td>{item.invoice_number || '—'}</td>
                    <td>₹{Number(item.grand_total || 0).toFixed(2)}</td>
                    <td>
                      <span className={statusBadgeClass(item.order_status)}>
                        {formatStatus(item.order_status)}
                      </span>
                    </td>
                    <td>{formatDate(item.created_date)}</td>
                    <td>
                      <Link className="btn primary" to={`/orders/${item.orderId}`}>
                        Track
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
