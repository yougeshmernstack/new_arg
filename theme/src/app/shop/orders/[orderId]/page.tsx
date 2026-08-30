'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getThemeToken, mediaUrl, themeApi } from '@/lib/themeApi';

function formatStatus(s: string) {
  return String(s || '').replace(/_/g, ' ');
}

function resolveTimelineEvent(entry: { status?: string; remark?: string }) {
  const status = String(entry?.status || '')
    .toLowerCase()
    .replace(/\s+/g, '_');
  const remark = String(entry?.remark || '').toLowerCase();

  if (status === 'payment_submitted' || remark.includes('payment proof submitted')) {
    return 'Payment submitted';
  }
  if (status === 'payment_rejected' || remark.includes('payment proof rejected')) {
    return 'Payment rejected';
  }
  if (
    status === 'order_placed' ||
    ((status === 'pending' || !status) &&
      (remark.includes('order placed') || remark.includes('awaiting payment')) &&
      !remark.includes('payment proof'))
  ) {
    return 'Order placed';
  }
  if (status === 'payment_verified' || (status === 'confirmed' && remark.includes('payment verified'))) {
    return 'Payment verified';
  }
  return formatStatus(status || 'update');
}

export default function ShopOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<{ bank?: any[]; upi?: any[] }>({ bank: [], upi: [] });
  const [utr, setUtr] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await themeApi.getOrder(params.orderId);
      setData(res?.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (!getThemeToken()) {
        setError('Please login first.');
        setLoading(false);
        return;
      }
      try {
        const [orderRes, methodsRes] = await Promise.all([
          themeApi.getOrder(params.orderId),
          themeApi.getPaymentMethods().catch(() => ({ data: { bank: [], upi: [] } })),
        ]);
        setData(orderRes?.data || null);
        setMethods(methodsRes?.data || { bank: [], upi: [] });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.orderId]);

  const order = data?.order;
  const payment = order?.payment || {};
  const payStatus = payment.status || 'none';
  const canSubmit =
    order?.order_status === 'pending' && (payStatus === 'none' || payStatus === 'rejected');
  const shipping = data?.shipping || order?.shipping || {};
  const timeline = data?.timeline || order?.timeline || [];
  const hasMethods = Boolean(methods.bank?.length || methods.upi?.length);

  const onSubmitPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !canSubmit) return;
    if (!utr.trim() || !proof) {
      setError('UTR and payment screenshot are required');
      return;
    }
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('orderId', String(order.orderId));
      fd.append('utr', utr.trim());
      fd.append('proof', proof);
      const res = await themeApi.submitOrderPayment(fd);
      setMessage(res?.message || 'Payment proof submitted.');
      setUtr('');
      setProof(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order?.orderId) return;
    setDownloading(true);
    setError('');
    try {
      const { blob, filename } = await themeApi.downloadInvoice(order.orderId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        filename ||
        `${order?.invoice_number || data?.invoice?.invoice_number || `order-${order.orderId}`}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <section className="section">Loading...</section>;
  if (error && !data) return <section className="section alert error">{error}</section>;

  const canDownload =
    String(payStatus || '').toLowerCase() === 'verified' ||
    String(order?.payment_status || '').toLowerCase() === 'received';

  return (
    <section className="section">
      <Link href="/shop/orders">Back to orders</Link>
      <h1>{order?.order_number}</h1>
      <p>
        Invoice: <strong>{order?.invoice_number || data?.invoice?.invoice_number || '—'}</strong>
        {canDownload ? (
          <>
            {' · '}
            <button
              type="button"
              onClick={handleDownloadInvoice}
              disabled={downloading}
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
              {downloading ? 'Preparing…' : 'Download invoice'}
            </button>
          </>
        ) : null}
      </p>
      <p>
        Status: {formatStatus(order?.order_status)} · Payment: {formatStatus(payStatus)}
      </p>
      <p>
        Amount due: <strong>₹{Number(order?.grand_total || 0).toFixed(2)}</strong>
      </p>

      {error ? <p className="alert error">{error}</p> : null}
      {message ? <p className="alert success">{message}</p> : null}

      <h2>Payment</h2>
      {payment.utr ? (
        <p>
          UTR: <code>{payment.utr}</code>
          {payment.remark ? ` · ${payment.remark}` : ''}
        </p>
      ) : null}
      {payment.proofUrl ? (
        <p>
          <a href={mediaUrl(payment.proofUrl)} target="_blank" rel="noreferrer">
            View submitted proof
          </a>
        </p>
      ) : null}
      {payStatus === 'submitted' ? (
        <p>Payment proof under review. Order confirms after admin verification.</p>
      ) : null}
      {payStatus === 'verified' ? <p>Payment verified. Order confirmed.</p> : null}

      {canSubmit ? (
        <>
          <h3>Pay to company account</h3>
          {!hasMethods ? <p>No payment methods configured. Contact admin.</p> : null}
          {(methods.bank || []).map((b: any, i: number) => (
            <div key={`bank-${i}`}>
              <strong>{b.bankName || 'Bank'}</strong>
              <p>
                A/C: {b.accountNumber} · IFSC: {b.ifsc} · {b.holder}
              </p>
            </div>
          ))}
          {(methods.upi || []).map((u: any, i: number) => (
            <div key={`upi-${i}`}>
              <strong>{u.name || 'UPI'}</strong>
              <p>{u.upiId}</p>
              {u.qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(u.qrCodeUrl)} alt="UPI QR" style={{ maxWidth: 160 }} />
              ) : null}
            </div>
          ))}
          <form onSubmit={onSubmitPayment}>
            <label>
              UTR / Txn ID
              <input required value={utr} onChange={(e) => setUtr(e.target.value)} />
            </label>
            <label>
              Payment screenshot
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => setProof(e.target.files?.[0] || null)}
              />
            </label>
            <button className="button" type="submit" disabled={submitting || !hasMethods}>
              {submitting ? 'Submitting...' : 'Submit payment proof'}
            </button>
          </form>
        </>
      ) : null}

      <h2>Tracking</h2>
      <ol>
        {[...timeline].reverse().map((entry: any, idx: number) => (
          <li key={`${entry.status}-${entry.updated_at}-${idx}`}>
            <strong>{resolveTimelineEvent(entry)}</strong> — {entry.remark || '—'}
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
