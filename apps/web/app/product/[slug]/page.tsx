import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/api';
import type { Product } from '@lilac/api-client';
import { ProductDetail } from '@/components/commerce';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const p = await serverApi<Product>(`/products/${slug}`);
    return {
      title: p.title,
      description: p.description,
      alternates: { canonical: `/product/${slug}` },
    };
  } catch {
    return { title: 'Product not found' };
  }
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let p: Product;
  try {
    p = await serverApi(`/products/${slug}`);
  } catch {
    notFound();
  }
  return <ProductDetail product={p} />;
}
