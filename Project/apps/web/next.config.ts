import type { NextConfig } from 'next';

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1');
const storageUrl = process.env.OBJECT_STORAGE_PUBLIC_URL ? new URL(process.env.OBJECT_STORAGE_PUBLIC_URL) : undefined;

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@skyspace/shared'],
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: apiUrl.protocol.replace(':', '') as 'http' | 'https', hostname: apiUrl.hostname, port: apiUrl.port, pathname: '/uploads/**' },
      ...(storageUrl ? [{ protocol: storageUrl.protocol.replace(':', '') as 'http' | 'https', hostname: storageUrl.hostname }] : []),
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/(customer|owner|agent|admin)/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default config;
