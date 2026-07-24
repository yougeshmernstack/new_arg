import Image from "next/image";
import Link from "next/link";
import type { Package } from "@/types/commerce";

type PackageCardProps = {
  pack: Package;
  featured?: boolean;
};

export function PackageCard({ pack, featured = false }: PackageCardProps) {
  const savings = pack.compareAtPrice > pack.price ? pack.compareAtPrice - pack.price : 0;
  const includeCount = pack.includes?.length || 0;
  const isPhoto = !/\.svg($|\?)/i.test(pack.image);

  return (
    <article className={`package-card${featured ? " is-featured" : ""}${isPhoto ? " has-photo" : ""}`}>
      <Link className="package-art" href={`/packages/${pack.slug}`}>
        <Image
          className="package-image"
          src={pack.image}
          alt={pack.name}
          width={featured ? 860 : 620}
          height={featured ? 640 : 470}
        />
        <span className="package-art-shade" aria-hidden="true" />
      </Link>
      <div className="catalog-card-body">
        <div className="package-meta">
          {includeCount > 0 ? (
            <span>
              {includeCount} {includeCount === 1 ? "item" : "items"} included
            </span>
          ) : null}
          {pack.idealFor ? <span>{pack.idealFor}</span> : null}
        </div>
        <h3>
          <Link href={`/packages/${pack.slug}`}>{pack.name}</Link>
        </h3>
        {pack.description ? <p>{pack.description}</p> : null}
        {pack.benefits?.length ? (
          <ul className="package-benefits">
            {pack.benefits.slice(0, featured ? 4 : 3).map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        ) : includeCount > 0 ? (
          <ul className="package-benefits">
            {pack.includes.slice(0, featured ? 4 : 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <div className="price-row">
          <div className="package-price">
            <strong>Rs. {pack.price.toLocaleString("en-IN")}</strong>
            {savings > 0 ? (
              <>
                <del>Rs. {pack.compareAtPrice.toLocaleString("en-IN")}</del>
                <span className="save-badge">Save Rs. {savings.toLocaleString("en-IN")}</span>
              </>
            ) : null}
          </div>
          <Link
            className={`button package-cta${featured ? "" : " button-soft"}`}
            href={`/packages/${pack.slug}`}
          >
            View package
          </Link>
        </div>
      </div>
    </article>
  );
}
