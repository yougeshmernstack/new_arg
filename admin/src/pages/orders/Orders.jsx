import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { commerceApi } from '../../api';
import { canDownloadInvoice, downloadOrderInvoice } from '../../utils/downloadInvoice';
import { exportToExcel, formatExcelAmount, formatExcelDate } from '../../utils/exportExcel';

const ROLE_META = {
  franchise: {
    title: 'Franchise Orders',
    orderType: 'franchise_purchase',
  },
  distributor: {
    title: 'Distributor Orders',
    orderType: undefined,
  },
  theme: {
    title: 'Theme Orders',
    orderType: undefined,
  },
};

function formatOrderStatus(status) {
  return String(status || 'pending')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function orderStatusBadgeClass(status) {
  const value = String(status || '').toLowerCase();
  if (['confirmed', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'].includes(value)) {
    return 'badge ok';
  }
  if (['cancelled', 'returned', 'refunded'].includes(value)) {
    return 'badge danger';
  }
  return 'badge warn';
}

function paymentStatusOf(item) {
  return String(item?.payment?.status || 'none').toLowerCase();
}

function formatPaymentStatus(status) {
  if (status === 'submitted') return 'Awaiting verify';
  if (status === 'verified') return 'Verified';
  if (status === 'rejected') return 'Rejected';
  return 'No proof';
}

function paymentBadgeClass(status) {
  if (status === 'submitted') return 'badge warn';
  if (status === 'verified') return 'badge ok';
  if (status === 'rejected') return 'badge danger';
  return 'badge';
}

function formatOrderDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function Orders({ buyerRole = 'franchise' }) {
  const meta = ROLE_META[buyerRole] || ROLE_META.franchise;
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await commerceApi.getOrders({
        search: search || undefined,
        status: status || undefined,
        payment_status: paymentStatus || undefined,
        buyer_role: buyerRole,
        order_type: meta.orderType,
        limit: 50,
      });
      setList(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerRole]);

  const handleDownloadInvoice = async (item) => {
    if (!item?.orderId || !canDownloadInvoice(item)) return;
    setDownloadingId(item.orderId);
    setError('');
    try {
      await downloadOrderInvoice(item.orderId, item.invoice_number || `order-${item.orderId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download invoice');
    } finally {
      setDownloadingId(null);
    }
  };

  const pendingCount = list.filter((item) => String(item.order_status || '').toLowerCase() === 'pending').length;
  const awaitingPayCount = list.filter((item) => paymentStatusOf(item) === 'submitted').length;
  const confirmedCount = list.filter((item) =>
    ['confirmed', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'].includes(
      String(item.order_status || '').toLowerCase(),
    ),
  ).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>{meta.title}</h2>
          <p className="page-sub">Track orders, invoices, buyer activity, and current fulfillment status.</p>
        </div>
        <button
          type="button"
          className="btn"
          disabled={loading || !list.length}
          onClick={() =>
            exportToExcel({
              filename: `${buyerRole}_orders`,
              sheetName: meta.title.slice(0, 31),
              rows: list,
              columns: [
                { header: 'Order #', value: (r) => r.order_number || '' },
                { header: 'Invoice #', value: (r) => r.invoice_number || '' },
                { header: 'Package', value: (r) => r.package_name || '' },
                { header: 'Buyer Name', value: (r) => r.buyer_name || '' },
                { header: 'Buyer Username', value: (r) => r.buyer_username || '' },
                { header: 'Buyer UID', value: (r) => r.buyer_uid ?? '' },
                { header: 'Buyer Panel ID', value: (r) => r.buyer_panel_id ?? '' },
                { header: 'Total', value: (r) => formatExcelAmount(r.grand_total) },
                { header: 'BV', value: (r) => formatExcelAmount(r.bv) },
                { header: 'Order Status', value: (r) => formatOrderStatus(r.order_status) },
                { header: 'Payment Status', value: (r) => formatPaymentStatus(paymentStatusOf(r)) },
                { header: 'UTR', value: (r) => r.payment?.utr || '' },
                { header: 'Date', value: (r) => formatExcelDate(r.created_date) },
              ],
            })
          }
        >
          Export Excel
        </button>
      </div>
      <form
        className="toolbar orders-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          placeholder="Search order, invoice, UID, username, name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="in_transit">In Transit</option>
          <option value="out_for_delivery">Out For Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="returned">Returned</option>
          <option value="refunded">Refunded</option>
        </select>
        <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
          <option value="">All payments</option>
          <option value="submitted">Awaiting verification</option>
          <option value="none">No proof yet</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <button type="submit" className="btn">
          Search
        </button>
      </form>
      <div className="list-meta orders-list-meta">
        <p>
          Showing <strong>{list.length}</strong> orders
        </p>
        <div className="orders-summary">
          <span className="orders-summary-chip is-pay-review">
            Awaiting verify <strong>{awaitingPayCount}</strong>
          </span>
          <span className="orders-summary-chip">
            Pending <strong>{pendingCount}</strong>
          </span>
          <span className="orders-summary-chip is-confirmed">
            Confirmed <strong>{confirmedCount}</strong>
          </span>
        </div>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      {loading ? (
        <div className="table-wrap">
          <div className="empty-state">
            <strong>Loading orders...</strong>
            <span>Please wait while we fetch the latest order list.</span>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Invoice #</th>
                <th>Buyer</th>
                <th>Total</th>
                <th>BV</th>
                <th>Order</th>
                <th>Payment</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <strong>No orders found</strong>
                      <span>Try changing the search text or status filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((item) => {
                  const pay = paymentStatusOf(item);
                  const buyerLabel = item.buyer_name || item.buyer_username || '—';
                  const buyerMeta = [
                    item.buyer_username ? `@${item.buyer_username}` : null,
                    item.buyer_uid ? `UID ${item.buyer_uid}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <tr
                      key={item._id || item.orderId}
                      className={pay === 'submitted' ? 'order-row-pay-review' : undefined}
                    >
                      <td>
                        <div className="cell-primary">{item.order_number || '—'}</div>
                        {item.package_name ? (
                          <div className="muted" style={{ fontSize: 12 }}>
                            {item.package_name}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <div className="cell-id">{item.invoice_number || '—'}</div>
                        {canDownloadInvoice(item) ? (
                          <button
                            type="button"
                            className="btn ghost sm"
                            style={{ marginTop: 4 }}
                            disabled={downloadingId === item.orderId}
                            onClick={() => handleDownloadInvoice(item)}
                          >
                            {downloadingId === item.orderId ? '…' : 'Invoice'}
                          </button>
                        ) : null}
                      </td>
                      <td>
                        <div className="cell-primary">{buyerLabel}</div>
                        {buyerMeta ? (
                          <div className="muted" style={{ fontSize: 12 }}>
                            {buyerMeta}
                          </div>
                        ) : null}
                        {item.buyer_panel_id ? (
                          <div className="muted" style={{ fontSize: 12 }}>
                            ID {item.buyer_panel_id}
                            {item.highest_package_name
                              ? ` · ${item.highest_package_name}`
                              : ''}
                          </div>
                        ) : item.highest_package_name ? (
                          <div className="muted" style={{ fontSize: 12 }}>
                            {item.highest_package_name}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <div className="cell-primary">₹{Number(item.grand_total || 0).toFixed(2)}</div>
                      </td>
                      <td>
                        <div className="cell-primary">{Number(item.bv || 0).toFixed(2)}</div>
                      </td>
                      <td>
                        <span className={orderStatusBadgeClass(item.order_status)}>
                          {formatOrderStatus(item.order_status)}
                        </span>
                      </td>
                      <td>
                        <span className={paymentBadgeClass(pay)}>{formatPaymentStatus(pay)}</span>
                        {pay === 'submitted' && item.payment?.utr ? (
                          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                            UTR: {item.payment.utr}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <div className="cell-primary">{formatOrderDate(item.created_date)}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          <Link
                            className={pay === 'submitted' ? 'btn primary sm' : 'btn ghost sm'}
                            to={`/orders/${item.orderId}`}
                          >
                            {pay === 'submitted' ? 'Verify' : 'View'}
                          </Link>
                          {canDownloadInvoice(item) ? (
                            <button
                              type="button"
                              className="btn ghost sm"
                              disabled={downloadingId === item.orderId}
                              onClick={() => handleDownloadInvoice(item)}
                            >
                              {downloadingId === item.orderId ? '…' : 'Download'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
