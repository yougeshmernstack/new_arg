import type { Metadata } from "next";
import Link from "next/link";
import { brand as fallbackBrand, legalDocuments as fallbackLegal } from "@/data/brand";
import { mediaUrl, themeApi, type LegalDoc } from "@/lib/themeApi";
import { getSiteBrand } from "@/lib/siteContent";

export const metadata: Metadata = {
  title: `Legal Documents | ${fallbackBrand.name}`,
  description: `Privacy policy, terms, shipping, refund policy, and disclaimer for ${fallbackBrand.name}.`,
};

async function getLegalDocs(): Promise<
  { id: string; title: string; summary: string; fileUrl?: string; sections?: { heading: string; body: string }[] }[]
> {
  try {
    const res = await themeApi.getLegalDocuments();
    const list = (res?.data || []) as LegalDoc[];
    if (list.length) {
      return list.map((doc) => ({
        id: doc.slug,
        title: doc.title,
        summary: doc.summary || "",
        fileUrl: doc.fileUrl ? mediaUrl(doc.fileUrl) : undefined,
      }));
    }
  } catch {
    /* fall through */
  }
  return fallbackLegal.map((doc) => ({
    id: doc.id,
    title: doc.title,
    summary: doc.summary,
    sections: doc.sections,
  }));
}

export default async function LegalPage() {
  const [brand, docs] = await Promise.all([getSiteBrand(), getLegalDocs()]);

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
            {docs.map((doc) => (
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
          {docs.map((doc) => (
            <article className="legal-doc" id={doc.id} key={doc.id}>
              <h2>{doc.title}</h2>
              {doc.summary ? <p className="legal-summary">{doc.summary}</p> : null}
              {doc.fileUrl ? (
                <p>
                  <a className="button button-soft" href={doc.fileUrl} target="_blank" rel="noreferrer">
                    View / download PDF
                  </a>
                </p>
              ) : null}
              {doc.sections?.map((section) => (
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
