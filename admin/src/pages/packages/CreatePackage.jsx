import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { commerceApi } from '../../api';
import PackageFormFields from './PackageFormFields';

const initial = {
  name: '',
  description: '',
  amount: '',
  discounted_amount: '',
  bv: '',
  pv: '',
  benefits: '',
  status: 'active',
};

export default function CreatePackage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([{ productId: '', quantity: 1 }]);
  const [images, setImages] = useState([]);
  const [descriptionImages, setDescriptionImages] = useState([]);
  const [uploading, setUploading] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await commerceApi.getProducts({ limit: 200, status: 'enabled' });
        setProducts(res.data?.data || []);
      } catch {
        setProducts([]);
      }
    })();
  }, []);

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
    setLoading(true);
    setError('');
    try {
      const normalizedItems = items
        .filter((row) => row.productId)
        .map((row) => ({
          productId: Number(row.productId),
          quantity: Math.max(1, Number(row.quantity) || 1),
        }));
      await commerceApi.createPackage({
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
      setError(err.response?.data?.message || 'Failed to create package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Create Package</h2>
          <p className="page-sub">Bundle products for distributor activation</p>
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
          submitLabel="Create package"
          submitting={loading}
        />
      </form>
    </div>
  );
}
