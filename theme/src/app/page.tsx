import Image from "next/image";
import Link from "next/link";
import { CategoryCard } from "@/components/CategoryCard";
import { PackageCard } from "@/components/PackageCard";
import { ProductCard } from "@/components/ProductCard";
import { RatingStars } from "@/components/RatingStars";
import { SectionHeader } from "@/components/SectionHeader";
import { brand } from "@/data/brand";
import { categories, featuredPackages, featuredProducts, testimonials } from "@/data/commerce";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">{brand.motto}</p>
          <h1>{brand.slogan}</h1>
          <p>
            {brand.description} {brand.subSlogan}
          </p>
          <div className="hero-actions">
            <Link className="button" href="/products">
              Shop wellness products
            </Link>
            <Link className="button button-soft" href="/packages">
              Explore packages
            </Link>
          </div>
          <div className="trust-strip">
            <span>Cold-pressed juices</span>
            <span>No added sugar</span>
            <span>Real ingredients</span>
          </div>
          <div className="hero-stats" aria-label="Store highlights">
            <div>
              <strong>14</strong>
              <span>Wellness products</span>
            </div>
            <div>
              <strong>9</strong>
              <span>Cold-pressed juices</span>
            </div>
            <div>
              <strong>4</strong>
              <span>Ready packages</span>
            </div>
          </div>
        </div>
        <div className="hero-panel hero-panel-light">
          <div className="hero-showcase">
            <Image
              src={brand.heroImage}
              alt={`${brand.name} wellness products`}
              width={640}
              height={480}
              priority
              className="hero-showcase-image"
            />
          </div>
          <div className="hero-product-card">
            <span className="hero-badge-light">Packages from Rs. 699</span>
            <h3>Wellness Juice Starter Pack</h3>
            <strong>Rs. 999</strong>
            <small>3 cold-pressed wellness juices</small>
            <Link className="button button-small" href="/packages/wellness-juice-starter">
              View package
            </Link>
          </div>
          <div className="floating-card floating-card-light">
            <RatingStars rating={4.9} reviews={76} />
            <p>Immunity, detox, and glow packages with clear bundle pricing.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHeader
          eyebrow="Shop by category"
          title="Premium wellness categories"
          description="Cold-pressed juices, superfood powders, plant proteins, gummies, and herbal teas."
        />
        <div className="category-grid">
          {categories.map((category) => (
            <CategoryCard key={category.name} category={category} />
          ))}
        </div>
      </section>

      <section className="section promo-showcase">
        <div>
          <p className="eyebrow">Signature offer</p>
          <h2>Start with the Wellness Juice Starter Pack.</h2>
          <p>
            Berry Immunity, Detox Cleanse, and Radiant Glow in one value bundle — cold-pressed,
            natural, and made with real fruits and superfoods.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/packages/wellness-juice-starter">
              View Rs. 999 starter pack
            </Link>
            <Link className="text-link" href="/products/berry-immunity">
              Read product details
            </Link>
          </div>
        </div>
        <div className="promo-card">
          <span>3 Bottles</span>
          <strong>Rs. 999</strong>
          <p>Wellness Juice Starter Pack for immunity, detox, and glow.</p>
        </div>
      </section>

      <section className="section">
        <SectionHeader
          eyebrow="Wellness products"
          title="Featured Arogya Greenlife products"
          description="Cold-pressed juices, superfoods, proteins, gummies, and herbal teas."
          actionLabel="View all products"
          actionHref="/products"
        />
        <div className="product-grid">
          {featuredProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      <section className="section section-tinted">
        <SectionHeader
          eyebrow="Bundles"
          title="Ready wellness packages"
          description="Immunity, detox, glow, and complete wellness bundles with clear pricing."
          actionLabel="View packages"
          actionHref="/packages"
        />
        <div className="package-grid">
          {featuredPackages.map((pack) => (
            <PackageCard key={pack.slug} pack={pack} />
          ))}
        </div>
      </section>

      <section className="section split-section">
        <div>
          <p className="eyebrow">Why {brand.name}</p>
          <h2>Designed for natural wellness commerce.</h2>
          <p>{brand.about}</p>
        </div>
        <div className="benefit-grid">
          <article>
            <strong>01</strong>
            <h3>Natural & Pure</h3>
            <p>Made with real fruits, vegetables, berries, and superfoods. No artificial additives.</p>
          </article>
          <article>
            <strong>02</strong>
            <h3>Cold-Pressed Goodness</h3>
            <p>Maximum nutrition in every bottle with clean, honest formulations.</p>
          </article>
          <article>
            <strong>03</strong>
            <h3>Sustainable & Responsible</h3>
            <p>Eco-friendly practices and responsible sourcing for a healthier planet.</p>
          </article>
        </div>
      </section>

      <section className="section process-section">
        <SectionHeader
          eyebrow="Our promise"
          title="Goodness that supports you"
          description="Every Arogya Greenlife product is crafted to support immunity, detox, energy, digestion, and overall well-being."
        />
        <div className="process-grid">
          {brand.benefits.map((benefit, index) => (
            <article key={benefit}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{benefit}</h3>
              <p>Premium wellness support with real ingredients and no added sugar.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section assurance-band">
        {brand.features.map((feature, index) => (
          <article key={feature.label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{feature.label}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
        <article>
          <span>05</span>
          <h3>Live Well. Drink Well.</h3>
          <p>Your wellness is our mission — nourishing health, naturally.</p>
        </article>
      </section>

      <section className="section">
        <SectionHeader eyebrow="Reviews" title="Customer confidence" />
        <div className="testimonial-grid">
          {testimonials.map((testimonial) => (
            <article className="testimonial-card" key={testimonial.name}>
              <RatingStars rating={testimonial.rating} />
              <p>&quot;{testimonial.quote}&quot;</p>
              <strong>{testimonial.name}</strong>
              <small>{testimonial.location}</small>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
