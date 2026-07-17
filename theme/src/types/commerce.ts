export type ProductCategory =
  | "Wellness Juices"
  | "Superfood Powders"
  | "Plant Proteins"
  | "Wellness Gummies"
  | "Wellness Supplements"
  | "Herbal Teas";

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  description: string;
  longDescription: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  badge?: string;
  status?: "available" | "upcoming";
  packSize: string;
  benefits: string[];
  ingredients: string[];
  usage: string;
  tags: string[];
};

export type Package = {
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number;
  image: string;
  badge: string;
  includes: string[];
  benefits: string[];
  idealFor: string;
  duration: string;
  rating: number;
  reviews: number;
};

export type Category = {
  name: ProductCategory | "Packages";
  description: string;
  image: string;
  itemCount: number;
};

export type Testimonial = {
  name: string;
  location: string;
  quote: string;
  rating: number;
};
