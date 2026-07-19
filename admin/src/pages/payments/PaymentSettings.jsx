import { useEffect, useState } from 'react';
import { paymentsApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const emptyBank = () => ({
  bankName: '',
  accountNumber: '',
  ifsc: '',
  holder: '',
  ac_type: 'savings',
  branch: '',
  status: 1,
});

const emptyUpi = () => ({
  name: '',
  upiId: '',
  qrCodeUrl: '',
  status: 1,
});

export default function PaymentSettings() {
  const [bank, setBank] = useState([emptyBank()]);
  const [upi, setUpi] = useState([emptyUpi()]);
  const [manualStatus, setManualStatus] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentsApi.getPaymentSettings();
      const data = res.data?.data || {};
      const banks = data.manual?.bank?.length ? data.manual.bank : [emptyBank()];
      const upis = data.manual?.upi?.length ? data.manual.upi : [emptyUpi()];
      setBank(banks);
      setUpi(upis);
      setManualStatus(data.manual?.status === 0 ? 0 : 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateBank = (index, key, value) => {
    setBank((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const updateUpi = (index, key, value) => {
    setUpi((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const uploadQr = async (index, file) => {
    if (!file) return;
    setUploadingIndex(index);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await paymentsApi.uploadPaymentQr(fd);
      const url = res.data?.data?.url;
      if (url) updateUpi(index, 'qrCodeUrl', url);
    } catch (err) {
      setError(err.response?.data?.message || 'QR upload failed');
    } finally {
      setUploadingIndex(null);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await paymentsApi.updatePaymentSettings({ bank, upi, manualStatus });
      setSuccess('Payment settings saved');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>Payment Settings</h2>
        <p>Bank and UPI details shown to distributors for fund deposits</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <form className="panel" onSubmit={save}>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={manualStatus === 1}
            onChange={(e) => setManualStatus(e.target.checked ? 1 : 0)}
          />
          Manual payments enabled
        </label>

        <h3>Bank accounts</h3>
        {bank.map((row, index) => (
          <div key={`bank-${index}`} className="form-grid" style={{ marginBottom: 16 }}>
            <label>
              Bank name
              <input value={row.bankName || ''} onChange={(e) => updateBank(index, 'bankName', e.target.value)} />
            </label>
            <label>
              Account number
              <input value={row.accountNumber || ''} onChange={(e) => updateBank(index, 'accountNumber', e.target.value)} />
            </label>
            <label>
              IFSC
              <input value={row.ifsc || ''} onChange={(e) => updateBank(index, 'ifsc', e.target.value)} />
            </label>
            <label>
              Holder name
              <input value={row.holder || ''} onChange={(e) => updateBank(index, 'holder', e.target.value)} />
            </label>
            <label>
              Account type
              <select value={row.ac_type || 'savings'} onChange={(e) => updateBank(index, 'ac_type', e.target.value)}>
                <option value="savings">Savings</option>
                <option value="current">Current</option>
              </select>
            </label>
            <label>
              Branch
              <input value={row.branch || ''} onChange={(e) => updateBank(index, 'branch', e.target.value)} />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={row.status !== 0}
                onChange={(e) => updateBank(index, 'status', e.target.checked ? 1 : 0)}
              />
              Active
            </label>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setBank((rows) => rows.filter((_, i) => i !== index))}
              disabled={bank.length <= 1}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => setBank((rows) => [...rows, emptyBank()])}>
          Add bank
        </button>

        <h3 style={{ marginTop: 24 }}>UPI details</h3>
        {upi.map((row, index) => (
          <div key={`upi-${index}`} className="form-grid" style={{ marginBottom: 16 }}>
            <label>
              Display name
              <input value={row.name || ''} onChange={(e) => updateUpi(index, 'name', e.target.value)} />
            </label>
            <label>
              UPI ID
              <input value={row.upiId || ''} onChange={(e) => updateUpi(index, 'upiId', e.target.value)} />
            </label>
            <label>
              QR code
              <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadQr(index, e.target.files?.[0])}
                disabled={uploadingIndex === index}
              />
            </label>
            {row.qrCodeUrl ? (
              <div className="media-upload-block">
                <img src={mediaUrl(row.qrCodeUrl)} alt="UPI QR" style={{ maxWidth: 160, borderRadius: 8 }} />
              </div>
            ) : null}
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={row.status !== 0}
                onChange={(e) => updateUpi(index, 'status', e.target.checked ? 1 : 0)}
              />
              Active
            </label>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setUpi((rows) => rows.filter((_, i) => i !== index))}
              disabled={upi.length <= 1}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => setUpi((rows) => [...rows, emptyUpi()])}>
          Add UPI
        </button>

        <div style={{ marginTop: 24 }}>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
