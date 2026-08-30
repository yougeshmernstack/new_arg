import { useMemo, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { storeApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

export default function PackageDetail() {
  const { packageId } = useParams();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await storeApi.getPackage(packageId);
        if (active) {
          setPkg(res.data?.data || null);
          setActiveIndex(0);
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

  const galleryImages = useMemo(() => {
    if (!pkg) return [];
    const seen = new Set();
    return [...(pkg.images || []), ...(pkg.description_images || [])]
      .filter(Boolean)
      .filter((src) => {
        if (seen.has(src)) return false;
        seen.add(src);
        return true;
      });
  }, [pkg]);

  if (loading) {
    return (
      <div className="page">
        <p>Loading package...</p>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="page">
        <div className="alert error">{error || 'Package not found.'}</div>
        <Link className="btn ghost" to="/packages">
          Back to packages
        </Link>
      </div>
    );
  }

  const amount = Number(pkg.amount || 0);
  const discounted = Number(pkg.discounted_amount ?? pkg.price ?? 0);
  const hasDiscount = amount > discounted;
  const benefits = pkg.benefits || [];
  const items = pkg.items || [];
  const descriptionImages = (pkg.description_images || []).filter(Boolean);
  const heroImage = galleryImages[activeIndex] || pkg.image || pkg.cover_image || '';

  return (
    <div className="page">
      <div className="page-head">
        <Link className="btn ghost" to="/packages">
          Back to packages
        </Link>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <div className="detail-grid">
        <section className="panel">
          {heroImage ? (
            <div className="package-detail-hero">
              <img
                src={mediaUrl(heroImage)}
                alt={`${pkg.name} package`}
                className="package-detail-hero-img"
              />
            </div>
          ) : null}
          {galleryImages.length > 1 ? (
            <div className="pdp-thumbs package-detail-thumbs">
              {galleryImages.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  className={`pdp-thumb ${index === activeIndex ? 'active' : ''}`}
                  onClick={() => setActiveIndex(index)}
                >
                  <img src={mediaUrl(src)} alt="" />
                </button>
              ))}
            </div>
          ) : null}
          <div className="package-card-title-row">
            <h2 style={{ margin: 0 }}>{pkg.name}</h2>
            <span className="package-type-badge">
              {pkg.in_stock ? 'Activation package' : 'Out of stock'}
            </span>
          </div>
          {pkg.description ? <p className="package-desc" style={{ marginTop: '0.85rem' }}>{pkg.description}</p> : null}

          <div className="package-price-block" style={{ marginTop: '1rem' }}>
            <div className="package-price-main">
              {hasDiscount ? (
                <span className="package-price-was">₹{amount.toFixed(2)}</span>
              ) : null}
              <strong className="package-price-now">₹{discounted.toFixed(2)}</strong>
            </div>
            <div className="package-points">
              <span className="package-point">
                <em>BV</em> {pkg.bv ?? 0}
              </span>
              <span className="package-point">
                <em>PV</em> {pkg.pv ?? 0}
              </span>
            </div>
          </div>

          <div className="package-detail-actions">
            <Link
              className={`btn primary${!pkg.in_stock ? ' disabled' : ''}`}
              to={`/packages/${pkg.packageId}/checkout`}
              onClick={(e) => {
                if (!pkg.in_stock) e.preventDefault();
              }}
              aria-disabled={!pkg.in_stock}
            >
              {pkg.in_stock ? 'Proceed to checkout' : 'Out of stock'}
            </Link>
          </div>
        </section>

        <section className="panel">
          <div className="package-section">
            <h4>Included products</h4>
            {items.length ? (
              <ul className="package-items">
                {items.map((item, index) => (
                  <li key={`${item.productId}-${index}`}>
                    <span className="package-item-name">
                      {item.product?.product_name || `Product #${item.productId}`}
                      <em>× {item.quantity}</em>
                    </span>
                    <span className={`package-stock ${item.in_stock ? 'ok' : 'low'}`}>
                      {item.in_stock ? 'In stock' : 'Low stock'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No products configured.</p>
            )}
          </div>

          <div className="package-section" style={{ marginTop: '1rem' }}>
            <h4>Benefits</h4>
            {benefits.length ? (
              <ul className="package-benefits">
                {benefits.map((benefit) => (
                  <li key={benefit}>
                    <CheckIcon />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No benefits listed.</p>
            )}
          </div>
        </section>
      </div>

      {descriptionImages.length > 0 ? (
        <section className="product-desc-images distributor-desc-images">
          <h2>Description images</h2>
          <div className="product-desc-images-stack">
            {descriptionImages.map((src, index) => (
              <img
                key={`${src}-${index}`}
                className="product-desc-image"
                src={mediaUrl(src)}
                alt={`${pkg.name} description ${index + 1}`}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
