import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { commerceApi } from '../../api';

const initial = {
  product_name: '',
  sku: '',
  categoryId: '',
  brandId: '',
  packageId: '',
  description: '',
  mrp: '',
  distributor_price: '',
  franchise_price: '',
  bv: '',
  gst: '',
  hsn_code: '',
  stock: '',
  weight: '',
  status: 'enabled',
  is_hidden: false,
};

export default function CreateProduct() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const onImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    try {
      const res = await commerceApi.uploadMedia(formData);
      const uploaded = res.data?.data?.images || [];
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload images');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await commerceApi.createProduct({
        ...form,
        categoryId: Number(form.categoryId),
        brandId: Number(form.brandId),
        packageId: Number(form.packageId),
        mrp: Number(form.mrp) || 0,
        distributor_price: Number(form.distributor_price) || 0,
        franchise_price: Number(form.franchise_price) || 0,
        bv: Number(form.bv) || 0,
        gst: Number(form.gst) || 0,
        stock: Number(form.stock) || 0,
        images,
      });
      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Add Product</h2>
          <p className="page-sub">Create a new catalog product</p>
        </div>
        <Link className="btn ghost" to="/products">
          Back
        </Link>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <form className="form-grid" onSubmit={onSubmit} style={{ maxWidth: 760 }}>
        <label>
          Product name
          <input name="product_name" value={form.product_name} onChange={onChange} required />
        </label>
        <label>
          SKU
          <input name="sku" value={form.sku} onChange={onChange} required />
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
          Initial stock
          <input name="stock" type="number" min="0" value={form.stock} onChange={onChange} />
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
        <label className="full">
          Images
          <input type="file" accept="image/*" multiple onChange={onImageUpload} />
          {images.length ? <p className="muted">{images.length} image(s) uploaded</p> : null}
        </label>
        <label>
          <input name="is_hidden" type="checkbox" checked={form.is_hidden} onChange={onChange} />
          {' '}Hide from buyers
        </label>
        <div className="form-actions full">
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Saving...' : 'Create product'}
          </button>
        </div>
      </form>
    </div>
  );
}
