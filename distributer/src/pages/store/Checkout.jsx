import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storeApi } from '../../api';

function makeIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `chk_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export default function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [address, setAddress] = useState({
    name: '',
    mobile: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });
  const idempotencyKey = useMemo(() => makeIdempotencyKey(), []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await storeApi.getCart();
        if (active) setCart(res.data?.data || null);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load cart');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const onChange = (key) => (e) => setAddress((a) => ({ ...a, [key]: e.target.value }));

  const placeOrder = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await storeApi.checkout({
        shipping_address: address,
        idempotency_key: idempotencyKey,
      });
      const orderId = res.data?.data?.order?.orderId;
      navigate(orderId ? `/orders/${orderId}` : '/orders', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed');
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page">Loading checkout...</div>;

  if (!items.length) {
    return (
      <div className="page">
        <p>Your cart is empty.</p>
        <Link className="btn primary" to="/products">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>Checkout</h2>
        <Link className="btn ghost" to="/cart">
          Back to cart
        </Link>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      <div className="detail-grid">
        <form className="form-grid" onSubmit={placeOrder}>
          <label>
            Name
            <input required value={address.name} onChange={onChange('name')} />
          </label>
          <label>
            Mobile
            <input required value={address.mobile} onChange={onChange('mobile')} />
          </label>
          <label className="full">
            Address line 1
            <input required value={address.line1} onChange={onChange('line1')} />
          </label>
          <label className="full">
            Address line 2
            <input value={address.line2} onChange={onChange('line2')} />
          </label>
          <label>
            City
            <input required value={address.city} onChange={onChange('city')} />
          </label>
          <label>
            State
            <input required value={address.state} onChange={onChange('state')} />
          </label>
          <label>
            Pincode
            <input required value={address.pincode} onChange={onChange('pincode')} />
          </label>
          <label>
            Country
            <input value={address.country} onChange={onChange('country')} />
          </label>
          <div className="form-actions full">
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? 'Placing order...' : 'Place order & pay'}
            </button>
          </div>
        </form>
        <section className="panel">
          <h3>Order summary</h3>
          <ul className="summary-list">
            {items.map((item) => (
              <li key={item.productId}>
                <span>
                  {item.product_name} × {item.quantity}
                </span>
                <strong>₹{(item.price * item.quantity).toFixed(2)}</strong>
              </li>
            ))}
          </ul>
          <p>
            <strong>Subtotal: ₹{subtotal.toFixed(2)}</strong>
          </p>
          <p className="muted">
            After placing the order, pay via company bank/UPI and upload your payment screenshot on the order page.
          </p>
        </section>
      </div>
    </div>
  );
}
