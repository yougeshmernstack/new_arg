import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/commerce";
import { RatingStars } from "@/components/RatingStars";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const savings = product.compareAtPrice ? product.compareAtPrice - product.price : 0;
  const isUpcoming = product.status === "upcoming";

  return (
    <article className="product-card">
      <Link className="product-art" href={`/products/${product.slug}`} aria-label={product.name}>
        <Image className="product-image" src={product.image} alt={product.name} width={520} height={520} priority={false} />
        {product.badge ? <span className="art-badge">{product.badge}</span> : null}
      </Link>
      <div className="card-body">
        <div className="card-meta">
          <span>{product.category}</span>
          {product.badge ? <strong>{product.badge}</strong> : null}
        </div>
        <h3>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <p>{product.description}</p>
        <RatingStars rating={product.rating} reviews={product.reviews} />
        <div className="price-row">
          <div>
            {isUpcoming ? (
              <strong>Coming soon</strong>
            ) : (
              <>
                <strong>Rs. {product.price.toLocaleString("en-IN")}</strong>
                {product.compareAtPrice ? <del>Rs. {product.compareAtPrice.toLocaleString("en-IN")}</del> : null}
              </>
            )}
          </div>
          {savings > 0 ? <span className="save-badge">Save Rs. {savings}</span> : null}
        </div>
        <Link className="button button-soft" href={`/products/${product.slug}`}>
          {isUpcoming ? "View launch" : "View details"}
        </Link>
      </div>
    </article>
  );
}
