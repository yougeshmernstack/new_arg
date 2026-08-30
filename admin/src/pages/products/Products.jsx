import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { commerceApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';
import { exportToExcel, formatExcelAmount } from '../../utils/exportExcel';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export default function Products() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [stockModal, setStockModal] = useState(null);
  const [stockForm, setStockForm] = useState({ action: 'increase', quantity: 1, remark: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100, search: search || undefined };
      if (filter === 'hidden') params.is_hidden = true;
      if (filter === 'low') params.stock = 'low';
      if (filter === 'out') params.stock = 'out';
      const res = await commerceApi.getProducts(params);
      setList(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleVisibility = async (item) => {
    setBusyId(item.productId);
    setMessage('');
    try {
      await commerceApi.toggleVisibility({
        productId: item.productId,
        is_hidden: !item.is_hidden,
      });
      setMessage(item.is_hidden ? 'Product is now visible.' : 'Product hidden from buyers.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update visibility');
    } finally {
      setBusyId(null);
    }
  };

  const submitStock = async (e) => {
    e.preventDefault();
    if (!stockModal) return;
    setBusyId(stockModal.productId);
    setError('');
    try {
      await commerceApi.updateStock({
        productId: stockModal.productId,
        action: stockForm.action,
        quantity: Number(stockForm.quantity),
        remark: stockForm.remark,
      });
      setMessage('Stock updated.');
      setStockModal(null);
      setStockForm({ action: 'increase', quantity: 1, remark: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update stock');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>Products</h2>
        <div className="toolbar" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
          <button
            type="button"
            className="btn"
            disabled={loading || !list.length}
            onClick={() =>
              exportToExcel({
                filename: 'products',
                sheetName: 'Products',
                rows: list,
                columns: [
                  { header: 'ID', value: (r) => r.productId ?? '' },
                  { header: 'Name', value: (r) => r.product_name || '' },
                  { header: 'SKU', value: (r) => r.sku || '' },
                  { header: 'Stock', value: (r) => r.stock ?? r.available_stock ?? '' },
                  { header: 'MRP', value: (r) => formatExcelAmount(r.mrp) },
                  {
                    header: 'Distributor Price',
                    value: (r) => formatExcelAmount(r.distributor_price || r.price),
                  },
                  { header: 'Hidden', value: (r) => (r.is_hidden ? 'Yes' : 'No') },
                  { header: 'Status', value: (r) => r.status || '' },
                ],
              })
            }
          >
            Export Excel
          </button>
          <Link className="btn primary" to="/products/create">
            Add Product
          </Link>
        </div>
      </div>

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          placeholder="Search name / SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All</option>
          <option value="hidden">Hidden</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <button type="submit" className="btn">
          Search
        </button>
      </form>

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>ID</th>
                <th>Name</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>MRP</th>
                <th>Dist. Price</th>
                <th>Visibility</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={10}>No products found</td>
                </tr>
              ) : (
                list.map((item) => {
                  const thumb = item.images?.[0];
                  return (
                    <tr key={item._id || item.productId}>
                      <td>
                        {thumb ? (
                          <img className="product-list-thumb" src={mediaUrl(thumb)} alt="" />
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>{item.productId}</td>
                      <td>{item.product_name}</td>
                      <td>{item.sku}</td>
                      <td>
                        <span className={item.stock <= 0 ? 'badge danger' : item.stock <= 10 ? 'badge warn' : 'badge ok'}>
                          {item.stock}
                          {item.stock <= 0 ? ' · OOS' : ''}
                        </span>
                      </td>
                      <td>{item.mrp}</td>
                      <td>{item.distributor_price}</td>
                      <td>{item.is_hidden ? 'Hidden' : 'Visible'}</td>
                      <td>{item.status}</td>
                      <td className="row-actions">
                        <Link className="btn ghost" to={`/products/${item.productId}/edit`}>
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="btn"
                          disabled={busyId === item.productId}
                          onClick={() => toggleVisibility(item)}
                        >
                          {item.is_hidden ? 'Show' : 'Hide'}
                        </button>
                        <button
                          type="button"
                          className="btn primary"
                          onClick={() => {
                            setStockModal(item);
                            setStockForm({ action: 'increase', quantity: 1, remark: '' });
                          }}
                        >
                          Add / Reduce Stock
                        </button>
                        <Link className="btn ghost" to={`/stock-history?productId=${item.productId}`}>
                          History
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {stockModal ? (
        <div className="modal-backdrop" onClick={() => setStockModal(null)} role="presentation">
          <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog">
            <h3>Add / Reduce Stock — {stockModal.product_name}</h3>
            <p className="muted">Current stock: <strong>{stockModal.stock}</strong></p>
            <form className="form-grid" onSubmit={submitStock}>
              <label>
                Action
                <select
                  value={stockForm.action}
                  onChange={(e) => setStockForm((s) => ({ ...s, action: e.target.value }))}
                >
                  <option value="increase">Increase (add stock)</option>
                  <option value="decrease">Decrease (reduce stock)</option>
                  <option value="set">Set exact stock</option>
                </select>
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min={stockForm.action === 'set' ? '0' : '1'}
                  step="1"
                  required
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm((s) => ({ ...s, quantity: e.target.value }))}
                />
              </label>
              <label>
                Remark (optional)
                <input
                  placeholder="e.g. Warehouse receipt / damaged goods"
                  value={stockForm.remark}
                  onChange={(e) => setStockForm((s) => ({ ...s, remark: e.target.value }))}
                />
              </label>
              <div className="form-actions">
                <button type="button" className="btn ghost" onClick={() => setStockModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={busyId === stockModal.productId}>
                  {busyId === stockModal.productId ? 'Saving...' : 'Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
