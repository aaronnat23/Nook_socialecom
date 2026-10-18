import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/shop/', '/product/', '/u/'],
      disallow: ['/me', '/settings', '/cart', '/checkout', '/orders', '/admin', '/api/'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000'}/sitemap.xml`,
  };
}
