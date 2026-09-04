import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { commerceApi } from '../../api';

export default function EditProduct() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [currentStock, setCurrentStock] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stockSaving, setStockSaving] = useState(false);
  const [error, setError] = useState('');
  const [stockMessage, setStockMessage] = useState('');
  const [stockForm, setStockForm] = useState({ action: 'increase', quantity: 1, remark: '' });

  const loadProduct = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await commerceApi.getProduct(productId);
      const p = res.data?.data;
      setForm({
        product_name: p.product_name || '',
        sku: p.sku || '',
        categoryId: p.categoryId ?? '',
        brandId: p.brandId ?? '',
        packageId: p.packageId ?? '',
        description: p.description || '',
        mrp: p.mrp ?? '',
        distributor_price: p.distributor_price ?? '',
        franchise_price: p.franchise_price ?? '',
        bv: p.bv ?? '',
        gst: p.gst ?? '',
        hsn_code: p.hsn_code || '',
        weight: p.weight || '',
        status: p.status || 'enabled',
        is_hidden: Boolean(p.is_hidden),
      });
      setCurrentStock(Number(p.stock) || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await commerceApi.updateProduct({
        productId: Number(productId),
        ...form,
        categoryId: Number(form.categoryId),
        brandId: Number(form.brandId),
        packageId: Number(form.packageId),
        mrp: Number(form.mrp) || 0,
        distributor_price: Number(form.distributor_price) || 0,
        franchise_price: Number(form.franchise_price) || 0,
        bv: Number(form.bv) || 0,
        gst: Number(form.gst) || 0,
      });
      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const onStockSubmit = async (e) => {
    e.preventDefault();
    setStockSaving(true);
    setError('');
    setStockMessage('');
    try {
      const res = await commerceApi.updateStock({
        productId: Number(productId),
        action: stockForm.action,
        quantity: Number(stockForm.quantity),
        remark: stockForm.remark,
      });
      const next = res.data?.data?.product?.stock;
      setCurrentStock(Number.isFinite(next) ? next : currentStock);
      setStockMessage('Stock updated successfully.');
      setStockForm({ action: 'increase', quantity: 1, remark: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update stock');
    } finally {
      setStockSaving(false);
    }
  };

  if (loading) return <div className="page">Loading product...</div>;
  if (!form) return <div className="page alert error">{error || 'Product not found'}</div>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Edit Product #{productId}</h2>
          <p className="page-sub">SKU: {form.sku} · Current stock: {currentStock}</p>
        </div>
        <Link className="btn ghost" to="/products">
          Back
        </Link>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {stockMessage ? <div className="alert success">{stockMessage}</div> : null}

      <section className="panel" style={{ maxWidth: 760, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Add / Reduce Stock</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Current available stock: <strong>{currentStock}</strong>
        </p>
        <form className="form-grid" onSubmit={onStockSubmit}>
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
          <label className="full">
            Remark (optional)
            <input
              placeholder="e.g. Warehouse receipt / damaged goods"
              value={stockForm.remark}
              onChange={(e) => setStockForm((s) => ({ ...s, remark: e.target.value }))}
            />
          </label>
          <div className="form-actions full">
            <button type="submit" className="btn primary" disabled={stockSaving}>
              {stockSaving ? 'Updating...' : 'Update Stock'}
            </button>
            <Link className="btn ghost" to={`/stock-history?productId=${productId}`}>
              View History
            </Link>
          </div>
        </form>
      </section>

      <form className="form-grid" onSubmit={onSubmit} style={{ maxWidth: 760 }}>
        <h3 className="full" style={{ margin: 0 }}>
          Product details
        </h3>
        <label>
          Product name
          <input name="product_name" value={form.product_name} onChange={onChange} required />
        </label>
        <label>
          Category ID
          <input name="categoryId" type="number" min="1" value={form.categoryId} onChange={onChange} required />
        </label>
        <label>
          Brand ID
          <input name="brandId" type="number" min="1" value={form.brandId} onChange={onChange} required />
        </label>
        <label>
          Package ID
          <input name="packageId" type="number" min="1" value={form.packageId} onChange={onChange} required />
        </label>
        <label>
          MRP
          <input name="mrp" type="number" min="0" step="0.01" value={form.mrp} onChange={onChange} />
        </label>
        <label>
          Distributor price
          <input name="distributor_price" type="number" min="0" step="0.01" value={form.distributor_price} onChange={onChange} />
        </label>
        <label>
          Franchise price
          <input name="franchise_price" type="number" min="0" step="0.01" value={form.franchise_price} onChange={onChange} />
        </label>
        <label>
          BV
          <input name="bv" type="number" min="0" step="0.01" value={form.bv} onChange={onChange} />
        </label>
        <label>
          GST %
          <input name="gst" type="number" min="0" step="0.01" value={form.gst} onChange={onChange} />
        </label>
        <label>
          HSN Code
          <input name="hsn_code" value={form.hsn_code} onChange={onChange} placeholder="e.g. 2009" />
        </label>
        <label>
          Weight
          <input name="weight" value={form.weight} onChange={onChange} />
        </label>
        <label>
          Status
          <select name="status" value={form.status} onChange={onChange}>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <label className="full">
          Description
          <textarea name="description" rows={4} value={form.description} onChange={onChange} />
        </label>
        <label>
          <input name="is_hidden" type="checkbox" checked={form.is_hidden} onChange={onChange} />
          {' '}Hide from buyers
        </label>
        <div className="form-actions full">
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
