import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { storeApi } from '../../api';

function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 8.5 12 3 3 8.5v7L12 21l9-5.5v-7Z" />
      <path d="M12 12v9" />
      <path d="M3 8.5 12 12l9-3.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

export default function Packages() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await storeApi.getPackages({ limit: 50 });
        if (active) setList(res.data?.data || []);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load packages');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page packages-page">
      <header className="packages-hero">
        <div className="packages-hero-copy">
          <p className="packages-eyebrow">Account activation</p>
          <h2>Activation Packages</h2>
          <p className="packages-lead">
            Choose a package to activate your distributor account. Included products ship to your address.
          </p>
        </div>
        <div className="packages-hero-aside" aria-hidden="true">
          <span className="packages-hero-orb" />
          <PackageIcon />
        </div>
      </header>

      {error ? <div className="alert error">{error}</div> : null}

      {loading ? (
        <div className="packages-grid" aria-label="Loading packages">
          {[1, 2].map((n) => (
            <div key={n} className="package-card package-card-skeleton" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="packages-empty">
          <PackageIcon />
          <p>No packages available right now.</p>
        </div>
      ) : (
        <div className="packages-grid">
          {list.map((pkg) => {
            const amount = Number(pkg.amount || 0);
            const discounted = Number(pkg.discounted_amount ?? pkg.price ?? 0);
            const items = pkg.items || [];
            const benefits = pkg.benefits || [];
            const hasDiscount = amount > discounted;
            const savePct = hasDiscount ? Math.round(((amount - discounted) / amount) * 100) : 0;

            return (
              <article
                key={pkg.packageId}
                className={`package-card${!pkg.in_stock ? ' is-oos' : ''}`}
              >
                <div className="package-card-accent" aria-hidden="true" />
                <div className="package-card-top">
                  <div className="package-card-title-row">
                    <h3>{pkg.name}</h3>
                    {hasDiscount && savePct > 0 ? (
                      <span className="package-save-badge">Save {savePct}%</span>
                    ) : (
                      <span className="package-type-badge">Activation</span>
                    )}
                  </div>
                  {pkg.description ? <p className="package-desc">{pkg.description}</p> : null}
                </div>

                <div className="package-price-block">
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

                {items.length > 0 ? (
                  <div className="package-section">
                    <h4>Includes</h4>
                    <ul className="package-items">
                      {items.map((item) => (
                        <li key={item.productId}>
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
                  </div>
                ) : null}

                {benefits.length > 0 ? (
                  <div className="package-section">
                    <h4>Benefits</h4>
                    <ul className="package-benefits">
                      {benefits.slice(0, 5).map((b) => (
                        <li key={b}>
                          <CheckIcon />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="package-card-footer">
                  <Link
                    className={`btn primary package-cta${!pkg.in_stock ? ' disabled' : ''}`}
                    to={`/packages/${pkg.packageId}/checkout`}
                    onClick={(e) => {
                      if (!pkg.in_stock) e.preventDefault();
                    }}
                    aria-disabled={!pkg.in_stock}
                  >
                    {pkg.in_stock ? 'Buy & Activate' : 'Out of stock'}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
