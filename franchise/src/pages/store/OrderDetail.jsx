import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { storeApi } from '../../api';

function formatStatus(s) {
  return String(s || '').replace(/_/g, ' ');
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await storeApi.getOrder(orderId);
        if (active) setData(res.data?.data || null);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load order');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId]);

  if (loading) return <div className="page">Loading order...</div>;
  if (error) return <div className="page alert error">{error}</div>;

  const order = data?.order;
  const invoice = data?.invoice;
  const shipping = data?.shipping || order?.shipping || {};
  const timeline = data?.timeline || order?.timeline || [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>{order?.order_number}</h2>
          <p className="muted">
            Invoice: <strong>{order?.invoice_number || invoice?.invoice_number || '—'}</strong>
            {' · '}
            <span className="badge">{formatStatus(order?.order_status)}</span>
          </p>
        </div>
        <Link className="btn ghost" to="/orders">
          Back to Purchase History
        </Link>
      </div>

      <div className="detail-grid">
        <section className="panel">
          <h3>Items</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {(order?.items || []).map((item) => (
                  <tr key={`${item.productId}-${item.sku}`}>
                    <td>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>₹{item.price}</td>
                    <td>₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <strong>Grand total: ₹{Number(order?.grand_total || 0).toFixed(2)}</strong>
          </p>
        </section>

        <section className="panel">
          <h3>Tracking timeline</h3>
          <ol className="timeline">
            {timeline.map((entry, idx) => (
              <li key={`${entry.status}-${idx}`} className="timeline-item">
                <div className="timeline-dot" />
                <div>
                  <strong>{formatStatus(entry.status)}</strong>
                  <p>{entry.remark || '—'}</p>
                  <small>
                    {entry.updated_at ? new Date(entry.updated_at).toLocaleString() : '—'}
                    {entry.updated_by_name ? ` · ${entry.updated_by_name}` : ''}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel">
          <h3>Shipping details</h3>
          {!shipping?.courier_name && !shipping?.tracking_number ? (
            <p className="muted">Shipping details will appear once the order is dispatched.</p>
          ) : (
            <dl className="ship-dl">
              <div>
                <dt>Courier</dt>
                <dd>{shipping.courier_name || '—'}</dd>
              </div>
              <div>
                <dt>Tracking number</dt>
                <dd>{shipping.tracking_number || '—'}</dd>
              </div>
              <div>
                <dt>Shipping partner</dt>
                <dd>{shipping.shipping_partner || '—'}</dd>
              </div>
              <div>
                <dt>Dispatch date</dt>
                <dd>{shipping.dispatch_date ? new Date(shipping.dispatch_date).toLocaleDateString() : '—'}</dd>
              </div>
              <div>
                <dt>Estimated delivery</dt>
                <dd>
                  {shipping.estimated_delivery
                    ? new Date(shipping.estimated_delivery).toLocaleDateString()
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Delivered date</dt>
                <dd>
                  {shipping.delivered_date ? new Date(shipping.delivered_date).toLocaleDateString() : '—'}
                </dd>
              </div>
            </dl>
          )}
        </section>
      </div>
    </div>
  );
}
