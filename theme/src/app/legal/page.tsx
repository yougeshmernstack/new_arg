import type { Metadata } from "next";
import Link from "next/link";
import { brand, legalDocuments } from "@/data/brand";

export const metadata: Metadata = {
  title: `Legal Documents | ${brand.name}`,
  description: `Privacy policy, terms, shipping, refund policy, and disclaimer for ${brand.name}.`
};

export default function LegalPage() {
  return (
    <>
      <section className="page-hero company-hero">
        <p className="eyebrow">Legal documents</p>
        <h1>Company policies & legal information</h1>
        <p>
          Important policies for using our website, placing orders, and understanding our wellness product
          guidelines.
        </p>
      </section>

      <section className="section legal-index">
        <div className="legal-nav">
          <h2>Quick links</h2>
          <nav aria-label="Legal document links">
            {legalDocuments.map((doc) => (
              <a href={`#${doc.id}`} key={doc.id}>
                {doc.title}
              </a>
            ))}
          </nav>
          <p className="muted">
            For legal or compliance questions, contact{" "}
            <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>.
          </p>
        </div>

        <div className="legal-content">
          {legalDocuments.map((doc) => (
            <article className="legal-doc" id={doc.id} key={doc.id}>
              <h2>{doc.title}</h2>
              <p className="legal-summary">{doc.summary}</p>
              {doc.sections.map((section) => (
                <div className="legal-section" key={section.heading}>
                  <h3>{section.heading}</h3>
                  <p>{section.body}</p>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section className="section section-white centered-section">
        <p className="muted">Need help before placing an order?</p>
        <div className="hero-actions centered-actions">
          <Link className="button button-soft" href="/contact">
            Contact us
          </Link>
          <Link className="text-link" href="/about">
            About company
          </Link>
        </div>
      </section>
    </>
  );
}
