import Link from "next/link";
import { PackageCard } from "@/components/PackageCard";
import { getCatalogPackages } from "@/lib/catalog";
import { getSiteBrand } from "@/lib/siteContent";

export default async function PackagesPage() {
  const [brand, packages] = await Promise.all([getSiteBrand(), getCatalogPackages()]);

  return (
    <div className="packages-page">
      <section className="packages-hero">
        <div className="packages-hero-inner">
          <p className="eyebrow">Wellness packages</p>
          <h1>
            Curated bundles
            <span>from {brand.name}</span>
          </h1>
          <p className="packages-hero-lede">
            Complete routines with clear pricing — name, benefits, and what&apos;s included.
          </p>
          <div className="packages-hero-actions">
            <Link className="button" href="/products">
              Browse products
            </Link>
            <p className="packages-count">
              {packages.length} {packages.length === 1 ? "package" : "packages"} available
            </p>
          </div>
        </div>
      </section>

      <section className="section packages-catalog">
        {packages.length === 0 ? (
          <div className="packages-empty">
            <h2>No packages yet</h2>
            <p className="muted">When admin adds packages, they will show up here.</p>
            <Link className="button" href="/products">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="packages-list">
            {packages.map((pack, index) => (
              <PackageCard key={pack.slug} pack={pack} featured={index === 0} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
