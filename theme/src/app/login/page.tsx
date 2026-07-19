'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { setThemeToken, themeApi } from '@/lib/themeApi';
import { useRouter } from 'next/navigation';

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
    <section className="section" style={{ maxWidth: 420, margin: '2rem auto' }}>
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
      <p>
        Demo user: <code>theme1</code> / <code>Admin@123</code>
      </p>
      <Link href="/shop">Continue to shop</Link>
    </section>
  );
}
