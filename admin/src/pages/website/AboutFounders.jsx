import { useEffect, useState } from 'react';
import { websiteApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const emptyFounder = () => ({ name: '', role: '', bio: '', photoUrl: '' });

export default function AboutFounders() {
  const [howItWasBuilt, setHowItWasBuilt] = useState('');
  const [aboutExtended, setAboutExtended] = useState(['', '', '']);
  const [founders, setFounders] = useState([emptyFounder(), emptyFounder()]);
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
      const data = res.data?.data || {};
      setHowItWasBuilt(data.howItWasBuilt || '');
      const paragraphs = Array.isArray(data.aboutExtended) ? data.aboutExtended : [];
      setAboutExtended([paragraphs[0] || '', paragraphs[1] || '', paragraphs[2] || '']);
      const list = Array.isArray(data.founders) ? data.founders : [];
      setFounders([
        {
          name: list[0]?.name || '',
          role: list[0]?.role || '',
          bio: list[0]?.bio || '',
          photoUrl: list[0]?.photoUrl || '',
        },
        {
          name: list[1]?.name || '',
          role: list[1]?.role || '',
          bio: list[1]?.bio || '',
          photoUrl: list[1]?.photoUrl || '',
        },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load about content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateFounder = (index, key, value) => {
    setFounders((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
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
      if (url) updateFounder(index, 'photoUrl', url);
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
      await websiteApi.updateWebsiteContent({
        howItWasBuilt,
        aboutExtended: aboutExtended.filter((p) => p.trim()),
        founders,
      });
      setSuccess('About & founders saved.');
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
        <h2>About &amp; Founders</h2>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <form className="panel" onSubmit={save}>
        <h3>Company story</h3>
        <label>
          How the company was built
          <textarea
            rows={5}
            value={howItWasBuilt}
            onChange={(e) => setHowItWasBuilt(e.target.value)}
            placeholder="Tell the founding story..."
          />
        </label>

        <h3>About paragraphs</h3>
        {aboutExtended.map((paragraph, index) => (
          <label key={`about-${index}`}>
            Paragraph {index + 1}
            <textarea
              rows={3}
              value={paragraph}
              onChange={(e) =>
                setAboutExtended((rows) => rows.map((p, i) => (i === index ? e.target.value : p)))
              }
            />
          </label>
        ))}

        <h3>Founders (2 people)</h3>
        <div className="founder-grid">
          {founders.map((founder, index) => (
            <div className="founder-card" key={`founder-${index}`}>
              <h4>Person {index + 1}</h4>
              <label>
                Name
                <input
                  value={founder.name}
                  onChange={(e) => updateFounder(index, 'name', e.target.value)}
                />
              </label>
              <label>
                Role / title
                <input
                  value={founder.role}
                  onChange={(e) => updateFounder(index, 'role', e.target.value)}
                />
              </label>
              <label>
                Bio
                <textarea
                  rows={4}
                  value={founder.bio}
                  onChange={(e) => updateFounder(index, 'bio', e.target.value)}
                />
              </label>
              <label>
                Photo
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingIndex === index}
                  onChange={(e) => uploadPhoto(index, e.target.files?.[0])}
                />
              </label>
              {founder.photoUrl ? (
                <img className="preview-thumb" src={mediaUrl(founder.photoUrl)} alt={founder.name || 'Founder'} />
              ) : null}
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save about & founders'}
          </button>
        </div>
      </form>
    </div>
  );
}
