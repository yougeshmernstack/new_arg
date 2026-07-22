import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { getCatalogPackages, getCatalogProducts } from "@/lib/catalog";
import { getSiteBrand } from "@/lib/siteContent";

export default async function ProductsPage() {
  const [brand, products, packages] = await Promise.all([
    getSiteBrand(),
    getCatalogProducts(),
    getCatalogPackages(),
  ]);

  return (
    <>
      <section className="page-hero compact-hero">
        <p className="eyebrow">Wellness products</p>
        <h1>Shop {brand.name}</h1>
        <p>{brand.description}</p>
      </section>

      <section className="section">
        {products.length === 0 ? (
          <p className="muted">No products available yet.</p>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        )}
      </section>

      {packages.length > 0 ? (
        <section className="section section-tinted">
          <SectionHeader
            eyebrow="Bundle recommendation"
            title="Want a complete wellness routine?"
            description="Explore packages curated from our catalog."
          />
          <div className="deal-strip">
            {packages.map((pack) => (
              <Link href={`/packages/${pack.slug}`} key={pack.slug}>
                <strong>{pack.name}</strong>
                <span>Rs. {pack.price.toLocaleString("en-IN")}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
