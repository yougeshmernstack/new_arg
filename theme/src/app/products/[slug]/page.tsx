import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { getCatalogProduct, getCatalogProducts } from "@/lib/catalog";
import { getSiteBrand } from "@/lib/siteContent";
import { brand as fallbackBrand } from "@/data/brand";
import { ProductGallery } from "@/components/ProductGallery";

type ProductDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: ProductDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);

  return {
    title: product ? `${product.name} | ${fallbackBrand.name}` : `Product | ${fallbackBrand.name}`,
  };
}

export default async function ProductDetailPage({ params }: ProductDetailProps) {
  const { slug } = await params;
  const [brand, product, allProducts] = await Promise.all([
    getSiteBrand(),
    getCatalogProduct(slug),
    getCatalogProducts(),
  ]);

  if (!product) {
    notFound();
  }

  const related = allProducts.filter((item) => item.slug !== product.slug).slice(0, 3);
  const galleryImages = product.images?.length ? product.images : [product.image];
  const descriptionImages = product.descriptionImages || [];

  return (
    <>
      <section className="detail-layout">
        <div className="detail-art">
          <ProductGallery images={galleryImages} alt={product.name} badge={product.badge} />
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <p>{product.longDescription}</p>
          <div className="detail-price">
            <strong>Rs. {product.price.toLocaleString("en-IN")}</strong>
            {product.compareAtPrice ? <del>Rs. {product.compareAtPrice.toLocaleString("en-IN")}</del> : null}
          </div>
          {product.packSize ? <p className="muted">Pack size: {product.packSize}</p> : null}
          <div className="hero-actions">
            <Link className="button" href="/shop">
              Buy in live shop
            </Link>
            <Link className="button button-soft" href="/products">
              Back to products
            </Link>
          </div>
        </div>
      </section>

      <section className="section product-info-grid">
        {product.benefits.length > 0 ? (
          <article className="info-card">
            <h2>Benefits</h2>
            <ul>
              {product.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </article>
        ) : null}
        {product.ingredients.length > 0 ? (
          <article className="info-card">
            <h2>Ingredients</h2>
            <ul>
              {product.ingredients.map((ingredient) => (
                <li key={ingredient}>{ingredient}</li>
              ))}
            </ul>
          </article>
        ) : null}
        {product.usage ? (
          <article className="info-card">
            <h2>How to use</h2>
            <p>{product.usage}</p>
          </article>
        ) : null}
      </section>

      {descriptionImages.length > 0 ? (
        <section className="section product-desc-images">
          <div className="section-header">
            <div>
              <p className="eyebrow">Product story</p>
              <h2>Description</h2>
            </div>
          </div>
          <div className="product-desc-images-stack">
            {descriptionImages.map((src, index) => (
              <Image
                key={`${src}-${index}`}
                className="product-desc-image"
                src={src}
                alt={`${product.name} description ${index + 1}`}
                width={1400}
                height={900}
                unoptimized={src.startsWith("http")}
              />
            ))}
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">You may also like</p>
              <h2>Related products</h2>
            </div>
            <Link className="text-link" href="/products">
              View all
            </Link>
          </div>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section centered-section">
        <p className="muted">Questions about {product.name}? Contact {brand.name}.</p>
        <Link className="text-link" href="/contact">
          Contact us
        </Link>
      </section>
    </>
  );
}
