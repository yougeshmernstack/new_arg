import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { commerceApi } from '../../api';

function parseBenefits(text) {
  return String(text || '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function EditPackage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [pkgRes, prodRes] = await Promise.all([
          commerceApi.getPackage(packageId),
          commerceApi.getProducts({ limit: 200 }),
        ]);
        if (!active) return;
        const data = pkgRes.data?.data;
        if (!data) {
          setError('Package not found.');
          setForm(null);
          return;
        }
        setForm({
          name: data.name || '',
          description: data.description || '',
          benefitsText: Array.isArray(data.benefits) ? data.benefits.join('\n') : '',
          amount: data.amount ?? 0,
          discounted_amount: data.discounted_amount ?? data.price ?? 0,
          bv: data.bv ?? 0,
          pv: data.pv ?? 0,
          status: data.status || 'active',
          items: (data.items || []).map((i) => ({
            productId: Number(i.productId),
            quantity: Math.max(1, Number(i.quantity) || 1),
          })),
        });
        setProducts(prodRes.data?.data || []);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load package');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [packageId]);

  const onChange = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const selectedIds = new Set((form?.items || []).map((i) => Number(i.productId)));

  const toggleProduct = (productId) => {
    const id = Number(productId);
    setForm((f) => {
      const exists = (f.items || []).find((i) => Number(i.productId) === id);
      if (exists) {
        return { ...f, items: f.items.filter((i) => Number(i.productId) !== id) };
      }
      return { ...f, items: [...(f.items || []), { productId: id, quantity: 1 }] };
    });
  };

  const setQty = (productId, quantity) => {
    const id = Number(productId);
    const qty = Math.max(1, Number(quantity) || 1);
    setForm((f) => ({
      ...f,
      items: (f.items || []).map((i) =>
        Number(i.productId) === id ? { ...i, quantity: qty } : i
      ),
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!(form.items || []).length) {
      setError('Select at least one product.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await commerceApi.updatePackage({
        packageId: Number(packageId),
        name: form.name,
        description: form.description,
        benefits: parseBenefits(form.benefitsText),
        amount: Number(form.amount),
        discounted_amount: Number(form.discounted_amount),
        bv: Number(form.bv),
        pv: Number(form.pv),
        status: form.status,
        items: form.items.map((i) => ({
          productId: Number(i.productId),
          quantity: Math.max(1, Number(i.quantity) || 1),
        })),
      });
      navigate('/packages');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update package');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page">Loading package...</div>;
  if (!form) {
    return (
      <div className="page">
        {error ? <div className="alert error">{error}</div> : <p>Package not found.</p>}
        <Link className="btn ghost" to="/packages">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>Edit Package #{packageId}</h2>
        <Link className="btn ghost" to="/packages">
          Back
        </Link>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      <form className="form-grid commerce-form" onSubmit={onSubmit}>
        <label>
          Name
          <input required value={form.name} onChange={onChange('name')} />
        </label>
        <label>
          Status
          <select value={form.status} onChange={onChange('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <label>
          Amount (MRP)
          <input required type="number" min="0" step="0.01" value={form.amount} onChange={onChange('amount')} />
        </label>
        <label>
          Discounted amount
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.discounted_amount}
            onChange={onChange('discounted_amount')}
          />
        </label>
        <label>
          Package BV
          <input type="number" min="0" step="0.01" value={form.bv} onChange={onChange('bv')} />
        </label>
        <label>
          Package PV
          <input type="number" min="0" step="0.01" value={form.pv} onChange={onChange('pv')} />
        </label>
        <label className="full">
          Description
          <textarea rows={3} value={form.description} onChange={onChange('description')} />
        </label>
        <label className="full">
          Benefits (one per line or comma-separated)
          <textarea rows={3} value={form.benefitsText} onChange={onChange('benefitsText')} />
        </label>

        <div className="full">
          <h3>Products in package</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th />
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Stock</th>
                  <th>Qty in package</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const checked = selectedIds.has(Number(p.productId));
                  const row = (form.items || []).find((i) => Number(i.productId) === Number(p.productId));
                  return (
                    <tr key={p.productId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProduct(p.productId)}
                        />
                      </td>
                      <td>{p.product_name}</td>
                      <td>{p.sku}</td>
                      <td>{p.stock}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          disabled={!checked}
                          value={row?.quantity ?? 1}
                          onChange={(e) => setQty(p.productId, e.target.value)}
                          style={{ width: 80 }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="form-actions full">
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save package'}
          </button>
        </div>
      </form>
    </div>
  );
}
