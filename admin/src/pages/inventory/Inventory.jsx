import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { commerceApi } from '../../api';

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

  const statusLabel = (status) => {
    if (status === 'out') return 'Out of stock';
    if (status === 'low') return 'Low';
    return 'OK';
  };

  const cards = [
    { label: 'Products', value: summary?.products ?? 0 },
    { label: 'Remaining Stock', value: summary?.remaining_units ?? 0 },
    { label: 'Delivered', value: summary?.delivered_units ?? 0 },
    { label: 'In Pipeline', value: summary?.in_pipeline_units ?? 0 },
    { label: 'Low Stock', value: summary?.low_stock_products ?? 0 },
    { label: 'Out of Stock', value: summary?.out_of_stock_products ?? 0 },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <h2>Inventory</h2>
        <Link className="btn" to="/stock-history">
          Stock History
        </Link>
      </div>

      {!loading && summary ? (
        <div className="stat-grid" style={{ marginBottom: 16 }}>
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

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Remaining</th>
                <th>Delivered</th>
                <th>In Pipeline</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8}>No inventory found</td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.productId}</td>
                    <td>
                      {item.product_name}
                      {item.is_hidden ? ' (hidden)' : ''}
                    </td>
                    <td>{item.sku}</td>
                    <td>
                      <strong>{item.remaining_stock}</strong>
                    </td>
                    <td>{item.delivered_qty}</td>
                    <td>{item.in_pipeline_qty}</td>
                    <td>{statusLabel(item.stock_status)}</td>
                    <td>
                      <Link className="btn ghost" to={`/stock-history?productId=${item.productId}`}>
                        History
                      </Link>
                      <Link className="btn ghost" to={`/products/${item.productId}/edit`}>
                        Edit
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
