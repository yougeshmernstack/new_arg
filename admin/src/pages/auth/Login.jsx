import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
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

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const brandInitial = String(APP_NAME || 'A').trim().charAt(0).toUpperCase() || 'A';

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(form.username.trim(), form.password);
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check credentials.');
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-brand">
          <div className="auth-brand-mark" aria-hidden="true">
            {brandInitial}
          </div>
          <div>
            <h1>{APP_NAME}</h1>
            <p className="auth-sub">Sign in to the admin console</p>
          </div>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <label>
          Username
          <input
            name="username"
            value={form.username}
            onChange={onChange}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={onChange}
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
        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
