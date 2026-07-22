import { useEffect, useState } from 'react';
import { websiteApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const emptyLabel = () => ({ label: '', description: '' });
const emptyOffering = () => ({ title: '', description: '' });

export default function CompanyBrand() {
  const [form, setForm] = useState({
    name: '',
    shortName: '',
    tagline: '',
    motto: '',
    slogan: '',
    subSlogan: '',
    description: '',
    about: '',
    mission: '',
    vision: '',
    commitment: '',
    logo: '',
    heroImage: '',
    contact: {
      phone: '',
      email: '',
      website: '',
      hours: '',
      address: '',
      supportNote: '',
    },
    values: [emptyLabel()],
    pillars: [emptyLabel()],
    features: [emptyLabel()],
    offerings: [emptyOffering()],
    assurances: [],
    benefits: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await websiteApi.getWebsiteContent();
      const data = res.data?.data || {};
      setForm({
        name: data.name || '',
        shortName: data.shortName || '',
        tagline: data.tagline || '',
        motto: data.motto || '',
        slogan: data.slogan || '',
        subSlogan: data.subSlogan || '',
        description: data.description || '',
        about: data.about || '',
        mission: data.mission || '',
        vision: data.vision || '',
        commitment: data.commitment || '',
        logo: data.logo || '',
        heroImage: data.heroImage || '',
        contact: {
          phone: data.contact?.phone || '',
          email: data.contact?.email || '',
          website: data.contact?.website || '',
          hours: data.contact?.hours || '',
          address: data.contact?.address || '',
          supportNote: data.contact?.supportNote || '',
        },
        values: data.values?.length ? data.values : [emptyLabel()],
        pillars: data.pillars?.length ? data.pillars : [emptyLabel()],
        features: data.features?.length ? data.features : [emptyLabel()],
        offerings: data.offerings?.length ? data.offerings : [emptyOffering()],
        assurances: data.assurances || [],
        benefits: data.benefits || [],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load website content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setContact = (key, value) =>
    setForm((prev) => ({ ...prev, contact: { ...prev.contact, [key]: value } }));

  const uploadImage = async (field, file) => {
    if (!file) return;
    setUploading(field);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await websiteApi.uploadWebsiteMedia(fd);
      const url = res.data?.data?.url;
      if (url) setField(field, url);
    } catch (err) {
      setError(err.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading('');
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await websiteApi.updateWebsiteContent(form);
      setSuccess('Company / brand details saved.');
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
        <h2>Company / Brand</h2>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <form className="panel" onSubmit={save}>
        <h3>Branding</h3>
        <div className="form-grid">
          <label>
            Company name
            <input value={form.name} onChange={(e) => setField('name', e.target.value)} required />
          </label>
          <label>
            Short name
            <input value={form.shortName} onChange={(e) => setField('shortName', e.target.value)} />
          </label>
          <label>
            Tagline
            <input value={form.tagline} onChange={(e) => setField('tagline', e.target.value)} />
          </label>
          <label>
            Motto
            <input value={form.motto} onChange={(e) => setField('motto', e.target.value)} />
          </label>
          <label>
            Slogan
            <input value={form.slogan} onChange={(e) => setField('slogan', e.target.value)} />
          </label>
          <label>
            Sub slogan
            <input value={form.subSlogan} onChange={(e) => setField('subSlogan', e.target.value)} />
          </label>
        </div>

        <label>
          Short description
          <textarea rows={3} value={form.description} onChange={(e) => setField('description', e.target.value)} />
        </label>
        <label>
          About (short)
          <textarea rows={4} value={form.about} onChange={(e) => setField('about', e.target.value)} />
        </label>
        <label>
          Mission
          <textarea rows={3} value={form.mission} onChange={(e) => setField('mission', e.target.value)} />
        </label>
        <label>
          Vision
          <textarea rows={3} value={form.vision} onChange={(e) => setField('vision', e.target.value)} />
        </label>
        <label>
          Commitment
          <textarea rows={3} value={form.commitment} onChange={(e) => setField('commitment', e.target.value)} />
        </label>

        <h3>Contact</h3>
        <div className="form-grid">
          <label>
            Phone
            <input value={form.contact.phone} onChange={(e) => setContact('phone', e.target.value)} />
          </label>
          <label>
            Email
            <input value={form.contact.email} onChange={(e) => setContact('email', e.target.value)} />
          </label>
          <label>
            Website
            <input value={form.contact.website} onChange={(e) => setContact('website', e.target.value)} />
          </label>
          <label>
            Hours
            <input value={form.contact.hours} onChange={(e) => setContact('hours', e.target.value)} />
          </label>
          <label className="full">
            Address
            <input value={form.contact.address} onChange={(e) => setContact('address', e.target.value)} />
          </label>
          <label className="full">
            Support note
            <input value={form.contact.supportNote} onChange={(e) => setContact('supportNote', e.target.value)} />
          </label>
        </div>

        <h3>Logo &amp; hero</h3>
        <div className="form-grid">
          <label>
            Logo image
            <input
              type="file"
              accept="image/*"
              disabled={uploading === 'logo'}
              onChange={(e) => uploadImage('logo', e.target.files?.[0])}
            />
            {form.logo ? (
              <img className="preview-thumb" src={mediaUrl(form.logo)} alt="Logo preview" />
            ) : null}
          </label>
          <label>
            Hero image
            <input
              type="file"
              accept="image/*"
              disabled={uploading === 'heroImage'}
              onChange={(e) => uploadImage('heroImage', e.target.files?.[0])}
            />
            {form.heroImage ? (
              <img className="preview-thumb" src={mediaUrl(form.heroImage)} alt="Hero preview" />
            ) : null}
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save company details'}
          </button>
        </div>
      </form>
    </div>
  );
}
