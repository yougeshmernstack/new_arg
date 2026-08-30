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
  payment_status?: string;
  payment?: { status?: string };
  created_date?: string;
};

function canDownloadInvoice(order: Order) {
  const pay = String(order?.payment?.status || '').toLowerCase();
  const paymentStatus = String(order?.payment_status || '').toLowerCase();
  return pay === 'verified' || paymentStatus === 'received';
}

export default function ShopOrdersPage() {
  const [list, setList] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

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

  const handleDownload = async (order: Order) => {
    if (!canDownloadInvoice(order)) return;
    setDownloadingId(order.orderId);
    setError('');
    try {
      const { blob, filename } = await themeApi.downloadInvoice(order.orderId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${order.invoice_number || `order-${order.orderId}`}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download invoice');
    } finally {
      setDownloadingId(null);
    }
  };

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
                {canDownloadInvoice(order) ? (
                  <>
                    {' · '}
                    <button
                      type="button"
                      onClick={() => handleDownload(order)}
                      disabled={downloadingId === order.orderId}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: 0,
                        font: 'inherit',
                      }}
                    >
                      {downloadingId === order.orderId ? '…' : 'Invoice'}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
