import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { websiteApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const emptySlide = () => ({
  imageUrl: '',
  linkUrl: '',
  title: '',
  sortOrder: 0,
  status: 'active',
});

export default function HeroBackground() {
  const [slides, setSlides] = useState([]);
  const [legacyHero, setLegacyHero] = useState('');
  const [form, setForm] = useState(emptySlide());
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await websiteApi.getWebsiteContent();
      const data = res.data?.data || {};
      const list = Array.isArray(data.heroSlides) ? data.heroSlides : [];
      setLegacyHero(data.heroImage || '');
      // Migrate: if no slides but legacy image exists, show it as a virtual slide for editing
      if (list.length === 0 && data.heroImage) {
        setSlides([
          {
            _id: 'legacy',
            imageUrl: data.heroImage,
            linkUrl: '',
            title: '',
            sortOrder: 0,
            status: 'active',
          },
        ]);
      } else {
        setSlides(list);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load hero slides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(emptySlide());
    setEditingId(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const startEdit = (item) => {
    setEditingId(item._id || item.imageUrl);
    setForm({
      imageUrl: item.imageUrl || '',
      linkUrl: item.linkUrl || '',
      title: item.title || '',
      sortOrder: item.sortOrder || 0,
      status: item.status || 'active',
      _id: item._id && item._id !== 'legacy' ? item._id : undefined,
    });
  };

  const persistSlides = async (nextSlides) => {
    const payload = nextSlides
      .filter((s) => s._id !== 'legacy' || s.imageUrl)
      .map((s, i) => ({
        ...(s._id && s._id !== 'legacy' ? { _id: s._id } : {}),
        imageUrl: s.imageUrl,
        linkUrl: s.linkUrl || '',
        title: s.title || '',
        sortOrder: Number.isFinite(Number(s.sortOrder)) ? Number(s.sortOrder) : i,
        status: s.status === 'inactive' ? 'inactive' : 'active',
      }));
    await websiteApi.updateWebsiteContent({
      heroSlides: payload,
      heroImage: payload.find((s) => s.status === 'active')?.imageUrl || payload[0]?.imageUrl || '',
    });
    return payload;
  };

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await websiteApi.uploadWebsiteMedia(fd);
      const url = res.data?.data?.url;
      if (url) setField('imageUrl', url);
    } catch (err) {
      setError(err.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.imageUrl) {
      setError('Upload a slide image first.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let next;
      if (editingId) {
        next = slides.map((s) => {
          const id = s._id || s.imageUrl;
          if (id !== editingId) return s;
          return {
            ...s,
            imageUrl: form.imageUrl,
            linkUrl: form.linkUrl,
            title: form.title,
            sortOrder: form.sortOrder,
            status: form.status,
          };
        });
      } else {
        next = [
          ...slides.filter((s) => s._id !== 'legacy'),
          {
            imageUrl: form.imageUrl,
            linkUrl: form.linkUrl,
            title: form.title,
            sortOrder: form.sortOrder || slides.length,
            status: form.status,
          },
        ];
      }
      const saved = await persistSlides(next);
      setSlides(saved);
      setLegacyHero(saved[0]?.imageUrl || '');
      resetForm();
      setSuccess(
        editingId
          ? 'Slide updated. Theme homepage refreshes on next load.'
          : 'Slide added. Theme homepage auto-rotates active slides.'
      );
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save slide');
    } finally {
      setSaving(false);
    }
  };

  const removeSlide = async (item) => {
    if (!window.confirm('Remove this hero slide?')) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const next = slides.filter((s) => (s._id || s.imageUrl) !== (item._id || item.imageUrl));
      const saved = await persistSlides(next);
      setSlides(saved);
      setLegacyHero(saved[0]?.imageUrl || '');
      if (editingId === (item._id || item.imageUrl)) resetForm();
      setSuccess(saved.length ? 'Slide removed.' : 'All slides cleared — theme default image will show.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove slide');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item) => {
    setSaving(true);
    setError('');
    try {
      const next = slides.map((s) => {
        if ((s._id || s.imageUrl) !== (item._id || item.imageUrl)) return s;
        return { ...s, status: s.status === 'active' ? 'inactive' : 'active' };
      });
      const saved = await persistSlides(next);
      setSlides(saved);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p>Loading...</p>
      </div>
    );
  }

  const sorted = [...slides].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Hero Background</h2>
          <p className="page-sub">
            Homepage banner slider (16:9). Add multiple photos — they auto-rotate with animation. Each photo can
            open a link when clicked.
          </p>
        </div>
      </div>

      <div className="alert info banner-size-note">
        <strong>Image size:</strong>
        <span> Use 16:9 photos (e.g. 1920×1080). Wider/taller images are cropped to center.</span>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <form className="panel hero-bg-panel" onSubmit={save}>
        <h3>{editingId ? 'Edit slide' : 'Add slide'}</h3>
        <div className="form-grid">
          <label>
            Title (optional)
            <input
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Sea buckthorn hero"
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

          <div className="full hero-link-box">
            <div className="hero-link-box-head">
              <strong>Click link (optional)</strong>
              <span>Jab user is photo pe click kare, yeh page / URL khulegi</span>
            </div>
            <label className="hero-link-field">
              Link URL
              <input
                value={form.linkUrl}
                onChange={(e) => setField('linkUrl', e.target.value)}
                placeholder="/products   or   https://example.com"
                autoComplete="off"
              />
            </label>
            <div className="hero-link-presets" role="group" aria-label="Quick link presets">
              {[
                { label: 'Products', value: '/products' },
                { label: 'Packages', value: '/packages' },
                { label: 'Shop', value: '/shop' },
                { label: 'Contact', value: '/contact' },
                { label: 'No link', value: '' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={`btn ghost hero-link-preset${form.linkUrl === preset.value ? ' is-active' : ''}`}
                  onClick={() => setField('linkUrl', preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="muted hero-link-help">
              Internal: <code>/products</code>, <code>/packages</code>, <code>/shop</code> · External: full URL
              like <code>https://…</code> · Empty = photo not clickable
            </p>
          </div>

          <label className="full">
            Slide image (16:9 landscape, e.g. 1920×1080)
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={uploading}
              onChange={(e) => uploadImage(e.target.files?.[0])}
            />
            {uploading ? <small>Uploading…</small> : null}
          </label>
          {form.imageUrl ? (
            <div className="full hero-bg-preview-wrap">
              <img className="hero-bg-preview" src={mediaUrl(form.imageUrl)} alt="Slide preview" />
              <span className="hero-bg-badge custom">16:9 preview</span>
              {form.linkUrl ? (
                <span className="hero-bg-badge hero-bg-badge-link">Link: {form.linkUrl}</span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="form-actions hero-bg-actions">
          <button type="submit" className="btn primary" disabled={saving || uploading || !form.imageUrl}>
            {saving ? 'Saving…' : editingId ? 'Update slide' : 'Add slide'}
          </button>
          {editingId ? (
            <button type="button" className="btn ghost" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
          <Link className="btn ghost" to="/website/company">
            Company / Brand
          </Link>
        </div>
        <p className="muted hero-bg-hint">
          Recommended: 1920×1080 (16:9), JPEG or WebP, under 10&nbsp;MB. Multiple active slides create the
          homepage carousel.
        </p>
      </form>

      {sorted.length === 0 ? (
        <div className="panel">
          <p className="muted">
            No custom slides yet{legacyHero ? '' : ' — theme default hero image is used'}.
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Title</th>
                <th>Click link</th>
                <th>Sort</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={item._id || item.imageUrl}>
                  <td>
                    <div className="banner-admin-thumb">
                      <img src={mediaUrl(item.imageUrl)} alt={item.title || 'Hero slide'} />
                    </div>
                  </td>
                  <td>{item.title || '—'}</td>
                  <td>
                    {item.linkUrl ? (
                      <a
                        className="hero-bg-link-cell is-set"
                        href={
                          /^https?:\/\//i.test(item.linkUrl)
                            ? item.linkUrl
                            : undefined
                        }
                        target={/^https?:\/\//i.test(item.linkUrl) ? '_blank' : undefined}
                        rel="noreferrer"
                        onClick={(e) => {
                          if (!/^https?:\/\//i.test(item.linkUrl)) e.preventDefault();
                        }}
                      >
                        {item.linkUrl}
                      </a>
                    ) : (
                      <span className="hero-bg-link-cell is-empty">No link</span>
                    )}
                  </td>
                  <td>{item.sortOrder}</td>
                  <td>
                    <span className={`badge ${item.status === 'active' ? 'ok' : 'warn'}`}>{item.status}</span>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn ghost" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button type="button" className="btn" disabled={saving} onClick={() => toggleStatus(item)}>
                      {item.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" className="btn" disabled={saving} onClick={() => removeSlide(item)}>
                      Remove
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
