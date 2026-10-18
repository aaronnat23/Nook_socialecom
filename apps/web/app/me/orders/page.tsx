import { OrdersPage } from '@/components/commerce';
export const metadata = { title: 'Shop orders', robots: { index: false, follow: false } };
export default function Page() {
  return <OrdersPage seller />;
}
