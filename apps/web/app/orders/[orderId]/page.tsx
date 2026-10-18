import { OrderPage } from '@/components/commerce';
export const metadata = { title: 'Your order', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <OrderPage id={orderId} />;
}
