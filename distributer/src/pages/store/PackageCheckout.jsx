import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { storeApi, distributorApi } from '../../api';

function makeIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `pkg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export default function PackageCheckout() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
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
        const [pkgRes, profileRes] = await Promise.all([
          storeApi.getPackage(packageId),
          distributorApi.getProfile().catch(() => null),
        ]);
        if (!active) return;
        setPkg(pkgRes.data?.data || null);
        const dist = profileRes?.data?.distributor;
        if (dist) {
          setAddress((a) => ({
            ...a,
            name: dist.name || a.name,
            mobile: dist.mobile || a.mobile,
            line1: dist.address?.line1 || a.line1,
            line2: dist.address?.line2 || a.line2,
            city: dist.address?.city || a.city,
            state: dist.address?.state || a.state,
            pincode: dist.address?.pincode || a.pincode,
            country: dist.address?.country || a.country || 'India',
          }));
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load package');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [packageId]);

  const onChange = (key) => (e) => setAddress((a) => ({ ...a, [key]: e.target.value }));

  const amount = Number(pkg?.amount || 0);
  const discounted = Number(pkg?.discounted_amount ?? pkg?.price ?? 0);

  const placeOrder = async (e) => {
    e.preventDefault();
    if (submitting || !pkg) return;
    if (!pkg.in_stock) {
      setError('Package products are out of stock.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await storeApi.purchasePackage({
        packageId: Number(packageId),
        shipping_address: address,
        idempotency_key: idempotencyKey,
      });
      const orderId = res.data?.data?.order?.orderId;
      navigate(orderId ? `/orders/${orderId}` : '/orders', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Purchase failed');
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page">Loading package checkout...</div>;

  if (!pkg) {
    return (
      <div className="page">
        {error ? <div className="alert error">{error}</div> : <p>Package not found.</p>}
        <Link className="btn primary" to="/packages">
          Browse packages
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>Buy {pkg.name}</h2>
        <Link className="btn ghost" to="/packages">
          Back
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
            <button
              type="submit"
              className="btn primary"
              disabled={submitting || !pkg.in_stock}
            >
              {submitting ? 'Placing order...' : 'Place order & pay'}
            </button>
          </div>
        </form>
        <section className="panel">
          <h3>Package summary</h3>
          <p>
            {amount > discounted ? (
              <>
                <span className="muted" style={{ textDecoration: 'line-through', marginRight: 8 }}>
                  ₹{amount.toFixed(2)}
                </span>
              </>
            ) : null}
            <strong>₹{discounted.toFixed(2)}</strong>
          </p>
          <p>
            BV: {pkg.bv ?? 0} · PV: {pkg.pv ?? 0}
          </p>
          <ul className="summary-list">
            {(pkg.items || []).map((item) => (
              <li key={item.productId}>
                <span>
                  {item.product?.product_name || `Product #${item.productId}`} × {item.quantity}
                </span>
              </li>
            ))}
          </ul>
          <p className="muted">
            After placing the order you will see company bank/UPI details. Pay the amount and upload
            your payment screenshot. Your package activates after admin verifies the payment.
          </p>
        </section>
      </div>
    </div>
  );
}
