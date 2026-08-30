import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Great_Vibes } from "next/font/google";
import { getSiteBrand } from "@/lib/siteContent";
import { brand as fallbackBrand } from "@/data/brand";

const signatureFont = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-signature",
});

export const metadata: Metadata = {
  title: `About Us | ${fallbackBrand.name}`,
  description: `Learn about ${fallbackBrand.name} — our mission, vision, values, founders, and commitment to natural wellness.`,
};

function LeafMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
      <path
        d="M32 46c0-14 8-24 18-28-2 14-8 24-18 28z"
        fill="currentColor"
        opacity="0.85"
      />
      <path
        d="M32 46c0-14-8-24-18-28 2 14 8 24 18 28z"
        fill="currentColor"
        opacity="0.7"
      />
      <circle cx="32" cy="28" r="3.5" fill="currentColor" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="20" cy="20" r="8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="20" cy="20" r="2.5" fill="currentColor" />
      <path d="M20 6v4M20 30v4M6 20h4M30 20h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M4 20s6-10 16-10 16 10 16 10-6 10-16 10S4 20 4 20z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="20" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M28 10l2-3M31 13l3-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconSprout() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M20 34V18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M20 22c0-7 5-12 12-14-1 8-5 13-12 14z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M20 24c0-6-4-10-10-12 1 7 4 11 10 12z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLeaf() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 14c6-10 14-10 14-10s2 10-6 16c-2 1.5-5 1-6-1-1.2-2.2-.8-4.2-2-5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 16c3-3 6-5 10-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconFlask() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3h6M10 3v6L5.5 18a3 3 0 002.6 4.5h7.8a3 3 0 002.6-4.5L14 9V3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 14h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.8 2.5 14.2 0 17M12 3.5c-2.5 2.8-2.5 14.2 0 17" stroke="currentColor" strokeWidth="1.4" />
      <path d="M16 7c2 1 3 2.5 3.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0112 8a3.8 3.8 0 017 2.8C19 15.6 12 20 12 20z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M7 13h2.5l1.5-2.5L13.5 15l1.5-2H17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const featureIcons = [IconLeaf, IconFlask, IconGlobe, IconHeart];

export default async function AboutPage() {
  const brand = await getSiteBrand();
  const founders = brand.founders.filter((f) => f.name);
  const valuesSummary =
    brand.values.length > 0
      ? brand.values.map((v) => v.label).join(" · ")
      : "Purity, quality, integrity, and sustainability in every choice.";
  const featureItems = (brand.assurances.length ? brand.assurances : [
    "100% Natural Ingredients",
    "Scientifically Researched",
    "Sustainable & Eco-Friendly",
    "Better Health, Better Life",
  ]).slice(0, 4);

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
        <section className={`section about-founders-showcase ${signatureFont.variable}`}>
          <div className="founders-stage">
            <div className="founders-stage-inner">
              <header className="founders-intro">
                <p className="eyebrow">Our people</p>
                <h2>Vision. Purpose. Wellness for All.</h2>
                <p>
                  United by a shared passion for natural living, our founders built {brand.name} to bring
                  purity, purpose, and lasting wellness to every home.
                </p>
              </header>

              <div className={`founders-trio${founders.length === 1 ? " is-single" : ""}`}>
                {founders[0] ? (
                  <article className="founder-glass">
                    <div className="founder-avatar-wrap">
                      {founders[0].photoUrl ? (
                        <Image
                          className="founder-avatar"
                          src={founders[0].photoUrl}
                          alt={founders[0].name}
                          width={280}
                          height={280}
                          unoptimized={founders[0].photoUrl.startsWith("http")}
                        />
                      ) : (
                        <div className="founder-avatar founder-avatar-fallback" aria-hidden="true">
                          {founders[0].name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <h3>{founders[0].name}</h3>
                    {founders[0].role ? <p className="founder-title">{founders[0].role}</p> : null}
                    {founders[0].bio ? <p className="founder-bio">{founders[0].bio}</p> : null}
                    <p className="founder-signature">{founders[0].name}</p>
                  </article>
                ) : null}

                <div className="founders-brand-center">
                  {brand.logo ? (
                    <Image
                      className="founders-brand-logo"
                      src={brand.logo}
                      alt={brand.name}
                      width={88}
                      height={88}
                      unoptimized={brand.logo.startsWith("http")}
                    />
                  ) : (
                    <LeafMark className="founders-brand-mark" />
                  )}
                  <p className="founders-brand-name">{brand.name.split(" ")[0]?.toUpperCase() || "AROGYA"}</p>
                  <p className="founders-brand-sub">Green Life</p>
                  <p className="founders-brand-motto">Nature. Wellness. Future.</p>
                </div>

                {founders[1] ? (
                  <article className="founder-glass">
                    <div className="founder-avatar-wrap">
                      {founders[1].photoUrl ? (
                        <Image
                          className="founder-avatar"
                          src={founders[1].photoUrl}
                          alt={founders[1].name}
                          width={280}
                          height={280}
                          unoptimized={founders[1].photoUrl.startsWith("http")}
                        />
                      ) : (
                        <div className="founder-avatar founder-avatar-fallback" aria-hidden="true">
                          {founders[1].name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <h3>{founders[1].name}</h3>
                    {founders[1].role ? <p className="founder-title">{founders[1].role}</p> : null}
                    {founders[1].bio ? <p className="founder-bio">{founders[1].bio}</p> : null}
                    <p className="founder-signature">{founders[1].name}</p>
                  </article>
                ) : null}
              </div>

              <div className="founders-mvv">
                <article>
                  <span className="founders-mvv-icon"><IconTarget /></span>
                  <div>
                    <h3>Our Mission</h3>
                    <p>{brand.mission}</p>
                  </div>
                </article>
                <article>
                  <span className="founders-mvv-icon"><IconEye /></span>
                  <div>
                    <h3>Our Vision</h3>
                    <p>{brand.vision}</p>
                  </div>
                </article>
                <article>
                  <span className="founders-mvv-icon"><IconSprout /></span>
                  <div>
                    <h3>Our Values</h3>
                    <p>{valuesSummary}</p>
                  </div>
                </article>
              </div>

              <ul className="founders-features">
                {featureItems.map((label, index) => {
                  const Icon = featureIcons[index % featureIcons.length];
                  return (
                    <li key={label}>
                      <span className="founders-feature-icon"><Icon /></span>
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
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
