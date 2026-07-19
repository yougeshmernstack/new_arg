import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { commerceApi } from '../../api';

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

export default function OrderDetail() {
  const { orderId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusForm, setStatusForm] = useState({ status: '', remark: '' });
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

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await commerceApi.getOrder(orderId);
      const payload = res.data?.data || null;
      setData(payload);
      const order = payload?.order;
      if (order) {
        const idx = NEXT_FLOW.indexOf(order.order_status);
        const next = idx >= 0 && idx < NEXT_FLOW.length - 1 ? NEXT_FLOW[idx + 1] : '';
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

  if (loading) return <div className="page">Loading order...</div>;
  if (error && !data) return <div className="page alert error">{error}</div>;

  const order = data?.order;
  const invoice = data?.invoice;
  const timeline = data?.timeline || order?.timeline || [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>{order?.order_number}</h2>
          <p className="muted">
            Invoice: <strong>{order?.invoice_number || invoice?.invoice_number || '—'}</strong>
            {' · '}
            Status: <span className="badge">{formatStatus(order?.order_status)}</span>
          </p>
        </div>
        <Link
          className="btn ghost"
          to={`/orders/${order?.buyer_role === 'distributor' || order?.buyer_role === 'theme' ? order.buyer_role : 'franchise'}`}
        >
          Back
        </Link>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <div className="detail-grid">
        <section className="panel">
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
                {(order?.items || []).map((item) => (
                  <tr key={`${item.productId}-${item.sku}`}>
                    <td>{item.product_name}</td>
                    <td>{item.sku}</td>
                    <td>{item.quantity}</td>
                    <td>{item.price}</td>
                    <td>{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="totals">
            Subtotal: {order?.subtotal?.toFixed?.(2) ?? order?.subtotal} · Tax:{' '}
            {order?.tax?.toFixed?.(2) ?? order?.tax} · <strong>Grand: {order?.grand_total?.toFixed?.(2) ?? order?.grand_total}</strong>
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
                    {entry.updated_by_role ? ` (${entry.updated_by_role})` : ''}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel">
          <h3>Update status</h3>
          <form className="form-grid" onSubmit={updateStatus}>
            <label>
              Status
              <select
                required
                value={statusForm.status}
                onChange={(e) => setStatusForm((s) => ({ ...s, status: e.target.value }))}
              >
                <option value="">Select</option>
                {[...NEXT_FLOW, ...EXTRA].map((s) => (
                  <option key={s} value={s}>
                    {formatStatus(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Remarks
              <input
                value={statusForm.remark}
                onChange={(e) => setStatusForm((s) => ({ ...s, remark: e.target.value }))}
              />
            </label>
            <button type="submit" className="btn primary" disabled={saving || !statusForm.status}>
              Update status
            </button>
          </form>
        </section>

        <section className="panel">
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
                onChange={(e) => setShipForm((s) => ({ ...s, estimated_delivery: e.target.value }))}
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
            <button type="submit" className="btn primary" disabled={saving}>
              Save shipping
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
