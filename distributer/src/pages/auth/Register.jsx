import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import BrandLogo from '../../components/common/BrandLogo';
import { getApiErrorMessage } from '../../utils/apiError';
import '../../styles/auth.css';

const initial = {
  name: '',
  email: '',
  mobile: '',
  password: '',
  sponsor_Id: '',
  placement: 'left',
};

const fields = [
  { name: 'name', label: 'Full name', placeholder: 'Your full name', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Email', placeholder: 'name@example.com', type: 'email', autoComplete: 'email' },
  { name: 'mobile', label: 'Mobile', placeholder: 'Mobile number', type: 'tel', autoComplete: 'tel' },
  { name: 'password', label: 'Password', placeholder: 'Create password', type: 'password', autoComplete: 'new-password' },
  { name: 'sponsor_Id', label: 'Sponsor username', placeholder: 'Enter sponsor username', type: 'text', autoComplete: 'off' },
];

const SIDE_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

export default function Register() {
  const { register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sponsorFromUrl = (searchParams.get('sponsor') || '').trim();
  const placementFromUrl = String(searchParams.get('placement') || '')
    .trim()
    .toLowerCase();
  const placementLocked =
    placementFromUrl === 'left' || placementFromUrl === 'right';
  const [form, setForm] = useState(() => ({
    ...initial,
    sponsor_Id: sponsorFromUrl,
    placement: placementLocked ? placementFromUrl : 'left',
  }));
  const [error, setError] = useState('');
  const [generatedUsername, setGeneratedUsername] = useState('');
  const sponsorLocked = Boolean(sponsorFromUrl);

  if (isAuthenticated && !generatedUsername) return <Navigate to="/" replace />;

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await register(form);
      const username = data?.distributor?.username || data?.user?.username || '';
      if (username) {
        setGeneratedUsername(username);
        return;
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed'));
    }
  };

  if (generatedUsername) {
    return (
      <div className="auth-page">
        <div className="auth-wrap">
          <div className="auth-panel auth-success-panel">
            <div className="auth-logo-wrap">
              <BrandLogo className="brand-logo auth-logo" />
            </div>
            <div className="auth-heading">
              <h1>Account created</h1>
              <p>Your distributor account is ready.</p>
            </div>
            <div className="auth-username-card">
              <span>Your username</span>
              <strong>{generatedUsername}</strong>
              <p>Save this username — you will need it to sign in.</p>
            </div>
            <button className="btn primary auth-submit" type="button" onClick={() => navigate('/', { replace: true })}>
              Continue to dashboard
            </button>
          </div>
          <p className="auth-bottom">Natural · Pure · Healthy · Sustainable</p>
        </div>
      </div>
    );
  }

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
          <p className="auth-note">Username will be generated automatically after registration.</p>
          <div className="register-fields">
            {fields.map((field) => {
              const isSponsor = field.name === 'sponsor_Id';
              return (
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
                    readOnly={isSponsor && sponsorLocked}
                  />
                  {isSponsor && sponsorLocked ? (
                    <small className="sponsor-locked-hint">Filled from your referral link</small>
                  ) : null}
                </label>
              );
            })}
            <fieldset className="register-field field-placement">
              <legend>Binary placement</legend>
              <p className="placement-hint">
                {placementLocked
                  ? 'Placement is set from your referral link.'
                  : 'Choose Left or Right. Placement under your sponsor follows the binary spillover rule automatically.'}
              </p>
              <div className="placement-options">
                {SIDE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`placement-option${form.placement === opt.value ? ' is-selected' : ''}`}
                    onClick={() => {
                      if (placementLocked) return;
                      setForm((p) => ({ ...p, placement: opt.value }));
                    }}
                    disabled={placementLocked && form.placement !== opt.value}
                    aria-pressed={form.placement === opt.value}
                  >
                    <span className="placement-label">{opt.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
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
