'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setThemeToken, themeApi } from '@/lib/themeApi';

const DISTRIBUTOR_LOGIN =
  process.env.NEXT_PUBLIC_DISTRIBUTOR_LOGIN_URL || 'http://192.168.18.20:3001/login';
const FRANCHISE_LOGIN =
  process.env.NEXT_PUBLIC_FRANCHISE_LOGIN_URL || 'http://192.168.18.20:3002/login';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await themeApi.register({
        name,
        username,
        email,
        mobile,
        password,
      });
      if (!data?.token) throw new Error('Signup token missing');
      setThemeToken(data.token);
      router.push('/shop');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section login-page">
      <div className="login-tabs">
        <Link className="login-tab" href="/login">
          Sign in
        </Link>
        <Link className="login-tab is-active" href="/signup">
          Sign up
        </Link>
      </div>

      <h1>Create account</h1>
      <p>Sign up to shop products, manage cart, and track orders.</p>
      {error ? <p className="alert error">{error}</p> : null}

      <form onSubmit={onSubmit} className="checkout-form">
        <label>
          Full name
          <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </label>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label>
          Mobile
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            autoComplete="tel"
          />
        </label>
        <label>
          Password
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
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
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <div className="login-auth-switch">
        <p>Already have an account?</p>
        <Link className="button button-soft login-portal-btn" href="/login">
          Sign in
        </Link>
      </div>

      <div className="login-portal-links">
        <p className="login-portal-label">Other portals</p>
        <a className="button button-soft login-portal-btn" href={DISTRIBUTOR_LOGIN}>
          Distributor login
        </a>
        <a className="button button-soft login-portal-btn" href={FRANCHISE_LOGIN}>
          Franchise login
        </a>
      </div>
    </section>
  );
}
