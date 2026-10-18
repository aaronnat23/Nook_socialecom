import { serverApi } from '@/lib/api';
import { Storefront } from '@/components/storefront';
import type { Shop, Product } from '@lilac/api-client';
import type { Document } from '@lilac/schema';
import { notFound } from 'next/navigation';
export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  let data: { display_name: string; bio: string; shop: Shop & { document?: Document } };
  try {
    data = await serverApi(`/users/${handle}`);
  } catch {
    notFound();
  }
  return (
    <div className="page-wrap" id="page-content">
      <div className="page-title">
        <div>
          <span className="eyebrow">@{handle}</span>
          <h1>{data.display_name}</h1>
          <p>{data.bio}</p>
        </div>
      </div>
      {data.shop.document ? (
        <Storefront document={data.shop.document} products={[]} shop={data.shop} />
      ) : (
        <div className="empty-state">
          <p>This space is still coming together.</p>
        </div>
      )}
    </div>
  );
}
