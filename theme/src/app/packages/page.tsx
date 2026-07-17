import { PackageCard } from "@/components/PackageCard";
import { SectionHeader } from "@/components/SectionHeader";
import { packages } from "@/data/commerce";

export default function PackagesPage() {
  return (
    <>
      <section className="page-hero compact-hero">
        <p className="eyebrow">Wellness packages</p>
        <h1>Arogya Greenlife bundles</h1>
        <p>
          Ready wellness bundles with cold-pressed juices, superfood powders, and gummies at value pricing.
        </p>
      </section>

      <section className="section">
        <SectionHeader
          eyebrow="Packages"
          title="Choose a wellness package"
          description="Starter packs, immunity bundles, detox & glow pairs, and complete wellness routines."
        />
        <div className="package-grid">
          {packages.map((pack) => (
            <PackageCard key={pack.slug} pack={pack} />
          ))}
        </div>
      </section>

      <section className="section split-section section-tinted">
        <div>
          <p className="eyebrow">Why bundles</p>
          <h2>Packages built for real wellness routines.</h2>
          <p>
            Each Arogya Greenlife package combines complementary products for immunity, detox, glow,
            and complete daily wellness.
          </p>
        </div>
        <div className="benefit-grid">
          <article>
            <strong>Clear pricing</strong>
            <p>Exact bundle prices with savings on multi-product packages.</p>
          </article>
          <article>
            <strong>Routine-first</strong>
            <p>Curated combinations for immunity, detox, and complete wellness goals.</p>
          </article>
          <article>
            <strong>Natural goodness</strong>
            <p>Cold-pressed juices and real ingredients in every bundle.</p>
          </article>
        </div>
      </section>
    </>
  );
}
