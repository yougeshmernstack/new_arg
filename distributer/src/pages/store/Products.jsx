import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storeApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 7h15l-1.5 9h-12z" />
      <path d="M6 7 5 3H2" />
      <circle cx="9" cy="20" r="1.2" />
      <circle cx="17" cy="20" r="1.2" />
    </svg>
  );
}

function ImagePlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m21 15-4.5-4.5L9 18" />
    </svg>
  );
}

export default function Products() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [qtyMap, setQtyMap] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = async (q = search) => {
    setLoading(true);
    setError('');
    try {
      const res = await storeApi.getProducts({ search: q || undefined, limit: 50 });
      setList(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToCart = async (e, item) => {
    e.stopPropagation();
    const qty = Math.max(1, Number(qtyMap[item.productId] || 1));
    if (item.out_of_stock || item.stock <= 0) {
      setError('Product is out of stock.');
      return;
    }
    if (qty > item.stock) {
      setError(`Only ${item.stock} units available.`);
      return;
    }
    setBusyId(item.productId);
    setError('');
    setMessage('');
    try {
      await storeApi.addToCart({ productId: item.productId, quantity: qty });
      setMessage(`${item.product_name} added to cart.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page products-page">
      <header className="products-hero">
        <div className="products-hero-copy">
          <p className="products-eyebrow">Wellness store</p>
          <h2>Products</h2>
          <p className="products-lead">
            Browse wellness products and add them to your cart for reorder or retail.
          </p>
        </div>
        <div className="products-hero-aside" aria-hidden="true">
          <span className="products-hero-orb" />
          <CartIcon />
        </div>
      </header>

      <form
        className="products-search"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <div className="products-search-field">
          <SearchIcon />
          <input
            placeholder="Search by name or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </div>
        <button type="submit" className="btn primary">
          Search
        </button>
      </form>

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      {loading ? (
        <div className="products-grid" aria-label="Loading products">
          {[1, 2, 3].map((n) => (
            <div key={n} className="store-product-card store-product-skeleton" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="products-empty">
          <ImagePlaceholderIcon />
          <p>No products available{search ? ` for “${search}”` : ''}.</p>
          {search ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setSearch('');
                load('');
              }}
            >
              Clear search
            </button>
          ) : null}
        </div>
      ) : (
        <div className="products-grid">
          {list.map((item) => {
            const oos = item.out_of_stock || item.stock <= 0;
            const thumb = item.images?.[0];
            return (
              <article
                key={item.productId}
                className={`store-product-card${oos ? ' is-oos' : ''}`}
                onClick={() => navigate(`/products/${item.productId}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/products/${item.productId}`);
                }}
                role="link"
                tabIndex={0}
              >
                <div className="store-product-media">
                  {thumb ? (
                    <img src={mediaUrl(thumb)} alt={item.product_name} />
                  ) : (
                    <div className="store-product-placeholder">
                      <ImagePlaceholderIcon />
                      <span>No image</span>
                    </div>
                  )}
                  <span className={`store-stock-badge ${oos ? 'danger' : 'ok'}`}>
                    {oos ? 'Out of stock' : `${item.stock} in stock`}
                  </span>
                </div>

                <div className="store-product-body">
                  <div className="store-product-meta">
                    <h3>
                      <Link to={`/products/${item.productId}`} onClick={(e) => e.stopPropagation()}>
                        {item.product_name}
                      </Link>
                    </h3>
                    {item.sku ? <span className="store-product-sku">{item.sku}</span> : null}
                  </div>

                  <p className="store-product-price">₹{Number(item.price || 0).toFixed(2)}</p>

                  <div className="store-product-actions" onClick={(e) => e.stopPropagation()}>
                    <label className="store-qty">
                      <span className="visually-hidden">Quantity</span>
                      <input
                        type="number"
                        min="1"
                        max={Math.max(1, item.stock || 1)}
                        disabled={oos}
                        value={qtyMap[item.productId] || 1}
                        onChange={(e) =>
                          setQtyMap((m) => ({ ...m, [item.productId]: e.target.value }))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="btn primary store-add-btn"
                      disabled={oos || busyId === item.productId}
                      onClick={(e) => addToCart(e, item)}
                    >
                      {busyId === item.productId ? 'Adding...' : 'Add to cart'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
