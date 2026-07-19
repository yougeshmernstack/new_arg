'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getThemeToken, themeApi } from '@/lib/themeApi';

export default function ShopOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const [data, setData] = useState<any>(null);
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
        const res = await themeApi.getOrder(params.orderId);
        setData(res?.data || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.orderId]);

  if (loading) return <section className="section">Loading...</section>;
  if (error) return <section className="section alert error">{error}</section>;

  const order = data?.order;
  const shipping = data?.shipping || order?.shipping || {};
  const timeline = data?.timeline || order?.timeline || [];

  return (
    <section className="section">
      <Link href="/shop/orders">Back to orders</Link>
      <h1>{order?.order_number}</h1>
      <p>
        Invoice: <strong>{order?.invoice_number || data?.invoice?.invoice_number || '—'}</strong>
      </p>
      <p>Status: {String(order?.order_status || '').replace(/_/g, ' ')}</p>

      <h2>Tracking</h2>
      <ol>
        {timeline.map((entry: any, idx: number) => (
          <li key={`${entry.status}-${idx}`}>
            <strong>{String(entry.status).replace(/_/g, ' ')}</strong> — {entry.remark || '—'}
            <br />
            <small>{entry.updated_at ? new Date(entry.updated_at).toLocaleString() : ''}</small>
          </li>
        ))}
      </ol>

      <h2>Shipping</h2>
      {!shipping?.courier_name && !shipping?.tracking_number ? (
        <p>Shipping details will appear after dispatch.</p>
      ) : (
        <ul>
          <li>Courier: {shipping.courier_name || '—'}</li>
          <li>Tracking: {shipping.tracking_number || '—'}</li>
          <li>Partner: {shipping.shipping_partner || '—'}</li>
          <li>
            Dispatch:{' '}
            {shipping.dispatch_date ? new Date(shipping.dispatch_date).toLocaleDateString() : '—'}
          </li>
          <li>
            ETA:{' '}
            {shipping.estimated_delivery
              ? new Date(shipping.estimated_delivery).toLocaleDateString()
              : '—'}
          </li>
        </ul>
      )}
    </section>
  );
}
