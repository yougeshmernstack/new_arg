import { useState } from 'react';
import { authApi } from '../../api';

export default function ChangePassword() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setSaving(true);
    try {
      const res = await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setMessage(res.data?.message || 'Password updated successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Change Password</h2>
          <p className="page-sub">Update your admin account password.</p>
        </div>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}
      <form className="form-grid" onSubmit={onSubmit} style={{ maxWidth: 420 }}>
        <label>
          Current password
          <div className="password-field">
            <input
              type={show.current ? 'text' : 'password'}
              name="currentPassword"
              value={form.currentPassword}
              onChange={onChange}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShow((s) => ({ ...s, current: !s.current }))}
            >
              {show.current ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
        <label>
          New password
          <div className="password-field">
            <input
              type={show.next ? 'text' : 'password'}
              name="newPassword"
              value={form.newPassword}
              onChange={onChange}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShow((s) => ({ ...s, next: !s.next }))}
            >
              {show.next ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
        <label>
          Confirm new password
          <div className="password-field">
            <input
              type={show.confirm ? 'text' : 'password'}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={onChange}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
            >
              {show.confirm ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
