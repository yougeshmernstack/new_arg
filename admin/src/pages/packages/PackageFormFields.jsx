import { useRef } from 'react';
import { API_BASE_URL } from '../../utils/constants';

export function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function ImageUploadSection({
  title,
  hint,
  images,
  uploading,
  disabled,
  onUpload,
  onRemove,
  emptyText,
}) {
  const inputRef = useRef(null);

  return (
    <div className="pkg-upload">
      <div className="pkg-upload-head">
        <div>
          <h4>{title}</h4>
          <p>{hint}</p>
        </div>
        <span className="badge">{images.length} file{images.length === 1 ? '' : 's'}</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={disabled}
        className="pkg-upload-input"
        onChange={onUpload}
      />

      <button
        type="button"
        className="pkg-upload-trigger"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <strong>{uploading ? 'Uploading…' : 'Choose images'}</strong>
        <span>JPG, PNG, WEBP — multiple allowed</span>
      </button>

      {images.length ? (
        <div className="media-preview-grid">
          {images.map((url, index) => (
            <div key={`${url}-${index}`} className="media-preview-item">
              <img src={mediaUrl(url)} alt={`${title} ${index + 1}`} />
              <button type="button" className="btn ghost" onClick={() => onRemove(index)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted pkg-upload-empty">{emptyText}</p>
      )}
    </div>
  );
}

export default function PackageFormFields({
  form,
  onChange,
  products,
  items,
  updateItem,
  addItem,
  removeItem,
  images,
  descriptionImages,
  uploading,
  onUploadImages,
  onUploadDescriptionImages,
  onRemoveImage,
  onRemoveDescriptionImage,
  statusOptions = ['active', 'inactive'],
  submitLabel,
  submitting,
}) {
  const busy = Boolean(uploading);

  return (
    <div className="package-form">
      <section className="panel">
        <div className="pkg-section-head">
          <h3>Basic details</h3>
          <p className="muted">Package name, price, BV/PV and status</p>
        </div>
        <div className="pkg-fields">
          <label className="full">
            Package name
            <input name="name" value={form.name} onChange={onChange} required />
          </label>
          <label>
            List amount
            <input name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={onChange} />
          </label>
          <label>
            Discounted amount
            <input
              name="discounted_amount"
              type="number"
              min="0"
              step="0.01"
              value={form.discounted_amount}
              onChange={onChange}
            />
          </label>
          <label>
            BV
            <input name="bv" type="number" min="0" step="0.01" value={form.bv} onChange={onChange} />
          </label>
          <label>
            PV
            <input name="pv" type="number" min="0" step="0.01" value={form.pv} onChange={onChange} />
          </label>
          <label>
            Status
            <select name="status" value={form.status} onChange={onChange}>
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="pkg-section-head">
          <h3>Content</h3>
          <p className="muted">Text shown on package detail pages</p>
        </div>
        <div className="pkg-fields">
          <label className="full">
            Description
            <textarea name="description" rows={4} value={form.description} onChange={onChange} />
          </label>
          <label className="full">
            Benefits (one per line, or comma separated)
            <textarea name="benefits" rows={4} value={form.benefits} onChange={onChange} />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="pkg-section-head">
          <h3>Images</h3>
          <p className="muted">Main gallery vs description section — upload separately</p>
        </div>
        <div className="pkg-upload-grid">
          <ImageUploadSection
            title="Package images"
            hint="Main cover / gallery photos for this package"
            images={images}
            uploading={uploading === 'package'}
            disabled={busy}
            onUpload={onUploadImages}
            onRemove={onRemoveImage}
            emptyText="No package images yet"
          />
          <ImageUploadSection
            title="Description images"
            hint="Extra images shown with the description content"
            images={descriptionImages}
            uploading={uploading === 'description'}
            disabled={busy}
            onUpload={onUploadDescriptionImages}
            onRemove={onRemoveDescriptionImage}
            emptyText="No description images yet"
          />
        </div>
      </section>

      <section className="panel">
        <div className="pkg-section-head">
          <div>
            <h3>Products in package</h3>
            <p className="muted">Which products and quantities are included</p>
          </div>
          <button type="button" className="btn ghost" onClick={addItem}>
            Add product
          </button>
        </div>

        <div className="pkg-items">
          {items.map((row, index) => (
            <div key={index} className="pkg-item-row">
              <label>
                Product
                <select
                  value={row.productId}
                  onChange={(e) => updateItem(index, 'productId', e.target.value)}
                  required
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.product_name} ({p.sku})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Qty
                <input
                  type="number"
                  min="1"
                  value={row.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn ghost"
                onClick={() => removeItem(index)}
                disabled={items.length <= 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="pkg-form-actions">
        <button type="submit" className="btn primary" disabled={submitting || busy}>
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </div>
  );
}
