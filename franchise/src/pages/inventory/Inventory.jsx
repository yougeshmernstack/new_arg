import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { franchiseApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function statusLabel(status) {
  if (status === 'out') return 'Out of stock';
  if (status === 'low') return 'Low stock';
  return 'In stock';
}

function statusClass(status) {
  if (status === 'out') return 'badge danger';
  if (status === 'low') return 'badge warn';
  return 'badge success';
}

export default function Inventory() {
  const [params] = useSearchParams();
  const [list, setList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(params.get('stock') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (stockFilter = filter) => {
    setLoading(true);
    setError('');
    try {
      const res = await franchiseApi.getInventory({
        limit: 100,
        search: search || undefined,
        stock: stockFilter || undefined,
      });
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

  const cards = [
    { label: 'SKU Count', value: summary?.sku_count ?? 0 },
    { label: 'Available', value: summary?.available_stock ?? 0 },
    { label: 'Purchased', value: summary?.purchased_stock ?? 0 },
    { label: 'Sold', value: summary?.sold_stock ?? 0 },
    { label: 'Reserved', value: summary?.reserved_stock ?? 0 },
    { label: 'Low Stock', value: summary?.low_stock_products ?? 0 },
    { label: 'Out of Stock', value: summary?.out_of_stock_products ?? 0 },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Inventory</h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)' }}>
            Product-wise stock in your franchise warehouse
          </p>
        </div>
        <Link className="btn" to="/products">
          Buy Products
        </Link>
      </div>

      {!loading && summary ? (
        <div className="stat-grid">
          {cards.map((card) => (
            <div key={card.label} className="stat-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          placeholder="Search product name / SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <button type="submit" className="btn primary">
          Search
        </button>
      </form>

      {error ? <div className="alert error">{error}</div> : null}

      {loading ? (
        <p>Loading inventory...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Available</th>
                <th>Purchased</th>
                <th>Sold</th>
                <th>Reserved</th>
                <th>Returned</th>
                <th>Damaged</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={10}>No inventory found for your franchise.</td>
                </tr>
              ) : (
                list.map((item) => {
                  const thumb = item.images?.[0];
                  return (
                    <tr key={item.inventoryId || item.productId}>
                      <td>
                        <div className="inventory-product-cell">
                          {thumb ? (
                            <img src={mediaUrl(thumb)} alt="" className="inventory-thumb" />
                          ) : (
                            <div className="inventory-thumb placeholder" />
                          )}
                          <div>
                            <strong>{item.product_name}</strong>
                            <div className="muted-xs">ID #{item.productId}</div>
                          </div>
                        </div>
                      </td>
                      <td>{item.sku}</td>
                      <td>
                        <strong>{item.available_stock ?? 0}</strong>
                      </td>
                      <td>{item.purchased_stock ?? 0}</td>
                      <td>{item.sold_stock ?? 0}</td>
                      <td>{item.reserved_stock ?? 0}</td>
                      <td>{item.returned_stock ?? 0}</td>
                      <td>{item.damaged_stock ?? 0}</td>
                      <td>₹{Number(item.franchise_price || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <span className={statusClass(item.stock_status)}>
                          {statusLabel(item.stock_status)}
                        </span>
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
