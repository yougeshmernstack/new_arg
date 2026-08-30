import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import Link from "next/link";
import { brand as fallbackBrand, legalDocuments as fallbackLegal } from "@/data/brand";
import { mediaUrl, themeApi, type LegalDoc } from "@/lib/themeApi";
import LegalPdfAttach from "@/components/LegalPdfAttach";

export const metadata: Metadata = {
  title: `Legal Documents | ${fallbackBrand.name}`,
  description: `Privacy policy, terms, shipping, refund policy, and disclaimer for ${fallbackBrand.name}.`,
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function localPdfSize(fileUrl?: string) {
  if (!fileUrl) return undefined;
  const name = fileUrl.split("?")[0].split("/").pop();
  if (!name) return undefined;
  const localPath = path.join("/var/www/arogyagreenlife/apis/uploads/legal", name);
  try {
    return formatBytes(fs.statSync(localPath).size);
  } catch {
    return undefined;
  }
}

async function getLegalDocs(): Promise<
  {
    id: string;
    title: string;
    summary: string;
    fileUrl?: string;
    fileSize?: string;
    sections?: { heading: string; body: string }[];
  }[]
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
        fileSize: localPdfSize(doc.fileUrl),
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
  const docs = await getLegalDocs();

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

      <section className="section legal-index legal-index-grid">
        <div className="legal-content legal-doc-grid">
          {docs.map((doc) => (
            <article className="legal-doc" id={doc.id} key={doc.id}>
              <h2>{doc.title}</h2>
              {doc.summary ? <p className="legal-summary">{doc.summary}</p> : null}
              {doc.fileUrl ? (
                <LegalPdfAttach title={doc.title} fileUrl={doc.fileUrl} fileSize={doc.fileSize} />
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

      {/* <section className="section section-white centered-section">
        <p className="muted">Need help before placing an order?</p>
        <div className="hero-actions centered-actions">
          <Link className="button button-soft" href="/contact">
            Contact us
          </Link>
          <Link className="text-link" href="/about">
            About company
          </Link>
        </div>
      </section> */}
    </>
  );
}
