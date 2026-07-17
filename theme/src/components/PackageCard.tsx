import Image from "next/image";
import Link from "next/link";
import type { Package } from "@/types/commerce";
import { RatingStars } from "@/components/RatingStars";

type PackageCardProps = {
  pack: Package;
};

export function PackageCard({ pack }: PackageCardProps) {
  const savings = pack.compareAtPrice - pack.price;

  return (
    <article className="package-card">
      <div className="package-art">
        <Image className="package-image" src={pack.image} alt={pack.name} width={620} height={470} />
        <strong>{pack.badge}</strong>
      </div>
      <div className="card-body">
        <p className="eyebrow">{pack.duration} routine</p>
        <h3>
          <Link href={`/packages/${pack.slug}`}>{pack.name}</Link>
        </h3>
        <p>{pack.description}</p>
        <ul className="mini-list">
          {pack.includes.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <RatingStars rating={pack.rating} reviews={pack.reviews} />
        <div className="price-row">
          <div>
            <strong>Rs. {pack.price.toLocaleString("en-IN")}</strong>
            {savings > 0 ? <del>Rs. {pack.compareAtPrice.toLocaleString("en-IN")}</del> : null}
          </div>
          {savings > 0 ? <span className="save-badge">Save Rs. {savings}</span> : null}
        </div>
        <Link className="button" href={`/packages/${pack.slug}`}>
          Explore package
        </Link>
      </div>
    </article>
  );
}
