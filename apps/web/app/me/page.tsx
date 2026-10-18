import { Suspense } from 'react';
import { SpacePage } from '@/components/my-space';
export const metadata = { title: 'My Space', robots: { index: false, follow: false } };
export default function Page() {
  return (
    <Suspense>
      <SpacePage />
    </Suspense>
  );
}
