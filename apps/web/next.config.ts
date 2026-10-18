import type { NextConfig } from 'next';
const config: NextConfig = {
  transpilePackages: ['@lilac/schema', '@lilac/renderer', '@lilac/api-client', '@lilac/ui'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://127.0.0.1:8000'}/api/:path*`,
      },
      {
        source: '/media/:path*',
        destination: `${process.env.API_URL || 'http://127.0.0.1:8000'}/media/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
export default config;
