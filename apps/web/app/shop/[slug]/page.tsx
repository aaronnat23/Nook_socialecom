import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/api';
import { Storefront } from '@/components/storefront';
import type { Shop, Product } from '@lilac/api-client';
import type { Document } from '@lilac/schema';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { NookWindow } from '@/components/frame';
interface Data extends Shop {
  document: Document;
  products: Product[];
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const shop = await serverApi<Data>(`/shops/${slug}`);
    return {
      title: shop.name,
      description: shop.bio,
      alternates: { canonical: `/shop/${slug}` },
      openGraph: { title: shop.name, description: shop.bio },
    };
  } catch {
    return { title: 'Space not found' };
  }
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let shop: Data;
  try {
    shop = await serverApi<Data>(`/shops/${slug}`);
  } catch {
    notFound();
  }
  return (
    <div className="page-wrap" id="page-content">
      <div className="visit-bar">
        <Link className="button outline small-button" href="/">
          <ArrowLeft size={15} /> Back to Discover
        </Link>
        <p>
          <span className="visit-note">you’re visiting</span>
          <strong>{shop.name}</strong>
          <span className="visit-place">
            {shop.category} · {shop.location}
          </span>
        </p>
      </div>
      <NookWindow address={`/ ${shop.slug}`} tag="Independent shop">
        <Storefront document={shop.document} products={shop.products} shop={shop} />
      </NookWindow>
      <div className="end-note">
        Sample shop · Sandbox purchases only ·{' '}
        <Link href={`/settings?report=${shop.id}`}>Report this space</Link>
      </div>
    </div>
  );
}
