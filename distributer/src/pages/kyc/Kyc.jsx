import { useEffect, useMemo, useState } from 'react';
import { kycApi } from '../../api';
import { API_BASE_URL } from '../../utils/constants';

const TABS = [
  { id: 'pan', label: 'PAN', hint: 'Permanent Account Number' },
  { id: 'bank', label: 'Bank', hint: 'Account & passbook' },
  { id: 'aadhaar', label: 'Aadhaar', hint: 'Front & back images' },
  { id: 'nominee', label: 'Nominee', hint: 'Beneficiary details' },
];

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function statusLabel(status) {
  if (status === 1) return 'Uploaded';
  if (status === 2) return 'Approved';
  if (status === 3) return 'Rejected';
  return 'Pending';
}

function statusTone(status) {
  if (status === 1) return 'warn';
  if (status === 2) return 'ok';
  if (status === 3) return 'danger';
  return 'idle';
}

function canEdit(status) {
  return status === 0 || status === 3 || status === undefined || status === null;
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.5 2.8 7.8 7 9 4.2-1.2 7-4.5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V7" />
      <path d="m8.5 10.5 3.5-3.5 3.5 3.5" />
      <path d="M5 16.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5" />
    </svg>
  );
}

function FileDrop({ label, file, preview, required, onChange }) {
  return (
    <label className={`kyc-drop${file ? ' has-file' : ''}`}>
      <input
        type="file"
        accept="image/*"
        required={required && !file}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      {preview ? (
        <img src={preview} alt="" className="kyc-drop-preview" />
      ) : (
        <span className="kyc-drop-icon"><UploadIcon /></span>
      )}
      <span className="kyc-drop-copy">
        <strong>{label}</strong>
        <em>{file ? file.name : 'JPG, PNG up to 5MB'}</em>
      </span>
    </label>
  );
}

function DocThumb({ src, alt }) {
  if (!src) return null;
  const url = mediaUrl(src);
  return (
    <a href={url} target="_blank" rel="noreferrer" className="kyc-doc-thumb">
      <img src={url} alt={alt} />
    </a>
  );
}

const emptyForms = {
  pan: { panNumber: '', document: null },
  bank: {
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    holderName: '',
    accountType: 'Saving',
    document: null,
  },
  aadhaar: { aadhaarNumber: '', documentFront: null, documentBack: null },
  nominee: { nomineeName: '', relation: '', mobile: '', document: null },
};

export default function Kyc() {
  const [tab, setTab] = useState('pan');
  const [kyc, setKyc] = useState(null);
  const [forms, setForms] = useState(emptyForms);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previews, setPreviews] = useState({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await kycApi.getKyc();
      setKyc(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load KYC');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const urls = {};
    const revoke = [];
    const track = (key, file) => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      urls[key] = url;
      revoke.push(url);
    };
    track('pan.document', forms.pan.document);
    track('bank.document', forms.bank.document);
    track('aadhaar.documentFront', forms.aadhaar.documentFront);
    track('aadhaar.documentBack', forms.aadhaar.documentBack);
    track('nominee.document', forms.nominee.document);
    setPreviews(urls);
    return () => revoke.forEach((u) => URL.revokeObjectURL(u));
  }, [forms]);

  const counts = useMemo(() => {
    const statuses = TABS.map((t) => kyc?.status?.[t.id] ?? 0);
    return {
      approved: statuses.filter((s) => s === 2).length,
      uploaded: statuses.filter((s) => s === 1).length,
      rejected: statuses.filter((s) => s === 3).length,
      pending: statuses.filter((s) => s === 0).length,
      total: TABS.length,
    };
  }, [kyc]);

  const status = kyc?.status?.[tab] ?? 0;
  const remark = kyc?.remarks?.[tab] || '';
  const activeTab = TABS.find((t) => t.id === tab);

  const setField = (type, key, value) => {
    setForms((prev) => ({
      ...prev,
      [type]: { ...prev[type], [key]: value },
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      if (tab === 'pan') {
        fd.append('panNumber', forms.pan.panNumber);
        if (forms.pan.document) fd.append('document', forms.pan.document);
        await kycApi.submitPanKyc(fd);
      } else if (tab === 'bank') {
        Object.entries(forms.bank).forEach(([k, v]) => {
          if (k === 'document') {
            if (v) fd.append('document', v);
          } else {
            fd.append(k, v);
          }
        });
        await kycApi.submitBankKyc(fd);
      } else if (tab === 'aadhaar') {
        fd.append('aadhaarNumber', forms.aadhaar.aadhaarNumber);
        if (forms.aadhaar.documentFront) fd.append('documentFront', forms.aadhaar.documentFront);
        if (forms.aadhaar.documentBack) fd.append('documentBack', forms.aadhaar.documentBack);
        await kycApi.submitAadhaarKyc(fd);
      } else {
        fd.append('nomineeName', forms.nominee.nomineeName);
        fd.append('relation', forms.nominee.relation);
        fd.append('mobile', forms.nominee.mobile);
        if (forms.nominee.document) fd.append('document', forms.nominee.document);
        await kycApi.submitNomineeKyc(fd);
      }
      setSuccess(`${activeTab?.label || 'KYC'} submitted for review.`);
      setForms(emptyForms);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSummary = () => {
    if (tab === 'pan' && kyc?.panDetails) {
      return (
        <div className="kyc-summary">
          <div className="kyc-kv"><span>PAN</span><strong>{kyc.panDetails.panNumber}</strong></div>
          <div className="kyc-docs"><DocThumb src={kyc.panDetails.document} alt="PAN" /></div>
        </div>
      );
    }
    if (tab === 'bank' && kyc?.bankDetails) {
      const b = kyc.bankDetails;
      return (
        <div className="kyc-summary">
          <div className="kyc-kv-grid">
            <div className="kyc-kv"><span>Account</span><strong>{b.accountNumber}</strong></div>
            <div className="kyc-kv"><span>IFSC</span><strong>{b.ifscCode}</strong></div>
            <div className="kyc-kv"><span>Bank</span><strong>{b.bankName}</strong></div>
            <div className="kyc-kv"><span>Holder</span><strong>{b.holderName}</strong></div>
            <div className="kyc-kv"><span>Type</span><strong>{b.accountType}</strong></div>
          </div>
          <div className="kyc-docs"><DocThumb src={b.document} alt="Bank doc" /></div>
        </div>
      );
    }
    if (tab === 'aadhaar' && kyc?.aadhaarDetails) {
      const a = kyc.aadhaarDetails;
      return (
        <div className="kyc-summary">
          <div className="kyc-kv"><span>Aadhaar</span><strong>{a.aadhaarNumber}</strong></div>
          <div className="kyc-docs">
            <DocThumb src={a.documentFront} alt="Aadhaar front" />
            <DocThumb src={a.documentBack} alt="Aadhaar back" />
          </div>
        </div>
      );
    }
    if (tab === 'nominee' && kyc?.nomineeDetails) {
      const n = kyc.nomineeDetails;
      return (
        <div className="kyc-summary">
          <div className="kyc-kv-grid">
            <div className="kyc-kv"><span>Name</span><strong>{n.nomineeName}</strong></div>
            <div className="kyc-kv"><span>Relation</span><strong>{n.relation}</strong></div>
            <div className="kyc-kv"><span>Mobile</span><strong>{n.mobile}</strong></div>
          </div>
          <div className="kyc-docs"><DocThumb src={n.document} alt="Nominee doc" /></div>
        </div>
      );
    }
    return <p className="kyc-empty">No documents uploaded yet for this section.</p>;
  };

  if (loading) {
    return (
      <div className="page kyc-page">
        <div className="kyc-hero kyc-skeleton" aria-hidden="true" />
        <div className="kyc-type-grid">
          {[0, 1, 2, 3].map((i) => <div key={i} className="kyc-type-card kyc-skeleton" />)}
        </div>
        <div className="kyc-panel kyc-skeleton" style={{ minHeight: 280 }} />
      </div>
    );
  }

  return (
    <div className="page kyc-page">
      <header className="kyc-hero">
        <div className="kyc-hero-copy">
          <p className="kyc-eyebrow">Identity verification</p>
          <h2>KYC Verification</h2>
          <p className="kyc-lead">
            Complete all four sections. Each document is reviewed separately by admin.
          </p>
        </div>
        <div className="kyc-progress-chip">
          <span>Approved</span>
          <strong>{counts.approved}/{counts.total}</strong>
          <em>
            {counts.uploaded ? `${counts.uploaded} awaiting` : null}
            {counts.uploaded && counts.rejected ? ' · ' : null}
            {counts.rejected ? `${counts.rejected} rejected` : null}
            {!counts.uploaded && !counts.rejected ? `${counts.pending} pending` : null}
          </em>
        </div>
        <div className="kyc-hero-aside" aria-hidden="true">
          <div className="kyc-hero-orb" />
          <ShieldIcon />
        </div>
      </header>

      <div className="kyc-type-grid" role="tablist" aria-label="KYC types">
        {TABS.map((t) => {
          const st = kyc?.status?.[t.id] ?? 0;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`kyc-type-card${tab === t.id ? ' is-active' : ''} tone-${statusTone(st)}`}
              onClick={() => {
                setTab(t.id);
                setError('');
                setSuccess('');
              }}
            >
              <div className="kyc-type-top">
                <strong>{t.label}</strong>
                <span className={`kyc-status tone-${statusTone(st)}`}>{statusLabel(st)}</span>
              </div>
              <p>{t.hint}</p>
            </button>
          );
        })}
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <section className="kyc-panel">
        <div className="kyc-panel-head">
          <div>
            <p className="kyc-section-kicker">{activeTab?.hint}</p>
            <h3>{activeTab?.label} KYC</h3>
          </div>
          <span className={`kyc-status lg tone-${statusTone(status)}`}>{statusLabel(status)}</span>
        </div>

        {status === 3 && remark ? (
          <div className="alert error kyc-reject-note">Rejected: {remark}</div>
        ) : null}

        {status === 1 ? (
          <div className="kyc-wait-note">Submitted — waiting for admin review. You cannot edit until it is approved or rejected.</div>
        ) : null}

        {!canEdit(status) ? (
          renderSummary()
        ) : (
          <>
            {status === 3 ? (
              <div className="kyc-resubmit-wrap">
                <p className="kyc-section-kicker">Previous submission</p>
                {renderSummary()}
              </div>
            ) : null}

            <form onSubmit={submit} className="kyc-form">
              {tab === 'pan' ? (
                <>
                  <label className="kyc-field">
                    <span>PAN Number</span>
                    <input
                      required
                      value={forms.pan.panNumber}
                      onChange={(e) => setField('pan', 'panNumber', e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                  </label>
                  <FileDrop
                    label="Upload PAN card"
                    file={forms.pan.document}
                    preview={previews['pan.document']}
                    required
                    onChange={(f) => setField('pan', 'document', f)}
                  />
                </>
              ) : null}

              {tab === 'bank' ? (
                <>
                  <label className="kyc-field">
                    <span>Account Number</span>
                    <input
                      required
                      value={forms.bank.accountNumber}
                      onChange={(e) => setField('bank', 'accountNumber', e.target.value)}
                    />
                  </label>
                  <label className="kyc-field">
                    <span>IFSC Code</span>
                    <input
                      required
                      value={forms.bank.ifscCode}
                      onChange={(e) => setField('bank', 'ifscCode', e.target.value.toUpperCase())}
                      placeholder="SBIN0001234"
                    />
                  </label>
                  <label className="kyc-field">
                    <span>Bank Name</span>
                    <input
                      required
                      value={forms.bank.bankName}
                      onChange={(e) => setField('bank', 'bankName', e.target.value)}
                    />
                  </label>
                  <label className="kyc-field">
                    <span>Holder Name</span>
                    <input
                      required
                      value={forms.bank.holderName}
                      onChange={(e) => setField('bank', 'holderName', e.target.value)}
                    />
                  </label>
                  <label className="kyc-field">
                    <span>Account Type</span>
                    <select
                      value={forms.bank.accountType}
                      onChange={(e) => setField('bank', 'accountType', e.target.value)}
                    >
                      <option value="Saving">Saving</option>
                      <option value="Current">Current</option>
                    </select>
                  </label>
                  <FileDrop
                    label="Passbook / cancelled cheque"
                    file={forms.bank.document}
                    preview={previews['bank.document']}
                    required
                    onChange={(f) => setField('bank', 'document', f)}
                  />
                </>
              ) : null}

              {tab === 'aadhaar' ? (
                <>
                  <label className="kyc-field kyc-field-span">
                    <span>Aadhaar Number</span>
                    <input
                      required
                      value={forms.aadhaar.aadhaarNumber}
                      onChange={(e) => setField('aadhaar', 'aadhaarNumber', e.target.value.replace(/\D/g, ''))}
                      placeholder="12-digit number"
                      maxLength={12}
                    />
                  </label>
                  <FileDrop
                    label="Aadhaar front"
                    file={forms.aadhaar.documentFront}
                    preview={previews['aadhaar.documentFront']}
                    required
                    onChange={(f) => setField('aadhaar', 'documentFront', f)}
                  />
                  <FileDrop
                    label="Aadhaar back"
                    file={forms.aadhaar.documentBack}
                    preview={previews['aadhaar.documentBack']}
                    required
                    onChange={(f) => setField('aadhaar', 'documentBack', f)}
                  />
                </>
              ) : null}

              {tab === 'nominee' ? (
                <>
                  <label className="kyc-field">
                    <span>Nominee Name</span>
                    <input
                      required
                      value={forms.nominee.nomineeName}
                      onChange={(e) => setField('nominee', 'nomineeName', e.target.value)}
                    />
                  </label>
                  <label className="kyc-field">
                    <span>Relation</span>
                    <input
                      required
                      value={forms.nominee.relation}
                      onChange={(e) => setField('nominee', 'relation', e.target.value)}
                      placeholder="Spouse / Parent / Child"
                    />
                  </label>
                  <label className="kyc-field">
                    <span>Mobile</span>
                    <input
                      required
                      value={forms.nominee.mobile}
                      onChange={(e) => setField('nominee', 'mobile', e.target.value.replace(/\D/g, ''))}
                      maxLength={10}
                      placeholder="10-digit mobile"
                    />
                  </label>
                  <FileDrop
                    label="Nominee ID proof"
                    file={forms.nominee.document}
                    preview={previews['nominee.document']}
                    required
                    onChange={(f) => setField('nominee', 'document', f)}
                  />
                </>
              ) : null}

              <div className="kyc-form-actions">
                <button type="submit" className="btn primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : status === 3 ? 'Re-submit KYC' : 'Submit KYC'}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
