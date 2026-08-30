import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { storeApi } from '../../api';
import OrderPaymentPanel from '../../components/store/OrderPaymentPanel';
import { canDownloadInvoice, downloadOrderInvoice } from '../../utils/downloadInvoice';

function formatStatus(s) {
  return String(s || '').replace(/_/g, ' ');
}

function resolveTimelineEvent(entry) {
  const status = String(entry?.status || '').toLowerCase().replace(/\s+/g, '_');
  const remark = String(entry?.remark || '').toLowerCase();

  if (status === 'payment_submitted' || remark.includes('payment proof submitted')) {
    return { label: 'Payment submitted', tone: 'warn' };
  }
  if (status === 'payment_rejected' || remark.includes('payment proof rejected')) {
    return { label: 'Payment rejected', tone: 'danger' };
  }
  if (
    status === 'order_placed' ||
    ((status === 'pending' || !status) &&
      (remark.includes('order placed') || remark.includes('awaiting payment')) &&
      !remark.includes('payment proof'))
  ) {
    return { label: 'Order placed', tone: 'muted' };
  }
  if (status === 'payment_verified' || (status === 'confirmed' && remark.includes('payment verified'))) {
    return { label: 'Payment verified', tone: 'ok' };
  }
  if (['confirmed', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'].includes(status)) {
    return { label: formatStatus(status), tone: 'ok' };
  }
  if (['cancelled', 'returned', 'refunded'].includes(status)) {
    return { label: formatStatus(status), tone: 'danger' };
  }
  if (status === 'pending') return { label: 'Pending', tone: 'warn' };
  return { label: formatStatus(status || 'update'), tone: 'muted' };
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await storeApi.getOrder(orderId);
      setData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    setError('');
    try {
      await downloadOrderInvoice(
        orderId,
        data?.order?.invoice_number || data?.invoice?.invoice_number || `order-${orderId}`,
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="page">Loading order...</div>;
  if (error && !data) return <div className="page alert error">{error}</div>;

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
            {' · '}
            Payment: <span className="badge">{formatStatus(order?.payment?.status || order?.payment_status)}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canDownloadInvoice(order, invoice) ? (
            <button
              type="button"
              className="btn primary"
              disabled={downloading}
              onClick={handleDownloadInvoice}
            >
              {downloading ? 'Preparing…' : 'Download invoice'}
            </button>
          ) : null}
          <Link className="btn ghost" to="/orders">
            Back to Purchase History
          </Link>
        </div>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <div className="detail-grid">
        {order ? (
          <OrderPaymentPanel
            order={order}
            onUpdated={() => load()}
          />
        ) : null}

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
            {[...timeline].reverse().map((entry, idx) => {
              const event = resolveTimelineEvent(entry);
              return (
                <li key={`${entry.status}-${entry.updated_at}-${idx}`} className="timeline-item">
                  <div className={`timeline-dot tone-${event.tone}`} />
                  <div>
                    <strong>{event.label}</strong>
                    <p>{entry.remark || '—'}</p>
                    <small>
                      {entry.updated_at ? new Date(entry.updated_at).toLocaleString() : '—'}
                      {entry.updated_by_name ? ` · ${entry.updated_by_name}` : ''}
                    </small>
                  </div>
                </li>
              );
            })}
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
