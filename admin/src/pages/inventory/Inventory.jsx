import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { commerceApi } from '../../api';
import { exportToExcel } from '../../utils/exportExcel';

function statusMeta(status) {
  if (status === 'out') return { label: 'Out of stock', tone: 'danger' };
  if (status === 'low') return { label: 'Low stock', tone: 'warn' };
  return { label: 'OK', tone: 'ok' };
}

export default function Inventory() {
  const [params] = useSearchParams();
  const [list, setList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(params.get('stock') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [stockModal, setStockModal] = useState(null);
  const [stockForm, setStockForm] = useState({ action: 'increase', quantity: 1, remark: '' });

  const load = async (stockFilter = filter) => {
    setLoading(true);
    setError('');
    try {
      const query = {
        limit: 100,
        search: search || undefined,
        stock: stockFilter || undefined,
      };
      const res = await commerceApi.getInventory(query);
      setList(res.data?.data || []);
      setSummary(res.data?.summary || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stock = params.get('stock') || '';
    setFilter(stock);
    load(stock);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const submitStock = async (e) => {
    e.preventDefault();
    if (!stockModal) return;
    setBusyId(stockModal.productId);
    setError('');
    setMessage('');
    try {
      await commerceApi.updateStock({
        productId: stockModal.productId,
        action: stockForm.action,
        quantity: Number(stockForm.quantity),
        remark: stockForm.remark,
      });
      setMessage(`Stock updated for ${stockModal.product_name}.`);
      setStockModal(null);
      setStockForm({ action: 'increase', quantity: 1, remark: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update stock');
    } finally {
      setBusyId(null);
    }
  };

  const cards = [
    { key: 'products', label: 'Products', value: summary?.products ?? 0, tone: 'default' },
    { key: 'remaining', label: 'Remaining', value: summary?.remaining_units ?? 0, tone: 'default' },
    { key: 'delivered', label: 'Delivered', value: summary?.delivered_units ?? 0, tone: 'ok' },
    { key: 'pipeline', label: 'In Pipeline', value: summary?.in_pipeline_units ?? 0, tone: 'info' },
    { key: 'low', label: 'Low Stock', value: summary?.low_stock_products ?? 0, tone: 'warn' },
    { key: 'out', label: 'Out of Stock', value: summary?.out_of_stock_products ?? 0, tone: 'danger' },
  ];

  return (
    <div className="page inventory-page">
      <div className="page-head">
        <div>
          <h2>Inventory</h2>
          <p className="page-sub">Stock remaining, pipeline and delivered units</p>
        </div>
        <div className="toolbar" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
          <button
            type="button"
            className="btn"
            disabled={loading || !list.length}
            onClick={() =>
              exportToExcel({
                filename: 'inventory',
                sheetName: 'Inventory',
                rows: list,
                columns: [
                  { header: 'ID', value: (r) => r.productId ?? '' },
                  { header: 'Product', value: (r) => r.product_name || '' },
                  { header: 'SKU', value: (r) => r.sku || '' },
                  { header: 'Remaining', value: (r) => r.remaining_stock ?? '' },
                  { header: 'Delivered', value: (r) => r.delivered_qty ?? '' },
                  { header: 'In Pipeline', value: (r) => r.in_pipeline_qty ?? '' },
                  { header: 'Status', value: (r) => statusMeta(r.stock_status).label },
                  { header: 'Hidden', value: (r) => (r.is_hidden ? 'Yes' : 'No') },
                ],
              })
            }
          >
            Export Excel
          </button>
          <Link className="btn" to="/stock-history">
            Stock History
          </Link>
        </div>
      </div>

      {!loading && summary ? (
        <div className="inventory-stat-grid">
          {cards.map((card) => (
            <div key={card.key} className={`inventory-stat tone-${card.tone}`}>
              <span>{card.label}</span>
              <strong>{Number(card.value).toLocaleString('en-IN')}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <form
        className="toolbar inventory-toolbar"
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
          <option value="">All stock</option>
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
        <p className="muted">Loading inventory…</p>
      ) : (
        <div className="table-wrap inventory-table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Remaining</th>
                <th>Delivered</th>
                <th>In Pipeline</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="inventory-empty-cell">
                    No inventory found for this filter
                  </td>
                </tr>
              ) : (
                list.map((item) => {
                  const meta = statusMeta(item.stock_status);
                  return (
                    <tr key={item.productId} className={`inventory-row status-${item.stock_status || 'ok'}`}>
                      <td className="inventory-id">#{item.productId}</td>
                      <td>
                        <div className="inventory-product">
                          <strong>{item.product_name}</strong>
                          {item.is_hidden ? <span className="badge warn">Hidden</span> : null}
                        </div>
                      </td>
                      <td className="inventory-sku">{item.sku}</td>
                      <td>
                        <span className={`inventory-qty ${meta.tone}`}>
                          {item.remaining_stock}
                        </span>
                      </td>
                      <td>{item.delivered_qty}</td>
                      <td>
                        <span className="inventory-pipeline">{item.in_pipeline_qty}</span>
                      </td>
                      <td>
                        <span className={`badge ${meta.tone}`}>{meta.label}</span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn primary"
                            disabled={busyId === item.productId}
                            onClick={() => {
                              setStockModal(item);
                              setStockForm({ action: 'increase', quantity: 1, remark: '' });
                            }}
                          >
                            Add / Reduce Stock
                          </button>
                          <Link
                            className="btn ghost"
                            to={`/stock-history?productId=${item.productId}`}
                          >
                            History
                          </Link>
                          <Link className="btn ghost" to={`/products/${item.productId}/edit`}>
                            Edit
                          </Link>
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

      {stockModal ? (
        <div className="modal-backdrop" onClick={() => setStockModal(null)} role="presentation">
          <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog">
            <h3>Add / Reduce Stock — {stockModal.product_name}</h3>
            <p className="muted">
              Current stock: <strong>{stockModal.remaining_stock ?? stockModal.stock}</strong>
            </p>
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
