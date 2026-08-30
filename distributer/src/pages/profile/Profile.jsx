import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { distributorApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import { storage } from '../../utils/storage';

const EMPTY_ADDRESS = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
};

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function statusMeta(status, blockStatus) {
  const value = String(status || 'inactive').toLowerCase();
  if (Number(blockStatus) === 1 || value === 'disabled') {
    return { label: 'Disabled', tone: 'danger' };
  }
  if (value === 'active') return { label: 'Active', tone: 'ok' };
  return { label: 'Inactive', tone: 'warn' };
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19.5c1.6-3.2 4-4.8 6.5-4.8s4.9 1.6 6.5 4.8" />
    </svg>
  );
}

export default function Profile() {
  const { setProfile, user, profile } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', mobile: '' });
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [meta, setMeta] = useState(null);
  const [username, setUsername] = useState(user?.username || profile?.username || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await distributorApi.getProfile();
        const distributor = res.data?.distributor;
        if (active && distributor) {
          setForm({
            name: distributor.name || '',
            email: distributor.email || '',
            mobile: distributor.mobile || '',
          });
          setAddress({
            ...EMPTY_ADDRESS,
            ...(distributor.address || {}),
            country: distributor.address?.country || 'India',
          });
          setUsername(distributor.username || '');
          setMeta(distributor);
          setProfile(distributor);
          storage.setProfile(distributor);
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
      const res = await distributorApi.updateProfile({ ...form, address });
      const distributor = res.data?.distributor;
      if (distributor) {
        setMeta(distributor);
        setProfile(distributor);
        storage.setProfile(distributor);
      }
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const status = useMemo(
    () => statusMeta(meta?.status || profile?.status, meta?.blockStatus ?? profile?.blockStatus),
    [meta, profile],
  );

  const initial = (form.name || username || 'D').trim().charAt(0).toUpperCase();
  const distributorId = meta?.distributorId || profile?.distributorId || '—';
  const uid = meta?.uid || profile?.uid || user?.uid || '—';

  if (loading) {
    return (
      <div className="page profile-page">
        <div className="profile-loading">Loading your profile…</div>
      </div>
    );
  }

  return (
    <div className="page profile-page">
      <section className="profile-hero">
        <div className="profile-hero-copy">
          <p className="profile-eyebrow">Account</p>
          <h2>Business Profile</h2>
          <p className="profile-lead">
            Keep your contact details current so payouts, KYC, and order updates reach you correctly.
          </p>
        </div>
        <div className="profile-hero-aside" aria-hidden="true">
          <span className="profile-hero-orb" />
          <UserIcon />
        </div>
      </section>

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <div className="profile-layout">
        <aside className="profile-identity panel">
          <div className="profile-identity-top">
            <div className="profile-avatar" aria-hidden="true">
              {initial}
            </div>
            <div className="profile-identity-text">
              <strong>{form.name || 'Distributor'}</strong>
              <span>@{username || '—'}</span>
            </div>
            <span className={`badge ${status.tone}`}>{status.label}</span>
          </div>

          <dl className="profile-meta-list">
            <div>
              <dt>Distributor ID</dt>
              <dd>#{distributorId}</dd>
            </div>
            <div>
              <dt>UID</dt>
              <dd>{uid}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{formatDate(meta?.joining_date)}</dd>
            </div>
            <div>
              <dt>Position</dt>
              <dd>
                {meta?.position
                  ? String(meta.position).charAt(0).toUpperCase() + String(meta.position).slice(1)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Package BV</dt>
              <dd>
                {Number(meta?.package_bv || 0) > 0
                  ? Number(meta.package_bv).toLocaleString('en-IN', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })
                  : 'No package'}
              </dd>
            </div>
          </dl>

          <div className="profile-identity-links">
            <Link className="btn ghost" to="/kyc">
              Manage KYC
            </Link>
            <Link className="btn ghost" to="/change-password">
              Change password
            </Link>
          </div>
        </aside>

        <form className="profile-form panel" onSubmit={onSubmit}>
          <div className="profile-section-head">
            <p className="profile-section-kicker">Contact</p>
            <h3>Personal details</h3>
            <p className="muted">Username is fixed. Update name, email, and mobile anytime.</p>
          </div>

          <div className="profile-fields">
            <label className="profile-field">
              <span>Username / ID</span>
              <input name="username" value={username} readOnly disabled />
            </label>
            <label className="profile-field">
              <span>Full name</span>
              <input
                name="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                autoComplete="name"
              />
            </label>
            <label className="profile-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </label>
            <label className="profile-field">
              <span>Mobile</span>
              <input
                name="mobile"
                value={form.mobile}
                onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                required
                autoComplete="tel"
              />
            </label>
          </div>

          <div className="profile-section-head profile-section-spaced">
            <p className="profile-section-kicker">Address</p>
            <h3>Delivery address</h3>
            <p className="muted">Used for package and product deliveries.</p>
          </div>

          <div className="profile-fields">
            <label className="profile-field profile-field-wide">
              <span>Address line 1</span>
              <input
                name="line1"
                value={address.line1}
                onChange={(e) => setAddress((p) => ({ ...p, line1: e.target.value }))}
                placeholder="House / street"
                autoComplete="address-line1"
              />
            </label>
            <label className="profile-field profile-field-wide">
              <span>Address line 2</span>
              <input
                name="line2"
                value={address.line2}
                onChange={(e) => setAddress((p) => ({ ...p, line2: e.target.value }))}
                placeholder="Landmark (optional)"
                autoComplete="address-line2"
              />
            </label>
            <label className="profile-field">
              <span>City</span>
              <input
                name="city"
                value={address.city}
                onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))}
                autoComplete="address-level2"
              />
            </label>
            <label className="profile-field">
              <span>State</span>
              <input
                name="state"
                value={address.state}
                onChange={(e) => setAddress((p) => ({ ...p, state: e.target.value }))}
                autoComplete="address-level1"
              />
            </label>
            <label className="profile-field">
              <span>Pincode</span>
              <input
                name="pincode"
                value={address.pincode}
                onChange={(e) => setAddress((p) => ({ ...p, pincode: e.target.value }))}
                autoComplete="postal-code"
              />
            </label>
            <label className="profile-field">
              <span>Country</span>
              <input
                name="country"
                value={address.country}
                onChange={(e) => setAddress((p) => ({ ...p, country: e.target.value }))}
                autoComplete="country-name"
              />
            </label>
          </div>

          <div className="profile-form-actions">
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
