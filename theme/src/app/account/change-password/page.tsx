'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearThemeToken, getThemeToken, themeApi } from '@/lib/themeApi';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getThemeToken()) {
      router.replace('/login');
    }
  }, [router]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setSaving(true);
    try {
      const data = await themeApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setMessage(data?.message || 'Password updated successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const status = (err as Error & { status?: number })?.status;
      if (status === 401) {
        clearThemeToken();
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="section" style={{ maxWidth: 420, margin: '2rem auto' }}>
      <h1>Change password</h1>
      <p>Update the password for your customer account.</p>
      {error ? <p className="alert error">{error}</p> : null}
      {message ? <p className="alert success">{message}</p> : null}
      <form onSubmit={onSubmit} className="checkout-form">
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
        <button className="button" type="submit" disabled={saving}>
          {saving ? 'Updating...' : 'Update password'}
        </button>
      </form>
      <p>
        <Link href="/shop">Back to shop</Link>
      </p>
    </section>
  );
}
