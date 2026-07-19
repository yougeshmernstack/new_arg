'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getThemeToken, mediaUrl, themeApi, type ShopProduct } from '@/lib/themeApi';

type TabKey = 'description' | 'benefits' | 'usage' | 'specs';

export default function ShopProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = String(params.productId || '');
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tab, setTab] = useState<TabKey>('description');

  useEffect(() => {
    let active = true;
    (async () => {
      if (!getThemeToken()) {
        setError('Please login to view this product.');
        setLoading(false);
        return;
      }
      try {
        const data = await themeApi.getProduct(productId);
        if (active) {
          setProduct(data?.data || null);
          setActiveIndex(0);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [productId]);

  const galleryItems = useMemo(() => {
    if (!product) return [] as Array<{ type: 'image' | 'video'; src: string }>;
    const images = (product.images || []).map((src) => ({ type: 'image' as const, src }));
    const videos = (product.videos || []).map((src) => ({ type: 'video' as const, src }));
    return [...images, ...videos];
  }, [product]);

  const activeItem = galleryItems[activeIndex] || null;

  const addToCart = async () => {
    if (!product) return;
    if (product.out_of_stock || product.stock <= 0) {
      setError('Product is out of stock.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await themeApi.addToCart({ productId: product.productId, quantity: 1 });
      setMessage('Added to cart.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="section">
        <p>Loading product...</p>
      </section>
    );
  }

  if (!getThemeToken()) {
    return (
      <section className="section">
        <p className="alert error">{error || 'Please login to view this product.'}</p>
        <Link className="button" href="/login">
          Login
        </Link>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="section">
        <p className="alert error">{error || 'Product not found.'}</p>
        <Link className="button button-soft" href="/shop">
          Back to shop
        </Link>
      </section>
    );
  }

  const oos = Boolean(product.out_of_stock || product.stock <= 0);

  return (
    <>
      <section className="section shop-pdp">
        <p>
          <Link href="/shop">← Back to shop</Link>
        </p>
        {error ? <p className="alert error">{error}</p> : null}
        {message ? <p className="alert success">{message}</p> : null}

        <div className="detail-layout shop-detail-layout">
          <div className="shop-gallery">
            <div className="shop-gallery-main panel">
              {activeItem ? (
                activeItem.type === 'video' ? (
                  <video key={activeItem.src} src={mediaUrl(activeItem.src)} controls playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(activeItem.src)} alt={product.product_name} />
                )
              ) : (
                <div className="shop-gallery-empty">No media available</div>
              )}
            </div>
            {galleryItems.length > 1 ? (
              <div className="shop-gallery-thumbs">
                {galleryItems.map((item, index) => (
                  <button
                    key={`${item.type}-${item.src}-${index}`}
                    type="button"
                    className={`shop-thumb ${index === activeIndex ? 'active' : ''}`}
                    onClick={() => setActiveIndex(index)}
                  >
                    {item.type === 'video' ? (
                      <span className="shop-thumb-video">▶ Video</span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(item.src)} alt="" />
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="detail-copy">
            <p className="eyebrow">SKU {product.sku}</p>
            <h1>{product.product_name}</h1>
            <div className="detail-price">
              <strong>Rs. {Number(product.price || 0).toLocaleString('en-IN')}</strong>
              {product.mrp && product.mrp > product.price ? (
                <span className="muted strike">MRP Rs. {Number(product.mrp).toLocaleString('en-IN')}</span>
              ) : null}
            </div>
            <p>{oos ? 'Out of Stock' : `In stock: ${product.stock}`}</p>
            {product.weight ? <p>Weight / pack: {product.weight}</p> : null}
            {product.description ? <p className="shop-short-desc">{product.description.slice(0, 220)}{product.description.length > 220 ? '…' : ''}</p> : null}
            <div className="shop-pdp-actions">
              <button className="button" type="button" disabled={oos || busy} onClick={addToCart}>
                {busy ? 'Adding...' : 'Add to cart'}
              </button>
              <button className="button button-soft" type="button" onClick={() => router.push('/shop/cart')}>
                View cart
              </button>
            </div>
          </div>
        </div>

        <div className="shop-tabs panel">
          <div className="shop-tab-list" role="tablist">
            {(
              [
                ['description', 'Description'],
                ['benefits', 'Benefits'],
                ['usage', 'Usage & Care'],
                ['specs', 'Specifications'],
              ] as Array<[TabKey, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`shop-tab ${tab === key ? 'active' : ''}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="shop-tab-panel">
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
              <div className="shop-info-blocks">
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
              <dl className="shop-specs">
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
      </section>
    </>
  );
}
