import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageCard } from "@/components/PackageCard";
import { ProductGallery } from "@/components/ProductGallery";
import { getCatalogPackage, getCatalogPackages } from "@/lib/catalog";
import { brand as fallbackBrand } from "@/data/brand";

type PackageDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PackageDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const pack = await getCatalogPackage(slug);

  return {
    title: pack ? `${pack.name} | ${fallbackBrand.name}` : `Package | ${fallbackBrand.name}`,
  };
}

export default async function PackageDetailPage({ params }: PackageDetailProps) {
  const { slug } = await params;
  const [pack, allPackages] = await Promise.all([getCatalogPackage(slug), getCatalogPackages()]);

  if (!pack) {
    notFound();
  }

  const related = allPackages.filter((item) => item.slug !== pack.slug);
  const savings = pack.compareAtPrice - pack.price;
  const galleryImages = pack.images?.length ? pack.images : [pack.image];
  const descriptionImages = pack.descriptionImages || [];

  return (
    <>
      <section className="detail-layout package-detail">
        <div className="detail-art">
          <ProductGallery images={galleryImages} alt={pack.name} badge={pack.badge} />
        </div>
        <div className="detail-copy">
          <p className="eyebrow">Wellness package</p>
          <h1>{pack.name}</h1>
          <p>{pack.description}</p>
          <div className="detail-price">
            <strong>Rs. {pack.price.toLocaleString("en-IN")}</strong>
            {savings > 0 ? <del>Rs. {pack.compareAtPrice.toLocaleString("en-IN")}</del> : null}
            {savings > 0 ? <span className="save-badge">Save Rs. {savings}</span> : null}
          </div>
          <div className="hero-actions">
            <Link className="button button-soft" href="/packages">
              Back to packages
            </Link>
          </div>
        </div>
      </section>

      <section className="section product-info-grid">
        {pack.includes.length > 0 ? (
          <article className="info-card">
            <h2>Included products</h2>
            <ul>
              {pack.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ) : null}
        {pack.benefits.length > 0 ? (
          <article className="info-card">
            <h2>Package benefits</h2>
            <ul>
              {pack.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </article>
        ) : null}
      </section>

      {descriptionImages.length > 0 ? (
        <section className="section product-desc-images">
          <div className="section-header">
            <div>
              <p className="eyebrow">Package story</p>
              <h2>Description</h2>
            </div>
          </div>
          <div className="product-desc-images-stack">
            {descriptionImages.map((src, index) => (
              <Image
                key={`${src}-${index}`}
                className="product-desc-image"
                src={src}
                alt={`${pack.name} description ${index + 1}`}
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
              <p className="eyebrow">Other packages</p>
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
      ) : null}
    </>
  );
}
