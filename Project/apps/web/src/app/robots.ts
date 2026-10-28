import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/customer', '/owner', '/agent/', '/admin', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
