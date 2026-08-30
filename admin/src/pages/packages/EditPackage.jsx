import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { commerceApi } from '../../api';
import PackageFormFields from './PackageFormFields';

export default function EditPackage() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [images, setImages] = useState([]);
  const [descriptionImages, setDescriptionImages] = useState([]);
  const [uploading, setUploading] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [pkgRes, prodRes] = await Promise.all([
          commerceApi.getPackage(packageId),
          commerceApi.getProducts({ limit: 200, status: 'enabled' }),
        ]);
        if (!active) return;
        const pkg = pkgRes.data?.data;
        setProducts(prodRes.data?.data || []);
        setForm({
          name: pkg.name || '',
          description: pkg.description || '',
          amount: pkg.amount ?? '',
          discounted_amount: pkg.discounted_amount ?? pkg.price ?? '',
          bv: pkg.bv ?? '',
          pv: pkg.pv ?? '',
          benefits: Array.isArray(pkg.benefits) ? pkg.benefits.join('\n') : '',
          status: pkg.status || 'active',
        });
        setImages(Array.isArray(pkg.images) ? pkg.images.filter(Boolean) : []);
        setDescriptionImages(
          Array.isArray(pkg.description_images) ? pkg.description_images.filter(Boolean) : [],
        );
        setItems(
          (pkg.items || []).length
            ? pkg.items.map((row) => ({
                productId: String(row.productId),
                quantity: row.quantity || 1,
              }))
            : [{ productId: '', quantity: 1 }],
        );
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

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addItem = () => setItems((prev) => [...prev, { productId: '', quantity: 1 }]);

  const removeItem = (index) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const uploadImages = async (e, kind, setter) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(kind);
    setError('');
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      const res = await commerceApi.uploadMedia(formData);
      const uploaded = res.data?.data?.images || [];
      setter((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload images');
    } finally {
      setUploading('');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const normalizedItems = items
        .filter((row) => row.productId)
        .map((row) => ({
          productId: Number(row.productId),
          quantity: Math.max(1, Number(row.quantity) || 1),
        }));
      await commerceApi.updatePackage({
        packageId: Number(packageId),
        ...form,
        amount: Number(form.amount) || 0,
        discounted_amount: Number(form.discounted_amount) || 0,
        bv: Number(form.bv) || 0,
        pv: Number(form.pv) || 0,
        images,
        description_images: descriptionImages,
        items: normalizedItems,
      });
      navigate('/packages');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update package');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page">Loading package...</div>;
  if (!form) return <div className="page alert error">{error || 'Package not found'}</div>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Edit Package #{packageId}</h2>
          <p className="page-sub">{form.name}</p>
        </div>
        <Link className="btn ghost" to="/packages">
          Back
        </Link>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <form onSubmit={onSubmit}>
        <PackageFormFields
          form={form}
          onChange={onChange}
          products={products}
          items={items}
          updateItem={updateItem}
          addItem={addItem}
          removeItem={removeItem}
          images={images}
          descriptionImages={descriptionImages}
          uploading={uploading}
          onUploadImages={(e) => uploadImages(e, 'package', setImages)}
          onUploadDescriptionImages={(e) => uploadImages(e, 'description', setDescriptionImages)}
          onRemoveImage={(index) => setImages((prev) => prev.filter((_, i) => i !== index))}
          onRemoveDescriptionImage={(index) =>
            setDescriptionImages((prev) => prev.filter((_, i) => i !== index))
          }
          statusOptions={['active', 'inactive', 'disabled']}
          submitLabel="Save changes"
          submitting={saving}
        />
      </form>
    </div>
  );
}
