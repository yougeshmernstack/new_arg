import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/commerce";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const isUpcoming = product.status === "upcoming";

  return (
    <article className="product-card">
      <Link className="product-art" href={`/products/${product.slug}`} aria-label={product.name}>
        <Image
          className="product-image"
          src={product.image}
          alt={product.name}
          width={520}
          height={520}
          priority={false}
          unoptimized={product.image.startsWith("http")}
        />
      </Link>
      <div className="catalog-card-body">
        <h3>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <p>{product.description}</p>
        <div className="price-row">
          <div>
            {isUpcoming ? (
              <strong>Coming soon</strong>
            ) : (
              <strong>Rs. {product.price.toLocaleString("en-IN")}</strong>
            )}
          </div>
          <Link className="text-link" href={`/products/${product.slug}`}>
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
