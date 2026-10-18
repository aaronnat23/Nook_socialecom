import { ProductsPage } from '@/components/products';
export const metadata = { title: 'Your products', robots: { index: false, follow: false } };
export default function Page() {
  return <ProductsPage />;
}
