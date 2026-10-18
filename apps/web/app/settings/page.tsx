import { Suspense } from 'react';
import { SettingsPage } from '@/components/settings';
export const metadata = { title: 'Settings', robots: { index: false, follow: false } };
export default function Page() {
  return (
    <Suspense>
      <SettingsPage />
    </Suspense>
  );
}
