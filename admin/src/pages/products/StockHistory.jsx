import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { commerceApi } from '../../api';
import { exportToExcel, formatExcelDate } from '../../utils/exportExcel';

export default function StockHistory() {
  const [params] = useSearchParams();
  const productId = params.get('productId') || '';
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterId, setFilterId] = useState(productId);

  const load = async (pid = filterId) => {
    setLoading(true);
    setError('');
    try {
      const res = await commerceApi.getStockHistory({
        productId: pid || undefined,
        limit: 100,
      });
      setList(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load stock history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return (
    <div className="page">
      <div className="page-head">
        <h2>Stock History</h2>
        <button
          type="button"
          className="btn"
          disabled={loading || !list.length}
          onClick={() =>
            exportToExcel({
              filename: 'stock_history',
              sheetName: 'Stock History',
              rows: list,
              columns: [
                { header: 'ID', value: (r) => r.historyId ?? '' },
                { header: 'Product ID', value: (r) => r.productId ?? '' },
                { header: 'SKU', value: (r) => r.sku || '' },
                { header: 'Action', value: (r) => r.action || '' },
                { header: 'Qty', value: (r) => r.quantity ?? '' },
                { header: 'Previous', value: (r) => r.previous_available ?? '' },
                { header: 'New', value: (r) => r.new_available ?? '' },
                {
                  header: 'Reference',
                  value: (r) => `${r.reference_type || ''} ${r.reference_id || ''}`.trim(),
                },
                { header: 'Remark', value: (r) => r.remark || '' },
                { header: 'Date', value: (r) => formatExcelDate(r.created_date) },
              ],
            })
          }
        >
          Export Excel
        </button>
      </div>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <input
          placeholder="Filter by product ID"
          value={filterId}
          onChange={(e) => setFilterId(e.target.value)}
        />
        <button type="submit" className="btn">
          Filter
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
                <th>Action</th>
                <th>Qty</th>
                <th>Previous</th>
                <th>New</th>
                <th>Reference</th>
                <th>Remark</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={10}>No history found</td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item._id || item.historyId}>
                    <td>{item.historyId}</td>
                    <td>{item.productId}</td>
                    <td>{item.sku}</td>
                    <td>{item.action}</td>
                    <td>{item.quantity}</td>
                    <td>{item.previous_available}</td>
                    <td>{item.new_available}</td>
                    <td>
                      {item.reference_type} {item.reference_id}
                    </td>
                    <td>{item.remark}</td>
                    <td>{item.created_date ? new Date(item.created_date).toLocaleString() : '—'}</td>
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
