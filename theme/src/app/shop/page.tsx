'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getThemeToken, mediaUrl, themeApi, type ShopProduct } from '@/lib/themeApi';

export default function ShopPage() {
  const [list, setList] = useState<ShopProduct[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!getThemeToken()) {
        setError('Please login to browse live products.');
        setLoading(false);
        return;
      }
      try {
        const data = await themeApi.getProducts({ limit: 50 });
        if (active) setList(data?.data || []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const addToCart = async (item: ShopProduct) => {
    if (item.out_of_stock || item.stock <= 0) {
      setError('Product is out of stock.');
      return;
    }
    setBusyId(item.productId);
    setError('');
    setMessage('');
    try {
      await themeApi.addToCart({ productId: item.productId, quantity: 1 });
      setMessage(`${item.product_name} added to cart.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <section className="page-hero compact-hero">
        <p className="eyebrow">Live storefront</p>
        <h1>Shop products</h1>
        <p>Hidden products are excluded. Out-of-stock items cannot be purchased.</p>
      </section>
      <section className="section">
        {!getThemeToken() ? (
          <p>
            <Link className="button" href="/login">
              Login to shop
            </Link>
          </p>
        ) : null}
        {error ? <p className="alert error">{error}</p> : null}
        {message ? <p className="alert success">{message}</p> : null}
        {loading ? (
          <p>Loading products...</p>
        ) : (
          <div className="product-grid">
            {list.length === 0 ? (
              <p>No products available.</p>
            ) : (
              list.map((item) => {
                const oos = Boolean(item.out_of_stock || item.stock <= 0);
                const thumb = item.images?.[0];
                return (
                  <article className="product-card shop-live-card" key={item.productId}>
                    <Link href={`/shop/${item.productId}`} className="shop-live-media">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl(thumb)} alt={item.product_name} />
                      ) : (
                        <div className="shop-live-placeholder">No image</div>
                      )}
                    </Link>
                    <h3>
                      <Link href={`/shop/${item.productId}`}>{item.product_name}</Link>
                    </h3>
                    <p>{item.sku}</p>
                    <p>
                      <strong>Rs. {Number(item.price || 0).toLocaleString('en-IN')}</strong>
                    </p>
                    <p>{oos ? 'Out of Stock' : `In stock: ${item.stock}`}</p>
                    <div className="shop-live-actions">
                      <Link className="button button-soft" href={`/shop/${item.productId}`}>
                        View
                      </Link>
                      <button
                        className="button"
                        type="button"
                        disabled={oos || busyId === item.productId}
                        onClick={() => addToCart(item)}
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
        <p style={{ marginTop: '1.5rem' }}>
          <Link className="button button-soft" href="/shop/cart">
            View cart
          </Link>
        </p>
      </section>
    </>
  );
}
