import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { brand } from "@/data/brand";

export const metadata: Metadata = {
  title: `About Us | ${brand.name}`,
  description: `Learn about ${brand.name} — our mission, vision, values, and commitment to natural wellness.`
};

export default function AboutPage() {
  return (
    <>
      <section className="page-hero company-hero">
        <p className="eyebrow">About company</p>
        <h1>Nature&apos;s path to healthy living</h1>
        <p>{brand.description}</p>
      </section>

      <section className="section company-intro">
        <div className="company-copy">
          <h2>About {brand.name}</h2>
          {brand.aboutExtended.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <aside className="company-sidebar">
          <div className="sidebar-block">
            <span className="sidebar-icon" aria-hidden="true">
              ◎
            </span>
            <h3>Our Mission</h3>
            <p>{brand.mission}</p>
          </div>
          <div className="sidebar-block">
            <span className="sidebar-icon" aria-hidden="true">
              ◉
            </span>
            <h3>Our Vision</h3>
            <p>{brand.vision}</p>
          </div>
          <div className="sidebar-block">
            <span className="sidebar-icon" aria-hidden="true">
              ♡
            </span>
            <h3>Our Values</h3>
            <ul>
              {brand.values.map((value) => (
                <li key={value.label}>
                  <strong>{value.label}</strong> — {value.description}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <section className="section section-white">
        <SectionHeader
          eyebrow="What we stand for"
          title="Natural, pure, and responsible"
          description="The principles that guide every Arogya Greenlife product."
        />
        <div className="pillar-grid">
          {brand.pillars.map((pillar) => (
            <article className="pillar-card" key={pillar.label}>
              <span className="pillar-dot" aria-hidden="true" />
              <h3>{pillar.label}</h3>
              <p>{pillar.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-tinted">
        <SectionHeader
          eyebrow="What we offer"
          title="Wellness products for everyday health"
          description="A wide range of wellness products made with natural goodness."
        />
        <div className="offering-grid">
          {brand.offerings.map((offering) => (
            <article className="offering-card" key={offering.title}>
              <h3>{offering.title}</h3>
              <p>{offering.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section commitment-section">
        <div className="commitment-card">
          <p className="eyebrow light">Our commitment</p>
          <h2>Live Well. Live Green.</h2>
          <p>{brand.commitment}</p>
          <div className="hero-actions">
            <Link className="button button-light" href="/products">
              Shop products
            </Link>
            <Link className="text-link light-link" href="/contact">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
