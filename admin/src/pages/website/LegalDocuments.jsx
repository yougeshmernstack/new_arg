import { useEffect, useState } from 'react';
import { websiteApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const emptyDoc = () => ({
  title: '',
  slug: '',
  summary: '',
  fileUrl: '',
  sortOrder: 0,
  status: 'active',
});

export default function LegalDocuments() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyDoc());
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
      const res = await websiteApi.getLegalDocuments();
      setList(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load legal documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(emptyDoc());
    setEditingId(null);
  };

  const startEdit = (doc) => {
    setEditingId(doc.documentId);
    setForm({
      title: doc.title || '',
      slug: doc.slug || '',
      summary: doc.summary || '',
      fileUrl: doc.fileUrl || '',
      sortOrder: doc.sortOrder || 0,
      status: doc.status || 'active',
    });
  };

  const uploadPdf = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await websiteApi.uploadLegalPdf(fd);
      const url = res.data?.data?.url;
      if (url) setField('fileUrl', url);
    } catch (err) {
      setError(err.response?.data?.message || 'PDF upload failed');
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
        await websiteApi.updateLegalDocument({ documentId: editingId, ...form });
        setSuccess('Legal document updated.');
      } else {
        await websiteApi.createLegalDocument(form);
        setSuccess('Legal document created.');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (doc) => {
    setBusyId(doc.documentId);
    setError('');
    try {
      await websiteApi.toggleLegalDocumentStatus({ documentId: doc.documentId });
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
        <h2>Legal documents</h2>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <form className="panel" onSubmit={save}>
        <h3>{editingId ? `Edit document #${editingId}` : 'Add legal document'}</h3>
        <div className="form-grid">
          <label>
            Title
            <input value={form.title} onChange={(e) => setField('title', e.target.value)} required />
          </label>
          <label>
            Slug
            <input
              value={form.slug}
              onChange={(e) => setField('slug', e.target.value)}
              placeholder="privacy-policy"
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
            Summary
            <textarea rows={2} value={form.summary} onChange={(e) => setField('summary', e.target.value)} />
          </label>
          <label className="full">
            PDF file
            <input
              type="file"
              accept="application/pdf"
              disabled={uploading}
              onChange={(e) => uploadPdf(e.target.files?.[0])}
            />
            {form.fileUrl ? (
              <a href={mediaUrl(form.fileUrl)} target="_blank" rel="noreferrer">
                View current PDF
              </a>
            ) : null}
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={saving || !form.fileUrl}>
            {saving ? 'Saving...' : editingId ? 'Update document' : 'Create document'}
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
        <p>No legal documents yet. Upload Privacy, Terms, Shipping, Refund PDFs.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Slug</th>
                <th>Order</th>
                <th>Status</th>
                <th>PDF</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((doc) => (
                <tr key={doc.documentId}>
                  <td>{doc.documentId}</td>
                  <td>{doc.title}</td>
                  <td>{doc.slug}</td>
                  <td>{doc.sortOrder}</td>
                  <td>{doc.status}</td>
                  <td>
                    {doc.fileUrl ? (
                      <a href={mediaUrl(doc.fileUrl)} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="actions">
                    <button type="button" className="btn" onClick={() => startEdit(doc)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={busyId === doc.documentId}
                      onClick={() => toggleStatus(doc)}
                    >
                      {doc.status === 'active' ? 'Deactivate' : 'Activate'}
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
