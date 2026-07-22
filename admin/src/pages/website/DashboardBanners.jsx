import { useEffect, useState } from 'react';
import { websiteApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

const BANNER_WIDTH = 1200;
const BANNER_HEIGHT = 360;

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const emptyBanner = () => ({
  title: '',
  imageUrl: '',
  linkUrl: '',
  sortOrder: 0,
  status: 'active',
});

export default function DashboardBanners() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyBanner());
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await websiteApi.getDashboardBanners();
      setList(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(emptyBanner());
    setEditingId(null);
  };

  const startEdit = (item) => {
    setEditingId(item.bannerId);
    setForm({
      title: item.title || '',
      imageUrl: item.imageUrl || '',
      linkUrl: item.linkUrl || '',
      sortOrder: item.sortOrder || 0,
      status: item.status || 'active',
    });
  };

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await websiteApi.uploadDashboardBanner(fd);
      const url = res.data?.data?.url;
      if (url) setField('imageUrl', url);
    } catch (err) {
      setError(err.response?.data?.message || 'Banner upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editingId) {
        await websiteApi.updateDashboardBanner({ bannerId: editingId, ...form });
        setSuccess('Banner updated.');
      } else {
        await websiteApi.createDashboardBanner(form);
        setSuccess('Banner created.');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item) => {
    setBusyId(item.bannerId);
    setError('');
    try {
      await websiteApi.toggleDashboardBannerStatus({ bannerId: item.bannerId });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>Dashboard banners</h2>
        <p className="page-sub">Slides shown on the distributor dashboard (auto-rotating).</p>
      </div>

      <div className="alert info banner-size-note">
        <strong>Required image size:</strong> {BANNER_WIDTH} × {BANNER_HEIGHT} px
        <span>
          {' '}
          (JPEG / PNG / WEBP / GIF, max 10 MB). Upload exactly this size for a sharp, full-bleed slide.
          Aspect ratio {BANNER_WIDTH}:{BANNER_HEIGHT} ({(BANNER_WIDTH / BANNER_HEIGHT).toFixed(2)}:1).
        </span>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <form className="panel" onSubmit={save}>
        <h3>{editingId ? `Edit banner #${editingId}` : 'Add banner'}</h3>
        <div className="form-grid">
          <label>
            Title (optional)
            <input
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Festival offer"
            />
          </label>
          <label>
            Link URL (optional)
            <input
              value={form.linkUrl}
              onChange={(e) => setField('linkUrl', e.target.value)}
              placeholder="https://… or /packages"
            />
          </label>
          <label>
            Sort order
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setField('sortOrder', Number(e.target.value) || 0)}
            />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="full">
            Banner image ({BANNER_WIDTH}×{BANNER_HEIGHT} px)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={uploading}
              onChange={(e) => uploadImage(e.target.files?.[0])}
            />
            {uploading ? <small>Uploading…</small> : null}
          </label>
          {form.imageUrl ? (
            <div className="full banner-admin-preview-wrap">
              <span className="banner-admin-preview-label">Preview ({BANNER_WIDTH}×{BANNER_HEIGHT})</span>
              <div className="banner-admin-preview">
                <img src={mediaUrl(form.imageUrl)} alt={form.title || 'Banner preview'} />
              </div>
            </div>
          ) : null}
        </div>
        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={saving || uploading || !form.imageUrl}>
            {saving ? 'Saving...' : editingId ? 'Update banner' : 'Create banner'}
          </button>
          {editingId ? (
            <button type="button" className="btn ghost" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : list.length === 0 ? (
        <p>No banners yet. Upload {BANNER_WIDTH}×{BANNER_HEIGHT} images to show on the distributor dashboard.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Preview</th>
                <th>Title</th>
                <th>Sort</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.bannerId}>
                  <td>{item.bannerId}</td>
                  <td>
                    <div className="banner-admin-thumb">
                      <img src={mediaUrl(item.imageUrl)} alt={item.title || `Banner ${item.bannerId}`} />
                    </div>
                  </td>
                  <td>{item.title || '—'}</td>
                  <td>{item.sortOrder}</td>
                  <td>
                    <span className={`badge ${item.status === 'active' ? 'ok' : 'warn'}`}>{item.status}</span>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn ghost" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={busyId === item.bannerId}
                      onClick={() => toggleStatus(item)}
                    >
                      {item.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
