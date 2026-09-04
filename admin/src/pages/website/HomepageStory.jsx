import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { websiteApi } from '../../api';

const emptyPillar = () => ({ label: '', description: '' });

export default function HomepageStory() {
  const [form, setForm] = useState({
    motto: '',
    about: '',
    homeStoryEnabled: true,
    pillars: [emptyPillar(), emptyPillar(), emptyPillar()],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await websiteApi.getWebsiteContent();
      const data = res.data?.data || {};
      const pillars = Array.isArray(data.pillars) ? data.pillars : [];
      const nextPillars = [0, 1, 2].map((i) => ({
        label: pillars[i]?.label || '',
        description: pillars[i]?.description || '',
      }));
      setForm({
        motto: data.motto || '',
        about: data.about || '',
        homeStoryEnabled: data.homeStoryEnabled !== false,
        pillars: nextPillars,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load homepage story');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setPillar = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      pillars: prev.pillars.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));
  };

  const addPillar = () => {
    if (form.pillars.length >= 6) return;
    setForm((prev) => ({ ...prev, pillars: [...prev.pillars, emptyPillar()] }));
  };

  const removePillar = (index) => {
    setForm((prev) => ({
      ...prev,
      pillars: prev.pillars.length <= 1 ? [emptyPillar()] : prev.pillars.filter((_, i) => i !== index),
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const pillars = form.pillars
        .map((p) => ({
          label: String(p.label || '').trim(),
          description: String(p.description || '').trim(),
        }))
        .filter((p) => p.label || p.description);

      await websiteApi.updateWebsiteContent({
        motto: form.motto,
        about: form.about,
        homeStoryEnabled: form.homeStoryEnabled,
        pillars,
      });
      setSuccess('Homepage story saved. Theme home updates on next load.');
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
          <h2>Homepage Story</h2>
          <p className="page-sub">
            Theme home section: “Why …”, motto heading, about text, and numbered points (01, 02, 03…).
          </p>
        </div>
      </div>

      <div className="alert info banner-size-note">
        <strong>Where it shows:</strong>
        <span> Public website homepage, below packages. Toggle off to hide the whole block.</span>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <form className="panel hero-bg-panel" onSubmit={save}>
        <label className="home-story-toggle">
          <input
            type="checkbox"
            checked={form.homeStoryEnabled}
            onChange={(e) => setField('homeStoryEnabled', e.target.checked)}
          />
          <span>
            <strong>Show on homepage</strong>
            <small>Uncheck to hide this section from the public home page</small>
          </span>
        </label>

        <label>
          Motto / heading
          <input
            value={form.motto}
            onChange={(e) => setField('motto', e.target.value)}
            placeholder="Nourish. Heal. Thrive."
          />
        </label>

        <label>
          About text
          <textarea
            rows={5}
            value={form.about}
            onChange={(e) => setField('about', e.target.value)}
            placeholder="We craft nutrient-rich juices…"
          />
        </label>

        <div className="home-story-pillars">
          <div className="home-story-pillars-head">
            <h3>Story points</h3>
            <button type="button" className="btn ghost" onClick={addPillar} disabled={form.pillars.length >= 6}>
              Add point
            </button>
          </div>
          <p className="muted">Shown as 01, 02, 03 on the right side of the homepage story block.</p>

          {form.pillars.map((pillar, index) => (
            <div className="home-story-pillar-card" key={`pillar-${index}`}>
              <div className="home-story-pillar-top">
                <strong>{String(index + 1).padStart(2, '0')}</strong>
                <button type="button" className="btn ghost" onClick={() => removePillar(index)}>
                  Remove
                </button>
              </div>
              <label>
                Title
                <input
                  value={pillar.label}
                  onChange={(e) => setPillar(index, 'label', e.target.value)}
                  placeholder="Clean ingredients"
                />
              </label>
              <label>
                Description
                <textarea
                  rows={3}
                  value={pillar.description}
                  onChange={(e) => setPillar(index, 'description', e.target.value)}
                  placeholder="Short supporting line…"
                />
              </label>
            </div>
          ))}
        </div>

        <div className="form-actions hero-bg-actions">
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save homepage story'}
          </button>
          <Link className="btn ghost" to="/website/company">
            Company / Brand
          </Link>
          <Link className="btn ghost" to="/website/about">
            About & Founders
          </Link>
        </div>
      </form>
    </div>
  );
}
