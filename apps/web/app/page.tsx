import { serverApi } from '@/lib/api';
import { Discover } from '@/components/discover';
import type { Product, Shop } from '@lilac/api-client';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const data = await serverApi<{ shops: Shop[]; products: Product[]; categories: string[] }>(
    '/discover',
  );
  return <Discover initial={data} />;
}
