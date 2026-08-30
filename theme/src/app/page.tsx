import Link from "next/link";
import { PackageCard } from "@/components/PackageCard";
import { ProductCard } from "@/components/ProductCard";
import { HeroBleed } from "@/components/HeroBleed";
import { SectionHeader } from "@/components/SectionHeader";
import { getCatalogPackages, getCatalogProducts } from "@/lib/catalog";
import { getSiteBrand } from "@/lib/siteContent";

const HERO_FALLBACK = "/images/brand/hero-wellness.jpg";

export default async function Home() {
  const [brand, products, packages] = await Promise.all([
    getSiteBrand(),
    getCatalogProducts(),
    getCatalogPackages(),
  ]);
  const featuredProducts = products.slice(0, 4);
  const featuredPackages = packages.slice(0, 3);
  const heroSrc = brand.heroImage || HERO_FALLBACK;
  const heroSlides =
    brand.heroSlides?.length > 0
      ? brand.heroSlides
      : [{ id: 'default', imageUrl: heroSrc, linkUrl: '', title: '' }];
  const lede =
    brand.tagline ||
    brand.subSlogan ||
    "Cold-pressed juices and clean wellness essentials made from real fruit, botanicals, and nothing artificial.";

  return (
    <>
      <HeroBleed
        brandName={brand.name}
        slogan={brand.slogan || "Wellness in every sip."}
        lede={lede}
        heroSrc={heroSrc}
        slides={heroSlides}
      />

      <section className="section section-catalog" id="catalog">
        <SectionHeader
          eyebrow="Catalog"
          title="Featured products"
          description="Browse what we craft — clean ingredients, clear pricing."
          actionLabel="All products"
          actionHref="/products"
        />
        <div className="product-grid">
          {featuredProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      {featuredPackages.length > 0 ? (
        <section className="section section-band">
          <div className="section-band-inner">
            <SectionHeader
              eyebrow="Packages"
              title="Ready wellness routines"
              description="Curated bundles for everyday nourishment."
              actionLabel="All packages"
              actionHref="/packages"
            />
            <div className="package-grid">
              {featuredPackages.map((pack) => (
                <PackageCard key={pack.slug} pack={pack} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section story-strip">
        <div className="story-copy">
          <p className="eyebrow">Why {brand.name}</p>
          <h2>{brand.motto || "Nourish. Heal. Thrive."}</h2>
          <p>{brand.about}</p>
          <Link className="text-link" href="/about">
            Our story
          </Link>
        </div>
        <div className="story-points">
          {(brand.pillars.length ? brand.pillars : brand.features).slice(0, 3).map((item, index) => (
            <article key={item.label} className="story-point">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.label}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
