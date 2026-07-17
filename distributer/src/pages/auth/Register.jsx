import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import BrandLogo from '../../components/common/BrandLogo';
import '../../styles/auth.css';

const initial = {
  name: '',
  email: '',
  mobile: '',
  username: '',
  password: '',
  sponsor_Id: '',
};

const fields = [
  { name: 'name', label: 'Full name', placeholder: 'Your full name', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Email', placeholder: 'name@example.com', type: 'email', autoComplete: 'email' },
  { name: 'mobile', label: 'Mobile', placeholder: 'Mobile number', type: 'tel', autoComplete: 'tel' },
  { name: 'username', label: 'Username', placeholder: 'Choose username', type: 'text', autoComplete: 'username' },
  { name: 'password', label: 'Password', placeholder: 'Create password', type: 'password', autoComplete: 'new-password' },
  { name: 'sponsor_Id', label: 'Sponsor ID', placeholder: 'Sponsor ID', type: 'text', autoComplete: 'off' },
];

export default function Register() {
  const { register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/" replace />;

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-wrap auth-wrap-wide">
        <form className="auth-panel auth-panel-register" onSubmit={onSubmit}>
          <div className="auth-logo-wrap">
            <BrandLogo className="brand-logo auth-logo" />
          </div>
          <div className="auth-heading">
            <h1>Create account</h1>
            <p>Register as an Arogya Green Life distributor</p>
          </div>
          {error ? <div className="alert error">{error}</div> : null}
          <div className="register-fields">
            {fields.map((field) => (
              <label key={field.name} className={`register-field field-${field.name}`}>
                <span>{field.label}</span>
                <input
                  name={field.name}
                  type={field.type}
                  value={form[field.name]}
                  onChange={onChange}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  required
                />
              </label>
            ))}
          </div>
          <button className="btn primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
          <p className="auth-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
        <p className="auth-bottom">Natural · Pure · Healthy · Sustainable</p>
      </div>
    </div>
  );
}
