'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { setThemeToken, themeApi } from '@/lib/themeApi';
import { useRouter } from 'next/navigation';

const DISTRIBUTOR_LOGIN =
  process.env.NEXT_PUBLIC_DISTRIBUTOR_LOGIN_URL || 'http://192.168.18.20:3001/login';
const FRANCHISE_LOGIN =
  process.env.NEXT_PUBLIC_FRANCHISE_LOGIN_URL || 'http://192.168.18.20:3002/login';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await themeApi.login({ username, password });
      if (!data?.token) throw new Error('Login token missing');
      setThemeToken(data.token);
      router.push('/shop');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section login-page">
      <div className="login-tabs">
        <Link className="login-tab is-active" href="/login">
          Sign in
        </Link>
        <Link className="login-tab" href="/signup">
          Sign up
        </Link>
      </div>

      <h1>Customer login</h1>
      <p>Sign in to shop live products, manage cart, and track orders.</p>
      {error ? <p className="alert error">{error}</p> : null}
      <form onSubmit={onSubmit} className="checkout-form">
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Password
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* <div className="login-auth-switch">
        <p>New here?</p>
        <Link className="button button-soft login-portal-btn" href="/signup">
          Sign up
        </Link>
      </div> */}

      <div className="login-portal-links">
        <p className="login-portal-label">Other portals</p>
        <a className="button button-soft login-portal-btn" href={DISTRIBUTOR_LOGIN}>
          Distributor login
        </a>
        <a className="button button-soft login-portal-btn" href={FRANCHISE_LOGIN}>
          Franchise login
        </a>
      </div>

      <p className="login-demo">
        Demo user: <code>theme1</code> / <code>Admin@123</code>
      </p>
      <Link className="text-link" href="/shop">
        Continue to shop
      </Link>
    </section>
  );
}
