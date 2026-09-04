import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { websiteApi } from '../../api';

const FIELDS = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourpage' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/yourhandle' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourpage' },
  { key: 'google', label: 'Google / Business', placeholder: 'https://g.page/yourbusiness' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/919999999999' },
];

const emptyLinks = () =>
  FIELDS.reduce((acc, f) => {
    acc[f.key] = '';
    return acc;
  }, {});

export default function SocialMedia() {
  const [links, setLinks] = useState(emptyLinks());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await websiteApi.getWebsiteContent();
      const data = res.data?.data?.socialLinks || {};
      setLinks({
        ...emptyLinks(),
        facebook: data.facebook || '',
        instagram: data.instagram || '',
        youtube: data.youtube || '',
        twitter: data.twitter || '',
        linkedin: data.linkedin || '',
        google: data.google || '',
        whatsapp: data.whatsapp || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load social links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (key, value) => setLinks((prev) => ({ ...prev, [key]: value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await websiteApi.updateWebsiteContent({ socialLinks: links });
      setSuccess('Social links saved. They appear in email templates (and site footer).');
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
        <div>
          <h2>Social Media</h2>
          <p className="page-sub">
            Add your public profile URLs. Filled links show as icons in email footers (welcome, OTP, order,
            invoice).
          </p>
        </div>
      </div>

      <div className="alert info banner-size-note">
        <strong>Tip:</strong>
        <span> Leave a field empty to hide that icon. Use full https:// links.</span>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <form className="panel hero-bg-panel" onSubmit={save}>
        <div className="form-grid">
          {FIELDS.map((field) => (
            <label key={field.key} className="full">
              {field.label}
              <input
                type="url"
                value={links[field.key]}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                autoComplete="off"
              />
            </label>
          ))}
        </div>

        <div className="form-actions hero-bg-actions">
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save social links'}
          </button>
          <Link className="btn ghost" to="/website/company">
            Company / Brand
          </Link>
        </div>
      </form>
    </div>
  );
}
