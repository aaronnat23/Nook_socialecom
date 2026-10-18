import { CheckoutPage } from '@/components/commerce';
export const metadata = { title: 'Sandbox checkout', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  return <CheckoutPage shopId={shopId} />;
}
