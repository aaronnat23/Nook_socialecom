import type { MetadataRoute } from 'next';
import { serverApi } from '@/lib/api';
import type { Shop, Product } from '@lilac/api-client';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000';
  const data = await serverApi<{ shops: Shop[]; products: Product[] }>('/discover');
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    ...data.shops.map((s) => ({
      url: `${base}/shop/${s.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...data.products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
