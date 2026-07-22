import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { wellnessApi } from '../../api';

const initial = {
  username: '',
  password: '',
  business_name: '',
  owner_name: '',
  email: '',
  mobile: '',
  gst_number: '',
};

const labels = {
  username: 'Username',
  password: 'Password',
  business_name: 'Business name',
  owner_name: 'Owner name',
  email: 'Email',
  mobile: 'Mobile',
  gst_number: 'GST number',
};

export default function CreateFranchise() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await wellnessApi.createFranchise(form);
      setSuccess('Franchise created successfully');
      setTimeout(() => navigate('/franchises'), 800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create franchise');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Create Franchise</h2>
          <p className="page-sub">Add a new franchise partner and login credentials</p>
        </div>
        <Link className="btn ghost" to="/franchises">
          ← Back
        </Link>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <form className="form-grid" onSubmit={onSubmit} style={{ maxWidth: 760 }}>
        {Object.keys(initial).map((key) => (
          <label key={key}>
            {labels[key] || key.replaceAll('_', ' ')}
            <input
              name={key}
              type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'}
              value={form[key]}
              onChange={onChange}
              autoComplete={key === 'password' ? 'new-password' : 'off'}
              required={['username', 'password', 'business_name', 'owner_name'].includes(key)}
            />
          </label>
        ))}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={() => navigate('/franchises')}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create franchise'}
          </button>
        </div>
      </form>
    </div>
  );
}
