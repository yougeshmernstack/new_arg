import type { Package, Product, ProductCategory } from '@/types/commerce';
import { mediaUrl, themeApi, type CatalogPackage, type CatalogProduct } from '@/lib/themeApi';
import { packages as fallbackPackages, products as fallbackProducts } from '@/data/commerce';

const PLACEHOLDER_PRODUCT = '/images/products/berry-immunity.svg';
const PLACEHOLDER_PACKAGE = '/images/brand/hero-wellness.jpg';

function slugifyName(name: string, id: number) {
  const base = String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base ? `${base}-${id}` : `item-${id}`;
}

function parseIngredients(value?: string | string[]): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function mapCatalogProduct(p: CatalogProduct): Product {
  const images = Array.isArray(p.images)
    ? p.images.map((src) => mediaUrl(src)).filter(Boolean)
    : [];
  const descriptionImages = Array.isArray(p.description_images)
    ? p.description_images.map((src) => mediaUrl(src)).filter(Boolean)
    : [];
  const image = images[0] || PLACEHOLDER_PRODUCT;
  return {
    slug: String(p.productId),
    name: p.product_name,
    category: 'Wellness Supplements' as ProductCategory,
    description: p.description || '',
    longDescription: p.description || '',
    price: Number(p.price ?? p.mrp) || 0,
    compareAtPrice: p.mrp && p.price && p.mrp > p.price ? Number(p.mrp) : undefined,
    rating: 5,
    reviews: 0,
    image,
    images,
    descriptionImages,
    badge: p.out_of_stock ? 'Out of stock' : undefined,
    status: 'available',
    packSize: p.weight || '',
    benefits: Array.isArray(p.benefits) ? p.benefits : [],
    ingredients: parseIngredients(p.ingredients),
    usage: p.directions || '',
    tags: [],
  };
}

export function mapCatalogPackage(pkg: CatalogPackage): Package {
  const includes =
    Array.isArray(pkg.itemNames) && pkg.itemNames.length
      ? pkg.itemNames
      : Array.isArray(pkg.items) && pkg.items.length
        ? pkg.items.map((item) => `Product #${item.productId} × ${item.quantity}`)
        : [];
  const images = Array.isArray(pkg.images)
    ? pkg.images.map((src) => mediaUrl(src)).filter(Boolean)
    : [];
  const descriptionImages = Array.isArray(pkg.description_images)
    ? pkg.description_images.map((src) => mediaUrl(src)).filter(Boolean)
    : [];
  const fallbackImage = pkg.image ? mediaUrl(pkg.image) : '';
  const image = images[0] || fallbackImage || PLACEHOLDER_PACKAGE;
  return {
    slug: String(pkg.packageId),
    name: pkg.name,
    description: pkg.description || '',
    price: Number(pkg.price ?? pkg.discounted_amount) || 0,
    compareAtPrice: Number(pkg.amount) || Number(pkg.price) || 0,
    image,
    images: images.length ? images : [image],
    descriptionImages,
    badge: 'Package',
    includes,
    benefits: Array.isArray(pkg.benefits) ? pkg.benefits : [],
    idealFor: 'Everyday wellness',
    duration: 'Custom',
    rating: 5,
    reviews: 0,
  };
}

export async function getCatalogProducts(params?: Record<string, string | number | undefined>): Promise<Product[]> {
  try {
    const res = await themeApi.catalogProducts({ limit: 100, ...params });
    const list = (res?.data || []) as CatalogProduct[];
    return list.map(mapCatalogProduct);
  } catch {
    return fallbackProducts;
  }
}

export async function getCatalogProduct(productId: string | number): Promise<Product | null> {
  const id = Number(productId);
  if (!Number.isFinite(id)) {
    return fallbackProducts.find((p) => p.slug === String(productId)) || null;
  }
  try {
    const res = await themeApi.catalogProduct(id);
    if (res?.data) return mapCatalogProduct(res.data as CatalogProduct);
  } catch {
    /* fall through */
  }
  return fallbackProducts.find((p) => p.slug === String(productId)) || null;
}

export async function getCatalogPackages(): Promise<Package[]> {
  try {
    const res = await themeApi.catalogPackages({ limit: 100 });
    const list = (res?.data || []) as CatalogPackage[];
    return list.map(mapCatalogPackage);
  } catch {
    return fallbackPackages;
  }
}

export async function getCatalogPackage(packageId: string | number): Promise<Package | null> {
  const id = Number(packageId);
  if (!Number.isFinite(id)) {
    return fallbackPackages.find((p) => p.slug === String(packageId)) || null;
  }
  try {
    const res = await themeApi.catalogPackage(id);
    if (res?.data) return mapCatalogPackage(res.data as CatalogPackage);
  } catch {
    /* fall through */
  }
  return fallbackPackages.find((p) => p.slug === String(packageId)) || null;
}

export { slugifyName };
