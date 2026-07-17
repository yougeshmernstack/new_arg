import Link from "next/link";
import type { Category } from "@/types/commerce";

type CategoryCardProps = {
  category: Category;
};

export function CategoryCard({ category }: CategoryCardProps) {
  const href = category.name === "Packages" ? "/packages" : `/products?category=${encodeURIComponent(category.name)}`;

  return (
    <Link className="category-card" href={href}>
      <span className="category-icon">{category.image}</span>
      <div>
        <h3>{category.name}</h3>
        <p>{category.description}</p>
        <small>{category.itemCount} items</small>
      </div>
    </Link>
  );
}
