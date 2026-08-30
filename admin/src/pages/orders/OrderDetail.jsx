import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { commerceApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';
import { canDownloadInvoice, downloadOrderInvoice } from '../../utils/downloadInvoice';

const NEXT_FLOW = [
  'pending',
  'confirmed',
  'packed',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
];

const EXTRA = ['cancelled', 'returned', 'refunded'];

function formatStatus(s) {
  return String(s || '').replace(/_/g, ' ');
}

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function orderBadgeClass(status) {
  const s = String(status || '').toLowerCase();
  if (['confirmed', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'].includes(s)) {
    return 'badge ok';
  }
  if (['cancelled', 'returned', 'refunded'].includes(s)) return 'badge danger';
  return 'badge warn';
}

function paymentBadgeClass(status) {
  if (status === 'submitted') return 'badge warn';
  if (status === 'verified') return 'badge ok';
  if (status === 'rejected') return 'badge danger';
  return 'badge';
}

function paymentLabel(status) {
  if (status === 'submitted') return 'Awaiting verification';
  if (status === 'verified') return 'Verified';
  if (status === 'rejected') return 'Rejected';
  if (status === 'none') return 'No proof yet';
  return formatStatus(status || 'none');
}

/** Resolve timeline event title + tone (supports older "pending" entries via remark). */
function resolveTimelineEvent(entry) {
  const status = String(entry?.status || '').toLowerCase().replace(/\s+/g, '_');
  const remark = String(entry?.remark || '').toLowerCase();

  if (
    status === 'payment_submitted' ||
    remark.includes('payment proof submitted')
  ) {
    return { label: 'Payment submitted', tone: 'warn' };
  }
  if (
    status === 'payment_rejected' ||
    remark.includes('payment proof rejected')
  ) {
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
  if (
    status === 'payment_verified' ||
    (status === 'confirmed' && remark.includes('payment verified'))
  ) {
    return { label: 'Payment verified', tone: 'ok' };
  }
  if (['confirmed', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'].includes(status)) {
    return { label: formatStatus(status), tone: 'ok' };
  }
  if (['cancelled', 'returned', 'refunded'].includes(status)) {
    return { label: formatStatus(status), tone: 'danger' };
  }
  if (status === 'pending') {
    return { label: 'Pending', tone: 'warn' };
  }
  return { label: formatStatus(status || 'update'), tone: 'muted' };
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusForm, setStatusForm] = useState({ status: '', remark: '' });
  const [payRemark, setPayRemark] = useState('');
  const [shipForm, setShipForm] = useState({
    courier_name: '',
    tracking_number: '',
    shipping_partner: '',
    dispatch_date: '',
    estimated_delivery: '',
    delivered_date: '',
    remark: '',
  });
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await commerceApi.getOrder(orderId);
      const payload = res.data?.data || null;
      setData(payload);
      const order = payload?.order;
      if (order) {
        const paymentOk = order.payment_status === 'received';
        const idx = NEXT_FLOW.indexOf(order.order_status);
        let next = idx >= 0 && idx < NEXT_FLOW.length - 1 ? NEXT_FLOW[idx + 1] : '';
        if (next === 'confirmed' && !paymentOk) next = '';
        setStatusForm({ status: next, remark: '' });
        const s = order.shipping || {};
        setShipForm({
          courier_name: s.courier_name || '',
          tracking_number: s.tracking_number || '',
          shipping_partner: s.shipping_partner || '',
          dispatch_date: s.dispatch_date ? String(s.dispatch_date).slice(0, 10) : '',
          estimated_delivery: s.estimated_delivery ? String(s.estimated_delivery).slice(0, 10) : '',
          delivered_date: s.delivered_date ? String(s.delivered_date).slice(0, 10) : '',
          remark: '',
        });
      }
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

  const updateStatus = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await commerceApi.updateOrderStatus({
        orderId: Number(orderId),
        status: statusForm.status,
        remark: statusForm.remark,
      });
      setMessage('Status updated.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const verifyPayment = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await commerceApi.verifyOrderPayment({
        orderId: Number(orderId),
        remark: payRemark,
      });
      setMessage(res.data?.message || 'Payment verified.');
      setPayRemark('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify payment');
    } finally {
      setSaving(false);
    }
  };

  const rejectPayment = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await commerceApi.rejectOrderPayment({
        orderId: Number(orderId),
        remark: payRemark || 'Payment proof rejected',
      });
      setMessage(res.data?.message || 'Payment rejected.');
      setPayRemark('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject payment');
    } finally {
      setSaving(false);
    }
  };

  const updateShipping = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await commerceApi.updateShipping({
        orderId: Number(orderId),
        ...shipForm,
      });
      setMessage('Shipping details saved.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update shipping');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!orderId) return;
    setDownloading(true);
    setError('');
    try {
      const invNo =
        data?.order?.invoice_number || data?.invoice?.invoice_number || `order-${orderId}`;
      await downloadOrderInvoice(orderId, invNo);
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
  const timeline = data?.timeline || order?.timeline || [];
  const payment = order?.payment || {};
  const payStatus = payment.status || 'none';
  const paymentOk = order?.payment_status === 'received';
  const canReviewPayment = payStatus === 'submitted';
  const backRole =
    order?.buyer_role === 'distributor' || order?.buyer_role === 'theme'
      ? order.buyer_role
      : 'franchise';

  const statusOptions = [...NEXT_FLOW, ...EXTRA].filter((s) => {
    if (s === 'confirmed' && !paymentOk && order?.order_status === 'pending') return false;
    return true;
  });

  const itemCount = (order?.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  return (
    <div className="page order-detail-page">
      <div className="page-head order-detail-head">
        <div>
          <p className="order-detail-kicker">Order detail</p>
          <h2>{order?.order_number}</h2>
          <div className="order-detail-meta">
            <span className="order-detail-meta-item">
              Invoice <strong>{order?.invoice_number || invoice?.invoice_number || '—'}</strong>
            </span>
            <span className={orderBadgeClass(order?.order_status)}>
              {formatStatus(order?.order_status)}
            </span>
            <span className={paymentBadgeClass(payStatus)}>{paymentLabel(payStatus)}</span>
            {order?.package_name ? (
              <span className="order-detail-pkg-chip">{order.package_name}</span>
            ) : null}
          </div>
        </div>
        <div className="order-detail-head-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
          <Link className="btn ghost" to={`/orders/${backRole}`}>
            ← Back to orders
          </Link>
        </div>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <div className="order-overview">
        <div className="order-metrics">
          <div className="order-metric">
            <span className="order-metric-label">Grand total</span>
            <strong className="order-metric-value">₹{Number(order?.grand_total || 0).toFixed(2)}</strong>
          </div>
          <div className="order-metric">
            <span className="order-metric-label">Order BV</span>
            <strong className="order-metric-value">{Number(order?.bv || 0).toFixed(2)}</strong>
          </div>
          <div className="order-metric">
            <span className="order-metric-label">Items</span>
            <strong className="order-metric-value">
              {itemCount} unit{itemCount === 1 ? '' : 's'}
            </strong>
          </div>
          <div className="order-metric">
            <span className="order-metric-label">Placed</span>
            <strong className="order-metric-value order-metric-value-sm">
              {order?.created_date ? new Date(order.created_date).toLocaleString() : '—'}
            </strong>
          </div>
        </div>

        <section className="order-buyer-card">
          <div className="order-buyer-card-top">
            <div className="order-buyer-avatar" aria-hidden="true">
              {(order?.buyer_name || order?.buyer_username || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="order-buyer-identity">
              <span className="order-metric-label">Buyer</span>
              <h3 className="order-buyer-name">
                {order?.buyer_name || order?.buyer_username || 'Unknown buyer'}
              </h3>
              <p className="order-buyer-username">
                {order?.buyer_username ? `@${order.buyer_username}` : 'No username'}
              </p>
            </div>
            {order?.buyer_role ? (
              <span className="order-buyer-role-chip">{order.buyer_role}</span>
            ) : null}
          </div>

          <div className="order-buyer-ids">
            <div className="order-buyer-id-chip">
              <span>UID</span>
              <strong>{order?.buyer_uid || '—'}</strong>
            </div>
            {order?.buyer_panel_id ? (
              <div className="order-buyer-id-chip">
                <span>
                  {order?.buyer_role === 'franchise'
                    ? 'Franchise ID'
                    : order?.buyer_role === 'theme'
                      ? 'Theme ID'
                      : 'Distributor ID'}
                </span>
                <strong>{order.buyer_panel_id}</strong>
              </div>
            ) : null}
          </div>

          {order?.buyer_role === 'distributor' ? (
            <div className="order-buyer-package">
              <span className="order-metric-label">Highest package</span>
              <div className="order-buyer-package-row">
                <strong>
                  {order?.highest_package_name || 'No package activated'}
                </strong>
                {order?.highest_package_name ? (
                  <span className="order-buyer-bv-pill">
                    BV {Number(order.highest_package_bv || 0).toFixed(2)}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {order?.package_name ? (
            <div className="order-buyer-order-pkg">
              <span className="order-metric-label">This order package</span>
              <strong>{order.package_name}</strong>
            </div>
          ) : null}
        </section>
      </div>

      {canReviewPayment ? (
        <section className="order-pay-review">
          <div className="order-pay-review-copy">
            <p className="order-pay-review-eyebrow">Action required</p>
            <h3>Verify payment proof</h3>
            <p className="muted">
              Buyer submitted UTR <code>{payment.utr}</code>. Confirm to activate the order, or reject
              so they can re-upload.
            </p>
          </div>
          <div className="order-pay-review-actions">
            <label className="order-pay-remark">
              Remark
              <input
                value={payRemark}
                onChange={(e) => setPayRemark(e.target.value)}
                placeholder="Optional note for timeline"
              />
            </label>
            <div className="order-pay-review-btns">
              <button type="button" className="btn primary" disabled={saving} onClick={verifyPayment}>
                {saving ? 'Saving…' : 'Verify & confirm order'}
              </button>
              <button type="button" className="btn danger" disabled={saving} onClick={rejectPayment}>
                Reject proof
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!paymentOk && order?.order_status === 'pending' && payStatus !== 'submitted' ? (
        <div className="order-pay-wait">
          Waiting for buyer to upload payment proof before this order can be confirmed.
        </div>
      ) : null}

      {payStatus === 'verified' || paymentOk ? (
        <div className="order-pay-ok">Payment verified. Order is confirmed and ready for fulfillment.</div>
      ) : null}

      <div className="order-detail-layout">
        <div className="order-detail-main">
          <section className="panel order-panel">
            <div className="panel-head-row">
              <h3>Payment proof</h3>
              <span className={paymentBadgeClass(payStatus)}>{paymentLabel(payStatus)}</span>
            </div>

            <div className="order-pay-grid">
              <div className="order-pay-facts">
                <div className="order-fact">
                  <span>Amount due</span>
                  <strong>₹{Number(order?.grand_total || 0).toFixed(2)}</strong>
                </div>
                <div className="order-fact">
                  <span>UTR</span>
                  <strong>{payment.utr || '—'}</strong>
                </div>
                <div className="order-fact">
                  <span>Submitted</span>
                  <strong>
                    {payment.submitted_at
                      ? new Date(payment.submitted_at).toLocaleString()
                      : '—'}
                  </strong>
                </div>
                {payment.remark ? (
                  <div className="order-fact">
                    <span>Remark</span>
                    <strong>{payment.remark}</strong>
                  </div>
                ) : null}
                {payment.proofUrl ? (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => window.open(mediaUrl(payment.proofUrl), '_blank')}
                  >
                    Open screenshot
                  </button>
                ) : (
                  <p className="muted">No screenshot uploaded yet.</p>
                )}
              </div>
              {payment.proofUrl ? (
                <button
                  type="button"
                  className="order-pay-preview"
                  onClick={() => window.open(mediaUrl(payment.proofUrl), '_blank')}
                  title="Open full screenshot"
                >
                  <img src={mediaUrl(payment.proofUrl)} alt="Payment proof" />
                </button>
              ) : (
                <div className="order-pay-preview is-empty">
                  <span>No proof image</span>
                </div>
              )}
            </div>
          </section>

          <section className="panel order-panel">
            <h3>Items</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order?.items || []).length === 0 ? (
                    <tr>
                      <td colSpan={5}>No items</td>
                    </tr>
                  ) : (
                    (order?.items || []).map((item) => (
                      <tr key={`${item.productId}-${item.sku}`}>
                        <td>{item.product_name}</td>
                        <td>{item.sku}</td>
                        <td>{item.quantity}</td>
                        <td>₹{Number(item.price || 0).toFixed(2)}</td>
                        <td>₹{Number(item.total || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="order-totals">
              <span>
                Subtotal <strong>₹{Number(order?.subtotal || 0).toFixed(2)}</strong>
              </span>
              <span>
                Tax <strong>₹{Number(order?.tax || 0).toFixed(2)}</strong>
              </span>
              <span className="order-totals-grand">
                Grand <strong>₹{Number(order?.grand_total || 0).toFixed(2)}</strong>
              </span>
            </div>
          </section>

          <section className="panel order-panel">
            <h3>Shipping details</h3>
            <form className="form-grid" onSubmit={updateShipping}>
              <label>
                Courier name
                <input
                  value={shipForm.courier_name}
                  onChange={(e) => setShipForm((s) => ({ ...s, courier_name: e.target.value }))}
                />
              </label>
              <label>
                Tracking number
                <input
                  value={shipForm.tracking_number}
                  onChange={(e) => setShipForm((s) => ({ ...s, tracking_number: e.target.value }))}
                />
              </label>
              <label>
                Shipping partner
                <input
                  value={shipForm.shipping_partner}
                  onChange={(e) => setShipForm((s) => ({ ...s, shipping_partner: e.target.value }))}
                />
              </label>
              <label>
                Dispatch date
                <input
                  type="date"
                  value={shipForm.dispatch_date}
                  onChange={(e) => setShipForm((s) => ({ ...s, dispatch_date: e.target.value }))}
                />
              </label>
              <label>
                Estimated delivery
                <input
                  type="date"
                  value={shipForm.estimated_delivery}
                  onChange={(e) =>
                    setShipForm((s) => ({ ...s, estimated_delivery: e.target.value }))
                  }
                />
              </label>
              <label>
                Delivered date
                <input
                  type="date"
                  value={shipForm.delivered_date}
                  onChange={(e) => setShipForm((s) => ({ ...s, delivered_date: e.target.value }))}
                />
              </label>
              <label className="full">
                Remark
                <input
                  value={shipForm.remark}
                  onChange={(e) => setShipForm((s) => ({ ...s, remark: e.target.value }))}
                />
              </label>
              <div className="form-actions full">
                <button type="submit" className="btn primary" disabled={saving}>
                  Save shipping
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="order-detail-side">
          <section className="panel order-panel">
            <h3>Update status</h3>
            {!paymentOk && order?.order_status === 'pending' ? (
              <p className="order-side-note">
                Confirm stays locked until payment is verified above.
              </p>
            ) : null}
            <form className="form-grid order-side-form" onSubmit={updateStatus}>
              <label className="full">
                Status
                <select
                  required
                  value={statusForm.status}
                  onChange={(e) => setStatusForm((s) => ({ ...s, status: e.target.value }))}
                >
                  <option value="">Select</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {formatStatus(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full">
                Remarks
                <input
                  value={statusForm.remark}
                  onChange={(e) => setStatusForm((s) => ({ ...s, remark: e.target.value }))}
                />
              </label>
              <button
                type="submit"
                className="btn primary"
                disabled={saving || !statusForm.status}
              >
                Update status
              </button>
            </form>
          </section>

          <section className="panel order-panel">
            <h3>Tracking timeline</h3>
            {timeline.length === 0 ? (
              <p className="muted">No timeline events yet.</p>
            ) : (
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
                          {entry.updated_by_role ? ` (${entry.updated_by_role})` : ''}
                        </small>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
