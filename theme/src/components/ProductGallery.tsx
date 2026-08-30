'use client';

import Image from 'next/image';
import { useState } from 'react';

type ProductGalleryProps = {
  images: string[];
  alt: string;
  badge?: string;
};

export function ProductGallery({ images, alt, badge }: ProductGalleryProps) {
  const list = images.filter(Boolean);
  const [active, setActive] = useState(0);
  const current = list[active] || list[0];

  if (!current) {
    return <div className="detail-gallery-empty">No image</div>;
  }

  return (
    <div className="detail-gallery">
      <div className="detail-gallery-main">
        <Image
          className="detail-image"
          src={current}
          alt={alt}
          width={760}
          height={760}
          priority
          unoptimized={current.startsWith('http')}
        />
        {badge ? <strong>{badge}</strong> : null}
      </div>
      {list.length > 1 ? (
        <div className="detail-gallery-thumbs">
          {list.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              className={`detail-gallery-thumb${index === active ? ' active' : ''}`}
              onClick={() => setActive(index)}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={src}
                alt=""
                width={120}
                height={120}
                unoptimized={src.startsWith('http')}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
