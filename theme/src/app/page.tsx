import Link from "next/link";
import { PackageCard } from "@/components/PackageCard";
import { HeroBleed } from "@/components/HeroBleed";
import { SectionHeader } from "@/components/SectionHeader";
import { getCatalogPackages } from "@/lib/catalog";
import { getSiteBrand } from "@/lib/siteContent";

const HERO_FALLBACK = "/images/brand/hero-wellness.jpg";

export default async function Home() {
  const [brand, packages] = await Promise.all([
    getSiteBrand(),
    getCatalogPackages(),
  ]);
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
  const storyPoints = (brand.pillars.length ? brand.pillars : brand.features)
    .filter((item) => item.label || item.description)
    .slice(0, 6);
  const showHomeStory = brand.homeStoryEnabled !== false;

  return (
    <>
      <HeroBleed
        brandName={brand.name}
        slogan={brand.slogan || "Wellness in every sip."}
        lede={lede}
        heroSrc={heroSrc}
        slides={heroSlides}
      />

      {featuredPackages.length > 0 ? (
        <section className="section section-band" id="catalog">
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
      ) : (
        <div id="catalog" />
      )}

      {showHomeStory ? (
        <section className="section story-strip">
          <div className="story-copy">
            <p className="eyebrow">Why {brand.name}</p>
            <h2>{brand.motto || "Nourish. Heal. Thrive."}</h2>
            <p>{brand.about}</p>
            <Link className="text-link" href="/about">
              Our story
            </Link>
          </div>
          {storyPoints.length > 0 ? (
            <div className="story-points">
              {storyPoints.map((item, index) => (
                <article key={`${item.label}-${index}`} className="story-point">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{item.label}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
