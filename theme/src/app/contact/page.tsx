import type { Metadata } from "next";
import Link from "next/link";
import { brand as fallbackBrand } from "@/data/brand";
import { getSiteBrand } from "@/lib/siteContent";

export const metadata: Metadata = {
  title: `Contact Us | ${fallbackBrand.name}`,
  description: `Get in touch with ${fallbackBrand.name} for orders, support, and wellness product enquiries.`,
};

export default async function ContactPage() {
  const brand = await getSiteBrand();
  const websiteHref = brand.contact.website.startsWith("http")
    ? brand.contact.website
    : `https://${brand.contact.website.replace(/^\/\//, "")}`;

  return (
    <div className="contact-page">
      <section className="contact-hero">
        <div className="contact-hero-inner">
          <p className="eyebrow">Contact us</p>
          <h1>
            We&apos;re here
            <span>to help</span>
          </h1>
          <p className="contact-hero-lede">
            Product enquiries, order support, or partnership opportunities.
            {brand.contact.supportNote ? ` ${brand.contact.supportNote}` : ""}
          </p>
          <div className="contact-hero-meta">
            <a href={`tel:${brand.contact.phone.replace(/\s/g, "")}`}>{brand.contact.phone}</a>
            <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
            <Link href="/products">Shop products →</Link>
          </div>
        </div>
      </section>

      <section className="section contact-main">
        <div className="contact-info">
          <p className="eyebrow">Reach us</p>
          <h2>Get in touch</h2>
          <p className="contact-info-lede">
            Prefer a direct line? Use the details below — we respond during business hours.
          </p>

          <dl className="contact-dl">
            <div>
              <dt>Phone</dt>
              <dd>
                <a href={`tel:${brand.contact.phone.replace(/\s/g, "")}`}>{brand.contact.phone}</a>
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
              </dd>
            </div>
            <div>
              <dt>Website</dt>
              <dd>
                <a href={websiteHref} target="_blank" rel="noreferrer">
                  {brand.contact.website}
                </a>
              </dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{brand.contact.address}</dd>
            </div>
            <div>
              <dt>Business hours</dt>
              <dd>{brand.contact.hours}</dd>
            </div>
          </dl>

          {brand.assurances.length > 0 ? (
            <ul className="contact-assurances">
              {brand.assurances.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <form className="contact-form-panel" action="#" method="post">
          <p className="eyebrow">Message</p>
          <h2>Send a note</h2>
          <p className="contact-form-lede">Tell us what you need — we&apos;ll get back soon.</p>

          <div className="contact-fields">
            <label>
              Full name
              <input type="text" name="name" placeholder="Your name" autoComplete="name" />
            </label>
            <label>
              Email
              <input type="email" name="email" placeholder="you@example.com" autoComplete="email" />
            </label>
            <label className="contact-field-full">
              Message
              <textarea name="message" rows={6} placeholder="How can we help?" />
            </label>
          </div>

          <button className="button" type="button">
            Send message
          </button>
          <p className="contact-form-note">We typically reply within one business day.</p>
        </form>
      </section>
    </div>
  );
}
