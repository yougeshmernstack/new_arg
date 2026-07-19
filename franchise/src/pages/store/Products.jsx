import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storeApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
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
    <div className="page">
      <div className="page-head">
        <h2>Products</h2>
      </div>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn">
          Search
        </button>
      </form>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="product-grid">
          {list.length === 0 ? (
            <p>No products available.</p>
          ) : (
            list.map((item) => {
              const oos = item.out_of_stock || item.stock <= 0;
              const thumb = item.images?.[0];
              return (
                <article
                  key={item.productId}
                  className="product-card product-card-clickable"
                  onClick={() => navigate(`/products/${item.productId}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/products/${item.productId}`);
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <div className="product-card-media">
                    {thumb ? (
                      <img src={mediaUrl(thumb)} alt={item.product_name} />
                    ) : (
                      <div className="product-card-placeholder">No image</div>
                    )}
                  </div>
                  <div className="product-card-top">
                    <h3>
                      <Link to={`/products/${item.productId}`} onClick={(e) => e.stopPropagation()}>
                        {item.product_name}
                      </Link>
                    </h3>
                    <span className="sku">{item.sku}</span>
                  </div>
                  <p className="price">₹{Number(item.price || 0).toFixed(2)}</p>
                  <p className="stock-line">
                    {oos ? (
                      <span className="badge danger">Out of Stock</span>
                    ) : (
                      <span className="badge ok">In stock: {item.stock}</span>
                    )}
                  </p>
                  <div className="product-actions" onClick={(e) => e.stopPropagation()}>
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
                    <button
                      type="button"
                      className="btn primary"
                      disabled={oos || busyId === item.productId}
                      onClick={(e) => addToCart(e, item)}
                    >
                      {busyId === item.productId ? 'Adding...' : 'Add to cart'}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
