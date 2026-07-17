import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { categories, packages, products } from "@/data/commerce";
import type { ProductCategory } from "@/types/commerce";

type ProductsPageProps = {
  searchParams?: Promise<{
    category?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const selectedCategory = params?.category as ProductCategory | undefined;
  const filteredProducts = selectedCategory
    ? products.filter((product) => product.category === selectedCategory)
    : products;

  return (
    <>
      <section className="page-hero compact-hero">
        <p className="eyebrow">Wellness products</p>
        <h1>Shop Arogya Greenlife</h1>
        <p>
          Browse cold-pressed wellness juices, superfood powders, plant proteins, gummies, and herbal teas.
        </p>
      </section>

      <section className="section">
        <div className="toolbar">
          <div className="search-placeholder">Search berry immunity, detox, greens powder...</div>
          <div className="filter-row" aria-label="Category filters">
            <Link className={!selectedCategory ? "active" : ""} href="/products">
              All
            </Link>
            {categories
              .filter((category) => category.name !== "Packages")
              .map((category) => (
                <Link
                  className={selectedCategory === category.name ? "active" : ""}
                  href={`/products?category=${encodeURIComponent(category.name)}`}
                  key={category.name}
                >
                  {category.name}
                </Link>
              ))}
          </div>
        </div>
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      <section className="section section-tinted">
        <SectionHeader
          eyebrow="Bundle recommendation"
          title="Want a complete wellness routine?"
          description="Explore immunity, detox, and complete wellness packages below."
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
    </>
  );
}
