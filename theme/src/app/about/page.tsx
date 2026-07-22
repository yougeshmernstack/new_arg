import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSiteBrand } from "@/lib/siteContent";
import { brand as fallbackBrand } from "@/data/brand";

export const metadata: Metadata = {
  title: `About Us | ${fallbackBrand.name}`,
  description: `Learn about ${fallbackBrand.name} — our mission, vision, values, founders, and commitment to natural wellness.`,
};

export default async function AboutPage() {
  const brand = await getSiteBrand();
  const founders = brand.founders.filter((f) => f.name);

  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-inner">
          <p className="eyebrow">About us</p>
          <h1>
            Nature&apos;s path
            <span>to healthy living</span>
          </h1>
          <p className="about-hero-lede">{brand.description}</p>
          <div className="about-hero-meta">
            <span>{brand.tagline}</span>
            <Link href="/products">Shop products →</Link>
            <Link href="/contact">Contact →</Link>
          </div>
        </div>
      </section>

      <section className="section about-story">
        <div className="about-story-copy">
          <p className="eyebrow">Our story</p>
          <h2>About {brand.name}</h2>
          {brand.aboutExtended.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {brand.howItWasBuilt ? (
            <div className="about-built">
              <h3>How it was built</h3>
              <p>{brand.howItWasBuilt}</p>
            </div>
          ) : null}
        </div>
        <div className="about-mv">
          <article className="about-mv-item">
            <p className="eyebrow">Mission</p>
            <h3>What we do</h3>
            <p>{brand.mission}</p>
          </article>
          <article className="about-mv-item">
            <p className="eyebrow">Vision</p>
            <h3>Where we&apos;re going</h3>
            <p>{brand.vision}</p>
          </article>
        </div>
      </section>

      <section className="section about-values">
        <div className="about-section-head">
          <p className="eyebrow">Values</p>
          <h2>What guides us</h2>
        </div>
        <ul className="about-values-list">
          {brand.values.map((value) => (
            <li key={value.label}>
              <strong>{value.label}</strong>
              <span>{value.description}</span>
            </li>
          ))}
        </ul>
      </section>

      {founders.length > 0 ? (
        <section className="section about-founders">
          <div className="about-section-head">
            <p className="eyebrow">Our people</p>
            <h2>The founders</h2>
            <p className="about-section-lede">The people who built this company.</p>
          </div>
          <div className={`about-founder-grid${founders.length === 1 ? " is-single" : ""}`}>
            {founders.map((founder) => (
              <article className="about-founder" key={founder.name}>
                {founder.photoUrl ? (
                  <Image
                    className="about-founder-photo"
                    src={founder.photoUrl}
                    alt={founder.name}
                    width={480}
                    height={560}
                    unoptimized={founder.photoUrl.startsWith("http")}
                  />
                ) : (
                  <div className="about-founder-photo about-founder-placeholder" aria-hidden="true" />
                )}
                <div className="about-founder-copy">
                  <h3>{founder.name}</h3>
                  {founder.role ? <p className="about-founder-role">{founder.role}</p> : null}
                  {founder.bio ? <p>{founder.bio}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section about-pillars">
        <div className="about-section-head">
          <p className="eyebrow">What we stand for</p>
          <h2>Natural, pure, and responsible</h2>
          <p className="about-section-lede">The principles behind every {brand.name} product.</p>
        </div>
        <ol className="about-pillar-list">
          {brand.pillars.map((pillar, index) => (
            <li key={pillar.label}>
              <span className="about-pillar-num">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{pillar.label}</h3>
                <p>{pillar.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="section about-offerings">
        <div className="about-section-head">
          <p className="eyebrow">What we offer</p>
          <h2>Wellness for everyday health</h2>
        </div>
        <div className="about-offering-grid">
          {brand.offerings.map((offering) => (
            <article key={offering.title}>
              <h3>{offering.title}</h3>
              <p>{offering.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section about-commit">
        <div className="about-commit-inner">
          <p className="eyebrow">Our commitment</p>
          <h2>Live Well. Live Green.</h2>
          <p>{brand.commitment}</p>
          <div className="about-commit-actions">
            <Link className="button button-light" href="/products">
              Shop products
            </Link>
            <Link className="text-link light-link" href="/contact">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
