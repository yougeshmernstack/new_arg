const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:6500';
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || '/theme';

const TOKEN_KEY = 'theme_auth_token';

export function getThemeToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setThemeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearThemeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function mediaUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export type ShopProduct = {
  productId: number;
  product_name: string;
  sku: string;
  price: number;
  mrp?: number;
  stock: number;
  out_of_stock?: boolean;
  description?: string;
  ingredients?: string;
  benefits?: string[];
  nutrition_facts?: string;
  directions?: string;
  storage?: string;
  manufacturing_details?: string;
  weight?: string;
  images?: string[];
  videos?: string[];
  description_images?: string[];
};

export type CatalogProduct = ShopProduct & {
  categoryId?: number;
  brandId?: number;
  packageId?: number;
};

export type CatalogPackage = {
  packageId: number;
  name: string;
  price: number;
  amount?: number;
  discounted_amount?: number;
  description?: string;
  benefits?: string[];
  items?: { productId: number; quantity: number }[];
  itemNames?: string[];
  image?: string | null;
  images?: string[];
  description_images?: string[];
  status?: string;
};

export type SiteContent = {
  name: string;
  shortName?: string;
  tagline?: string;
  motto?: string;
  slogan?: string;
  subSlogan?: string;
  description?: string;
  about?: string;
  aboutExtended?: string[];
  vision?: string;
  mission?: string;
  commitment?: string;
  howItWasBuilt?: string;
  values?: { label: string; description: string }[];
  offerings?: { title: string; description: string }[];
  pillars?: { label: string; description: string }[];
  features?: { label: string; description: string }[];
  assurances?: string[];
  benefits?: string[];
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    hours?: string;
    address?: string;
    supportNote?: string;
  };
  founders?: { name: string; role: string; bio: string; photoUrl: string }[];
  logo?: string;
  heroImage?: string;
  heroSlides?: {
    _id?: string;
    imageUrl?: string;
    linkUrl?: string;
    title?: string;
    sortOrder?: number;
    status?: string;
  }[];
};

export type LegalDoc = {
  documentId: number;
  slug: string;
  title: string;
  summary?: string;
  fileUrl: string;
  sortOrder?: number;
};

async function request(path: string, options: RequestInit = {}, requireAuth = true) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (requireAuth) {
    const token = getThemeToken();
    if (token) headers.Authorization = token;
  }

  const res = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
    ...options,
    headers,
    cache: options.cache ?? 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    const error = new Error(message) as Error & { status?: number; data?: unknown };
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function publicRequest(path: string, options: RequestInit = {}) {
  return request(path, options, false);
}

export const themeApi = {
  login: (payload: { username: string; password: string }) =>
    request('/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload: Record<string, unknown>) =>
    request('/register', { method: 'POST', body: JSON.stringify(payload) }),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request('/change-password', { method: 'POST', body: JSON.stringify(payload) }),
  getProducts: (params?: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    const q = qs.toString();
    return request(`/get-products${q ? `?${q}` : ''}`);
  },
  getProduct: (productId: number | string) =>
    request(`/get-product?productId=${productId}`),
  getCart: () => request('/get-cart'),
  addToCart: (payload: { productId: number; quantity?: number }) =>
    request('/add-to-cart', { method: 'POST', body: JSON.stringify(payload) }),
  updateCartItem: (payload: { productId: number; quantity: number }) =>
    request('/update-cart-item', { method: 'POST', body: JSON.stringify(payload) }),
  removeCartItem: (payload: { productId: number }) =>
    request('/remove-cart-item', { method: 'POST', body: JSON.stringify(payload) }),
  checkout: (payload: Record<string, unknown>) =>
    request('/checkout', { method: 'POST', body: JSON.stringify(payload) }),
  getOrders: () => request('/get-orders?limit=50'),
  getOrder: (orderId: number | string) =>
    request(`/get-order?orderId=${orderId}`),
  downloadInvoice: async (orderId: number | string) => {
    const token = getThemeToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = token;
    const res = await fetch(`${API_BASE}${API_PREFIX}/download-invoice?orderId=${orderId}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || `Request failed (${res.status})`);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition') || '';
    const match = /filename="?([^"]+)"?/i.exec(disposition);
    return { blob, filename: match?.[1] || `invoice-${orderId}.html` };
  },
  getPaymentMethods: () => request('/get-payment-methods'),
  submitOrderPayment: async (formData: FormData) => {
    const token = getThemeToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = token;
    const res = await fetch(`${API_BASE}${API_PREFIX}/submit-order-payment`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.message || `Request failed (${res.status})`;
      const error = new Error(message) as Error & { status?: number; data?: unknown };
      error.status = res.status;
      error.data = data;
      throw error;
    }
    return data;
  },

  // Public catalog / CMS
  getSiteContent: () => publicRequest('/get-site-content'),
  getLegalDocuments: () => publicRequest('/get-legal-documents'),
  catalogProducts: (params?: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    const q = qs.toString();
    return publicRequest(`/catalog-products${q ? `?${q}` : ''}`);
  },
  catalogProduct: (productId: number | string) =>
    publicRequest(`/catalog-product?productId=${productId}`),
  catalogPackages: (params?: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    const q = qs.toString();
    return publicRequest(`/catalog-packages${q ? `?${q}` : ''}`);
  },
  catalogPackage: (packageId: number | string) =>
    publicRequest(`/catalog-package?packageId=${packageId}`),
};
