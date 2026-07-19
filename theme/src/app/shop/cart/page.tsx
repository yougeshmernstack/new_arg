'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getThemeToken, themeApi } from '@/lib/themeApi';

type CartItem = {
  productId: number;
  product_name: string;
  sku: string;
  quantity: number;
  price: number;
};

export default function ShopCartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!getThemeToken()) {
      setError('Please login first.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await themeApi.getCart();
      setItems(data?.data?.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <section className="section">
      <h1>Cart</h1>
      {error ? <p className="alert error">{error}</p> : null}
      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>
          Cart is empty. <Link href="/shop">Browse products</Link>
        </p>
      ) : (
        <>
          <div className="cart-lines">
            {items.map((item) => (
              <div key={item.productId} className="cart-line">
                <div>
                  <strong>{item.product_name}</strong>
                  <p>
                    {item.sku} · Qty {item.quantity}
                  </p>
                </div>
                <strong>Rs. {(item.price * item.quantity).toLocaleString('en-IN')}</strong>
              </div>
            ))}
          </div>
          <p>
            <strong>Subtotal: Rs. {subtotal.toLocaleString('en-IN')}</strong>
          </p>
          <button className="button" type="button" onClick={() => router.push('/shop/checkout')}>
            Proceed to checkout
          </button>
        </>
      )}
    </section>
  );
}
