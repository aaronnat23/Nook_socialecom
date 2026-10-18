import { serverApi } from '@/lib/api';
import { Discover } from '@/components/discover';
import type { Product, Shop } from '@lilac/api-client';
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const data = await serverApi<{ shops: Shop[]; products: Product[]; categories: string[] }>(
    '/discover',
  );
  return <Discover initial={data} searchQuery={q} />;
}
