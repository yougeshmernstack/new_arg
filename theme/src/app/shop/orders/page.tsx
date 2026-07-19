'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getThemeToken, themeApi } from '@/lib/themeApi';

type Order = {
  orderId: number;
  order_number: string;
  invoice_number?: string;
  grand_total: number;
  order_status: string;
  created_date?: string;
};

export default function ShopOrdersPage() {
  const [list, setList] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!getThemeToken()) {
        setError('Please login first.');
        setLoading(false);
        return;
      }
      try {
        const data = await themeApi.getOrders();
        setList(data?.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="section">
      <h1>My orders</h1>
      {error ? <p className="alert error">{error}</p> : null}
      {loading ? (
        <p>Loading...</p>
      ) : list.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <div className="cart-lines">
          {list.map((order) => (
            <div className="cart-line" key={order.orderId}>
              <div>
                <strong>{order.order_number}</strong>
                <p>
                  Invoice {order.invoice_number || '—'} · {order.order_status}
                </p>
              </div>
              <div>
                <p>Rs. {Number(order.grand_total || 0).toLocaleString('en-IN')}</p>
                <Link href={`/shop/orders/${order.orderId}`}>Track</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
