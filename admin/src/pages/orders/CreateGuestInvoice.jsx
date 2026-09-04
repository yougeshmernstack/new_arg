import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { commerceApi } from '../../api';

const emptyAddress = {
  name: '',
  mobile: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
};

const emptyLine = () => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  mode: 'product',
  productId: '',
  product_name: '',
  sku: '',
  hsn_code: '',
  quantity: 1,
  price: '',
});

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CreateGuestInvoice() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    mobile: '',
    gst_number: '',
    payment_ref: '',
  });
  const [billing, setBilling] = useState({ ...emptyAddress });
  const [shipping, setShipping] = useState({ ...emptyAddress });
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [lines, setLines] = useState([emptyLine()]);
  const [remark, setRemark] = useState('');
  const [deductStock, setDeductStock] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingProducts(true);
      try {
        const res = await commerceApi.getProducts({ limit: 200 });
        if (alive) setProducts(res.data?.data || []);
      } catch (err) {
        if (alive) setError(err.response?.data?.message || 'Failed to load products');
      } finally {
        if (alive) setLoadingProducts(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(String(p.productId), p));
    return map;
  }, [products]);

  const updateCustomer = (e) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
    if (name === 'name' || name === 'mobile') {
      setBilling((prev) => ({
        ...prev,
        ...(name === 'name' && !prev.name ? { name: value } : {}),
        ...(name === 'mobile' && !prev.mobile ? { mobile: value } : {}),
      }));
    }
  };

  const updateAddress = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  const updateLine = (key, patch) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const onPickProduct = (key, productId) => {
    const product = productMap.get(String(productId));
    updateLine(key, {
      productId,
      product_name: product?.product_name || '',
      sku: product?.sku || '',
      hsn_code: product?.hsn_code || '',
      price: product?.mrp ?? '',
    });
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (key) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.key !== key)));
  };

  const GUEST_DISCOUNT_PERCENT = 20;

  const estimatedTotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const qty = Number(line.quantity) || 0;
      const list = Number(line.price) || 0;
      const discounted = list * (1 - GUEST_DISCOUNT_PERCENT / 100);
      return sum + qty * discounted;
    }, 0);
  }, [lines]);

  const estimatedListTotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const qty = Number(line.quantity) || 0;
      const list = Number(line.price) || 0;
      return sum + qty * list;
    }, 0);
  }, [lines]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const shippingPayload = sameAsBilling
        ? {
            ...billing,
            name: billing.name || customer.name,
            mobile: billing.mobile || customer.mobile,
          }
        : shipping;

      const items = lines.map((line) => {
        if (line.mode === 'product') {
          return {
            productId: Number(line.productId),
            quantity: Number(line.quantity),
            price: line.price === '' ? undefined : Number(line.price),
          };
        }
        return {
          productId: 0,
          product_name: line.product_name,
          sku: line.sku || 'CUSTOM',
          hsn_code: line.hsn_code || '',
          quantity: Number(line.quantity),
          price: Number(line.price),
        };
      });

      const res = await commerceApi.createGuestInvoice({
        customer: {
          name: customer.name,
          email: customer.email,
          mobile: customer.mobile,
          gst_number: customer.gst_number,
          payment_ref: customer.payment_ref,
        },
        billing_address: {
          ...billing,
          name: billing.name || customer.name,
          mobile: billing.mobile || customer.mobile,
        },
        shipping_address: shippingPayload,
        items,
        remark,
        deduct_stock: deductStock,
      });

      const invoiceNumber = res.data?.data?.invoice_number || '';
      const orderId = res.data?.data?.order?.orderId;
      setSuccess(`Invoice ${invoiceNumber} created.`);
      if (orderId) {
        setTimeout(() => navigate(`/orders/${orderId}`), 700);
      } else {
        setTimeout(() => navigate('/orders/guest'), 700);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create guest invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Create Guest Invoice</h2>
          <p className="page-sub">
            Cut a bill without username — billing + shipping. Products get 20% off; discounted amount is GST-inclusive.
          </p>
        </div>
        <Link className="btn ghost" to="/orders/guest">
          ← Guest invoices
        </Link>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <form className="form-grid" onSubmit={onSubmit} style={{ maxWidth: 980 }}>
        <h3 className="full" style={{ margin: '8px 0 0' }}>
          Customer
        </h3>
        <label>
          Name *
          <input name="name" value={customer.name} onChange={updateCustomer} required />
        </label>
        <label>
          Mobile
          <input name="mobile" value={customer.mobile} onChange={updateCustomer} />
        </label>
        <label>
          Email
          <input name="email" type="email" value={customer.email} onChange={updateCustomer} />
        </label>
        <label>
          GST number
          <input name="gst_number" value={customer.gst_number} onChange={updateCustomer} />
        </label>
        <label>
          Payment reference / UTR
          <input name="payment_ref" value={customer.payment_ref} onChange={updateCustomer} />
        </label>

        <h3 className="full" style={{ margin: '16px 0 0' }}>
          Billing address
        </h3>
        <label>
          Name
          <input name="name" value={billing.name} onChange={updateAddress(setBilling)} />
        </label>
        <label>
          Mobile
          <input name="mobile" value={billing.mobile} onChange={updateAddress(setBilling)} />
        </label>
        <label className="full">
          Address line 1 *
          <input name="line1" value={billing.line1} onChange={updateAddress(setBilling)} required />
        </label>
        <label className="full">
          Address line 2
          <input name="line2" value={billing.line2} onChange={updateAddress(setBilling)} />
        </label>
        <label>
          City
          <input name="city" value={billing.city} onChange={updateAddress(setBilling)} />
        </label>
        <label>
          State
          <input name="state" value={billing.state} onChange={updateAddress(setBilling)} />
        </label>
        <label>
          Pincode
          <input name="pincode" value={billing.pincode} onChange={updateAddress(setBilling)} />
        </label>
        <label>
          Country
          <input name="country" value={billing.country} onChange={updateAddress(setBilling)} />
        </label>

        <label className="full" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={sameAsBilling}
            onChange={(e) => setSameAsBilling(e.target.checked)}
          />
          Shipping address same as billing
        </label>

        {!sameAsBilling ? (
          <>
            <h3 className="full" style={{ margin: '8px 0 0' }}>
              Shipping address
            </h3>
            <label>
              Name
              <input name="name" value={shipping.name} onChange={updateAddress(setShipping)} />
            </label>
            <label>
              Mobile
              <input name="mobile" value={shipping.mobile} onChange={updateAddress(setShipping)} />
            </label>
            <label className="full">
              Address line 1 *
              <input
                name="line1"
                value={shipping.line1}
                onChange={updateAddress(setShipping)}
                required={!sameAsBilling}
              />
            </label>
            <label className="full">
              Address line 2
              <input name="line2" value={shipping.line2} onChange={updateAddress(setShipping)} />
            </label>
            <label>
              City
              <input name="city" value={shipping.city} onChange={updateAddress(setShipping)} />
            </label>
            <label>
              State
              <input name="state" value={shipping.state} onChange={updateAddress(setShipping)} />
            </label>
            <label>
              Pincode
              <input name="pincode" value={shipping.pincode} onChange={updateAddress(setShipping)} />
            </label>
            <label>
              Country
              <input name="country" value={shipping.country} onChange={updateAddress(setShipping)} />
            </label>
          </>
        ) : null}

        <h3 className="full" style={{ margin: '16px 0 0' }}>
          Invoice items
        </h3>
        {loadingProducts ? <p className="full page-sub">Loading products…</p> : null}

        {lines.map((line, index) => (
          <div
            key={line.key}
            className="full"
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr 90px 120px auto',
              gap: 10,
              alignItems: 'end',
              padding: '10px 0',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <label>
              Type
              <select
                value={line.mode}
                onChange={(e) =>
                  updateLine(line.key, {
                    mode: e.target.value,
                    productId: '',
                    product_name: '',
                    sku: '',
                    price: '',
                  })
                }
              >
                <option value="product">Product</option>
                <option value="custom">Custom</option>
              </select>
            </label>

            {line.mode === 'product' ? (
              <label>
                Product {index + 1}
                <select
                  value={line.productId}
                  onChange={(e) => onPickProduct(line.key, e.target.value)}
                  required
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.product_name} (stock {p.stock}) — ₹{formatMoney(p.mrp)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                Item name
                <input
                  value={line.product_name}
                  onChange={(e) => updateLine(line.key, { product_name: e.target.value })}
                  required
                />
              </label>
            )}

            <label>
              Qty
              <input
                type="number"
                min="1"
                value={line.quantity}
                onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                required
              />
            </label>
            <label>
              MRP / Price
              <input
                type="number"
                min="0"
                step="0.01"
                value={line.price}
                onChange={(e) => updateLine(line.key, { price: e.target.value })}
                required={line.mode === 'custom'}
                placeholder={line.mode === 'product' ? 'MRP' : '0'}
              />
            </label>
            <button type="button" className="btn ghost" onClick={() => removeLine(line.key)}>
              Remove
            </button>
          </div>
        ))}

        <div className="full" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn ghost" onClick={addLine}>
            + Add item
          </button>
          <span className="page-sub">
            MRP total: ₹{formatMoney(estimatedListTotal)} → after 20% off (GST incl.): ₹
            {formatMoney(estimatedTotal)}
          </span>
        </div>

        <p className="full page-sub" style={{ marginTop: 0 }}>
          Guest product purchase: automatic 20% discount. Pay amount already includes GST.
        </p>

        <label className="full">
          Remark
          <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />
        </label>

        <label className="full" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={deductStock}
            onChange={(e) => setDeductStock(e.target.checked)}
          />
          Deduct product stock (catalog items only)
        </label>

        <div className="full" style={{ display: 'flex', gap: 10 }}>
          <button className="btn" type="submit" disabled={loading || loadingProducts}>
            {loading ? 'Creating…' : 'Generate invoice'}
          </button>
          <Link className="btn ghost" to="/orders/guest">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
