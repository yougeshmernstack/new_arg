import { useEffect, useState } from 'react';
import { websiteApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const emptyRow = (sortOrder = 0) => ({
  name: '',
  location: '',
  quote: '',
  rating: 5,
  photoUrl: '',
  status: 'active',
  sortOrder,
});

export default function ReviewsTestimonials() {
  const [rows, setRows] = useState([emptyRow(0)]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await websiteApi.getWebsiteContent();
      const list = Array.isArray(res.data?.data?.testimonials)
        ? res.data.data.testimonials
        : [];
      const mapped = list
        .slice()
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map((t, i) => ({
          _id: t._id,
          name: t.name || '',
          location: t.location || '',
          quote: t.quote || '',
          rating: Number(t.rating) || 5,
          photoUrl: t.photoUrl || '',
          status: t.status === 'inactive' ? 'inactive' : 'active',
          sortOrder: Number.isFinite(Number(t.sortOrder)) ? Number(t.sortOrder) : i,
        }));
      setRows(mapped.length ? mapped : [emptyRow(0)]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRow = (index, key, value) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow(prev.length)]);
  };

  const removeRow = (index) => {
    setRows((prev) => {
      if (prev.length <= 1) return [emptyRow(0)];
      return prev.filter((_, i) => i !== index).map((row, i) => ({ ...row, sortOrder: i }));
    });
  };

  const uploadPhoto = async (index, file) => {
    if (!file) return;
    setUploadingIndex(index);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await websiteApi.uploadWebsiteMedia(fd);
      const url = res.data?.data?.url;
      if (url) updateRow(index, 'photoUrl', url);
    } catch (err) {
      setError(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setUploadingIndex(null);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = rows
        .map((row, i) => ({
          ...row,
          sortOrder: i,
          rating: Math.min(5, Math.max(1, Number(row.rating) || 5)),
        }))
        .filter((row) => row.name.trim() || row.quote.trim());

      await websiteApi.updateWebsiteContent({ testimonials: payload });
      setSuccess('Reviews & testimonials saved.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
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

  return (
    <div className="page">
      <div className="page-head">
        <h2>Reviews &amp; Testimonials</h2>
        <p className="page-sub">
          Customer reviews shown on the public website (/reviews) and linked from the footer.
        </p>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <form className="panel" onSubmit={save}>
        <div className="form-actions" style={{ marginBottom: '1rem' }}>
          <button type="button" className="btn" onClick={addRow}>
            Add review
          </button>
        </div>

        <div className="founder-grid">
          {rows.map((row, index) => (
            <div className="founder-card" key={row._id || `review-${index}`}>
              <div className="form-actions" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0 }}>Review {index + 1}</h4>
                <button type="button" className="btn ghost" onClick={() => removeRow(index)}>
                  Remove
                </button>
              </div>

              <label>
                Name
                <input
                  value={row.name}
                  onChange={(e) => updateRow(index, 'name', e.target.value)}
                  placeholder="Customer name"
                  required={Boolean(row.quote.trim())}
                />
              </label>

              <label>
                Location
                <input
                  value={row.location}
                  onChange={(e) => updateRow(index, 'location', e.target.value)}
                  placeholder="City"
                />
              </label>

              <label>
                Rating (1–5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={1}
                  value={row.rating}
                  onChange={(e) => updateRow(index, 'rating', Number(e.target.value) || 5)}
                />
              </label>

              <label>
                Status
                <select
                  value={row.status}
                  onChange={(e) => updateRow(index, 'status', e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <label>
                Quote / review
                <textarea
                  rows={4}
                  value={row.quote}
                  onChange={(e) => updateRow(index, 'quote', e.target.value)}
                  placeholder="What they said..."
                />
              </label>

              <label>
                Photo (optional)
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingIndex === index}
                  onChange={(e) => uploadPhoto(index, e.target.files?.[0])}
                />
              </label>
              {row.photoUrl ? (
                <img
                  className="preview-thumb"
                  src={mediaUrl(row.photoUrl)}
                  alt={row.name || 'Reviewer'}
                />
              ) : null}
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button type="button" className="btn" onClick={addRow}>
            Add review
          </button>
          <button type="submit" className="btn primary" disabled={saving || uploadingIndex !== null}>
            {saving ? 'Saving...' : 'Save reviews'}
          </button>
        </div>
      </form>
    </div>
  );
}
