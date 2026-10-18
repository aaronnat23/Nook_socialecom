import type { Document } from '@lilac/schema';
export interface Shop {
  id: string;
  slug: string;
  name: string;
  bio: string;
  category: string;
  location: string;
  avatar: string;
  cover: string;
  seller_enabled: boolean;
  followers: number;
  theme: string;
  document?: Document;
}
export interface Variant {
  id: string;
  sku: string;
  options: Record<string, string>;
  price_minor: number;
  stock: number;
}
export interface Product {
  id: string;
  slug: string;
  shop_id: string;
  shop_name: string;
  shop_slug: string;
  title: string;
  description: string;
  price_minor: number;
  currency: string;
  image: string;
  category: string;
  status: string;
  variants: Variant[];
  created_at: string;
  shipping_minor?: number;
  return_policy?: string;
}
export interface Me {
  id: string;
  email: string;
  handle: string;
  display_name: string;
  bio: string;
  seller_enabled: boolean;
  shop: Shop;
  favorites: string[];
  following: string[];
  is_admin: boolean;
  preferences: Record<string, boolean>;
}
export interface Draft {
  document: Document;
  revision: number;
  updated_at: string;
}
export interface Order {
  id: string;
  shop_id: string;
  shop_name: string;
  state: string;
  total_minor: number;
  subtotal_minor: number;
  shipping_minor: number;
  currency: string;
  items: { title: string; quantity: number; unit_price_minor: number; variant_id: string }[];
  created_at: string;
  tracking?: string;
  sandbox: boolean;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export function createClient(base: string, getToken: () => string | null = () => null) {
  return async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = getToken();
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        ...(init.body && !(init.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new ApiError(
        response.status,
        data.error?.message || data.detail || 'Something went wrong. Please try again.',
        data.error?.details,
      );
    return data as T;
  };
}
