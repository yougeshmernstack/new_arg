import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storeApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function CartBagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="20" r="1.2" />
      <circle cx="17" cy="20" r="1.2" />
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.5L21 8H7" />
    </svg>
  );
}

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await storeApi.getCart();
      setCart(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateQty = async (productId, quantity) => {
    const qty = Number(quantity);
    if (!qty || qty < 1) return;
    setBusy(productId);
    setError('');
    try {
      const res = await storeApi.updateCartItem({ productId, quantity: qty });
      setCart(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update cart');
      await load();
    } finally {
      setBusy(null);
    }
  };

  const removeItem = async (productId) => {
    setBusy(productId);
    try {
      const res = await storeApi.removeCartItem({ productId });
      setCart(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove item');
    } finally {
      setBusy(null);
    }
  };

  const items = cart?.items || [];
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="page cart-page">
      <header className="cart-hero">
        <div className="cart-hero-copy">
          <p className="cart-eyebrow">Your bag</p>
          <h2>Cart</h2>
          <p className="cart-lead">
            {loading
              ? 'Loading your items…'
              : items.length === 0
                ? 'No items yet — pick products to get started.'
                : `${items.length} product${items.length === 1 ? '' : 's'} · ${totalUnits} unit${totalUnits === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="cart-hero-actions">
          <Link className="btn ghost" to="/products">
            Continue shopping
          </Link>
          <div className="cart-hero-aside" aria-hidden="true">
            <span className="cart-hero-orb" />
            <CartBagIcon />
          </div>
        </div>
      </header>

      {error ? <div className="alert error">{error}</div> : null}

      {loading ? (
        <div className="cart-layout" aria-label="Loading cart">
          <div className="cart-items">
            {[1, 2].map((n) => (
              <div key={n} className="cart-item cart-item-skeleton" />
            ))}
          </div>
          <aside className="cart-summary cart-summary-skeleton" />
        </div>
      ) : items.length === 0 ? (
        <div className="cart-empty">
          <div className="cart-empty-visual" aria-hidden="true">
            <span className="cart-empty-ring" />
            <div className="cart-empty-icon">
              <CartBagIcon />
            </div>
          </div>
          <h3>Your cart is empty</h3>
          <p>Browse wellness products and add items when you are ready to order.</p>
          <div className="cart-empty-actions">
            <Link className="btn primary" to="/products">
              Browse products
            </Link>
            <Link className="btn ghost" to="/packages">
              View packages
            </Link>
          </div>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => {
              const itemBusy = busy === item.productId;
              return (
                <article className={`cart-item ${itemBusy ? 'is-busy' : ''}`} key={item.productId}>
                  <Link className="cart-item-media" to={`/products/${item.productId}`}>
                    {item.image ? (
                      <img src={mediaUrl(item.image)} alt={item.product_name} />
                    ) : (
                      <span className="cart-item-noimg">No image</span>
                    )}
                  </Link>
                  <div className="cart-item-info">
                    <Link className="cart-item-name" to={`/products/${item.productId}`}>
                      {item.product_name}
                    </Link>
                    <span className="sku">SKU {item.sku}</span>
                    <span className="cart-item-unit">₹{Number(item.price).toFixed(2)} / unit</span>
                    <div className="cart-item-actions">
                      <div className="qty-stepper">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          disabled={itemBusy || item.quantity <= 1}
                          onClick={() => updateQty(item.productId, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={itemBusy}
                          onClick={() => updateQty(item.productId, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-item-remove"
                        disabled={itemBusy}
                        onClick={() => removeItem(item.productId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-total">
                    <span className="cart-item-total-label">Total</span>
                    <strong>₹{(item.price * item.quantity).toFixed(2)}</strong>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="cart-summary">
            <div className="cart-summary-head">
              <h3>Order summary</h3>
              <span className="cart-summary-chip">{totalUnits} units</span>
            </div>
            <div className="cart-summary-row">
              <span>Items ({items.length})</span>
              <span>{totalUnits} units</span>
            </div>
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="cart-summary-row muted">
              <span>Taxes</span>
              <span>At checkout</span>
            </div>
            <div className="cart-summary-total">
              <span>Total</span>
              <strong>₹{subtotal.toFixed(2)}</strong>
            </div>
            <button type="button" className="btn primary cart-checkout-btn" onClick={() => navigate('/checkout')}>
              Proceed to checkout
            </button>
            <Link className="cart-summary-link" to="/products">
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
