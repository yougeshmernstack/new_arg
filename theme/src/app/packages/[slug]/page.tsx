import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageCard } from "@/components/PackageCard";
import { RatingStars } from "@/components/RatingStars";
import { brand } from "@/data/brand";
import { packages } from "@/data/commerce";

type PackageDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return packages.map((pack) => ({
    slug: pack.slug
  }));
}

export async function generateMetadata({ params }: PackageDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const pack = packages.find((item) => item.slug === slug);

  return {
    title: pack ? `${pack.name} | ${brand.name}` : `Package | ${brand.name}`
  };
}

export default async function PackageDetailPage({ params }: PackageDetailProps) {
  const { slug } = await params;
  const pack = packages.find((item) => item.slug === slug);

  if (!pack) {
    notFound();
  }

  const related = packages.filter((item) => item.slug !== pack.slug);
  const savings = pack.compareAtPrice - pack.price;

  return (
    <>
      <section className="detail-layout package-detail">
        <div className="detail-art">
          <Image className="detail-image package-detail-image" src={pack.image} alt={pack.name} width={850} height={646} priority />
          <strong>{pack.badge}</strong>
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{pack.duration} package</p>
          <h1>{pack.name}</h1>
          <RatingStars rating={pack.rating} reviews={pack.reviews} />
          <p>{pack.description}</p>
          <div className="detail-price">
            <strong>Rs. {pack.price.toLocaleString("en-IN")}</strong>
            {savings > 0 ? <del>Rs. {pack.compareAtPrice.toLocaleString("en-IN")}</del> : null}
            {savings > 0 ? <span className="save-badge">Save Rs. {savings}</span> : null}
          </div>
          <div className="hero-actions">
            <Link className="button" href="/cart">
              Add package
            </Link>
            <Link className="button button-soft" href="/checkout">
              Checkout now
            </Link>
          </div>
          <div className="notice-card">
            <strong>Ideal for</strong>
            <p>{pack.idealFor}</p>
          </div>
        </div>
      </section>

      <section className="section product-info-grid">
        <article className="info-card">
          <h2>Included products</h2>
          <ul>
            {pack.includes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="info-card">
          <h2>Package benefits</h2>
          <ul>
            {pack.benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </article>
        <article className="info-card">
          <h2>Routine duration</h2>
          <p>{pack.duration}</p>
          <p className="muted">Replace this later with subscription or refill logic.</p>
        </article>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Other routines</p>
            <h2>Related packages</h2>
          </div>
          <Link className="text-link" href="/packages">
            View all
          </Link>
        </div>
        <div className="package-grid">
          {related.map((item) => (
            <PackageCard key={item.slug} pack={item} />
          ))}
        </div>
      </section>
    </>
  );
}
