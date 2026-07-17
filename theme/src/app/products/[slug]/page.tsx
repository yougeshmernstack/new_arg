import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { RatingStars } from "@/components/RatingStars";
import { brand } from "@/data/brand";
import { products } from "@/data/commerce";

type ProductDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug
  }));
}

export async function generateMetadata({ params }: ProductDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);

  return {
    title: product ? `${product.name} | ${brand.name}` : `Product | ${brand.name}`
  };
}

export default async function ProductDetailPage({ params }: ProductDetailProps) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);

  if (!product) {
    notFound();
  }

  const related = products
    .filter((item) => item.category === product.category && item.slug !== product.slug)
    .concat(products.filter((item) => item.slug !== product.slug))
    .slice(0, 3);
  const isUpcoming = product.status === "upcoming";

  return (
    <>
      <section className="detail-layout">
        <div className="detail-art">
          <Image className="detail-image" src={product.image} alt={product.name} width={760} height={760} priority />
          {product.badge ? <strong>{product.badge}</strong> : null}
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <RatingStars rating={product.rating} reviews={product.reviews} />
          <p>{product.longDescription}</p>
          <div className="detail-price">
            {isUpcoming ? (
              <strong>Coming soon</strong>
            ) : (
              <>
                <strong>Rs. {product.price.toLocaleString("en-IN")}</strong>
                {product.compareAtPrice ? <del>Rs. {product.compareAtPrice.toLocaleString("en-IN")}</del> : null}
              </>
            )}
          </div>
          <p className="muted">Pack size: {product.packSize}</p>
          {!isUpcoming ? (
            <div className="quantity-row">
              <button type="button">-</button>
              <span>1</span>
              <button type="button">+</button>
            </div>
          ) : null}
          <div className="hero-actions">
            {isUpcoming ? (
              <Link className="button" href="/products">
                Notify me soon
              </Link>
            ) : (
              <>
                <Link className="button" href="/cart">
                  Add to cart
                </Link>
                <Link className="button button-soft" href="/checkout">
                  Buy now
                </Link>
              </>
            )}
          </div>
          <div className="tag-row">
            {product.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="section product-info-grid">
        <article className="info-card">
          <h2>Benefits</h2>
          <ul>
            {product.benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </article>
        <article className="info-card">
          <h2>Ingredients</h2>
          <ul>
            {product.ingredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </article>
        <article className="info-card">
          <h2>How to use</h2>
          <p>{product.usage}</p>
        </article>
      </section>

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
    </>
  );
}
