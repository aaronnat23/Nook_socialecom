import type { Metadata } from 'next';
import { Provider } from '@/components/provider';
import { Shell } from '@/components/shell';
import './globals.css';
import './nook.css';
export const metadata: Metadata = {
  title: { default: 'Nook — a cosy corner of the internet for small shops', template: '%s · Nook' },
  description:
    'Nook is where independent Malaysian shops move in, decorate their own corner of the internet, and show you who they really are.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000'),
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#page-content">
          Skip to content
        </a>
        <Provider>
          <Shell>{children}</Shell>
        </Provider>
      </body>
    </html>
  );
}
