import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { commerceApi } from '../../api';

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

export default function Orders({ buyerRole = 'franchise' }) {
  const meta = ROLE_META[buyerRole] || ROLE_META.franchise;
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await commerceApi.getOrders({
        search: search || undefined,
        status: status || undefined,
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

  return (
    <div className="page">
      <div className="page-head">
        <h2>{meta.title}</h2>
      </div>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          placeholder="Search order / invoice number"
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
        <button type="submit" className="btn">
          Search
        </button>
      </form>
      {error ? <div className="alert error">{error}</div> : null}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Invoice #</th>
                <th>Buyer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7}>No orders found</td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item._id || item.orderId}>
                    <td>{item.order_number}</td>
                    <td>{item.invoice_number || '—'}</td>
                    <td>{item.buyer_uid}</td>
                    <td>{Number(item.grand_total || 0).toFixed(2)}</td>
                    <td>
                      <span className="badge">{item.order_status}</span>
                    </td>
                    <td>{item.created_date ? new Date(item.created_date).toLocaleString() : '—'}</td>
                    <td>
                      <Link className="btn primary" to={`/orders/${item.orderId}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
