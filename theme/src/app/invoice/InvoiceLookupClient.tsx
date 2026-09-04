'use client';

import { FormEvent, useMemo, useState } from 'react';
import { themeApi } from '@/lib/themeApi';

type InvoiceLookup = {
  invoice_number: string;
  order_number: string;
  payment_status: string;
  created_date?: string;
  customer: {
    name?: string;
    email?: string;
    mobile?: string;
    gst_number?: string;
    billing_address?: string;
    shipping_address?: string;
  };
  items: {
    product_name: string;
    sku?: string;
    hsn_code?: string;
    quantity: number;
    price: number;
    tax?: number;
    gst?: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  gst?: number;
  discount?: number;
  grand_total: number;
  can_download?: boolean;
};

function money(value: number | undefined) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function InvoiceLookupClient() {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState<InvoiceLookup | null>(null);

  const createdLabel = useMemo(() => {
    if (!invoice?.created_date) return '';
    try {
      return new Date(invoice.created_date).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(invoice.created_date);
    }
  }, [invoice?.created_date]);

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    const value = invoiceNumber.trim();
    if (!value) {
      setError('Enter an invoice number.');
      return;
    }
    setLoading(true);
    setError('');
    setInvoice(null);
    try {
      const res = await themeApi.lookupInvoice(value);
      setInvoice(res?.data || null);
      if (!res?.data) setError('Invoice not found.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invoice not found.');
    } finally {
      setLoading(false);
    }
  };

  const onDownload = async () => {
    if (!invoice?.invoice_number) return;
    setDownloading(true);
    setError('');
    try {
      const { blob, filename } = await themeApi.downloadInvoiceByNumber(invoice.invoice_number);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download invoice.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="invoice-lookup-page">
      <section className="invoice-lookup-hero">
        <div className="invoice-lookup-hero-inner">
          <p className="eyebrow">Invoices</p>
          <h1>
            Check your
            <span>invoice</span>
          </h1>
          <p className="invoice-lookup-lede">
            Enter the invoice number shared with you to view details and download the PDF.
          </p>
        </div>
      </section>

      <section className="section invoice-lookup-main">
        <form className="invoice-lookup-form" onSubmit={onSearch}>
          <label htmlFor="invoice-number">Invoice number</label>
          <div className="invoice-lookup-row">
            <input
              id="invoice-number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
              placeholder="INV-2026-000001"
              autoComplete="off"
              spellCheck={false}
            />
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Searching…' : 'Check invoice'}
            </button>
          </div>
        </form>

        {error ? <div className="invoice-lookup-alert">{error}</div> : null}

        {invoice ? (
          <article className="invoice-lookup-result">
            <header className="invoice-lookup-result-head">
              <div>
                <p className="eyebrow">Found</p>
                <h2>{invoice.invoice_number}</h2>
                <p>
                  Order {invoice.order_number}
                  {createdLabel ? ` · ${createdLabel}` : ''}
                </p>
              </div>
              {invoice.can_download ? (
                <button className="btn" type="button" onClick={onDownload} disabled={downloading}>
                  {downloading ? 'Downloading…' : 'Download PDF'}
                </button>
              ) : (
                <span className="invoice-lookup-pill">Payment pending</span>
              )}
            </header>

            <div className="invoice-lookup-grid">
              <div>
                <h3>Customer</h3>
                <p>{invoice.customer?.name || '—'}</p>
                {invoice.customer?.mobile ? <p>{invoice.customer.mobile}</p> : null}
                {invoice.customer?.email ? <p>{invoice.customer.email}</p> : null}
                {invoice.customer?.gst_number ? <p>GST: {invoice.customer.gst_number}</p> : null}
              </div>
              <div>
                <h3>Billing address</h3>
                <p>{invoice.customer?.billing_address || '—'}</p>
              </div>
              <div>
                <h3>Shipping address</h3>
                <p>{invoice.customer?.shipping_address || '—'}</p>
              </div>
            </div>

            <div className="invoice-lookup-table-wrap">
              <table className="invoice-lookup-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items || []).map((item, idx) => (
                    <tr key={`${item.sku || item.product_name}-${idx}`}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong>{item.product_name}</strong>
                        {item.sku ? <span className="muted"> · {item.sku}</span> : null}
                      </td>
                      <td>{item.quantity}</td>
                      <td>₹{money(item.price)}</td>
                      <td>₹{money(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="invoice-lookup-totals">
              <div>
                <dt>Subtotal</dt>
                <dd>₹{money(invoice.subtotal)}</dd>
              </div>
              <div>
                <dt>Tax / GST</dt>
                <dd>₹{money(invoice.tax ?? invoice.gst)}</dd>
              </div>
              <div>
                <dt>Grand total</dt>
                <dd>₹{money(invoice.grand_total)}</dd>
              </div>
            </dl>
          </article>
        ) : null}
      </section>
    </div>
  );
}
