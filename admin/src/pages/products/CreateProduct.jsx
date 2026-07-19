import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { commerceApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

const empty = {
  product_name: '',
  sku: '',
  categoryId: 1,
  brandId: 1,
  packageId: 1,
  description: '',
  ingredients: '',
  benefitsText: '',
  nutrition_facts: '',
  directions: '',
  storage: '',
  manufacturing_details: '',
  mrp: 0,
  distributor_price: 0,
  franchise_price: 0,
  gst: 0,
  stock: 0,
  weight: '',
  status: 'enabled',
  is_hidden: false,
  images: [],
  videos: [],
};

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function parseBenefits(text) {
  return String(text || '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function CreateProduct() {
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onChange = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const uploadFiles = async (fileList, kind) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      files.forEach((file) => fd.append('files', file));
      const res = await commerceApi.uploadMedia(fd);
      const data = res.data?.data || {};
      if (kind === 'image') {
        const next = data.images?.length ? data.images : (data.urls || []).filter((u) => !/\.(mp4|webm)$/i.test(u));
        setForm((f) => ({ ...f, images: [...(f.images || []), ...next] }));
      } else {
        const next = data.videos?.length ? data.videos : (data.urls || []).filter((u) => /\.(mp4|webm)$/i.test(u));
        setForm((f) => ({ ...f, videos: [...(f.videos || []), ...next] }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (key, index) => {
    setForm((f) => ({
      ...f,
      [key]: (f[key] || []).filter((_, i) => i !== index),
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await commerceApi.createProduct({
        product_name: form.product_name,
        sku: form.sku,
        categoryId: Number(form.categoryId),
        brandId: Number(form.brandId),
        packageId: Number(form.packageId),
        description: form.description,
        ingredients: form.ingredients,
        benefits: parseBenefits(form.benefitsText),
        nutrition_facts: form.nutrition_facts,
        directions: form.directions,
        storage: form.storage,
        manufacturing_details: form.manufacturing_details,
        mrp: Number(form.mrp),
        distributor_price: Number(form.distributor_price),
        franchise_price: Number(form.franchise_price),
        gst: Number(form.gst),
        stock: Number(form.stock),
        weight: form.weight,
        status: form.status,
        is_hidden: form.is_hidden,
        images: form.images || [],
        videos: form.videos || [],
      });
      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>Add Product</h2>
        <Link className="btn ghost" to="/products">
          Back
        </Link>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      <form className="form-grid commerce-form" onSubmit={onSubmit}>
        <label>
          Name
          <input required value={form.product_name} onChange={onChange('product_name')} />
        </label>
        <label>
          SKU
          <input required value={form.sku} onChange={onChange('sku')} />
        </label>
        <label>
          Category ID
          <input required type="number" value={form.categoryId} onChange={onChange('categoryId')} />
        </label>
        <label>
          Brand ID
          <input required type="number" value={form.brandId} onChange={onChange('brandId')} />
        </label>
        <label>
          Package ID
          <input required type="number" value={form.packageId} onChange={onChange('packageId')} />
        </label>
        <label>
          Weight
          <input value={form.weight} onChange={onChange('weight')} />
        </label>
        <label>
          MRP
          <input type="number" min="0" value={form.mrp} onChange={onChange('mrp')} />
        </label>
        <label>
          Distributor price
          <input type="number" min="0" value={form.distributor_price} onChange={onChange('distributor_price')} />
        </label>
        <label>
          Franchise price
          <input type="number" min="0" value={form.franchise_price} onChange={onChange('franchise_price')} />
        </label>
        <label>
          GST %
          <input type="number" min="0" value={form.gst} onChange={onChange('gst')} />
        </label>
        <label>
          Initial stock
          <input type="number" min="0" value={form.stock} onChange={onChange('stock')} />
        </label>
        <label>
          Status
          <select value={form.status} onChange={onChange('status')}>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>

        <label className="full">
          Description
          <textarea rows={4} value={form.description} onChange={onChange('description')} />
        </label>
        <label className="full">
          Benefits (one per line or comma-separated)
          <textarea rows={3} value={form.benefitsText} onChange={onChange('benefitsText')} />
        </label>
        <label className="full">
          Ingredients
          <textarea rows={3} value={form.ingredients} onChange={onChange('ingredients')} />
        </label>
        <label className="full">
          Directions / How to use
          <textarea rows={3} value={form.directions} onChange={onChange('directions')} />
        </label>
        <label className="full">
          Storage
          <textarea rows={2} value={form.storage} onChange={onChange('storage')} />
        </label>
        <label className="full">
          Nutrition facts
          <textarea rows={3} value={form.nutrition_facts} onChange={onChange('nutrition_facts')} />
        </label>
        <label className="full">
          Manufacturing details
          <textarea rows={2} value={form.manufacturing_details} onChange={onChange('manufacturing_details')} />
        </label>

        <div className="full media-upload-block">
          <h3>Product images</h3>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            disabled={uploading}
            onChange={(e) => {
              uploadFiles(e.target.files, 'image');
              e.target.value = '';
            }}
          />
          <div className="media-preview-grid">
            {(form.images || []).map((url, i) => (
              <div className="media-preview-item" key={`${url}-${i}`}>
                <img src={mediaUrl(url)} alt={`Product ${i + 1}`} />
                <button type="button" className="btn ghost" onClick={() => removeMedia('images', i)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="full media-upload-block">
          <h3>Product videos</h3>
          <input
            type="file"
            accept="video/mp4,video/webm"
            multiple
            disabled={uploading}
            onChange={(e) => {
              uploadFiles(e.target.files, 'video');
              e.target.value = '';
            }}
          />
          <div className="media-preview-grid">
            {(form.videos || []).map((url, i) => (
              <div className="media-preview-item" key={`${url}-${i}`}>
                <video src={mediaUrl(url)} controls muted />
                <button type="button" className="btn ghost" onClick={() => removeMedia('videos', i)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <label className="check">
          <input type="checkbox" checked={form.is_hidden} onChange={onChange('is_hidden')} />
          Hidden from buyers
        </label>
        <div className="form-actions full">
          <button type="submit" className="btn primary" disabled={saving || uploading}>
            {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Create product'}
          </button>
        </div>
      </form>
    </div>
  );
}
