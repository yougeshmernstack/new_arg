import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { storeApi } from '../../api';
import OrderPaymentPanel from '../../components/store/OrderPaymentPanel';
import { canDownloadInvoice, downloadOrderInvoice } from '../../utils/downloadInvoice';

function formatStatus(s) {
  return String(s || '').replace(/_/g, ' ');
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
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
  const itemCount = (order?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <div className="page order-detail-page">
      <div className="page-head order-detail-head">
        <div>
          <h2>{order?.order_number}</h2>
          <p className="muted">Track payment, items, shipping and full order progress from one place.</p>
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
            Back
          </Link>
        </div>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="order-overview">
        <article className="order-stat-card">
          <span className="order-stat-label">Invoice</span>
          <strong>{order?.invoice_number || invoice?.invoice_number || '—'}</strong>
          <small>Billing reference for this order</small>
        </article>
        <article className="order-stat-card">
          <span className="order-stat-label">Order status</span>
          <strong>{formatStatus(order?.order_status)}</strong>
          <small>Current order processing state</small>
        </article>
        <article className="order-stat-card">
          <span className="order-stat-label">Payment status</span>
          <strong>{formatStatus(order?.payment?.status || order?.payment_status)}</strong>
          <small>Verification state of submitted payment</small>
        </article>
        <article className="order-stat-card">
          <span className="order-stat-label">Order total</span>
          <strong>₹{Number(order?.grand_total || 0).toFixed(2)}</strong>
          <small>{itemCount} item(s) in this order</small>
        </article>
      </section>

      <div className="detail-grid order-detail-grid">
        {order ? (
          <OrderPaymentPanel
            order={order}
            onUpdated={(updated) => {
              setData((d) => ({ ...d, order: updated || d?.order }));
              load();
            }}
          />
        ) : null}

        <section className="panel order-info-panel">
          <div className="order-panel-head">
            <div>
              <h3>Items</h3>
              <p className="muted">Products included in this order and their quantities.</p>
            </div>
          </div>
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
          <div className="order-total-row">
            <span>Grand total</span>
            <strong>₹{Number(order?.grand_total || 0).toFixed(2)}</strong>
          </div>
        </section>

        <section className="panel order-info-panel">
          <div className="order-panel-head">
            <div>
              <h3>Tracking timeline</h3>
              <p className="muted">Every action taken on this order appears here.</p>
            </div>
          </div>
          <ol className="timeline">
            {[...timeline].reverse().map((entry, idx) => {
              const event = resolveTimelineEvent(entry);
              return (
                <li key={`${entry.status}-${entry.updated_at}-${idx}`} className="timeline-item">
                  <div className={`timeline-dot tone-${event.tone}`} />
                  <div className="timeline-copy">
                    <strong>{event.label}</strong>
                    <p>{entry.remark || '—'}</p>
                    <small>
                      {formatDateTime(entry.updated_at)}
                      {entry.updated_by_name ? ` · ${entry.updated_by_name}` : ''}
                    </small>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="panel order-info-panel">
          <div className="order-panel-head">
            <div>
              <h3>Shipping details</h3>
              <p className="muted">Courier and delivery information will appear here once dispatched.</p>
            </div>
          </div>
          {!shipping?.courier_name && !shipping?.tracking_number ? (
            <div className="order-empty-note">
              <p className="muted">Shipping details will appear once the order is dispatched.</p>
            </div>
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
