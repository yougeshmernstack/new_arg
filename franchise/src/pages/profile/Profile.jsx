import { useEffect, useState } from 'react';
import { franchiseApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import { storage } from '../../utils/storage';

export default function Profile() {
  const { setProfile } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', mobile: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await franchiseApi.getProfile();
        const franchise = res.data?.franchise;
        if (active && franchise) {
          setForm({
            name: franchise.owner_name || '',
            email: franchise.email || '',
            mobile: franchise.mobile || '',
          });
          setProfile(franchise);
          storage.setProfile(franchise);
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [setProfile]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await franchiseApi.updateProfile(form);
      const franchise = res.data?.franchise;
      if (franchise) {
        setProfile(franchise);
        storage.setProfile(franchise);
      }
      setMessage('Profile updated');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page">Loading profile...</div>;

  return (
    <div className="page">
      <h2>Profile</h2>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}
      <form className="form-grid" onSubmit={onSubmit}>
        {['name', 'email', 'mobile'].map((key) => (
          <label key={key}>
            {key}
            <input
              name={key}
              value={form[key]}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              required
            />
          </label>
        ))}
        <div className="form-actions">
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
