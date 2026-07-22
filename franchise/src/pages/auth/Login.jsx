import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from '../../components/common/BrandLogo';
import { useAuth } from '../../hooks/useAuth';
import { APP_NAME } from '../../utils/constants';
import '../../styles/auth.css';

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(form.username.trim(), form.password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="auth-page">
      <aside className="auth-brand">
        <div className="auth-brand-glow" aria-hidden="true" />
        <div className="auth-brand-inner">
          <BrandLogo className="auth-brand-logo" />
          <p className="auth-brand-kicker">Store operations</p>
          <h1 className="auth-brand-title">{APP_NAME}</h1>
          <p className="auth-brand-copy">
            Track inventory, place purchase orders, and manage counter sales from one desk.
          </p>
          <ul className="auth-brand-list">
            <li>
              <span className="auth-brand-check" aria-hidden="true" />
              Live stock levels
            </li>
            <li>
              <span className="auth-brand-check" aria-hidden="true" />
              Purchase &amp; receive
            </li>
            <li>
              <span className="auth-brand-check" aria-hidden="true" />
              Order tracking
            </li>
          </ul>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-ring" aria-hidden="true" />
        <form className="auth-form" onSubmit={onSubmit}>
          <div className="auth-form-head">
            <p className="auth-eyebrow">
              <span className="auth-eyebrow-bar" aria-hidden="true" />
              Franchise desk
            </p>
            <h2>Staff login</h2>
            <p>Use your franchise account credentials</p>
          </div>

          {error ? <div className="alert error">{error}</div> : null}

          <label className="auth-field">
            <span>Username</span>
            <input
              name="username"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              placeholder="Franchise username"
              autoComplete="username"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Enter password"
                autoComplete="current-password"
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

          <button className="btn primary auth-submit" type="submit" disabled={loading}>
            <span>{loading ? 'Signing in...' : 'Login to desk'}</span>
            {!loading ? <span className="auth-submit-arrow" aria-hidden="true">→</span> : null}
          </button>
        </form>
      </main>
    </div>
  );
}
