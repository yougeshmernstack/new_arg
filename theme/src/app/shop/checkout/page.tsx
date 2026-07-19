'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getThemeToken, themeApi } from '@/lib/themeApi';

export default function ShopCheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<Array<{ productId: number; product_name: string; quantity: number; price: number }>>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState({
    name: '',
    mobile: '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });
  const idempotencyKey = useMemo(
    () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `chk_${Date.now()}`),
    []
  );

  useEffect(() => {
    (async () => {
      if (!getThemeToken()) {
        setError('Please login first.');
        return;
      }
      try {
        const data = await themeApi.getCart();
        setItems(data?.data?.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cart');
      }
    })();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const data = await themeApi.checkout({
        shipping_address: address,
        idempotency_key: idempotencyKey,
      });
      const orderId = data?.data?.order?.orderId;
      router.replace(orderId ? `/shop/orders/${orderId}` : '/shop/orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setSubmitting(false);
    }
  };

  if (!items.length && !error) {
    return (
      <section className="section">
        <p>Cart is empty.</p>
        <Link href="/shop">Browse products</Link>
      </section>
    );
  }

  return (
    <section className="section">
      <h1>Checkout</h1>
      {error ? <p className="alert error">{error}</p> : null}
      <form className="checkout-form" onSubmit={onSubmit}>
        {(['name', 'mobile', 'line1', 'city', 'state', 'pincode'] as const).map((key) => (
          <label key={key}>
            {key}
            <input
              required
              value={address[key]}
              onChange={(e) => setAddress((a) => ({ ...a, [key]: e.target.value }))}
            />
          </label>
        ))}
        <button className="button" type="submit" disabled={submitting || !items.length}>
          {submitting ? 'Placing order...' : 'Place order'}
        </button>
      </form>
    </section>
  );
}
