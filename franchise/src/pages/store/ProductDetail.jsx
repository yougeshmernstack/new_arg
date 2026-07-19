import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { storeApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tab, setTab] = useState('description');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await storeApi.getProduct(productId);
        if (active) {
          setProduct(res.data?.data || null);
          setActiveIndex(0);
          setQty(1);
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load product');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [productId]);

  const galleryItems = useMemo(() => {
    if (!product) return [];
    const images = (product.images || []).map((src) => ({ type: 'image', src }));
    const videos = (product.videos || []).map((src) => ({ type: 'video', src }));
    return [...images, ...videos];
  }, [product]);

  const activeItem = galleryItems[activeIndex] || null;

  const addToCart = async () => {
    if (!product) return;
    const quantity = Math.max(1, Number(qty) || 1);
    if (product.out_of_stock || product.stock <= 0) {
      setError('Product is out of stock.');
      return;
    }
    if (quantity > product.stock) {
      setError(`Only ${product.stock} units available.`);
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await storeApi.addToCart({ productId: product.productId, quantity });
      setMessage('Added to cart.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p>Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page">
        <div className="alert error">{error || 'Product not found.'}</div>
        <Link className="btn ghost" to="/products">
          Back to products
        </Link>
      </div>
    );
  }

  const oos = Boolean(product.out_of_stock || product.stock <= 0);

  return (
    <div className="page">
      <div className="page-head">
        <Link className="btn ghost" to="/products">
          ← Back
        </Link>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <div className="pdp-layout">
        <div className="pdp-gallery">
          <div className="pdp-gallery-main">
            {activeItem ? (
              activeItem.type === 'video' ? (
                <video key={activeItem.src} src={mediaUrl(activeItem.src)} controls playsInline />
              ) : (
                <img src={mediaUrl(activeItem.src)} alt={product.product_name} />
              )
            ) : (
              <div className="product-card-placeholder">No media available</div>
            )}
          </div>
          {galleryItems.length > 1 ? (
            <div className="pdp-thumbs">
              {galleryItems.map((item, index) => (
                <button
                  key={`${item.type}-${item.src}-${index}`}
                  type="button"
                  className={`pdp-thumb ${index === activeIndex ? 'active' : ''}`}
                  onClick={() => setActiveIndex(index)}
                >
                  {item.type === 'video' ? (
                    <span className="pdp-thumb-video">▶</span>
                  ) : (
                    <img src={mediaUrl(item.src)} alt="" />
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="pdp-info">
          <p className="sku">SKU {product.sku}</p>
          <h2>{product.product_name}</h2>
          <p className="price">₹{Number(product.price || 0).toFixed(2)}</p>
          {product.mrp && Number(product.mrp) > Number(product.price) ? (
            <p className="muted strike">MRP ₹{Number(product.mrp).toFixed(2)}</p>
          ) : null}
          <p className="stock-line">
            {oos ? (
              <span className="badge danger">Out of Stock</span>
            ) : (
              <span className="badge ok">In stock: {product.stock}</span>
            )}
          </p>
          {product.weight ? <p className="muted">Weight / pack: {product.weight}</p> : null}
          {product.description ? (
            <p className="pdp-short-desc">
              {product.description.slice(0, 220)}
              {product.description.length > 220 ? '…' : ''}
            </p>
          ) : null}

          <div className="product-actions pdp-actions">
            <input
              type="number"
              min="1"
              max={Math.max(1, product.stock || 1)}
              disabled={oos}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            <button type="button" className="btn primary" disabled={oos || busy} onClick={addToCart}>
              {busy ? 'Adding...' : 'Add to cart'}
            </button>
            <button type="button" className="btn ghost" onClick={() => navigate('/cart')}>
              View cart
            </button>
          </div>
        </div>
      </div>

      <div className="pdp-tabs">
        <div className="pdp-tab-list" role="tablist">
          {[
            ['description', 'Description'],
            ['benefits', 'Benefits'],
            ['usage', 'Usage & Care'],
            ['specs', 'Specifications'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`pdp-tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="pdp-tab-panel">
          {tab === 'description' ? (
            <p style={{ whiteSpace: 'pre-wrap' }}>{product.description || 'No description available.'}</p>
          ) : null}
          {tab === 'benefits' ? (
            product.benefits?.length ? (
              <ul>
                {product.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : (
              <p>No benefits listed.</p>
            )
          ) : null}
          {tab === 'usage' ? (
            <div className="pdp-info-blocks">
              <div>
                <h3>Ingredients</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{product.ingredients || '—'}</p>
              </div>
              <div>
                <h3>Directions</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{product.directions || '—'}</p>
              </div>
              <div>
                <h3>Storage</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{product.storage || '—'}</p>
              </div>
              <div>
                <h3>Nutrition facts</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{product.nutrition_facts || '—'}</p>
              </div>
            </div>
          ) : null}
          {tab === 'specs' ? (
            <dl className="pdp-specs">
              <div>
                <dt>SKU</dt>
                <dd>{product.sku}</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{product.weight || '—'}</dd>
              </div>
              <div>
                <dt>Manufacturing</dt>
                <dd style={{ whiteSpace: 'pre-wrap' }}>{product.manufacturing_details || '—'}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      </div>
    </div>
  );
}
