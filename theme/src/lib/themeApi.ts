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
};

async function request(path: string, options: RequestInit = {}) {
  const token = getThemeToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = token;

  const res = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
    ...options,
    headers,
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
};
